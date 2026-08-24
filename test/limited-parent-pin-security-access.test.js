'use strict';

/**
 * Limited-parent PIN security access — real requirePremiumApi + family pin routes.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const {
  isLimitedParentSecurityRequestAllowed,
  normalizePathname,
} = require('../src/lib/limited-parent-security-access');
const config = require('../src/lib/config');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function setPaymentStart(iso, db) {
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes(`${ROOT}/src/`)
      || key.endsWith(`${ROOT}/app.js`)
      || key.includes(`${ROOT}/db/`)
    ) {
      delete require.cache[key];
    }
  }
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    ['payment_start_at', JSON.stringify(iso)]
  );
  const { setPaymentStartAt } = require('../src/lib/payment-settings');
  await setPaymentStartAt(iso);
}

function parentHeaders(session) {
  return {
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
    'Content-Type': 'application/json',
  };
}

describe('limited parent security access — exact path helper', () => {
  it('allows only exact parent-pin-status and set-pin routes', () => {
    assert.equal(
      isLimitedParentSecurityRequestAllowed({
        method: 'GET',
        originalUrl: '/api/family/parent-pin-status',
        user: { type: 'parent' },
      }),
      true
    );
    assert.equal(
      isLimitedParentSecurityRequestAllowed({
        method: 'POST',
        originalUrl: '/api/family/set-pin',
        user: { type: 'parent' },
      }),
      true
    );
    assert.equal(
      isLimitedParentSecurityRequestAllowed({
        method: 'GET',
        originalUrl: '/api/family/parent-pin-status-picker',
        user: { type: 'parent' },
      }),
      false
    );
    assert.equal(
      isLimitedParentSecurityRequestAllowed({
        method: 'POST',
        originalUrl: '/api/family/set-pin',
        user: { type: 'child' },
      }),
      false
    );
    assert.equal(normalizePathname('/api/family/set-pin/'), '/api/family/set-pin');
  });
});

test('limited parent PIN security access integration A–I', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  let http;
  try {
    await setPaymentStart('2020-01-01T00:00:00+02:00', db);
    const { createApp } = require('../app');
    http = await listenApp(createApp);

    const session = await registerAndLogin(http.baseUrl);
    const headers = parentHeaders(session);

    const meRes = await fetch(`${http.baseUrl}/api/auth/me`, { headers });
    assert.equal(meRes.status, 200);
    const me = await meRes.json();
    const familyId = me.familyId || me.family_id;
    assert.ok(familyId);

    const childBootstrap = await fetch(`${http.baseUrl}/api/onboarding/child`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'PinGateBarn', emoji: '🌟' }),
    });
    const childBootstrapText = await childBootstrap.text();
    assert.equal(childBootstrap.status, 201, childBootstrapText);
    const childRecord = JSON.parse(childBootstrapText);

    await t.test('A: post-cutoff limited parent GET /api/family/parent-pin-status → 200', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/parent-pin-status`, { headers });
      const text = await res.text();
      assert.equal(res.status, 200, text);
      const body = JSON.parse(text);
      assert.equal(body.has_pin, false);
    });

    await t.test('B: same limited parent POST /api/family/set-pin (first-time) → 200', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pin: '4821', confirmPin: '4821' }),
      });
      const text = await res.text();
      assert.equal(res.status, 200, text);
      const body = JSON.parse(text);
      assert.equal(body.success, true);
    });

    await t.test('C: GET status after save → has_pin=true', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/parent-pin-status`, { headers });
      const text = await res.text();
      assert.equal(res.status, 200, text);
      const body = JSON.parse(text);
      assert.equal(body.has_pin, true);
    });

    await t.test('D: limited parent satisfies ParentPinHandoffGate has_pin contract', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/parent-pin-status`, { headers });
      const body = await res.json();
      assert.equal(body.has_pin, true);
      const gate = read('public/js/parent-pin-handoff-gate.js');
      assert.match(gate, /has_pin === true/);
      assert.match(gate, /fetchHasParentPin/);
    });

    await t.test('E: unrelated /api/family premium mutation → 402', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ timezone: 'Europe/Stockholm' }),
      });
      const text = await res.text();
      assert.equal(res.status, 402, text);
      const body = JSON.parse(text);
      assert.equal(body.code, 'PREMIUM_REQUIRED');
    });

    await t.test('F: child JWT POST /api/family/set-pin → blocked', async () => {
      const childToken = jwt.sign(
        {
          id: childRecord.id,
          type: 'child',
          familyId,
          username: childRecord.username,
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      const res = await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers: {
          Cookie: cookieHeader({ access_token: childToken }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: '9999', confirmPin: '9999' }),
      });
      assert.notEqual(res.status, 200);
      assert.ok([401, 403, 402].includes(res.status), `status ${res.status}`);
    });

    await t.test('G: unauthenticated POST /api/family/set-pin → blocked', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: '1111', confirmPin: '1111' }),
      });
      assert.ok([401, 403].includes(res.status), `status ${res.status}`);
    });

    await t.test('H: existing PIN cannot be overwritten without current PIN/password → 400', async () => {
      const res = await fetch(`${http.baseUrl}/api/family/set-pin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pin: '5678', confirmPin: '5678' }),
      });
      const text = await res.text();
      assert.equal(res.status, 400, text);
      const body = JSON.parse(text);
      assert.match(body.error, /nuvarande PIN|lösenord/i);
    });
  } finally {
    if (http) await http.close();
    await db.cleanup();
  }
});

test('I: existing onboarding limited-account integration remains importable', async () => {
  const hotfix = read('test/onboarding-limited-account-hotfix.test.js');
  assert.match(hotfix, /limited onboarding authorization integration A–J/);
  assert.match(read('src/middleware/require-premium.js'), /isLimitedParentSecurityRequestAllowed/);
});
