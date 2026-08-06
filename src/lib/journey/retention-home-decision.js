'use strict';

/**
 * R4.6 — Canonical Hem retention decision (post first_success).
 * One primary action; SILENT when routine is established and active.
 */

const db = require('../db');
const familyMilestones = require('../../../db/family-milestones');
const { getChildrenForParent } = require('../../../db/parent-access');
const { getFamilyCommunicationState } = require('./derived-state');
const { isJourneyFlagEnabledForFamily } = require('./family-pilot');
const { resolveFamilyLocale } = require('../locale');
const { t } = require('../i18n');
const { getLocalDateStr } = require('../daily-log-generator');

const RETENTION_FLAG = 'journey_retention_home_v1';
const WELCOME_BACK_MIN_DAYS = 3;
const WELCOME_BACK_MAX_DAYS = 21;
const ESTABLISHED_QUIET_DAYS = 2;

/**
 * @typedef {object} RetentionHomeDecision
 * @property {string} action
 * @property {number} priority
 * @property {string} reason
 * @property {string} surface
 * @property {string} communication
 * @property {boolean} show_primary_coach
 * @property {string|null} [child_id]
 * @property {string|null} [child_name]
 */

async function isRetentionHomeEnabled(familyId) {
  return isJourneyFlagEnabledForFamily(RETENTION_FLAG, familyId);
}

async function childHasCompletionToday(childId, dateStr) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date = $2::date AND dli.completed = true`,
    [childId, dateStr]
  );
  return (result.rows[0]?.n || 0) > 0;
}

async function childHasOpenItemsToday(childId, dateStr) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date = $2::date AND dli.completed = false`,
    [childId, dateStr]
  );
  return (result.rows[0]?.n || 0) > 0;
}

function childEverLoggedIn(milestones, childId) {
  const set = milestones._children_logged_in || [];
  return set.includes(childId);
}

async function childHasFirstCompletion(familyId, childId) {
  const result = await db.query(
    `SELECT 1 FROM family_milestones
     WHERE family_id = $1 AND milestone = 'child_first_completion'
       AND (child_id = $2::uuid OR scope_key = $3)
     LIMIT 1`,
    [familyId, childId, `child:${childId}`]
  );
  return result.rows.length > 0;
}

/**
 * @param {string} familyId
 * @param {string} parentId
 * @returns {Promise<RetentionHomeDecision|null>}
 */
async function buildRetentionHomeDecision(familyId, parentId) {
  if (!familyId || !parentId) return null;
  const enabled = await isRetentionHomeEnabled(familyId);
  if (!enabled) return null;

  const milestones = await familyMilestones.getMilestoneMap(familyId);
  if (!milestones.first_success) return null;

  const children = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
  if (children.length === 0) {
    return {
      action: 'SILENT',
      priority: 0,
      reason: 'no_accessible_children',
      surface: 'home',
      communication: 'none',
      show_primary_coach: false,
    };
  }

  const comm = await getFamilyCommunicationState(familyId);
  const tz = children[0].timezone || 'Europe/Stockholm';
  const todayStr = getLocalDateStr(undefined, tz);

  const routineReady = Boolean(milestones.routine_ready);
  const needingHandoff = children.filter((c) => !childEverLoggedIn(milestones, c.id));

  if (routineReady && needingHandoff.length > 0) {
    const target = needingHandoff.length === 1
      ? needingHandoff[0]
      : pickChildNeedingHandoff(needingHandoff, milestones);
    return {
      action: 'SHOW_CHILD',
      priority: 100,
      reason: needingHandoff.length > 1 ? 'MULTI_CHILD_HANDOFF' : 'ROUTINE_READY_NO_CHILD_ACCESS',
      surface: 'home',
      communication: 'none',
      show_primary_coach: true,
      child_id: target?.id || needingHandoff[0].id,
      child_name: target?.name || needingHandoff[0].name,
    };
  }

  for (const child of children) {
    const loggedIn = childEverLoggedIn(milestones, child.id);
    if (loggedIn && !(await childHasFirstCompletion(familyId, child.id))) {
      return {
        action: 'COMPLETE_FIRST_ROUTINE',
        priority: 90,
        reason: 'CHILD_ACCESS_NO_COMPLETION',
        surface: 'home',
        communication: 'none',
        show_primary_coach: true,
        child_id: child.id,
        child_name: child.name,
      };
    }
  }

  const daysSince = comm?.daysSinceCompletion;
  if (
    typeof daysSince === 'number'
    && daysSince >= WELCOME_BACK_MIN_DAYS
    && daysSince <= WELCOME_BACK_MAX_DAYS
    && !milestones.established_routine
  ) {
    const target = children.length === 1 ? children[0] : null;
    return {
      action: 'WELCOME_BACK',
      priority: 70,
      reason: 'RETURN_AFTER_GAP',
      surface: 'home',
      communication: 'none',
      show_primary_coach: true,
      child_id: target?.id || null,
      child_name: target?.name || null,
    };
  }

  for (const child of children) {
    const open = await childHasOpenItemsToday(child.id, todayStr);
    const doneToday = await childHasCompletionToday(child.id, todayStr);
    if (open && !doneToday) {
      return {
        action: 'CONTINUE_TODAY',
        priority: 80,
        reason: 'ROUTINE_IN_PROGRESS',
        surface: 'home',
        communication: 'none',
        show_primary_coach: true,
        child_id: child.id,
        child_name: child.name,
      };
    }
  }

  if (
    milestones.established_routine
    && typeof daysSince === 'number'
    && daysSince <= ESTABLISHED_QUIET_DAYS
  ) {
    return {
      action: 'SILENT',
      priority: 10,
      reason: 'ESTABLISHED_ROUTINE_ACTIVE',
      surface: 'home',
      communication: 'none',
      show_primary_coach: false,
    };
  }

  if (milestones.established_routine) {
    return {
      action: 'SILENT',
      priority: 10,
      reason: 'ESTABLISHED_ROUTINE',
      surface: 'home',
      communication: 'none',
      show_primary_coach: false,
    };
  }

  const parentCount = await db.query(
    'SELECT COUNT(*)::int AS n FROM parent WHERE family_id = $1',
    [familyId]
  );
  const invitePending = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_invite
     WHERE family_id = $1 AND accepted = false AND expires_at > NOW()`,
    [familyId]
  );
  if (
    parentCount.rows[0].n === 1
    && !milestones.coparent_joined
    && invitePending.rows[0].n === 0
    && milestones.first_success
  ) {
    return {
      action: 'INVITE_ADULT',
      priority: 40,
      reason: 'OPTIONAL_CO_PARENT',
      surface: 'home',
      communication: 'none',
      show_primary_coach: true,
      child_id: null,
      child_name: null,
    };
  }

  return {
    action: 'SILENT',
    priority: 0,
    reason: 'NO_PRIMARY_STEP',
    surface: 'home',
    communication: 'none',
    show_primary_coach: false,
  };
}

function pickChildNeedingHandoff(children, milestones) {
  for (const c of children) {
    if (!childEverLoggedIn(milestones, c.id)) return c;
  }
  return children[0];
}

const ACTION_TO_NEXT = {
  SHOW_CHILD: 'child_access',
  COMPLETE_FIRST_ROUTINE: 'await_first_completion',
  CONTINUE_TODAY: 'continue_today',
  WELCOME_BACK: 'welcome_back',
  INVITE_ADULT: 'invite_adult',
  SILENT: 'none',
};

/**
 * Map retention decision to canonical next-action payload fields.
 */
async function retentionToCanonicalFields(decision, familyId) {
  const localeRow = await db.query(
    'SELECT preferred_locale, timezone FROM family WHERE id = $1',
    [familyId]
  );
  const lang = resolveFamilyLocale(localeRow.rows[0]?.preferred_locale);
  const nextAction = ACTION_TO_NEXT[decision.action] || 'none';
  const nameParams = decision.child_name ? { name: decision.child_name } : {};

  if (!decision.show_primary_coach || nextAction === 'none') {
    return {
      show_primary_coach: false,
      next_action: 'none',
      primary_action: {
        action: decision.action,
        priority: decision.priority,
        reason: decision.reason,
        surface: decision.surface,
        communication: decision.communication,
        child_id: decision.child_id,
      },
      reason: [decision.reason],
      cta_label: null,
      cta_target: null,
      headline: null,
      body: null,
    };
  }

  let i18nKey = nextAction;
  if (nextAction === 'child_access' && decision.child_name) {
    i18nKey = 'child_access_named';
  }

  const headline = t(lang, `home.firstSuccess.actions.${i18nKey}.headline`, nameParams);
  const body = t(lang, `home.firstSuccess.actions.${i18nKey}.body`, nameParams);
  const ctaLabel = t(lang, `home.firstSuccess.actions.${i18nKey}.cta`, nameParams);

  let ctaTarget = null;
  if (nextAction === 'continue_today' && decision.child_id) {
    const tz = localeRow.rows[0]?.timezone || 'Europe/Stockholm';
    ctaTarget = `/daily-log?childId=${decision.child_id}&date=${getLocalDateStr(undefined, tz)}`;
  }
  if (nextAction === 'invite_adult') {
    ctaTarget = null;
  }

  return {
    show_primary_coach: true,
    next_action: nextAction,
    primary_action: {
      action: decision.action,
      priority: decision.priority,
      reason: decision.reason,
      surface: decision.surface,
      communication: decision.communication,
      child_id: decision.child_id,
    },
    reason: [decision.reason],
    cta_label: ctaLabel,
    cta_target: ctaTarget,
    headline,
    body,
  };
}

module.exports = {
  RETENTION_FLAG,
  buildRetentionHomeDecision,
  retentionToCanonicalFields,
  isRetentionHomeEnabled,
};
