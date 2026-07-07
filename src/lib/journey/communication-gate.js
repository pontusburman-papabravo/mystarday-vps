'use strict';

/**
 * Journey Gate — sole decision point for retention communications (ADR §2.1).
 * Journey (derived-state) owns lifecycle status; Gate owns allow/deny.
 */

const db = require('../db');
const { getFamilyCommunicationState } = require('./derived-state');

/** @typedef {'email'|'push'} CommunicationChannel */
/** @typedef {'legacy_win_back'|'legacy_activation_email'|'legacy_activation_nudge'|'legacy_child_handoff_reminder'|'legacy_retention_push'|'retention_email'|'retention_push'} CommunicationIntent */

const EMAIL_ALLOWED_STATES = new Set([
  'SETTING_UP',
  'FIRST_USE',
  'AT_RISK',
]);

const PUSH_ALLOWED_STATES = new Set([
  'SETTING_UP',
  'FIRST_USE',
  'BUILDING_ROUTINE',
  'ESTABLISHED_ROUTINE',
  'EXPANDING',
  'INDEPENDENCE',
  'AT_RISK',
]);

const LEGACY_WIN_BACK_INTENTS = new Set(['legacy_win_back', 'win_back']);
const LEGACY_ACTIVATION_EMAIL_INTENTS = new Set(['legacy_activation_email', 'activation_program_email']);
const LEGACY_NUDGE_INTENTS = new Set(['legacy_activation_nudge', 'activation_nudge']);
const LEGACY_HANDOFF_REMINDER_INTENTS = new Set(['legacy_child_handoff_reminder', 'child_handoff_reminder']);
const RETENTION_PUSH_INTENTS = new Set(['legacy_retention_push', 'retention_push']);

function normalizeIntent(intent) {
  return String(intent || '').trim().toLowerCase();
}

function isLegacyWinBackDisabled() {
  return process.env.WIN_BACK_ENABLED !== 'true';
}

function isLegacyActivationEmailDisabled() {
  return process.env.ACTIVATION_PROGRAM_EMAIL_ENABLED !== 'true';
}

async function hasRetentionEmailCooldown(familyId, client = db) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM win_back_email_log w
       WHERE w.family_id = $1
         AND w.status = 'sent'
         AND w.sent_at > NOW() - INTERVAL '30 days'
     ) OR EXISTS (
       SELECT 1 FROM activation_program_email_invite i
       WHERE i.family_id = $1
         AND i.sent_at > NOW() - INTERVAL '30 days'
     ) OR EXISTS (
       SELECT 1 FROM family_activation_state s
       WHERE s.family_id = $1
         AND s.activation_nudge_sent_at > NOW() - INTERVAL '30 days'
     ) AS blocked`,
    [familyId]
  );
  return result.rows[0]?.blocked === true;
}

/**
 * @param {string} familyId
 * @param {{ channel?: CommunicationChannel, intent?: CommunicationIntent }} opts
 * @returns {Promise<{ allowed: boolean, reason: string, state: string, phase: string }>}
 */
async function evaluateCommunicationGate(familyId, opts = {}) {
  const channel = opts.channel === 'push' ? 'push' : 'email';
  const intent = normalizeIntent(opts.intent);

  const comm = await getFamilyCommunicationState(familyId);
  if (!comm) {
    return { allowed: false, reason: 'family_not_found', state: 'UNKNOWN', phase: 'UNKNOWN' };
  }

  const { state, phase } = comm;

  if (LEGACY_WIN_BACK_INTENTS.has(intent)) {
    if (isLegacyWinBackDisabled()) {
      return { allowed: false, reason: 'legacy_win_back_disabled', state, phase };
    }
    if (state === 'CHURNED') {
      return { allowed: false, reason: 'churned_no_win_back', state, phase };
    }
    if (state !== 'AT_RISK') {
      return { allowed: false, reason: 'win_back_only_at_risk', state, phase };
    }
  }

  if (LEGACY_ACTIVATION_EMAIL_INTENTS.has(intent)) {
    if (isLegacyActivationEmailDisabled()) {
      return { allowed: false, reason: 'legacy_activation_email_disabled', state, phase };
    }
    if (!EMAIL_ALLOWED_STATES.has(state)) {
      return { allowed: false, reason: 'email_not_allowed_for_state', state, phase };
    }
  }

  if (LEGACY_NUDGE_INTENTS.has(intent)) {
    if (state === 'CHURNED') {
      return { allowed: false, reason: 'churned_no_nudge', state, phase };
    }
    if (!EMAIL_ALLOWED_STATES.has(state) || !['SETTING_UP', 'FIRST_USE'].includes(state)) {
      return { allowed: false, reason: 'nudge_only_early_states', state, phase };
    }
  }

  if (LEGACY_HANDOFF_REMINDER_INTENTS.has(intent)) {
    if (state === 'CHURNED') {
      return { allowed: false, reason: 'churned_no_handoff_reminder', state, phase };
    }
    if (!EMAIL_ALLOWED_STATES.has(state) || !['SETTING_UP', 'FIRST_USE'].includes(state)) {
      return { allowed: false, reason: 'handoff_reminder_only_early_states', state, phase };
    }
  }

  if (RETENTION_PUSH_INTENTS.has(intent)) {
    if (state === 'CHURNED') {
      return { allowed: false, reason: 'churned_no_push', state, phase };
    }
    if (intent === 'retention_push') {
      const milestoneDay = Number(opts.milestoneDay);
      if (![3, 7, 14].includes(milestoneDay)) {
        return { allowed: false, reason: 'invalid_milestone_day', state, phase };
      }
      if (!comm.everCompleted) {
        return { allowed: false, reason: 'never_completed', state, phase };
      }
      if (comm.daysSinceCompletion !== milestoneDay) {
        return {
          allowed: false,
          reason: 'milestone_day_mismatch',
          state,
          phase,
        };
      }
    }
    if (intent === 'legacy_retention_push') {
      if (!PUSH_ALLOWED_STATES.has(state)) {
        return { allowed: false, reason: 'push_not_allowed_for_state', state, phase };
      }
      if (state !== 'AT_RISK' && !['SETTING_UP', 'FIRST_USE', 'BUILDING_ROUTINE', 'ESTABLISHED_ROUTINE'].includes(state)) {
        return { allowed: false, reason: 'retention_push_state_mismatch', state, phase };
      }
    }
  }

  if (channel === 'email') {
    if (state === 'CHURNED') {
      return { allowed: false, reason: 'churned_no_email', state, phase };
    }
    if (!EMAIL_ALLOWED_STATES.has(state) && !LEGACY_WIN_BACK_INTENTS.has(intent)) {
      return { allowed: false, reason: 'email_not_allowed_for_state', state, phase };
    }
    if (await hasRetentionEmailCooldown(familyId)) {
      return { allowed: false, reason: 'email_cooldown_30d', state, phase };
    }
  }

  if (channel === 'push' && !PUSH_ALLOWED_STATES.has(state)) {
    return { allowed: false, reason: 'push_not_allowed_for_state', state, phase };
  }

  return { allowed: true, reason: 'allowed', state, phase };
}

module.exports = {
  evaluateCommunicationGate,
  hasRetentionEmailCooldown,
  isLegacyWinBackDisabled,
  isLegacyActivationEmailDisabled,
};
