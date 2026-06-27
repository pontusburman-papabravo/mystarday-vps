'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isForDigFollowupSurvey,
  resolveCampaignRecipientEmail,
  buildSurveyUrl,
  parseOutcomeFromSurvey,
  OUTCOME_SCORE_BY_OPTION,
} = require('../src/lib/for-dig-survey-outcome-sync');

describe('for-dig-survey-outcome-sync', () => {
  it('detects follow-up surveys by tag or slug', () => {
    assert.equal(isForDigFollowupSurvey({ slug: 'utfall-kim-loke', target_tag: 'För dig uppföljning' }), true);
    assert.equal(isForDigFollowupSurvey({ slug: 'aktiva-anvandare', target_tag: 'x' }), false);
  });

  it('resolves campaign email by ref key or live slug', () => {
    assert.equal(
      resolveCampaignRecipientEmail({ surveySlug: 'utfall-kim-loke', campaignKey: 'kim' }),
      'kimandreasvensson@outlook.com'
    );
    assert.equal(
      resolveCampaignRecipientEmail({ surveySlug: 'utfall-kim-loke', campaignKey: null }),
      'kimandreasvensson@outlook.com'
    );
    assert.equal(
      resolveCampaignRecipientEmail({ surveySlug: 'utfall-sed-morgon', campaignKey: 'pontus' }),
      'pontus@burman.cc'
    );
  });

  it('builds survey URL with ref param', () => {
    assert.equal(
      buildSurveyUrl('https://example.com', 'utfall-jimmy-kvall', 'jimmy'),
      'https://example.com/tyck/utfall-jimmy-kvall?ref=jimmy'
    );
  });

  it('maps radio answer to outcome score and optional free text', () => {
    const survey = {
      questions: [
        {
          id: 'q1',
          sort_order: 0,
          question_type: 'radio',
          options: [
            { id: 'o4', option_text: '😊 Mycket bättre' },
            { id: 'o3', option_text: '🙂 Lite bättre' },
          ],
        },
        {
          id: 'q2',
          sort_order: 1,
          question_type: 'text_long',
        },
      ],
    };
    const answers = [
      { question_id: 'q1', selected_option_ids: ['o3'] },
      { question_id: 'q2', freetext_value: 'Morgonen flyter bättre' },
    ];
    const parsed = parseOutcomeFromSurvey(survey, answers);
    assert.equal(parsed.outcomeScore, OUTCOME_SCORE_BY_OPTION['🙂 Lite bättre']);
    assert.equal(parsed.freeText, 'Morgonen flyter bättre');
  });

  it('skips when parent chose not tested yet', () => {
    const survey = {
      questions: [{
        id: 'q1',
        sort_order: 0,
        question_type: 'radio',
        options: [{ id: 'o0', option_text: 'Har inte testat än' }],
      }],
    };
    const parsed = parseOutcomeFromSurvey(survey, [
      { question_id: 'q1', selected_option_ids: ['o0'] },
    ]);
    assert.equal(parsed.skipped, 'not_tested');
  });
});
