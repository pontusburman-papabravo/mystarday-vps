'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const ROOT = path.join(__dirname, '..');
const DEMO_EMAIL = 'english.demo@mystarday.se'; // pragma: allowlist secret

function uniqueEmail() {
  return `legacy-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

function cookiesFrom(res) {
  const headers = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
  return headers.map((h) => h.split(';')[0]).join('; ');
}

async function registerAndLogin(baseUrl, locale) {
  const email = uniqueEmail();
  const password = 'testpass123';
  const reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Legacy Test', email, password, preferred_locale: locale }),
  });
  assert.equal(reg.status, 201, await reg.clone().text());
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = JSON.parse(await login.text());
  assert.equal(login.status, 200);
  return { email, cookies: cookiesFrom(login), csrf: body.csrfToken };
}

test('legacy-language notice — relevant only after sv → en switch, once until dismissed', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const pg = require('../src/lib/db');

  try {
    // ── Existing Swedish family ──
    const sv = await registerAndLogin(http.baseUrl, 'sv-SE');
    const authHeaders = { 'Content-Type': 'application/json', Cookie: sv.cookies, 'X-CSRF-Token': sv.csrf };

    // Snapshot seeded (Swedish) user content before the switch
    const before = await pg.query(
      `SELECT at.name FROM activity_template at
       JOIN parent p ON p.family_id = at.family_id
       WHERE p.email = $1 ORDER BY at.name`,
      [sv.email.toLowerCase()]
    );
    assert.ok(before.rows.length > 0, 'registration should seed activities');

    // Not shown while still Swedish
    let ctx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, { headers: authHeaders })).json();
    assert.equal(ctx.show_legacy_language_notice, false);

    // Switch to English via settings
    const put = await fetch(`${http.baseUrl}/api/family/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ preferred_locale: 'en-GB' }),
    });
    assert.equal(put.status, 200, await put.clone().text());

    // Now relevant
    ctx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, { headers: authHeaders })).json();
    assert.equal(ctx.show_legacy_language_notice, true);
    assert.equal(ctx.previous_locale, 'sv-SE');

    // User data untouched by the switch
    const after = await pg.query(
      `SELECT at.name FROM activity_template at
       JOIN parent p ON p.family_id = at.family_id
       WHERE p.email = $1 ORDER BY at.name`,
      [sv.email.toLowerCase()]
    );
    assert.deepEqual(after.rows, before.rows, 'switching locale must not modify user activities');

    // Dismiss persists — never shown again
    const dismiss = await fetch(`${http.baseUrl}/api/family/legacy-language-notice/dismiss`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(dismiss.status, 200, await dismiss.clone().text());
    ctx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, { headers: authHeaders })).json();
    assert.equal(ctx.show_legacy_language_notice, false);

    // Even after switching back and forth again (dismissed_at is COALESCEd)
    await fetch(`${http.baseUrl}/api/family/settings`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ preferred_locale: 'sv-SE' }),
    });
    await fetch(`${http.baseUrl}/api/family/settings`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ preferred_locale: 'en-GB' }),
    });
    ctx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, { headers: authHeaders })).json();
    assert.equal(ctx.show_legacy_language_notice, false, 'dismissal is once per family');

    // ── New English family: never shown ──
    const en = await registerAndLogin(http.baseUrl, 'en-GB');
    const enCtx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, {
      headers: { Cookie: en.cookies },
    })).json();
    assert.equal(enCtx.show_legacy_language_notice, false);

    // ── Early beta family (backfilled, previous_locale never tracked): shown ──
    await pg.query(
      `UPDATE family SET previous_locale = NULL, english_beta_offer_state = 'accepted_english_beta',
         legacy_language_notice_dismissed_at = NULL
       WHERE id = (SELECT family_id FROM parent WHERE LOWER(email) = $1)`,
      [en.email.toLowerCase()]
    );
    const earlyCtx = await (await fetch(`${http.baseUrl}/api/family/locale-context`, {
      headers: { Cookie: en.cookies },
    })).json();
    assert.equal(earlyCtx.show_legacy_language_notice, true, 'backfilled early beta family should see the notice');

    // New English families seed English activities
    const enActs = await pg.query(
      `SELECT at.name FROM activity_template at
       JOIN parent p ON p.family_id = at.family_id
       WHERE p.email = $1 AND at.name ~ '[åäöÅÄÖ]'`,
      [en.email.toLowerCase()]
    );
    assert.equal(enActs.rows.length, 0, 'en-GB registration must seed English activity names');
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('english demo seed is idempotent, English-only and clearly demo-marked', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');

  const runSeed = () => execFileSync(process.execPath, [path.join(ROOT, 'scripts/seed-english-demo-family.mjs')], {
    env: { ...process.env, DEMO_FAMILY_PASSWORD: 'Test-Seed-Pass-1!', DEMO_CHILD_PIN: '4321' },
    encoding: 'utf8',
  });

  async function counts(familyId) {
    const q = async (sql) => Number((await pg.query(sql, [familyId])).rows[0].count);
    return {
      children: await q('SELECT count(*) FROM child WHERE family_id = $1'),
      activities: await q('SELECT count(*) FROM activity_template WHERE family_id = $1'),
      schedules: await q('SELECT count(*) FROM weekly_schedule WHERE family_id = $1'),
      rewards: await q('SELECT count(*) FROM reward WHERE family_id = $1'),
      subSteps: await q(`SELECT count(*) FROM activity_sub_step WHERE activity_template_id IN
        (SELECT id FROM activity_template WHERE family_id = $1)`),
      completed: await q(`SELECT count(*) FROM daily_log_item WHERE completed AND daily_log_id IN
        (SELECT id FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1))`),
    };
  }

  try {
    runSeed();
    const fam = await pg.query(
      `SELECT f.id, f.preferred_locale, f.name, f.is_lifetime_free FROM family f
       JOIN parent p ON p.family_id = f.id WHERE LOWER(p.email) = $1`,
      [DEMO_EMAIL]
    );
    assert.equal(fam.rows.length, 1);
    const familyId = fam.rows[0].id;
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    assert.match(fam.rows[0].name, /Demo \(QA\)/, 'family name must be clearly demo-marked');
    assert.equal(fam.rows[0].is_lifetime_free, true);

    const first = await counts(familyId);
    assert.ok(first.children === 1 && first.activities > 0 && first.schedules === 7 && first.rewards > 0);
    assert.ok(first.subSteps > 0 && first.completed > 0, 'demo needs sub-steps and earned stars');

    // English flags enabled
    const flags = await pg.query(
      `SELECT feature_slug FROM family_features WHERE family_id = $1 ORDER BY feature_slug`, [familyId]
    );
    const slugs = flags.rows.map((r) => r.feature_slug);
    assert.ok(slugs.includes('english_app') && slugs.includes('english_child_experience'));

    // No Swedish display names anywhere in the demo content
    const sv = await pg.query(
      `SELECT count(*) FROM activity_template WHERE family_id = $1 AND name ~ '[åäöÅÄÖ]'`, [familyId]
    );
    assert.equal(Number(sv.rows[0].count), 0);

    // Idempotent: second run yields identical content counts, same family
    runSeed();
    const famAgain = await pg.query(
      `SELECT f.id FROM family f JOIN parent p ON p.family_id = f.id
       WHERE LOWER(p.email) = $1`,
      [DEMO_EMAIL]
    );
    assert.equal(famAgain.rows.length, 1);
    assert.equal(famAgain.rows[0].id, familyId);
    assert.deepEqual(await counts(familyId), first);
  } finally {
    // Clean the demo family out of the shared test DB
    const fam = await pg.query(`SELECT family_id FROM parent WHERE LOWER(email) = $1`, [DEMO_EMAIL]);
    if (fam.rows.length > 0) {
      const fid = fam.rows[0].family_id;
      const stmts = [
        `DELETE FROM daily_log_item WHERE daily_log_id IN (SELECT id FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1))`,
        `DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
        `DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`,
        `DELETE FROM reward WHERE family_id = $1`,
        `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (SELECT id FROM weekly_schedule WHERE family_id = $1)`,
        `DELETE FROM weekly_schedule WHERE family_id = $1`,
        `DELETE FROM activity_sub_step WHERE activity_template_id IN (SELECT id FROM activity_template WHERE family_id = $1)`,
        `DELETE FROM activity_template WHERE family_id = $1`,
        `DELETE FROM category WHERE family_id = $1`,
        `DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
        `DELETE FROM child WHERE family_id = $1`,
        `DELETE FROM family_features WHERE family_id = $1`,
        `DELETE FROM parent WHERE family_id = $1`,
        `DELETE FROM family WHERE id = $1`,
      ];
      for (const sql of stmts) await pg.query(sql, [fid]);
    }
    await db.cleanup();
  }
});
