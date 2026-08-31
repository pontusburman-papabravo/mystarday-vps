'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { cookieHeader } = require('./helpers/http.js');
const {
  registerAndLogin,
  onboardingChildRaw,
  onboardingScheduleRaw,
  childLoginRaw,
  seedSchoolWeekdaySchedules,
} = require('./helpers/golden-path-fas6.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');
const { familyHasActiveRewards } = require('../src/lib/journey/ingest-rewards-ready-if-seeded');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const JOURNEY_FLAGS_ON = [
  FLAG_KEYS.ingestEnabled,
  FLAG_KEYS.evaluatorEnabled,
  FLAG_KEYS.contextApi,
];

async function enableJourneyFlags(query) {
  for (const key of JOURNEY_FLAGS_ON) {
    await query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

function parentHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
}

async function putChildPin(baseUrl, session, childId, pin) {
  return fetch(`${baseUrl}/api/children/${childId}/pin`, {
    method: 'PUT',
    headers: parentHeaders(session),
    body: JSON.stringify({ pin }),
  });
}

describe('activation slim handoff integration', () => {
  it('shown onboarding PIN logs the child in; wrong PIN fails', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await seedSchoolWeekdaySchedules(db);
      const session = await registerAndLogin(http.baseUrl);
      const childRes = await onboardingChildRaw(http.baseUrl, session, {
        name: 'SlimPin',
        emoji: '🌟',
      });
      assert.equal(childRes.status, 201, childRes.text);
      const pin = childRes.body.pin;
      const username = childRes.body.username;
      assert.match(String(pin), /^\d{4}$/);
      assert.ok(username);

      const ok = await childLoginRaw(http.baseUrl, { username, pin });
      assert.equal(ok.status, 200, ok.text);

      const bad = await childLoginRaw(http.baseUrl, { username, pin: '0000' });
      assert.notEqual(bad.status, 200);
      assert.ok(bad.status === 401 || bad.status === 403 || bad.status === 429);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('seeded rewards + saved routine ingest rewards_ready and reach FIRST_USE', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableJourneyFlags(db.query);
      await seedSchoolWeekdaySchedules(db);
      const session = await registerAndLogin(http.baseUrl);
      const childRes = await onboardingChildRaw(http.baseUrl, session, {
        name: 'SlimJourney',
        emoji: '🌟',
      });
      assert.equal(childRes.status, 201, childRes.text);
      const familyRow = await db.query('SELECT family_id FROM child WHERE id = $1', [childRes.body.id]);
      const familyId = familyRow.rows[0].family_id;
      assert.ok(familyId);
      assert.equal(await familyHasActiveRewards(familyId), true);

      const sched = await onboardingScheduleRaw(http.baseUrl, session, {
        child_id: childRes.body.id,
        template_group: 'skola',
      });
      assert.equal(sched.status, 200, sched.text);

      const milestones = await db.query(
        `SELECT milestone FROM family_milestones WHERE family_id = $1`,
        [familyId]
      );
      const names = milestones.rows.map((r) => r.milestone);
      assert.ok(names.includes('routine_ready'), names.join(','));
      assert.ok(names.includes('rewards_ready'), names.join(','));

      const fam = await db.query('SELECT journey_phase FROM family WHERE id = $1', [familyId]);
      assert.equal(fam.rows[0].journey_phase, 'FIRST_USE');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('does not ingest rewards_ready when the family has no active rewards', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await enableJourneyFlags(db.query);
      await seedSchoolWeekdaySchedules(db);
      const session = await registerAndLogin(http.baseUrl);
      const childRes = await onboardingChildRaw(http.baseUrl, session, {
        name: 'NoReward',
        emoji: '🌟',
      });
      assert.equal(childRes.status, 201, childRes.text);
      const familyRow = await db.query('SELECT family_id FROM child WHERE id = $1', [childRes.body.id]);
      const familyId = familyRow.rows[0].family_id;
      await db.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
      assert.equal(await familyHasActiveRewards(familyId), false);
      const sched = await onboardingScheduleRaw(http.baseUrl, session, {
        child_id: childRes.body.id,
        template_group: 'skola',
      });
      assert.equal(sched.status, 200, sched.text);

      const ready = await db.query(
        `SELECT 1 FROM family_milestones WHERE family_id = $1 AND milestone = 'rewards_ready'`,
        [familyId]
      );
      assert.equal(ready.rows.length, 0);
      const fam = await db.query('SELECT journey_phase FROM family WHERE id = $1', [familyId]);
      assert.equal(fam.rows[0].journey_phase, 'SETTING_UP');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('unauthorized, cross-family, and revoked parents cannot change child PIN', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const owner = await registerAndLogin(http.baseUrl, { name: 'Pin Owner' });
      const other = await registerAndLogin(http.baseUrl, { name: 'Pin Other' });
      const childRes = await onboardingChildRaw(http.baseUrl, owner, {
        name: 'AuthzBarn',
        emoji: '🌟',
      });
      assert.equal(childRes.status, 201, childRes.text);
      const childId = childRes.body.id;

      const stranger = await putChildPin(http.baseUrl, other, childId, '2580');
      assert.equal(stranger.status, 403, await stranger.text());

      const parentRow = await db.query(
        `SELECT id FROM parent WHERE email = $1`,
        [owner.email]
      );
      const parentId = parentRow.rows[0].id;
      await db.query(
        `UPDATE parent_child SET revoked_at = NOW(), revoked_by = $1
         WHERE parent_id = $1 AND child_id = $2 AND revoked_at IS NULL`,
        [parentId, childId]
      );
      const revoked = await putChildPin(http.baseUrl, owner, childId, '2580');
      assert.equal(revoked.status, 403, await revoked.text());
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  it('authorized parent can set a new PIN without knowing the old one', async (t) => {
    const db = await setupTestDb();
    if (db.skip) return t.skip('No real TEST_DATABASE_URL');
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await registerAndLogin(http.baseUrl);
      const childRes = await onboardingChildRaw(http.baseUrl, session, {
        name: 'ResetBarn',
        emoji: '🌟',
      });
      assert.equal(childRes.status, 201, childRes.text);
      const put = await putChildPin(http.baseUrl, session, childRes.body.id, '2580');
      assert.equal(put.status, 200, await put.text());
      const login = await childLoginRaw(http.baseUrl, {
        username: childRes.body.username,
        pin: '2580',
      });
      assert.equal(login.status, 200, login.text);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
