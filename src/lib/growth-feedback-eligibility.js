'use strict';

/**
 * Decide which short growth-feedback prompt (if any) a family may see.
 * Journey Gate + activation milestones — never before first real value
 * for the positive prompt; stuck prompts are context-specific.
 */

const db = require('./db');
const { isActivationFlagEnabled } = require('./activation-flags');
const { getFamilyCommunicationState } = require('./journey/derived-state');
const feedbackDb = require('../../db/growth-feedback');

const FLAG_KEY = 'growth_feedback_v1';

const FIRST_VALUE_ANSWERS = Object.freeze([
  { value: 'yes', labelSv: 'Ja', labelEn: 'Yes' },
  { value: 'a_bit', labelSv: 'Lite', labelEn: 'A bit' },
  { value: 'not_yet', labelSv: 'Nej ännu', labelEn: 'Not yet' },
]);

const STUCK_ANSWERS = Object.freeze([
  { value: 'child_login', labelSv: 'Barninloggningen', labelEn: 'Child login' },
  { value: 'schedule', labelSv: 'Schemat', labelEn: 'The schedule' },
  { value: 'technical', labelSv: 'Tekniskt fel', labelEn: 'Technical issue' },
  { value: 'too_many_steps', labelSv: 'För många steg', labelEn: 'Too many steps' },
  { value: 'child_refused', labelSv: 'Barnet ville inte använda appen', labelEn: 'Child did not want to use the app' },
  { value: 'other', labelSv: 'Annat', labelEn: 'Other' },
]);

/**
 * Critical blockers that suppress celebratory / referral-adjacent feedback.
 */
async function getCriticalBlockers(familyId) {
  const result = await db.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM family_activation_state s
         WHERE s.family_id = $1 AND s.child_created_at IS NULL
       ) AS no_child,
       EXISTS (
         SELECT 1 FROM family_activation_state s
         WHERE s.family_id = $1
           AND s.schema_saved_at IS NOT NULL
           AND s.child_access_completed_at IS NULL
       ) AS schema_no_child_login,
       EXISTS (
         SELECT 1 FROM family_activation_state s
         WHERE s.family_id = $1
           AND s.child_access_completed_at IS NOT NULL
           AND s.first_completion_at IS NULL
           AND s.child_access_completed_at < NOW() - INTERVAL '24 hours'
       ) AS login_no_completion,
       NOT EXISTS (
         SELECT 1 FROM parent p
         WHERE p.family_id = $1
           AND COALESCE(p.onboarding_completed, false) = true
       ) AS onboarding_incomplete`,
    [familyId]
  );
  const row = result.rows[0] || {};
  const blockers = [];
  if (row.onboarding_incomplete) blockers.push('onboarding_incomplete');
  if (row.no_child) blockers.push('no_child');
  if (row.schema_no_child_login) blockers.push('schema_no_child_login');
  if (row.login_no_completion) blockers.push('login_no_completion');
  return blockers;
}

async function loadActivationSnapshot(familyId) {
  const result = await db.query(
    `SELECT
       s.child_created_at,
       s.schema_saved_at,
       s.child_access_completed_at,
       s.first_completion_at,
       s.p0_activated_at,
       s.signup_at,
       (
         SELECT COUNT(DISTINCT dli.completed_date)::int
         FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c ON c.id = dl.child_id
         WHERE c.family_id = $1
           AND dli.completed = true
           AND dli.completed_date IS NOT NULL
       ) AS distinct_completion_days,
       EXISTS (
         SELECT 1 FROM family_milestones fm
         WHERE fm.family_id = $1 AND fm.milestone = 'first_success'
       ) AS has_first_success_milestone
     FROM family_activation_state s
     WHERE s.family_id = $1`,
    [familyId]
  );
  return result.rows[0] || null;
}

function buildPrompt(promptKey, locale) {
  const en = locale === 'en-GB' || locale === 'en';
  if (promptKey === 'first_value' || promptKey === 'three_routine_days') {
    return {
      promptKey,
      question: en
        ? 'Did this routine get a little easier?'
        : 'Blev den här rutinen lite enklare?',
      answers: FIRST_VALUE_ANSWERS.map((a) => ({
        value: a.value,
        label: en ? a.labelEn : a.labelSv,
      })),
      allowComment: true,
    };
  }
  if (promptKey === 'stuck_blocker' || promptKey === 'onboarding_no_child_access') {
    return {
      promptKey,
      question: en
        ? 'What stopped you from continuing?'
        : 'Vad gjorde att ni inte kom vidare?',
      answers: STUCK_ANSWERS.map((a) => ({
        value: a.value,
        label: en ? a.labelEn : a.labelSv,
      })),
      allowComment: true,
    };
  }
  if (promptKey === 'account_delete') {
    return {
      promptKey,
      question: en
        ? 'What made you leave?'
        : 'Vad fick er att lämna?',
      answers: STUCK_ANSWERS.map((a) => ({
        value: a.value,
        label: en ? a.labelEn : a.labelSv,
      })),
      allowComment: true,
    };
  }
  return null;
}

/**
 * @param {string} familyId
 * @param {{ locale?: string, intent?: string }} [opts]
 *   intent: optional force for account_delete surface
 * @returns {Promise<{ eligible: boolean, reason: string, prompt?: object, blockers?: string[] }>}
 */
async function evaluateGrowthFeedbackEligibility(familyId, opts = {}) {
  const enabled = await isActivationFlagEnabled(FLAG_KEY, familyId);
  if (!enabled) {
    return { eligible: false, reason: 'flag_off' };
  }

  const locale = opts.locale || 'sv-SE';
  const answered = new Set(await feedbackDb.listAnsweredPromptKeys(familyId));
  const blockers = await getCriticalBlockers(familyId);
  const snap = await loadActivationSnapshot(familyId);
  const comm = await getFamilyCommunicationState(familyId);
  const state = comm?.state || 'UNKNOWN';

  // Account deletion surface — only when explicitly requested by client flow
  if (opts.intent === 'account_delete') {
    if (answered.has('account_delete')) {
      return { eligible: false, reason: 'already_answered', blockers };
    }
    return {
      eligible: true,
      reason: 'account_delete',
      prompt: buildPrompt('account_delete', locale),
      blockers,
    };
  }

  // Positive prompts require First Success / first completion — never during active blocker
  const hasValue =
    Boolean(snap?.first_completion_at) ||
    Boolean(snap?.p0_activated_at) ||
    Boolean(snap?.has_first_success_milestone);

  if (hasValue && blockers.length === 0) {
    if (
      Number(snap.distinct_completion_days || 0) >= 3 &&
      !answered.has('three_routine_days')
    ) {
      return {
        eligible: true,
        reason: 'three_routine_days',
        prompt: buildPrompt('three_routine_days', locale),
        blockers,
      };
    }
    if (!answered.has('first_value')) {
      return {
        eligible: true,
        reason: 'first_value',
        prompt: buildPrompt('first_value', locale),
        blockers,
      };
    }
    return { eligible: false, reason: 'already_answered_value', blockers };
  }

  // Stuck: onboarding done-ish / age window, no child access
  if (
    blockers.includes('schema_no_child_login') &&
    !answered.has('onboarding_no_child_access')
  ) {
    // Only after family had a chance (48h+) and still stuck
    if (snap?.schema_saved_at) {
      const ageMs = Date.now() - new Date(snap.schema_saved_at).getTime();
      if (ageMs >= 48 * 60 * 60 * 1000) {
        return {
          eligible: true,
          reason: 'onboarding_no_child_access',
          prompt: buildPrompt('onboarding_no_child_access', locale),
          blockers,
        };
      }
    }
  }

  if (
    (blockers.includes('login_no_completion') || blockers.includes('onboarding_incomplete')) &&
    !answered.has('stuck_blocker') &&
    (state === 'SETTING_UP' || state === 'FIRST_USE' || state === 'AT_RISK')
  ) {
    const signupAt = snap?.signup_at;
    if (signupAt) {
      const ageMs = Date.now() - new Date(signupAt).getTime();
      if (ageMs >= 48 * 60 * 60 * 1000 && ageMs <= 14 * 24 * 60 * 60 * 1000) {
        return {
          eligible: true,
          reason: 'stuck_blocker',
          prompt: buildPrompt('stuck_blocker', locale),
          blockers,
        };
      }
    }
  }

  if (!hasValue) {
    return { eligible: false, reason: 'no_value_yet', blockers };
  }
  return { eligible: false, reason: 'no_matching_prompt', blockers };
}

module.exports = {
  FLAG_KEY,
  FIRST_VALUE_ANSWERS,
  STUCK_ANSWERS,
  getCriticalBlockers,
  evaluateGrowthFeedbackEligibility,
};
