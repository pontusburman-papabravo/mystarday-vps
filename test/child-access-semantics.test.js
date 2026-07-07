'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { hashPassword } = require('../src/lib/hash');
const { updateActivationState, ensureActivationState } = require('../src/lib/activation-p0');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function getActivationState(db, familyId) {
  const result = await db.query(
    `SELECT schema_saved_at, child_access_completed_at, first_completion_at,
            p0_activated_at, p0_activated_within_48h
     FROM family_activation_state
     WHERE family_id = $1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function waitForActivationField(db, familyId, field, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await getActivationState(db, familyId);
    if (state && state[field]) return state;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const finalState = await getActivationState(db, familyId);
  assert.ok(finalState && finalState[field], `Timed out waiting for ${field}`);
  return finalState;
}

describe('child access semantics — static contracts', () => {
  it('startChildHandoff logs child_handoff_started without recordChildAccess', () => {
    const src = read('public/js/onboarding-activation.js');
    const fn = src.slice(src.indexOf('function startChildHandoff'), src.indexOf('function confirmHandoffSkip'));
    assert.match(fn, /child_handoff_started/);
    assert.doesNotMatch(fn, /recordChildAccess/);
    assert.doesNotMatch(fn, /child-access-complete/);
  });

  it('child-handoff-reminder still requires child_access_completed_at IS NULL', () => {
    const sched = read('src/lib/child-handoff-reminder-scheduler.js');
    assert.match(sched, /child_access_completed_at IS NULL/);
  });
});

test('POST /api/onboarding/child-access-complete does not set child_access_completed_at', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Handoff', emoji: '👶' });

    await updateActivationState(familyId, 'schema_saved');

    const res = await fetch(`${http.baseUrl}/api/onboarding/child-access-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(session.cookies),
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ child_id: childId, source: 'child_view' }),
    });
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.deprecated, true);

    const state = await getActivationState(db, familyId);
    assert.equal(state.child_access_completed_at, null);
    assert.ok(state.schema_saved_at);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('verified child login sets child_access_completed_at', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'Login', emoji: '🔑' });
    const pinHash = await hashPassword('2468');
    await db.query(
      `UPDATE child SET username = 'loginchild', pin = $1 WHERE id = $2`,
      [pinHash, childId]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'loginchild', pin: '2468' }),
    });
    assert.equal(loginRes.status, 200);

    const state = await waitForActivationField(db, familyId, 'child_access_completed_at');
    assert.ok(state.child_access_completed_at);

    const analytics = await db.query(
      `SELECT COUNT(*)::int AS n FROM analytics_events
       WHERE family_id = $1 AND event_type = 'child_session_started'`,
      [familyId]
    );
    assert.ok(analytics.rows[0].n >= 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('P0 not achieved without verified child access', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    const childId = await createChild(http.baseUrl, session, { name: 'NoAccess', emoji: '⛔' });

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed, completed_at)
       VALUES ($1, 'Vakna', 'morgon', 0, 1, true, NOW())`,
      [log.rows[0].id]
    );

    await updateActivationState(familyId, 'schema_saved');
    await updateActivationState(familyId, 'first_completion', { metadata: { source: 'test' } });

    const state = await getActivationState(db, familyId);
    assert.ok(state.schema_saved_at);
    assert.ok(state.first_completion_at);
    assert.equal(state.child_access_completed_at, null);
    assert.equal(state.p0_activated_at, null);
    assert.equal(state.p0_activated_within_48h, false);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('P0 achieved with schema + verified child login + first completion within 48h', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }

  const { createApp } = require('../app');
  const http = await listenApp(createApp);

  try {
    const session = await registerAndLogin(http.baseUrl);
    const parentRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = parentRow.rows[0].family_id;
    await ensureActivationState(familyId);
    const childId = await createChild(http.baseUrl, session, { name: 'P0Kid', emoji: '⭐' });
    const pinHash = await hashPassword('1357');
    await db.query(
      `UPDATE child SET username = 'p0kid', pin = $1, view_type = 'day_sections' WHERE id = $2`,
      [pinHash, childId]
    );

    await updateActivationState(familyId, 'schema_saved');

    const log = await db.query(
      `INSERT INTO daily_log (child_id, date) VALUES ($1, CURRENT_DATE) RETURNING id`,
      [childId]
    );
    const item = await db.query(
      `INSERT INTO daily_log_item (daily_log_id, name, section, sort_order, star_value, completed)
       VALUES ($1, 'Tänder', 'morgon', 0, 1, false)
       RETURNING id`,
      [log.rows[0].id]
    );

    const loginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'p0kid', pin: '1357' }),
    });
    const loginBody = JSON.parse(await loginRes.text());
    assert.equal(loginRes.status, 200);
    let cookies = {};
    for (const header of getSetCookieHeaders(loginRes)) {
      cookies = mergeCookies(cookies, [header]);
    }

    const completeRes = await fetch(
      `${http.baseUrl}/api/me/daily-log-items/${item.rows[0].id}/complete`,
      {
        method: 'PUT',
        headers: {
          Cookie: cookieHeader(cookies),
          'Content-Type': 'application/json',
          'X-CSRF-Token': loginBody.csrfToken,
        },
      }
    );
    assert.equal(completeRes.status, 200);

    const state = await waitForActivationField(db, familyId, 'p0_activated_at');
    assert.ok(state.schema_saved_at);
    assert.ok(state.child_access_completed_at);
    assert.ok(state.first_completion_at);
    assert.ok(state.p0_activated_at);
    assert.equal(state.p0_activated_within_48h, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
