'use strict';

const db = require('./db');
const surveyDb = require('../../db/surveys');
const feedbackDb = require('../../db/for-dig-goal-feedback');
const analytics = require('../../db/analytics');
const {
  isForDigFollowupSurvey,
  resolveCampaignRecipientEmail,
  parseOutcomeFromSurvey,
} = require('./for-dig-survey-outcome-sync');

async function lookupParentByEmail(email) {
  if (!email) return null;
  const result = await db.query(
    `SELECT id, family_id, email
     FROM parent
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

/**
 * After a /tyck/utfall-* submit: write outcome rows for all pending child×mål.
 */
async function syncSurveyResponseToForDigOutcomes({ responseId, campaignRef }) {
  const response = await surveyDb.getResponse(responseId);
  if (!response || response.status !== 'submitted') {
    return { synced: 0, skipped: 'not_submitted' };
  }

  const survey = await surveyDb.getSurveyFull(response.survey_id);
  if (!isForDigFollowupSurvey(survey)) {
    return { synced: 0, skipped: 'not_followup' };
  }

  const ref = campaignRef || response.campaign_ref || null;
  const parentEmail = resolveCampaignRecipientEmail({
    surveySlug: survey.slug,
    campaignKey: ref,
  });
  if (!parentEmail) {
    return { synced: 0, skipped: 'no_campaign_email' };
  }

  const parent = await lookupParentByEmail(parentEmail);
  if (!parent) {
    return { synced: 0, skipped: 'parent_not_found', parentEmail };
  }

  const answers = await surveyDb.getAnswersForResponse(responseId);
  const parsed = parseOutcomeFromSurvey(survey, answers);
  if (parsed.skipped) {
    return { synced: 0, skipped: parsed.skipped };
  }

  const pending = await feedbackDb.listPendingOutcomesForFamily(parent.family_id);
  if (pending.length === 0) {
    return { synced: 0, skipped: 'no_pending', familyId: parent.family_id };
  }

  let synced = 0;
  for (const row of pending) {
    await feedbackDb.upsertOutcomeFeedback({
      familyId: parent.family_id,
      parentId: parent.id,
      childId: row.child_id,
      goalSlug: row.goal_slug,
      outcomeScore: parsed.outcomeScore,
      freeText: parsed.freeText,
    });
    synced += 1;
  }

  analytics.track(parent.family_id, 'for_dig_feedback_outcome', {
    source: 'survey',
    survey_slug: survey.slug,
    campaign_ref: ref,
    outcome_score: parsed.outcomeScore,
    synced_count: synced,
  }).catch(() => {});

  return {
    synced,
    outcomeScore: parsed.outcomeScore,
    familyId: parent.family_id,
    surveySlug: survey.slug,
  };
}

module.exports = {
  lookupParentByEmail,
  syncSurveyResponseToForDigOutcomes,
};
