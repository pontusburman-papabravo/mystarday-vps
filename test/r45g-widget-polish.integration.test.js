'use strict';

/**
 * R4.5g — widget payload polish (deep link path, duration).
 */

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { cookieHeader, listenApp } = require('./helpers/http.js');
const { registerAndLogin, createChild } = require('./helpers/auth-session.js');
const { FLAG_KEY } = require('../src/lib/trusted-device-flags');
const { FLAG_NATIVE, FLAG_COMPLETION } = require('../src/lib/widget-flags');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const { getLocalDateStr } = require('../src/lib/daily-log-generator');

async function enableFlags(db) {
  for (const key of [FLAG_KEY, FLAG_NATIVE, FLAG_COMPLETION, FLAG_KEYS.firstStarMode]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

test('R4.5g: next-action includes open_app_path and duration_seconds for timer capability', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  try {
    await enableFlags(db);
    const parent = await registerAndLogin(http.baseUrl);
    const childId = await createChild(http.baseUrl, parent, { name: 'Timer', emoji: '⏳' });
    const fam = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    const familyId = fam.rows[0].family_id;
    const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
    const tpl = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, source, duration_seconds)
       VALUES ($1, 'Borsta', '🪥', 1, 0, 'user', 120) RETURNING id`,
      [familyId]
    );
    await db.query('UPDATE child SET activity_timers_enabled = true WHERE id = $1', [childId]);
    await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
    const logRes = await db.query(
      'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
      [childId, dateStr]
    );
    await db.query(
      `INSERT INTO daily_log_item (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
       VALUES ($1, $2, 'Borsta', '🪥', 1, 0, 'morgon')`,
      [logRes.rows[0].id, tpl.rows[0].id]
    );

    const bindRes = await fetch(`${http.baseUrl}/api/widget/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(parent.cookies),
        'X-CSRF-Token': parent.csrfToken,
      },
      body: JSON.stringify({
        installation_id: 'timer-inst',
        platform: 'ios',
        child_id: childId,
      }),
    });
    const { binding_token: token } = await bindRes.json();

    const next = await (await fetch(`${http.baseUrl}/api/widget/next-action`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();

    assert.equal(next.status, 'ready');
    assert.equal(next.activity.capability, 'open_app');
    assert.equal(next.activity.open_app_reason, 'timer');
    assert.equal(next.activity.duration_seconds, 120);
    assert.match(next.activity.open_app_path, /widget_focus=/);
    assert.match(next.activity.open_app_path, /panel=timer/);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
