'use strict';

/**
 * P1 diagnostics-only (physical QA follow-up): GET /api/family/trusted-devices/
 * this-device now logs family id + the three effective Family Device flags +
 * the trusted-device lookup outcome, so a "Barnenhet är inte aktiverat" report
 * can be correlated without guessing. No behavior change — response contract is
 * unchanged; this only asserts the [THIS-DEVICE-DIAG] log line.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_KEY: ENTRY_FLAG } = require('../src/lib/family-device-entry-flags');
const { FLAG_KEY: DAILY_UX_FLAG } = require('../src/lib/family-device-daily-ux-flags');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function setFlag(db, key, enabled) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = $2`,
    [key, enabled]
  );
}

function captureConsoleLog() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => { lines.push(args.map(String).join(' ')); };
  return {
    lines,
    restore() { console.log = original; },
  };
}

/** Last [THIS-DEVICE-DIAG] line — getThisDeviceState() logs once early (before the
 *  enabled check) and once more with the trusted-device lookup outcome. */
function parseDiagLine(lines) {
  const matches = lines.filter((l) => l.includes('[THIS-DEVICE-DIAG]'));
  const line = matches[matches.length - 1];
  if (!line) return null;
  const jsonStart = line.indexOf('{');
  if (jsonStart === -1) return null;
  try {
    return JSON.parse(line.slice(jsonStart));
  } catch (_) {
    return null;
  }
}

async function fetchThisDevice(baseUrl, parent) {
  const capture = captureConsoleLog();
  try {
    const res = await fetch(`${baseUrl}/api/family/trusted-devices/this-device`, {
      headers: { Cookie: cookieHeader(parent.cookies) },
    });
    const body = await res.json();
    return { res, body, diag: parseDiagLine(capture.lines) };
  } finally {
    capture.restore();
  }
}

test('this-device: [THIS-DEVICE-DIAG] captures family id + effective flags + lookup outcome for both OFF and ON, no behavior change', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    // ── Phase 1: flags OFF ──────────────────────────────────────────────────
    await setFlag(db, FLAG_KEY, false);
    await setFlag(db, ENTRY_FLAG, false);
    await setFlag(db, DAILY_UX_FLAG, false);
    const parentOff = await registerAndLogin(http.baseUrl);

    const off = await fetchThisDevice(http.baseUrl, parentOff);
    assert.equal(off.res.status, 200);
    assert.equal(off.body.enabled, false, 'unchanged response contract when trusted_device_v1 is off');

    assert.ok(off.diag, 'expected a [THIS-DEVICE-DIAG] log line');
    assert.ok(off.diag.family_id, 'family id is non-empty');
    assert.match(off.diag.family_id, /^[0-9a-f-]{36}$/i, 'family id looks like a UUID');
    assert.equal(off.diag.effective_family_device_entry_v1, false);
    assert.equal(off.diag.effective_family_device_daily_ux_v1, false);
    assert.ok('trusted_device_lookup' in off.diag);
    // No PIN/token/cookie value ever logged.
    const offJson = JSON.stringify(off.diag);
    assert.doesNotMatch(offJson, /pin["\s:]/i);
    assert.doesNotMatch(offJson, /token/i);
    assert.doesNotMatch(offJson, /cookie/i);

    // ── Phase 2: flags ON (new family so the flag flip cannot leak state) ──
    await setFlag(db, FLAG_KEY, true);
    await setFlag(db, ENTRY_FLAG, true);
    await setFlag(db, DAILY_UX_FLAG, true);
    const parentOn = await registerAndLogin(http.baseUrl);

    const on = await fetchThisDevice(http.baseUrl, parentOn);
    assert.equal(on.res.status, 200);
    assert.equal(on.body.enabled, true);
    assert.equal(on.body.enrolled, false, 'no trusted-device cookie on this request → not enrolled');

    assert.ok(on.diag);
    assert.equal(on.diag.effective_family_device_entry_v1, true);
    assert.equal(on.diag.effective_family_device_daily_ux_v1, true);
    assert.equal(on.diag.trusted_device_lookup, 'no_trusted_device_cookie');
    assert.equal(on.diag.resolver_error, null, 'no resolver exception for a normal family id');
    assert.notEqual(off.diag.family_id, on.diag.family_id, 'two distinct families across the two phases');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
