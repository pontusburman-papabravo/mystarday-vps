'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}
process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';

test('host-2026 survey is public, separates lottery email, and caps max-3', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }

    const { seedBuiltInSurveys } = require('../src/routes/surveys');
    await seedBuiltInSurveys();

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const page = await fetch(`${http.baseUrl}/tyck/host-2026`);
    assert.equal(page.status, 200);

    const other = await fetch(`${http.baseUrl}/api/surveys/s/aktiva-anvandare`);
    assert.equal(other.status, 403);

    const surveyRes = await fetch(`${http.baseUrl}/api/surveys/s/host-2026`);
    assert.equal(surveyRes.status, 200);
    const survey = await surveyRes.json();
    assert.equal(survey.slug, 'host-2026');
    assert.equal(survey.contest_collect_after_submit, true);
    assert.equal(survey.popup_landing_enabled, false);

    const q1 = survey.questions[0];
    const q2 = survey.questions[1];
    const qFree = survey.questions[survey.questions.length - 1];
    assert.equal(q2.max_selections, 3);
    assert.equal(qFree.is_required, false);

    const start = await fetch(`${http.baseUrl}/api/surveys/s/host-2026/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie_token: `host2026-${Date.now()}` }),
    });
    assert.equal(start.status, 201);
    const { response_id } = await start.json();

    const tooMany = await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: q2.id,
        selected_option_ids: q2.options.slice(0, 4).map((o) => o.id),
      }),
    });
    assert.equal(tooMany.status, 400);

    await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: q1.id,
        selected_option_ids: [q1.options[0].id],
      }),
    });
    await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: q2.id,
        selected_option_ids: q2.options.slice(0, 3).map((o) => o.id),
      }),
    });
    await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: qFree.id,
        answer_text: '<script>alert(1)</script> mer koll',
      }),
    });

    const submit = await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gdpr_consent: true,
        respondent_email: 'should-not-stick@example.com',
        contest_gdpr_consent: true,
      }),
    });
    const submitBody = await submit.json();
    assert.equal(submit.status, 200, JSON.stringify(submitBody));
    assert.equal(submitBody.contest_entered, false);
    assert.equal(submitBody.contest_collect_after_submit, true);

    const saved = await db.query('SELECT respondent_email, status FROM survey_responses WHERE id = $1', [response_id]);
    assert.equal(saved.rows[0].status, 'submitted');
    assert.equal(saved.rows[0].respondent_email, null);

    const contest = await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Lottery.Winner@example.com',
        age_confirmed_18: true,
        contest_gdpr_consent: true,
      }),
    });
    assert.equal(contest.status, 201);

    const dup = await fetch(`${http.baseUrl}/api/surveys/responses/${response_id}/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lottery.winner@example.com',
        age_confirmed_18: true,
        contest_gdpr_consent: true,
      }),
    });
    assert.equal(dup.status, 409);

    const linked = await db.query(
      'SELECT respondent_email FROM survey_responses WHERE id = $1',
      [response_id]
    );
    assert.equal(linked.rows[0].respondent_email, null);

    const legalPage = await fetch(`${http.baseUrl}/kampanj/host-2026/utlottning`);
    assert.equal(legalPage.status, 200);
    const legalHtml = await legalPage.text();
    assert.match(legalHtml, /Papa Bravo AB/);
    assert.match(legalHtml, /Zalando är inte sponsor/);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
