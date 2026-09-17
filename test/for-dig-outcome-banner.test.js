'use strict';

/**
 * För dig dismissible Hem outcome banner + explicit email feedback mode.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { sanitizeReturnUrl } = require('../src/lib/sanitize-return-url');
const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');
const { CTA_PATH } = require('../src/lib/for-dig-outcome-email-template');
const { parentApiMessage } = require('../src/lib/parent-api-messages');
const { loadLocales } = require('../src/lib/i18n');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');
const GOAL_SLUG = FOR_DIG_GOALS[0].slug;
const OTHER_GOAL = FOR_DIG_GOALS[1].slug;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function authFetch(baseUrl, session, pathname, { method = 'GET', body } = {}) {
  const headers = {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function enableForDig(db) {
  await db.query(
    `INSERT INTO features (slug, name, status)
     VALUES ('for_dig', 'För dig', 'live')
     ON CONFLICT (slug) DO UPDATE SET status = 'live'`
  );
}

async function seedPendingInstall(db, { familyId, parentId, childId, goalSlug = GOAL_SLUG, daysAgo = 8 }) {
  await db.query(
    `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, parent_id, installed_at)
     VALUES ($1, $2, $3, $4, NOW() - ($5::int || ' days')::interval)
     ON CONFLICT (goal_slug, family_id, child_id)
     DO UPDATE SET installed_at = EXCLUDED.installed_at, parent_id = EXCLUDED.parent_id`,
    [goalSlug, familyId, childId, parentId, daysAgo]
  );
}

test('banner source: Hem script, dismiss X, explicit mode, no home chain, parent-only', () => {
  const html = read('public/dashboard.html');
  const src = read('public/js/for-dig-outcome-banner.js');
  const auth = read('public/js/auth.js');
  const sv = JSON.parse(read('config/i18n/home-sv-SE.json'));
  const en = JSON.parse(read('config/i18n/home-en-GB.json'));

  assert.match(html, /for-dig-outcome-banner\.js/);
  assert.match(src, /\/api\/for-dig\/feedback\/pending/);
  assert.match(src, /\/api\/for-dig\/feedback\/dismiss/);
  assert.match(src, /forDigOutcomeDismiss/);
  assert.match(src, /homeDismissedThisView/);
  assert.match(src, /for_dig_feedback/);
  assert.match(src, /alreadyAnswered/);
  assert.match(src, /Svara på nästa|home\.forDig\.outcome\.next/);
  assert.match(src, /user\.type !== 'parent'/);
  assert.match(src, /phase: 'outcome'/);
  assert.doesNotMatch(src, /localStorage/);

  assert.equal(CTA_PATH, '/dashboard?for_dig_feedback=1');
  assert.equal(sv.forDig.outcome.sub, 'För {{name}}');
  assert.equal(sv.forDig.outcome.dismissAria, 'Stäng');
  assert.equal(sv.forDig.outcome.alreadyAnswered, 'Tack! Det ser ut som att du redan har svarat.');
  assert.equal(sv.forDig.outcome.next, 'Svara på nästa');
  assert.equal(en.forDig.outcome.next, 'Answer the next one');
  assert.deepEqual(Object.keys(sv.forDig.outcome).sort(), Object.keys(en.forDig.outcome).sort());

  assert.match(auth, /authGuard[\s\S]*login\?next=' \+ encodeURIComponent\(Auth\._currentSafeReturnPath\(\)\)/);
  assert.match(auth, /_sessionLostRedirect[\s\S]*login\?next=' \+ next/);
  const login = read('public/login.html');
  assert.match(login, /sanitizeReturnUrl\(next\)/);
  assert.equal(sanitizeReturnUrl('/dashboard?for_dig_feedback=1'), '/dashboard?for_dig_feedback=1');
  assert.equal(
    sanitizeReturnUrl('/login?next=%2Fdashboard%3Ffor_dig_feedback%3D1'),
    '/login?next=%2Fdashboard%3Ffor_dig_feedback%3D1'
  );

  const route = read('src/routes/for-dig.js');
  assert.match(route, /sendApiError\(res, 400, 'CHILD_ID_INTENT_REQUIRED'\)/);
  assert.match(route, /sendApiError\(res, 403, 'FOR_DIG_CHILD_ACCESS'\)/);
  assert.match(route, /sendApiError\(res, 500, 'GENERIC_SERVER_ERROR'\)/);
  assert.doesNotMatch(route, /child_id och goal_slug krävs/);
  assert.doesNotMatch(route, /Kunde inte stänga frågan/);
  loadLocales();
  assert.equal(
    parentApiMessage('sv-SE', 'errors.forDig.childAndGoalRequired'),
    'child_id och goal_slug krävs'
  );
  assert.equal(
    parentApiMessage('en-GB', 'errors.forDig.childAndGoalRequired'),
    'child_id and goal_slug are required'
  );
  assert.equal(
    parentApiMessage('sv-SE', 'errors.forDig.childAccessDenied'),
    'Du har inte åtkomst till ett av valda barn.'
  );
  assert.equal(
    parentApiMessage('en-GB', 'errors.forDig.childAccessDenied'),
    'You do not have access to one of the selected children.'
  );
  assert.equal(
    parentApiMessage('sv-SE', 'errors.forDig.dismissFailed'),
    'Kunde inte stänga frågan'
  );
  assert.equal(
    parentApiMessage('en-GB', 'errors.forDig.dismissFailed'),
    'Could not close the question'
  );
});

test('pending/dismiss/submit/explicit isolation + child cannot leave outcome', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('TEST_DATABASE_URL required');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableForDig(db);
    const session = await registerAndLogin(http.baseUrl);
    const me = await authFetch(http.baseUrl, session, '/api/auth/me');
    const familyId = me.json.family_id || me.json.familyId;
    const parentId = me.json.id;
    const childId = await createChild(http.baseUrl, session, {
      name: 'Astrid',
      birthday: '2018-01-15',
    });

    await seedPendingInstall(db, { familyId, parentId, childId, goalSlug: GOAL_SLUG, daysAgo: 10 });
    await seedPendingInstall(db, { familyId, parentId, childId, goalSlug: OTHER_GOAL, daysAgo: 8 });

    const pending = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/pending');
    assert.equal(pending.res.status, 200, pending.text);
    assert.equal(pending.json.length, 2);
    assert.equal(pending.json.every((row) => row.dismissed === false), true);
    assert.equal(pending.json[0].goal_slug, GOAL_SLUG);

    const missingFields = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/dismiss', {
      method: 'POST',
      body: {},
    });
    assert.equal(missingFields.res.status, 400, missingFields.text);
    assert.equal(missingFields.json.error, 'CHILD_ID_INTENT_REQUIRED');
    assert.equal(missingFields.json.code, 'CHILD_ID_INTENT_REQUIRED');

    const foreignChild = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/dismiss', {
      method: 'POST',
      body: { child_id: '00000000-0000-4000-8000-000000000099', goal_slug: GOAL_SLUG },
    });
    assert.equal(foreignChild.res.status, 403, foreignChild.text);
    assert.equal(foreignChild.json.error, 'FOR_DIG_CHILD_ACCESS');
    assert.equal(foreignChild.json.code, 'FOR_DIG_CHILD_ACCESS');

    const dismiss = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/dismiss', {
      method: 'POST',
      body: { child_id: childId, goal_slug: GOAL_SLUG },
    });
    assert.equal(dismiss.res.status, 200, dismiss.text);

    const afterDismiss = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/pending');
    assert.equal(afterDismiss.json.length, 2);
    const dismissed = afterDismiss.json.find((row) => row.goal_slug === GOAL_SLUG);
    const remaining = afterDismiss.json.find((row) => row.goal_slug === OTHER_GOAL);
    assert.equal(dismissed.dismissed, true);
    assert.equal(remaining.dismissed, false);

    const outcomes = await db.query(
      `SELECT id FROM for_dig_goal_feedback WHERE family_id = $1 AND phase = 'outcome'`,
      [familyId]
    );
    assert.equal(outcomes.rowCount, 0);
    const optOut = await db.query(
      `SELECT opted_out_at FROM for_dig_followup_email_preference WHERE parent_id = $1`,
      [parentId]
    );
    assert.equal(optOut.rowCount, 0);

    const submit = await authFetch(http.baseUrl, session, '/api/for-dig/feedback', {
      method: 'POST',
      body: {
        goal_slug: GOAL_SLUG,
        child_id: childId,
        phase: 'outcome',
        outcome_score: 4,
        free_text: 'Lugnare kvällar',
      },
    });
    assert.ok(submit.res.status === 200 || submit.res.status === 201, submit.text);

    const afterSubmit = await authFetch(http.baseUrl, session, '/api/for-dig/feedback/pending');
    assert.equal(afterSubmit.json.some((row) => row.goal_slug === GOAL_SLUG), false);
    assert.equal(afterSubmit.json.length, 1);
    assert.equal(afterSubmit.json[0].goal_slug, OTHER_GOAL);

    const pinHash = await hashPassword('2468');
    const childRow = await db.query(`SELECT username FROM child WHERE id = $1`, [childId]);
    await db.query(`UPDATE child SET pin = $1 WHERE id = $2`, [pinHash, childId]);
    const childLogin = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: childRow.rows[0].username, pin: '2468' }),
    });
    assert.equal(childLogin.status, 200, await childLogin.clone().text());
    const childBody = await childLogin.json();
    let cookies = {};
    for (const header of getSetCookieHeaders(childLogin)) {
      cookies = mergeCookies(cookies, [header]);
    }
    const childSession = { cookies, csrfToken: childBody.csrfToken };
    const childPending = await authFetch(http.baseUrl, childSession, '/api/for-dig/feedback/pending');
    assert.ok(childPending.res.status === 401 || childPending.res.status === 403, childPending.text);
    const childSubmit = await authFetch(http.baseUrl, childSession, '/api/for-dig/feedback', {
      method: 'POST',
      body: {
        goal_slug: OTHER_GOAL,
        child_id: childId,
        phase: 'outcome',
        outcome_score: 1,
      },
    });
    assert.ok(childSubmit.res.status === 401 || childSubmit.res.status === 403, childSubmit.text);
    const childDismiss = await authFetch(http.baseUrl, childSession, '/api/for-dig/feedback/dismiss', {
      method: 'POST',
      body: { child_id: childId, goal_slug: OTHER_GOAL },
    });
    assert.ok(childDismiss.res.status === 401 || childDismiss.res.status === 403, childDismiss.text);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
