'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}
process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';

async function loginAsAdmin(baseUrl, db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const { getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  if (loginRes.status !== 200) {
    throw new Error(`admin re-login failed ${loginRes.status}: ${await loginRes.text()}`);
  }
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { ...session, cookies };
}

function renderLikeAdmin(answers) {
  return (Array.isArray(answers) ? answers : []).filter((a) => a && typeof a === 'object').map((a) => a.question_id);
}

test('admin response list survives submitted rows with no answers', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const { seedBuiltInSurveys } = require('../src/routes/surveys');
  await seedBuiltInSurveys();
  const surveysDb = require('../db/surveys');

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const survey = await surveysDb.getSurveyBySlug('host-2026');
    assert.ok(survey);

    const empty = await db.query(
      `INSERT INTO survey_responses (survey_id, status, submitted_at, gdpr_consent)
       VALUES ($1, 'submitted', NOW(), true)
       RETURNING id`,
      [survey.id]
    );
    const withAnswer = await db.query(
      `INSERT INTO survey_responses (survey_id, status, submitted_at, gdpr_consent)
       VALUES ($1, 'submitted', NOW(), true)
       RETURNING id`,
      [survey.id]
    );
    const questions = await surveysDb.getQuestionsForSurvey(survey.id);
    await surveysDb.upsertAnswer({
      response_id: withAnswer.rows[0].id,
      question_id: questions[0].id,
      selected_option_ids: [],
      answer_text: 'ok',
    });

    const rows = await surveysDb.getSurveyResponses(survey.id);
    const emptyRow = rows.find((r) => r.id === empty.rows[0].id);
    const filledRow = rows.find((r) => r.id === withAnswer.rows[0].id);
    assert.ok(emptyRow);
    assert.ok(filledRow);
    assert.equal(Array.isArray(emptyRow.answers), true);
    assert.equal(emptyRow.answers.length, 0);
    assert.equal(emptyRow.answers[0], undefined);
    assert.doesNotThrow(() => {
      rows.forEach((r) => (r.answers || []).map((a) => a.question_id));
    });
    assert.deepEqual(renderLikeAdmin(emptyRow.answers), []);
    assert.equal(renderLikeAdmin(filledRow.answers).length, 1);

    const session = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
    const res = await fetch(`${http.baseUrl}/api/admin/surveys/${survey.id}/responses`, {
      headers: { Cookie: cookieHeader(session.cookies) },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(Array.isArray(body), true);
    const httpEmpty = body.find((r) => r.id === empty.rows[0].id);
    assert.ok(httpEmpty);
    assert.equal(Array.isArray(httpEmpty.answers), true);
    assert.equal(httpEmpty.answers.length, 0);
    assert.doesNotThrow(() => {
      body.forEach((r) => (r.answers || []).map((a) => a.question_id));
    });
  } finally {
    await http.close();
    await db.cleanup();
  }
});
