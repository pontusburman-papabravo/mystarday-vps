'use strict';

/**
 * P1 hotfix — limited/unpaid families must complete onboarding; template retry UX.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { ensureCanonicalStandardLibrary } = require('./helpers/golden-path-fas6.js');
const config = require('../src/lib/config');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function setPaymentStart(iso) {
  const appSettings = require('../db/app-settings');
  await appSettings.upsertSetting('payment_start_at', iso);
  delete require.cache[require.resolve('../app')];
  delete require.cache[require.resolve('../src/lib/db')];
}

describe('onboarding limited-account hotfix — middleware allowlist', () => {
  const {
    isLimitedAccountPath,
    isChildLimitedAccountPath,
    LIMITED_ACCOUNT_ALLOWED_PREFIXES,
    CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES,
  } = require('../src/middleware/require-premium');

  it('includes /api/onboarding/ in LIMITED_ACCOUNT_ALLOWED_PREFIXES', () => {
    assert.ok(LIMITED_ACCOUNT_ALLOWED_PREFIXES.includes('/api/onboarding/'));
    assert.equal(isLimitedAccountPath('/api/onboarding/template-groups'), true);
    assert.equal(isLimitedAccountPath('/api/onboarding/child'), true);
    assert.equal(isLimitedAccountPath('/api/onboarding/schedule'), true);
    assert.equal(isLimitedAccountPath('/api/children'), false);
  });

  it('E: child limited allowlist unchanged — onboarding not whitelisted for child', () => {
    assert.ok(!CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES.includes('/api/onboarding/'));
    assert.equal(isChildLimitedAccountPath('/api/onboarding/template-groups'), false);
  });
});

describe('onboarding limited-account hotfix — client contracts', () => {
  const src = read('public/js/onboarding.js');

  it('F: failed template load shows retry control', () => {
    assert.match(src, /function renderTemplateGroupsLoadFailed/);
    assert.match(src, /templatesLoadFailed/);
    assert.match(src, /templatesRetryBtn/);
    assert.match(src, /id="templateGroupsRetryBtn"/);
    assert.match(src, /loadTemplateGroups\(\)/);
  });

  it('G: successful retry renders server groups and re-enables Next', () => {
    assert.match(src, /async function loadTemplateGroups\(\)/);
    assert.match(src, /buildTemplateGroupGrid\(templateGroups\)/);
    assert.match(src, /if \(step1Btn\) step1Btn\.disabled = false/);
    assert.match(src, /if \(!templateGroupsLoading\) loadTemplateGroups\(\)/);
  });

  it('H: Next without schedule shows error and focuses schedule section', () => {
    assert.match(src, /if \(!selectedDayPref\)/);
    assert.match(src, /onboarding\.child\.scheduleRequired/);
    assert.match(src, /focusScheduleSection\(\)/);
    assert.match(src, /function focusScheduleSection/);
    assert.match(src, /scrollIntoView/);
  });

  it('I: no fake fallback schedule cards in template grid loader', () => {
    const loaderBlock = src.slice(
      src.indexOf('async function loadTemplateGroups'),
      src.indexOf('function buildTemplateGroupGrid')
    );
    assert.doesNotMatch(loaderBlock, /getTemplateGroupFallback\(\)/);
    assert.doesNotMatch(loaderBlock, /TEMPLATE_GROUP_META\.map/);
  });
});

test('limited unpaid parent — onboarding API integration A–E', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  await ensureCanonicalStandardLibrary(db);
  const savedPaymentStart = '2026-10-01T00:00:00+02:00';
  let limitedHttp;

  try {
    await setPaymentStart('2020-01-01T00:00:00+02:00');
    const { createApp } = require('../app');
    limitedHttp = await listenApp(createApp);

    const unauthRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`);
    assert.equal(unauthRes.status, 401, 'onboarding remains parent-auth protected');

    const session = await registerAndLogin(limitedHttp.baseUrl);
    const parentHeaders = {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
      'Content-Type': 'application/json',
    };

    await t.test('A: GET /api/onboarding/template-groups passes premium gate', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`, {
        headers: parentHeaders,
      });
      const text = await res.text();
      assert.notEqual(res.status, 402, text);
      assert.equal(res.status, 200, text);
      const body = JSON.parse(text);
      assert.ok(Array.isArray(body));
    });

    await t.test('B: POST /api/onboarding/child not blocked by premium middleware', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers: parentHeaders,
        body: JSON.stringify({ name: 'LimitedBarn', emoji: '🌟' }),
      });
      const text = await res.text();
      assert.notEqual(res.status, 402, text);
      assert.equal(res.status, 201, text);
      const body = JSON.parse(text);
      assert.ok(body.id);
      session._childId = body.id;
      session._childUsername = body.username;
      session._childPin = body.pin;
    });

    await t.test('C: POST /api/onboarding/schedule not blocked by premium middleware', async () => {
      const childId = session._childId;
      assert.ok(childId, 'child from test B required');
      const res = await fetch(`${limitedHttp.baseUrl}/api/onboarding/schedule`, {
        method: 'POST',
        headers: parentHeaders,
        body: JSON.stringify({ child_id: childId, template_group: 'forskola' }),
      });
      const text = await res.text();
      assert.notEqual(res.status, 402, text);
      assert.equal(res.status, 200, text);
    });

    await t.test('D: unrelated premium API still returns 402', async () => {
      const res = await fetch(`${limitedHttp.baseUrl}/api/children`, {
        headers: parentHeaders,
      });
      assert.equal(res.status, 402);
      const body = await res.json();
      assert.equal(body.code, 'PREMIUM_REQUIRED');
    });

    await t.test('E: child JWT still cannot access parent onboarding routes', async () => {
      const familyRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
      const childToken = jwt.sign(
        {
          id: session._childId,
          type: 'child',
          familyId: familyRow.rows[0].family_id,
          username: session._childUsername,
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      const childRes = await fetch(`${limitedHttp.baseUrl}/api/onboarding/template-groups`, {
        headers: { Cookie: cookieHeader({ access_token: childToken }) },
      });
      assert.notEqual(childRes.status, 200);
      assert.ok([402, 403].includes(childRes.status), `unexpected status ${childRes.status}`);
    });
  } finally {
    if (limitedHttp) await limitedHttp.close();
    await setPaymentStart(savedPaymentStart);
    await db.cleanup();
  }
});
