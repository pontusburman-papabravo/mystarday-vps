'use strict';

const { OUTCOME_OPTIONS, buildFollowupEmails } = require('./for-dig-followup-campaign');

const FOR_DIG_FOLLOWUP_TAG = 'För dig uppföljning';
const FOLLOWUP_SLUG_PREFIX = 'utfall-';

/** Map PU1 option label → for_dig outcome_score (§19.2 B). */
const OUTCOME_SCORE_BY_OPTION = Object.freeze({
  '😊 Mycket bättre': 4,
  '🙂 Lite bättre': 3,
  '😐 Ingen skillnad': 2,
});

function isForDigFollowupSurvey(survey) {
  if (!survey) return false;
  if (survey.target_tag === FOR_DIG_FOLLOWUP_TAG) return true;
  return typeof survey.slug === 'string' && survey.slug.startsWith(FOLLOWUP_SLUG_PREFIX);
}

function resolveCampaignRecipientEmail({ surveySlug, campaignKey }) {
  const rows = buildFollowupEmails();
  if (campaignKey) {
    const byKey = rows.find((r) => r.key === campaignKey);
    if (byKey) return byKey.to;
  }
  const live = rows.find((r) => r.send && r.surveySlug === surveySlug);
  return live ? live.to : null;
}

function buildSurveyUrl(baseUrl, surveySlug, campaignKey) {
  const root = `${String(baseUrl || '').replace(/\/$/, '')}/tyck/${surveySlug}`;
  return campaignKey ? `${root}?ref=${encodeURIComponent(campaignKey)}` : root;
}

/**
 * Parse outcome from submitted survey answers.
 * @returns {{ outcomeScore?: number, freeText?: string, skipped?: string }}
 */
function parseOutcomeFromSurvey(survey, answers) {
  if (!survey?.questions?.length || !Array.isArray(answers)) {
    return { skipped: 'no_answers' };
  }

  const questions = [...survey.questions].sort((a, b) => a.sort_order - b.sort_order);
  const radioQ = questions.find((q) => q.question_type === 'radio');
  if (!radioQ) return { skipped: 'no_radio_question' };

  const radioAnswer = answers.find((a) => a.question_id === radioQ.id);
  if (!radioAnswer?.selected_option_ids?.length) {
    return { skipped: 'no_outcome_answer' };
  }

  const optionId = radioAnswer.selected_option_ids[0];
  const option = (radioQ.options || []).find((o) => o.id === optionId);
  const label = option?.option_text;
  if (!label) return { skipped: 'unknown_option' };
  if (label === 'Har inte testat än') return { skipped: 'not_tested' };

  const outcomeScore = OUTCOME_SCORE_BY_OPTION[label];
  if (!outcomeScore) return { skipped: 'unmapped_option' };

  const textQ = questions.find((q) => q.question_type === 'text_long');
  let freeText = null;
  if (textQ) {
    const textAnswer = answers.find((a) => a.question_id === textQ.id);
    freeText = (textAnswer?.freetext_value || textAnswer?.answer_text || '').trim() || null;
  }

  return { outcomeScore, freeText };
}

module.exports = {
  FOR_DIG_FOLLOWUP_TAG,
  FOLLOWUP_SLUG_PREFIX,
  OUTCOME_SCORE_BY_OPTION,
  isForDigFollowupSurvey,
  resolveCampaignRecipientEmail,
  buildSurveyUrl,
  parseOutcomeFromSurvey,
};
