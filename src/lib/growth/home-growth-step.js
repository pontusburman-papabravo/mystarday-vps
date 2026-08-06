'use strict';

/**
 * R4.7 — Single growth step on Hem (invite, weekly highlight, referral).
 * Called only after core retention steps; at most one growth CTA.
 */

const db = require('../db');
const familyMilestones = require('../../../db/family-milestones');
const { getChildrenForParent } = require('../../../db/parent-access');
const { isJourneyFlagEnabledForFamily } = require('../journey/family-pilot');
const { isFlagEnabled } = require('../journey/flags');
const { evaluateReferralEligibility } = require('../referral-eligibility');
const { buildWeeklyHighlight } = require('./weekly-highlight');

const GROWTH_FLAG = 'growth_home_v1';
const INVITE_SNOOZE_DAYS = 14;
const SHARE_SNOOZE_DAYS = 7;
const MAX_ADULTS_BEFORE_INVITE = 1;

async function isGrowthHomeEnabled(familyId) {
  if (await isFlagEnabled(GROWTH_FLAG)) return true;
  return isJourneyFlagEnabledForFamily(GROWTH_FLAG, familyId);
}

function scopeParent(parentId) {
  return `parent:${parentId}`;
}

async function snoozeActive(familyId, milestone, parentId) {
  const result = await db.query(
    `SELECT metadata FROM family_milestones
     WHERE family_id = $1 AND milestone = $2 AND scope_key = $3
     LIMIT 1`,
    [familyId, milestone, scopeParent(parentId)]
  );
  const until = result.rows[0]?.metadata?.until;
  if (!until) return false;
  return new Date(until) > new Date();
}

async function setSnooze(familyId, milestone, parentId, days) {
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  const metadata = { until: until.toISOString() };
  const sk = scopeParent(parentId);
  const updated = await db.query(
    `UPDATE family_milestones
     SET metadata = $4::jsonb
     WHERE family_id = $1 AND milestone = $2 AND scope_key = $3`,
    [familyId, milestone, sk, JSON.stringify(metadata)]
  );
  if (updated.rowCount === 0) {
    await familyMilestones.insertMilestone({
      familyId,
      milestone,
      scopeKey: sk,
      metadata,
      source: 'parent',
    });
  }
}

/**
 * @param {string} familyId
 * @param {string} parentId
 * @param {{ milestones: object, children: object[] }} ctx
 */
async function pickGrowthHomeStep(familyId, parentId, ctx = {}) {
  if (!familyId || !parentId) return null;
  if (!(await isGrowthHomeEnabled(familyId))) return null;

  const milestones = ctx.milestones || await familyMilestones.getMilestoneMap(familyId);
  if (!milestones.first_success) return null;

  const children = ctx.children || await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
  if (children.length === 0) return null;

  const candidates = [];

  const invite = await evaluateAdultInvite(familyId, parentId, milestones);
  if (invite) candidates.push(invite);

  const share = await evaluateShareWeek(familyId, parentId, milestones, children);
  if (share) candidates.push(share);

  const refer = await evaluateReferFamily(familyId);
  if (refer) candidates.push(refer);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

async function evaluateAdultInvite(familyId, parentId, milestones) {
  if (await snoozeActive(familyId, 'growth_invite_snoozed', parentId)) return null;

  const parentCount = await db.query(
    'SELECT COUNT(*)::int AS n FROM parent WHERE family_id = $1',
    [familyId]
  );
  if (parentCount.rows[0].n > MAX_ADULTS_BEFORE_INVITE) return null;
  if (milestones.coparent_joined) return null;

  const invitePending = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_invite
     WHERE family_id = $1 AND accepted = false AND expires_at > NOW()`,
    [familyId]
  );
  if (invitePending.rows[0].n > 0) return null;

  return {
    action: 'INVITE_ADULT',
    priority: 40,
    reason: 'OPTIONAL_CO_PARENT',
    surface: 'home',
    communication: 'none',
    show_primary_coach: true,
    child_id: null,
    child_name: null,
    growth: true,
  };
}

async function evaluateShareWeek(familyId, parentId, milestones, children) {
  if (await snoozeActive(familyId, 'growth_share_week_snoozed', parentId)) return null;

  const highlight = await buildWeeklyHighlight(familyId, parentId, children);
  if (!highlight || !highlight.share_text) return null;

  if (!milestones.established_routine && highlight.completion_count < 3) return null;

  return {
    action: 'SHARE_WEEK',
    priority: 35,
    reason: 'WEEKLY_HIGHLIGHT_READY',
    surface: 'home',
    communication: 'none',
    show_primary_coach: true,
    child_id: null,
    child_name: null,
    growth: true,
    weekly_highlight: highlight,
  };
}

async function evaluateReferFamily(familyId) {
  const gate = await evaluateReferralEligibility(familyId);
  if (!gate.eligible) return null;

  return {
    action: 'REFER_FAMILY',
    priority: 30,
    reason: 'REFERRAL_ELIGIBLE',
    surface: 'home',
    communication: 'none',
    show_primary_coach: true,
    child_id: null,
    child_name: null,
    growth: true,
  };
}

module.exports = {
  GROWTH_FLAG,
  isGrowthHomeEnabled,
  pickGrowthHomeStep,
  setSnooze,
  INVITE_SNOOZE_DAYS,
  SHARE_SNOOZE_DAYS,
  evaluateAdultInvite,
};
