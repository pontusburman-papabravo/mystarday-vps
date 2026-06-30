'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { deriveContext, tryFirstWeekExperience } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const {
  deriveFirstWeekDay,
  effectiveFirstWeekDay,
  isEveningHour,
  pickFirstWeekExperience,
  buildWeekReflectionStory,
  FIRST_WEEK_MAX_DAY,
} = require('../src/lib/journey/first-week');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');

const TZ = 'Europe/Stockholm';

function fsAtDaysAgo(days) {
  return DateTime.now().setZone(TZ).minus({ days }).toISO();
}

describe('first week — day derivation', () => {
  it('day 0 on same calendar day as first_success', () => {
    const fs = DateTime.now().setZone(TZ).startOf('day').plus({ hours: 10 });
    assert.equal(deriveFirstWeekDay(fs.toJSDate(), fs.toJSDate(), TZ), 0);
  });

  it('day 1 on next calendar day (first morning)', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 1 }).startOf('day');
    const today = DateTime.now().setZone(TZ).startOf('day');
    assert.equal(deriveFirstWeekDay(fs.toJSDate(), today.toJSDate(), TZ), 1);
  });

  it('effective day null before celebration shown', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 2 });
    assert.equal(effectiveFirstWeekDay(fs.toJSDate(), new Date(), TZ, false), null);
  });

  it('effective day 1–7 after celebration', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 3 });
    const day = effectiveFirstWeekDay(fs.toJSDate(), new Date(), TZ, true);
    assert.equal(day, 3);
  });

  it('effective day null after day 7', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 10 });
    assert.equal(effectiveFirstWeekDay(fs.toJSDate(), new Date(), TZ, true), null);
  });

  it('parent returning after 48h lands on correct day', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 2 });
    const returnAt = DateTime.now().setZone(TZ);
    assert.equal(deriveFirstWeekDay(fs.toJSDate(), returnAt.toJSDate(), TZ), 2);
    assert.equal(effectiveFirstWeekDay(fs.toJSDate(), returnAt.toJSDate(), TZ, true), 2);
  });
});

describe('first week — experience picker (pure)', () => {
  const baseMilestones = { _celebration_shown: true };

  it('day 1 morning before 17:00', () => {
    const morning = DateTime.now().setZone(TZ).set({ hour: 8 }).toJSDate();
    const pick = pickFirstWeekExperience({ day: 1, milestones: baseMilestones, now: morning, timezone: TZ });
    assert.equal(pick.experience, 'fw_day1_morning');
  });

  it('day 1 evening after 17:00', () => {
    const evening = DateTime.now().setZone(TZ).set({ hour: 18 }).toJSDate();
    const pick = pickFirstWeekExperience({ day: 1, milestones: baseMilestones, now: evening, timezone: TZ });
    assert.equal(pick.experience, 'fw_day1_evening');
  });

  it('day 2 silent when child logged in today', () => {
    const pick = pickFirstWeekExperience({
      day: 2,
      milestones: baseMilestones,
      signals: { childLoggedInToday: true },
    });
    assert.equal(pick.experience, null);
    assert.equal(pick.silent, true);
  });

  it('day 3 calm setback on missed yesterday — no shame copy key', () => {
    const pick = pickFirstWeekExperience({
      day: 3,
      milestones: baseMilestones,
      signals: { missedYesterday: true },
    });
    assert.equal(pick.experience, 'fw_day3_new_day');
    assert.equal(pick.reason, 'day_3_setback');
  });

  it('day 3 fallthrough when on track', () => {
    const pick = pickFirstWeekExperience({
      day: 3,
      milestones: baseMilestones,
      signals: { missedYesterday: false, missedTwoDays: false },
    });
    assert.equal(pick.fallthrough, true);
  });

  it('day 3 handles two missed days', () => {
    const pick = pickFirstWeekExperience({
      day: 3,
      milestones: baseMilestones,
      signals: { missedTwoDays: true },
    });
    assert.equal(pick.experience, 'fw_day3_new_day');
  });

  it('day 4 discovery when universe unlock', () => {
    const pick = pickFirstWeekExperience({
      day: 4,
      milestones: baseMilestones,
      signals: { hasNewDiscovery: true },
    });
    assert.equal(pick.experience, 'fw_day4_discovery');
  });

  it('day 5 and 6 — product stays silent', () => {
    const d5 = pickFirstWeekExperience({ day: 5, milestones: baseMilestones });
    const d6 = pickFirstWeekExperience({ day: 6, milestones: baseMilestones });
    assert.equal(d5.silent, true);
    assert.equal(d6.silent, true);
    assert.equal(d5.experience, null);
    assert.equal(d6.experience, null);
  });

  it('day 7 week reflection', () => {
    const pick = pickFirstWeekExperience({ day: 7, milestones: baseMilestones });
    assert.equal(pick.experience, 'fw_week_reflection');
    assert.equal(pick.priority, 'reflection');
  });

  it('dismissed day shows nothing', () => {
    const pick = pickFirstWeekExperience({
      day: 2,
      milestones: { ...baseMilestones, fw_day_dismissed_2: '2026-01-01' },
    });
    assert.equal(pick.experience, null);
    assert.equal(pick.reason, 'day_dismissed');
  });
});

describe('first week — warm reflection story', () => {
  it('uses child name and morning routine narrative', () => {
    const story = buildWeekReflectionStory({
      childName: 'Alma',
      anyCompletion: true,
      hadMorningRoutine: true,
    });
    assert.match(story, /Alma/);
    assert.match(story, /morgonrutin/);
    assert.match(story, /Ni gjorde det tillsammans/);
    assert.doesNotMatch(story, /statistik|produktivitet|streak/i);
  });

  it('gentle story when few completions', () => {
    const story = buildWeekReflectionStory({ childName: 'Erik', anyCompletion: false });
    assert.match(story, /Imorgon är en ny dag/);
    assert.doesNotMatch(story, /app/i);
  });

  it('two-child story names both children', () => {
    const story = buildWeekReflectionStory({
      childCount: 2,
      childNames: ['Alma', 'Erik'],
      anyCompletion: true,
    });
    assert.match(story, /Alma och Erik/);
    assert.doesNotMatch(story, /statistik|produktivitet|streak/i);
  });
});

describe('first week — evaluator integration', () => {
  const milestones = {
    first_success: 'a',
    child_first_completion: 'b',
    parent_saw_completion: 'c',
    _celebration_shown: true,
  };

  it('day 3 setback in BUILDING_ROUTINE', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      opts: {
        coachEnabled: true,
        firstWeekEnabled: true,
        celebrationShown: true,
        firstWeekDay: 3,
        firstWeekSignals: { missedYesterday: true },
        registryVersion: 'test',
      },
    });
    assert.ok(ctx.recommended_experiences.includes('fw_day3_new_day'));
    assert.ok(ctx.reason.includes(ReasonCode.FIRST_WEEK_SETBACK));
  });

  it('day 7 reflection blocks with warm priority', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      opts: {
        coachEnabled: true,
        firstWeekEnabled: true,
        celebrationShown: true,
        firstWeekDay: 7,
        reflectionStory: 'Den här veckan tog Alma sina första steg.',
        registryVersion: 'test',
      },
    });
    assert.equal(ctx.priority, 'reflection');
    assert.equal(ctx.blocking_experience, 'fw_week_reflection');
    assert.ok(ctx.reason.includes(ReasonCode.FIRST_WEEK_REFLECTION));
  });

  it('day 5 silent suppresses coach_consistency', () => {
    const fw = tryFirstWeekExperience('BUILDING_ROUTINE', milestones, {
      firstWeekEnabled: true,
      celebrationShown: true,
      firstWeekDay: 5,
      registryVersion: 'test',
    });
    assert.equal(fw.priority, 'none');
    assert.ok(fw.reason.includes(ReasonCode.FIRST_WEEK_SILENT));
  });

  it('after day 7 falls through to coach_consistency', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      opts: {
        coachEnabled: true,
        firstWeekEnabled: true,
        celebrationShown: true,
        firstWeekDay: null,
        registryVersion: 'test',
      },
    });
    assert.ok(ctx.recommended_experiences.includes('coach_consistency'));
  });

  it('first week works when coach_v1 is off', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      opts: {
        coachEnabled: false,
        firstWeekEnabled: true,
        celebrationShown: true,
        firstWeekDay: 1,
        registryVersion: 'test',
        now: new Date('2026-06-30T08:00:00+02:00'),
      },
    });
    assert.ok(ctx.recommended_experiences.includes('fw_day1_morning'));
  });
});

describe('first week — registry copy', () => {
  it('has all day experiences in JSON registry', () => {
    const registry = require('../config/journey-experience-registry.json');
    const phase = registry.phases.BUILDING_ROUTINE;
    const keys = [
      'fw_day1_morning', 'fw_day1_evening', 'fw_day2_quiet',
      'fw_day3_new_day', 'fw_day4_discovery', 'fw_week_reflection',
    ];
    for (const key of keys) {
      assert.ok(phase[key], `missing ${key}`);
      assert.ok(phase[key].headline);
    }
    assert.match(phase.fw_day3_new_day.headline, /Imorgon är en ny dag/);
    assert.doesNotMatch(phase.fw_day3_new_day.body, /streak|statistik|dashboard|produktivitet/i);
    assert.doesNotMatch(phase.fw_week_reflection.headline, /sammanfattning/i);
  });
});

describe('first week — frontend wiring', () => {
  it('journey-first-week.js mounts and handles reflection', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../public/js/journey-first-week.js'), 'utf8');
    assert.match(src, /journeyFirstWeekMount/);
    assert.match(src, /fw_week_reflection/);
    assert.match(src, /week_reflection_completed/);
    assert.match(src, /first_week_dismissed/);
  });

  it('journey-coach defers fw experiences to first-week module', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../public/js/journey-coach.js'), 'utf8');
    assert.match(src, /fw_/);
  });

  it('dashboard loads journey-first-week.js', () => {
    const html = require('fs').readFileSync(
      require('path').join(__dirname, '../public/dashboard.html'),
      'utf8'
    );
    assert.match(html, /journey-first-week\.js/);
  });
});

describe('first week — DB integration', () => {
  it('dismiss + reflection intents persist milestones', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      for (const key of [FLAG_KEYS.ingestEnabled, FLAG_KEYS.evaluatorEnabled, FLAG_KEYS.firstWeekV1]) {
        await db.query(
          `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
           ON CONFLICT (key) DO UPDATE SET enabled = true`,
          [key]
        );
      }

      const fam = await db.query(
        `INSERT INTO family (name, timezone, journey_phase) VALUES ('FW Test', 'Europe/Stockholm', 'BUILDING_ROUTINE') RETURNING id`
      );
      const familyId = fam.rows[0].id;

      const { ingestMilestone, ingestClientIntent } = require('../src/lib/journey/ingest');
      const { buildContextForFamily } = require('../src/lib/journey/context-builder');

      await ingestMilestone({ familyId, milestone: 'child_first_completion', source: 'system' });
      await ingestMilestone({ familyId, milestone: 'parent_saw_completion', source: 'system' });
      await require('../src/lib/journey/ingest').maybeDeriveFirstSuccess(familyId);
      await require('../db/family-milestones').markCelebrationShown(familyId);

      let ctx = await buildContextForFamily(familyId);
      assert.ok(ctx.capabilities.first_week_v1);

      const dismiss = await ingestClientIntent({
        familyId,
        intent: 'first_week_dismissed',
        metadata: { day: 2 },
      });
      assert.equal(dismiss.ok, true);

      const reflect = await ingestClientIntent({
        familyId,
        intent: 'week_reflection_completed',
        metadata: { warmth: 'tillsammans' },
      });
      assert.equal(reflect.ok, true);
      assert.equal(reflect.inserted, true);

      const dup = await ingestClientIntent({
        familyId,
        intent: 'week_reflection_completed',
      });
      assert.equal(dup.inserted, false);
    } finally {
      await db.cleanup();
    }
  });

  it('two children — signals use primary child name', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Two Kids', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      await db.query(
        `INSERT INTO child (family_id, name, emoji, username, pin, sort_order) VALUES
         ($1, 'Alma', '⭐', 'alma', 'h', 0),
         ($1, 'Erik', '🌟', 'erik', 'h', 1)`,
        [familyId]
      );

      const { loadFirstWeekSignals } = require('../src/lib/journey/first-week');
      const signals = await loadFirstWeekSignals(familyId);
      assert.equal(signals.childCount, 2);
      assert.equal(signals.childName, 'Alma');
    } finally {
      await db.cleanup();
    }
  });
});

describe('first week — offline resilience', () => {
  it('context client caches with TTL for offline display', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../public/js/journey-context-client.js'), 'utf8');
    assert.match(src, /cachedContext/);
    assert.match(src, /CACHE_TTL_MS/);
    assert.match(src, /clearCache/);
  });

  it('first-week module stops polling when flag is off', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../public/js/journey-first-week.js'), 'utf8');
    assert.match(src, /flagOff/);
    assert.match(src, /capabilities\?\.first_week_v1/);
    assert.match(src, /fetchContext\(true\)/);
  });
});

describe('first week — release readiness', () => {
  it('migration defaults family_journey_first_week_v1 to OFF', () => {
    const migration = require('../migrations/1809000000000_journey_first_week.js');
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../migrations/1809000000000_journey_first_week.js'),
      'utf8'
    );
    assert.match(src, /family_journey_first_week_v1/);
    assert.match(src, /VALUES \(\$1, false/);
    assert.equal(typeof migration.down, 'function');
  });

  it('registry seed is idempotent via ON CONFLICT DO UPDATE', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../migrations/1809000000000_journey_first_week.js'),
      'utf8'
    );
    assert.match(src, /ON CONFLICT \(version, phase, experience_key, locale\) DO UPDATE/);
  });

  it('flag OFF — context has no first_week block and no fw experiences', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await db.query(
        `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, false, 'test')
         ON CONFLICT (key) DO UPDATE SET enabled = false`,
        [FLAG_KEYS.firstWeekV1]
      );
      for (const key of [FLAG_KEYS.ingestEnabled, FLAG_KEYS.evaluatorEnabled, FLAG_KEYS.contextApi]) {
        await db.query(
          `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
           ON CONFLICT (key) DO UPDATE SET enabled = true`,
          [key]
        );
      }

      const fam = await db.query(
        `INSERT INTO family (name, timezone, journey_phase) VALUES ('Flag Off', 'Europe/Stockholm', 'BUILDING_ROUTINE') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const { ingestMilestone } = require('../src/lib/journey/ingest');
      await ingestMilestone({ familyId, milestone: 'child_first_completion', source: 'system' });
      await ingestMilestone({ familyId, milestone: 'parent_saw_completion', source: 'system' });
      await require('../src/lib/journey/ingest').maybeDeriveFirstSuccess(familyId);
      await require('../db/family-milestones').markCelebrationShown(familyId);

      const { buildContextForFamily } = require('../src/lib/journey/context-builder');
      const ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.capabilities.first_week_v1, false);
      assert.equal(ctx.first_week, undefined);
      assert.ok(!ctx.recommended_experiences?.some((k) => k.startsWith('fw_')));
    } finally {
      await db.cleanup();
    }
  });

  it('activation banner suppresses when first_week active', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../public/js/activation-program-banner.js'),
      'utf8'
    );
    assert.match(src, /shouldSuppressForJourneyFirstWeek/);
    assert.match(src, /activation_program_suppressed/);
  });

  it('journey-first-week shouldRender hides during celebration and parent ack', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../public/js/journey-first-week.js'),
      'utf8'
    );
    assert.match(src, /parent_ack_completion/);
    assert.match(src, /context\.celebration/);
  });

  it('dismiss is scoped per day — day 2 dismiss does not block day 3', () => {
    const pick = pickFirstWeekExperience({
      day: 3,
      milestones: { fw_day_dismissed_2: '2026-01-01' },
      signals: {},
    });
    assert.notEqual(pick.reason, 'day_dismissed');
    assert.equal(pick.experience, null);
    assert.equal(pick.fallthrough, true);
  });

  it('week reflection after parent returns 48h on day 7', () => {
    const fsAt = DateTime.now().setZone(TZ).minus({ days: 7 }).toJSDate();
    const returnAt = DateTime.now().setZone(TZ).toJSDate();
    const day = effectiveFirstWeekDay(fsAt, returnAt, TZ, true);
    assert.equal(day, 7);
    const pick = pickFirstWeekExperience({
      day,
      milestones: { _celebration_shown: true },
      signals: {},
    });
    assert.equal(pick.experience, 'fw_week_reflection');
  });

  it('reflection is once per family — second submit is idempotent', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await db.query(
        `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
         ON CONFLICT (key) DO UPDATE SET enabled = true`,
        [FLAG_KEYS.ingestEnabled]
      );
      const fam = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Reflect Once', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const { ingestClientIntent } = require('../src/lib/journey/ingest');
      const first = await ingestClientIntent({ familyId, intent: 'week_reflection_completed' });
      const second = await ingestClientIntent({ familyId, intent: 'week_reflection_completed' });
      assert.equal(first.inserted, true);
      assert.equal(second.inserted, false);
    } finally {
      await db.cleanup();
    }
  });

  it('migration down removes flag and registry rows', async () => {
    const mod = require('../migrations/1809000000000_journey_first_week.js');
    assert.equal(typeof mod.up, 'function');
    assert.equal(typeof mod.down, 'function');
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../migrations/1809000000000_journey_first_week.js'),
      'utf8'
    );
    assert.match(src, /DELETE FROM feature_flag WHERE key = 'family_journey_first_week_v1'/);
    assert.match(src, /DELETE FROM journey_experience_registry/);
    assert.match(src, /idx_family_milestones_once/);
  });
});
