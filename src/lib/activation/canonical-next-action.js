'use strict';

/**
 * Canonical Hem next-action — Journey is source of truth; Product Engine is legacy adapter only.
 * @see docs/adr/ADR-020-CANONICAL-FIRST-SUCCESS-COACH.md
 */

const familyMilestones = require('../../../db/family-milestones');
const activationDb = require('../../../db/family-activation-state');
const { isActivationFlagEnabled, FLAG_KEYS } = require('../activation-flags');
const { getActivationFunnelStep } = require('../activation-p0-core');
const { buildContextForFamily } = require('../journey/context-builder');
const { loadRegistry } = require('../journey/registry');
const { FLAG_KEYS: JOURNEY_FLAGS, isFlagEnabled } = require('../journey/flags');
const { resolveFamilyLocale } = require('../locale');
const { t } = require('../i18n');
const db = require('../db');

const I18N_PREFIX = 'home.firstSuccess.actions.';

/**
 * @typedef {object} CanonicalNextAction
 * @property {boolean} enabled
 * @property {boolean} [show_primary_coach]
 * @property {string|null} next_action
 * @property {string[]} reason
 * @property {string|null} journey_phase
 * @property {string|null} blocking_issue
 * @property {string|null} cta_label
 * @property {string|null} cta_target
 * @property {string|null} headline
 * @property {string|null} body
 * @property {string} [authority]
 * @property {string} [funnel_step]
 * @property {object} [journey_context]
 * @property {object} [engine_adapter]
 */

/**
 * @param {string} familyId
 * @param {object} [options]
 * @param {boolean} [options.includeEngineAdapter]
 * @param {string} [options.parentId]
 * @returns {Promise<CanonicalNextAction>}
 */
async function buildCanonicalNextAction(familyId, options = {}) {
  const enabled = await isActivationFlagEnabled(FLAG_KEYS.firstSuccessV1, familyId);
  if (!enabled) {
    return { enabled: false, show_primary_coach: false, next_action: null, reason: ['flag_off'], journey_phase: null, blocking_issue: null, cta_label: null, cta_target: null, headline: null, body: null };
  }

  const [state, milestones, phase, localeRow] = await Promise.all([
    activationDb.getByFamilyId(familyId),
    familyMilestones.getMilestoneMap(familyId),
    familyMilestones.getJourneyPhase(familyId),
    db.query('SELECT preferred_locale FROM family WHERE id = $1 LIMIT 1', [familyId]),
  ]);
  const lang = resolveFamilyLocale(localeRow.rows[0]?.preferred_locale);
  const funnelStep = getActivationFunnelStep(state);

  if (milestones.first_success || state?.p0_activated_at) {
    const parentId = options.parentId;
    if (parentId) {
      const {
        buildRetentionHomeDecision,
        retentionToCanonicalFields,
        isRetentionHomeEnabled,
      } = require('../journey/retention-home-decision');
      if (await isRetentionHomeEnabled(familyId)) {
        const decision = await buildRetentionHomeDecision(familyId, parentId);
        if (decision) {
          const fields = await retentionToCanonicalFields(decision, familyId);
          return {
            enabled: true,
            authority: 'journey_retention',
            funnel_step: funnelStep,
            journey_phase: phase,
            blocking_issue: null,
            ...fields,
          };
        }
      }
    }
    return {
      enabled: true,
      show_primary_coach: false,
      next_action: 'none',
      reason: ['already_first_success'],
      journey_phase: phase,
      blocking_issue: null,
      cta_label: null,
      cta_target: null,
      headline: null,
      body: null,
      authority: 'journey',
      funnel_step: funnelStep,
    };
  }

  const milestoneAction = pickMilestoneAction(state, milestones, lang);
  if (milestoneAction) {
    return {
      enabled: true,
      show_primary_coach: true,
      authority: 'journey',
      funnel_step: funnelStep,
      journey_phase: phase,
      blocking_issue: null,
      ...milestoneAction,
    };
  }

  const journeyContext = await buildContextForFamily(familyId);
  const journeyPick = await pickFromJourneyContext(journeyContext, lang, familyId);
  if (journeyPick) {
    return {
      enabled: true,
      show_primary_coach: true,
      authority: 'journey',
      funnel_step: funnelStep,
      journey_phase: journeyContext.phase || phase,
      blocking_issue: journeyContext.blocking_experience || null,
      journey_context: summarizeContext(journeyContext),
      ...journeyPick,
    };
  }

  if (options.includeEngineAdapter) {
    const adapter = await tryEngineAdapter(familyId);
    if (adapter) {
      return {
        enabled: true,
        show_primary_coach: true,
        authority: 'engine_adapter',
        funnel_step: funnelStep,
        journey_phase: phase,
        blocking_issue: null,
        engine_adapter: adapter.meta,
        ...adapter.action,
      };
    }
  }

  return {
    enabled: true,
    show_primary_coach: false,
    next_action: 'none',
    reason: ['no_coach'],
    journey_phase: phase,
    blocking_issue: null,
    cta_label: null,
    cta_target: null,
    headline: null,
    body: null,
    authority: 'journey',
    funnel_step: funnelStep,
  };
}

/**
 * @param {object|null} state
 * @param {Record<string, unknown>} milestones
 * @param {string} lang
 */
function pickMilestoneAction(state, milestones, lang) {
  if (!state?.child_created_at && !milestones.child_created) {
    return actionFromKey('create_child', lang, '/onboarding', ['incomplete_child']);
  }
  if (!state?.schema_saved_at && !milestones.routine_ready) {
    return actionFromKey('save_schedule', lang, '/onboarding#stepStarterPlan', ['incomplete_schedule']);
  }
  if (!state?.child_access_completed_at && !milestones.child_logged_in) {
    return actionFromKey('child_access', lang, null, ['incomplete_child_access']);
  }
  if (milestones.child_first_completion && !milestones.parent_saw_completion && !milestones.first_success) {
    return actionFromKey('parent_ack', lang, null, ['waiting_parent_ack']);
  }
  if (!state?.first_completion_at && !milestones.child_first_completion) {
    return actionFromKey('await_first_completion', lang, null, ['await_child_completion']);
  }
  return null;
}

function actionFromKey(nextAction, lang, ctaTarget, reason) {
  const headline = t(lang, `${I18N_PREFIX}${nextAction}.headline`);
  const body = t(lang, `${I18N_PREFIX}${nextAction}.body`);
  const ctaLabel = t(lang, `${I18N_PREFIX}${nextAction}.cta`);
  return {
    next_action: nextAction,
    reason,
    cta_label: ctaLabel,
    cta_target: ctaTarget,
    headline,
    body,
  };
}

async function pickFromJourneyContext(context, lang, familyId) {
  if (!context) return null;

  const expKey =
    context.blocking_experience
    || context.celebration
    || context.recommended_experiences?.[0];
  if (!expKey) return null;

  const registry = await loadRegistry({
    useDb: await isFlagEnabled(JOURNEY_FLAGS.registryV2),
    locale: lang,
  });
  const exp = registry?.phases?.[context.phase]?.[expKey]
    || registry?.phases?.FIRST_USE?.[expKey]
    || registry?.phases?.BUILDING_ROUTINE?.[expKey]
    || {};

  const nextAction = mapExperienceToAction(expKey);
  const reason = Array.isArray(context.reason) ? context.reason.map(String) : [];

  let ctaTarget = null;
  if (expKey === 'handoff_to_child' || nextAction === 'child_access') {
    ctaTarget = null;
  } else if (exp.route) {
    ctaTarget = exp.route;
  }

  return {
    next_action: nextAction,
    reason: reason.length ? reason : [`journey_experience:${expKey}`],
    cta_label: exp.cta || t(lang, `${I18N_PREFIX}${nextAction}.cta`),
    cta_target: ctaTarget,
    headline: exp.headline || t(lang, `${I18N_PREFIX}${nextAction}.headline`),
    body: exp.body || t(lang, `${I18N_PREFIX}${nextAction}.body`),
  };
}

function mapExperienceToAction(expKey) {
  const map = {
    handoff_to_child: 'child_access',
    parent_ack_completion: 'parent_ack',
    celebrate_first_success: 'celebrate_first_success',
    coach_consistency: 'journey_coach',
    coach_evening: 'journey_coach',
    coach_expand: 'journey_coach',
  };
  return map[expKey] || 'journey_coach';
}

function summarizeContext(ctx) {
  return {
    phase: ctx.phase,
    priority: ctx.priority,
    blocking_experience: ctx.blocking_experience,
    celebration: ctx.celebration,
    recommended_experiences: ctx.recommended_experiences,
  };
}

async function tryEngineAdapter(familyId) {
  try {
    const { isEngineApiEnabled } = require('../first-success-engine-flag');
    if (!(await isEngineApiEnabled(familyId))) return null;
    const { collectFamilyFacts } = require('../../core-engine/1-facts/collector');
    const { ProductEngine } = require('../../core-engine');
    const { serializeEngineOutput } = require('../../core-engine/serialize');
    const facts = await collectFamilyFacts(familyId);
    const output = ProductEngine.evaluate(facts, {
      activePolicySet: 'v2_first_success_control',
      currentDeviceTime: new Date(),
    });
    const serialized = serializeEngineOutput(output);
    if (!serialized?.policy?.name) return null;
    const policy = serialized.policy.name;
    const route = serialized.policy.route || serialized.ui?.route || null;
    return {
      meta: { policy, need: serialized.trace?.evaluatedNeed },
      action: {
        next_action: 'engine_legacy',
        reason: ['engine_adapter_fallback'],
        cta_label: serialized.policy.cta || null,
        cta_target: route,
        headline: serialized.policy.headline || null,
        body: serialized.policy.body || null,
      },
    };
  } catch {
    return null;
  }
}

module.exports = {
  buildCanonicalNextAction,
  pickMilestoneAction,
  mapExperienceToAction,
};
