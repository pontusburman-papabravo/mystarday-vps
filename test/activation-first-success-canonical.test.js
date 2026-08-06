'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadLocales, t } = require('../src/lib/i18n');
const { setupTestDb } = require('./helpers/setup.js');
const {
  buildCanonicalNextAction,
  pickMilestoneAction,
  mapExperienceToAction,
} = require('../src/lib/activation/canonical-next-action');
const { FLAG_KEYS } = require('../src/lib/activation-flags');
const familyMilestones = require('../db/family-milestones');

const ROOT = path.join(__dirname, '..');

const ACTION_KEYS = [
  'create_child',
  'save_schedule',
  'child_access',
  'child_access_named',
  'await_first_completion',
  'parent_ack',
  'celebrate_first_success',
  'journey_coach',
  'engine_legacy',
  'continue_today',
  'welcome_back',
  'invite_adult',
  'share_week',
  'refer_family',
];

before(() => {
  loadLocales();
});

describe('activation_first_success_v1 migration', () => {
  it('seeds flag default OFF', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1810150000000_activation_first_success_v1_flag.js'),
      'utf8'
    );
    assert.match(src, /activation_first_success_v1/);
    assert.match(src, /false/);
  });
});

describe('home.firstSuccess server i18n', () => {
  for (const lang of ['sv-SE', 'en-GB']) {
    for (const action of ACTION_KEYS) {
      for (const part of ['headline', 'body', 'cta']) {
        it(`${lang} home.firstSuccess.actions.${action}.${part}`, () => {
          const key = `home.firstSuccess.actions.${action}.${part}`;
          const value = t(lang, key);
          assert.notEqual(value, key, `missing translation for ${key}`);
          if (action === 'engine_legacy' && part === 'body') return;
          assert.ok(value.length > 0);
        });
      }
    }
  }
});

describe('canonical next-action — milestone ladder', () => {
  it('pickMilestoneAction orders create_child before schedule', () => {
    const a = pickMilestoneAction(null, {}, 'sv-SE');
    assert.equal(a.next_action, 'create_child');
    const b = pickMilestoneAction({ child_created_at: new Date() }, {}, 'sv-SE');
    assert.equal(b.next_action, 'save_schedule');
  });

  it('mapExperienceToAction normalizes handoff_to_child', () => {
    assert.equal(mapExperienceToAction('handoff_to_child'), 'child_access');
  });

  it('returns flag_off when feature disabled', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Canon Off', 'Europe/Stockholm') RETURNING id`
      );
      const payload = await buildCanonicalNextAction(fam.rows[0].id);
      assert.equal(payload.enabled, false);
      assert.equal(payload.reason[0], 'flag_off');
    } finally {
      await db.cleanup();
    }
  });

  it('returns create_child when flag ON and empty state', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      const familyId = await insertFamily(db);
      await db.query(
        `INSERT INTO family_activation_state (family_id, signup_at) VALUES ($1, now())`,
        [familyId]
      );
      const payload = await buildCanonicalNextAction(familyId);
      assert.equal(payload.enabled, true);
      assert.equal(payload.show_primary_coach, true);
      assert.equal(payload.next_action, 'create_child');
      assert.ok(payload.cta_label);
      assert.match(payload.cta_label, /barn|child|profil|profile/i);
    } finally {
      await disableFirstSuccessFlag(db);
      await db.cleanup();
    }
  });
});

// pragma: allowlist secret
describe('first_success — derived milestone path', () => {
  it('ingestMilestone rejects direct first_success (derived only)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableJourneyIngest(db);
      const familyId = await insertFamily(db);
      const { ingestMilestone } = require('../src/lib/journey/ingest');
      const result = await ingestMilestone({ familyId, milestone: 'first_success', source: 'test' });
      assert.equal(result.inserted, false);
      const map = await familyMilestones.getMilestoneMap(familyId);
      assert.equal(map.first_success, undefined);
    } finally {
      await db.cleanup();
    }
  });

  it('maybeDeriveFirstSuccess inserts first_success and getMilestoneMap sees it', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableJourneyIngest(db);
      const familyId = await insertFamily(db);
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Alma', '⭐', 'almafs', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;
      const { ingestMilestone, maybeDeriveFirstSuccess } =
        require('../src/lib/journey/ingest');

      await ingestMilestone({ familyId, milestone: 'child_first_completion', childId, source: 'system' });
      const ack = await ingestMilestone({
        familyId,
        milestone: 'parent_saw_completion',
        source: 'system',
      });
      assert.equal(ack.inserted, true);

      const map = await familyMilestones.getMilestoneMap(familyId);
      assert.ok(map.first_success, 'first_success derived after parent_saw_completion ingest');

      const second = await maybeDeriveFirstSuccess(familyId);
      assert.equal(second, false);
    } finally {
      await db.cleanup();
    }
  });

  it('hides coach after derived first_success when v1 flag ON (retention SILENT)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      await enableFirstSuccessFlag(db);
      await enableJourneyIngest(db);
      await enableRetentionHomeFlag(db);
      const familyId = await insertFamily(db);
      const parent = await db.query(
        `INSERT INTO parent (email, password_hash, family_id, name, onboarding_completed, verified)
         VALUES ('ret-silent@test.local', 'hash', $1, 'P', true, true) RETURNING id`,
        [familyId]
      );
      const parentId = parent.rows[0].id;
      const child = await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order)
         VALUES ($1, 'Erik', '⭐', 'erikfs', 'hash', 0) RETURNING id`,
        [familyId]
      );
      const childId = child.rows[0].id;
      await db.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, childId]
      );
      const { ingestMilestone } = require('../src/lib/journey/ingest');

      await ingestMilestone({ familyId, milestone: 'child_first_completion', childId, source: 'system' });
      await ingestMilestone({ familyId, milestone: 'parent_saw_completion', source: 'system' });
      await familyMilestones.insertMilestone({
        familyId,
        milestone: 'established_routine',
        source: 'system',
      });
      const map = await familyMilestones.getMilestoneMap(familyId);
      assert.ok(map.first_success);

      const payload = await buildCanonicalNextAction(familyId, { parentId });
      assert.equal(payload.enabled, true);
      assert.equal(payload.authority, 'journey_retention');
      assert.equal(payload.show_primary_coach, false);
      assert.equal(payload.primary_action.action, 'SILENT');
    } finally {
      await disableFirstSuccessFlag(db);
      await disableRetentionHomeFlag(db);
      await db.cleanup();
    }
  });

  it('direct insertMilestone first_success is idempotent (ON CONFLICT)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    try {
      const familyId = await insertFamily(db);
      const older = new Date('2026-01-01T08:00:00Z');
      const newer = new Date('2026-06-01T08:00:00Z');
      const a = await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
        occurredAt: older,
      });
      const b = await familyMilestones.insertMilestone({
        familyId,
        milestone: 'first_success',
        source: 'system',
        occurredAt: newer,
      });
      assert.equal(a.inserted, true);
      assert.equal(b.inserted, false);
      const map = await familyMilestones.getMilestoneMap(familyId);
      assert.equal(new Date(map.first_success).toISOString(), older.toISOString());
    } finally {
      await db.cleanup();
    }
  });
});

describe('GET /api/family/next-action route', () => {
  it('is mounted on family router', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/family/index.js'), 'utf8');
    assert.match(src, /next-action/);
  });
});

describe('client authority — single primary coach', () => {
  it('engine-coach defers when ActivationFirstSuccessHub suppresses', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/engine-coach.js'), 'utf8');
    assert.match(src, /ActivationFirstSuccessHub/);
  });
  it('journey-coach defers when ActivationFirstSuccessHub suppresses', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/journey-coach.js'), 'utf8');
    assert.match(src, /shouldDeferToFirstSuccessHub/);
    assert.match(src, /ActivationFirstSuccessHub\.shouldSuppressLegacyCoaches/);
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/home-primary-action.js'), 'utf8');
    assert.match(orch, /journey_retention/);
  });
  it('hub refreshes legacy coaches after primary render', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/activation-first-success-hub.js'), 'utf8');
    assert.match(src, /refreshLegacyCoachMounts/);
    assert.match(src, /EngineCoach\.load/);
    assert.match(src, /JourneyCoach\.pollCoach/);
  });
});

async function insertFamily(db) {
  const fam = await db.query(
    `INSERT INTO family (name, timezone) VALUES ('FS Test', 'Europe/Stockholm') RETURNING id`
  );
  return fam.rows[0].id;
}

async function enableFirstSuccessFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEYS.firstSuccessV1]
  );
}

async function disableFirstSuccessFlag(db) {
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FLAG_KEYS.firstSuccessV1]);
}

async function enableJourneyIngest(db) {
  const { FLAG_KEYS } = require('../src/lib/journey/flags');
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    [FLAG_KEYS.ingestEnabled]
  );
}

async function enableRetentionHomeFlag(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`,
    ['journey_retention_home_v1']
  );
}

async function disableRetentionHomeFlag(db) {
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, ['journey_retention_home_v1']);
}
