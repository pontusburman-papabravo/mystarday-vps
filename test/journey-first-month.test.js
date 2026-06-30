'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { deriveContext, tryFirstMonthExperience } = require('../src/lib/journey/evaluator');
const { ReasonCode } = require('../src/lib/journey/reason-codes');
const {
  effectiveFirstMonthDay,
  monthWeek,
  pickFirstMonthExperience,
  buildMonthAffirmationStory,
  FIRST_MONTH_MIN_DAY,
  FIRST_MONTH_MAX_DAY,
  VACATION_GAP_DAYS,
} = require('../src/lib/journey/first-month');
const { deriveFirstWeekDay } = require('../src/lib/journey/first-week');
const { setupTestDb } = require('./helpers/setup.js');
const { FLAG_KEYS } = require('../src/lib/journey/flags');

const TZ = 'Europe/Stockholm';

function fsAtDaysAgo(days) {
  return DateTime.now().setZone(TZ).minus({ days }).startOf('day').plus({ hours: 10 }).toJSDate();
}

describe('first month — day derivation (dag 8–30)', () => {
  it('effective day null before day 8', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 5 });
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true), null);
  });

  it('effective day 8 on calendar day 8 after first_success', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 8 }).startOf('day');
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true), 8);
  });

  it('effective day 30 on day 30', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 30 }).startOf('day');
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true), 30);
  });

  it('effective day null after day 30', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 35 }).startOf('day');
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true), null);
  });

  it('null before celebration shown', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 15 });
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, false), null);
  });

  it('week mapping: 8–14 → week 2, 15–21 → week 3, 22–30 → week 4', () => {
    assert.equal(monthWeek(8), 2);
    assert.equal(monthWeek(14), 2);
    assert.equal(monthWeek(15), 3);
    assert.equal(monthWeek(21), 3);
    assert.equal(monthWeek(22), 4);
    assert.equal(monthWeek(30), 4);
  });
});

describe('first month — product moments (pure)', () => {
  const baseMilestones = { _celebration_shown: true };

  it('week 2 day 8 — single low-key bridge', () => {
    const d8 = pickFirstMonthExperience({ day: 8, milestones: baseMilestones, signals: {} });
    assert.equal(d8.experience, 'fm_day8_bridge');
    assert.equal(d8.priority, 'whisper');
  });

  it('week 2 day 9 silent', () => {
    const d9 = pickFirstMonthExperience({ day: 9, milestones: baseMilestones, signals: {} });
    assert.equal(d9.silent, true);
    assert.equal(d9.experience, null);
  });

  it('day 10 — first own initiative when custom activity exists', () => {
    const pick = pickFirstMonthExperience({
      day: 10,
      milestones: baseMilestones,
      signals: { hasCustomActivity: true },
    });
    assert.equal(pick.experience, 'fm_own_initiative');
    assert.equal(pick.priority, 'affirmation');
  });

  it('day 13 — calm week affirmation', () => {
    const pick = pickFirstMonthExperience({
      day: 13,
      milestones: baseMilestones,
      signals: { calmWeek: true },
    });
    assert.equal(pick.experience, 'fm_calm_week');
  });

  it('coparent within 48h of event — not calendar day 14', () => {
    const pick = pickFirstMonthExperience({
      day: 20,
      milestones: baseMilestones,
      signals: { coparentWithin48h: true },
    });
    assert.equal(pick.experience, 'fm_coparent_roots');
  });

  it('coparent outside 48h window — no moment', () => {
    const pick = pickFirstMonthExperience({
      day: 14,
      milestones: baseMilestones,
      signals: { coparentWithin48h: false, coparentJoined: true },
    });
    assert.equal(pick.experience, null);
    assert.equal(pick.silent, true);
  });

  it('week 3 day 17 — child explores independently', () => {
    const pick = pickFirstMonthExperience({
      day: 17,
      milestones: baseMilestones,
      signals: { hasNewDiscovery: true, childLedWeek: true },
    });
    assert.equal(pick.experience, 'fm_child_explores');
  });

  it('week 3 day 19 — morning flows (first morning that just worked)', () => {
    const pick = pickFirstMonthExperience({
      day: 19,
      milestones: baseMilestones,
      signals: { childSelfMorningDays: 3 },
    });
    assert.equal(pick.experience, 'fm_morning_flows');
  });

  it('week 3 day 20 — sibling moment (two children)', () => {
    const pick = pickFirstMonthExperience({
      day: 20,
      milestones: baseMilestones,
      signals: { childCount: 2, siblingActivity: true },
    });
    assert.equal(pick.experience, 'fm_sibling_moment');
  });

  it('week 4 day 28 — single low-key presence', () => {
    const pick = pickFirstMonthExperience({ day: 28, milestones: baseMilestones, signals: {} });
    assert.equal(pick.experience, 'fm_week4_presence');
    assert.equal(pick.priority, 'whisper');
  });

  it('week 4 days 26–27 and 29 silent (only one whisper on 28)', () => {
    const d26 = pickFirstMonthExperience({ day: 26, milestones: baseMilestones, signals: {} });
    const d27 = pickFirstMonthExperience({ day: 27, milestones: baseMilestones, signals: {} });
    const d29 = pickFirstMonthExperience({ day: 29, milestones: baseMilestones, signals: {} });
    assert.equal(d26.silent, true);
    assert.equal(d27.silent, true);
    assert.equal(d29.silent, true);
  });

  it('week 4 day 25 — first tradition', () => {
    const pick = pickFirstMonthExperience({
      day: 25,
      milestones: baseMilestones,
      signals: { hasTradition: true },
    });
    assert.equal(pick.experience, 'fm_tradition');
  });

  it('day 30 — month affirmation (confirm, not celebrate)', () => {
    const pick = pickFirstMonthExperience({ day: 30, milestones: baseMilestones, signals: {} });
    assert.equal(pick.experience, 'fm_month_affirmation');
    assert.equal(pick.priority, 'reflection');
  });

  it('return after vacation — welcome back takes priority', () => {
    const pick = pickFirstMonthExperience({
      day: 12,
      milestones: baseMilestones,
      signals: { returnedFromGap: true },
    });
    assert.equal(pick.experience, 'fm_welcome_back');
    assert.equal(pick.reason, 'returned_from_gap');
  });

  it('missed days do not trigger shame — week 2 stays silent', () => {
    const pick = pickFirstMonthExperience({
      day: 11,
      milestones: baseMilestones,
      signals: { missedYesterday: true, missedTwoDays: true },
    });
    assert.equal(pick.experience, null);
    assert.equal(pick.silent, true);
  });

  it('dismissed moment does not repeat', () => {
    const pick = pickFirstMonthExperience({
      day: 10,
      milestones: { ...baseMilestones, fm_dismissed_fm_own_initiative: '2026-01-01' },
      signals: { hasCustomActivity: true },
    });
    assert.equal(pick.experience, null);
    assert.equal(pick.silent, true);
  });

  it('month complete after reflection — no more moments', () => {
    const pick = pickFirstMonthExperience({
      day: 30,
      milestones: { ...baseMilestones, month_reflection_completed: '2026-01-01' },
      signals: {},
    });
    assert.equal(pick.reason, 'month_complete');
    assert.equal(pick.experience, null);
  });
});

describe('first month — affirmation story', () => {
  it('two children — warm sibling narrative', () => {
    const story = buildMonthAffirmationStory({
      childCount: 2,
      childNames: ['Ella', 'Noah'],
      hadCustomRoutine: true,
    });
    assert.match(story, /Ella och Noah/);
    assert.match(story, /er egen väg/);
    assert.doesNotMatch(story, /streak/i);
    assert.doesNotMatch(story, /poäng/i);
  });

  it('coparent present — bonusfamilj acknowledgment', () => {
    const story = buildMonthAffirmationStory({
      childName: 'Ella',
      coparentPresent: true,
    });
    assert.match(story, /tillsammans/);
  });
});

describe('first month — evaluator integration', () => {
  const milestones = {
    first_success: fsAtDaysAgo(15).toISOString(),
    child_first_completion: fsAtDaysAgo(15).toISOString(),
    parent_saw_completion: fsAtDaysAgo(15).toISOString(),
    _celebration_shown: true,
  };

  it('tryFirstMonthExperience returns affirmation on day 19', () => {
    const ctx = tryFirstMonthExperience('BUILDING_ROUTINE', milestones, {
      firstMonthEnabled: true,
      celebrationShown: true,
      firstMonthDay: 19,
      firstMonthSignals: { childSelfMorningDays: 3 },
      registryVersion: '2026-06-30-first-month-v1',
    });
    assert.ok(ctx);
    assert.equal(ctx.recommended_experiences[0], 'fm_morning_flows');
    assert.equal(ctx.priority, 'affirmation');
    assert.equal(ctx.first_month.day, 19);
  });

  it('tryFirstMonthExperience silent on week 2 quiet day', () => {
    const ctx = tryFirstMonthExperience('BUILDING_ROUTINE', milestones, {
      firstMonthEnabled: true,
      celebrationShown: true,
      firstMonthDay: 9,
      firstMonthSignals: {},
      registryVersion: '2026-06-30-first-month-v1',
    });
    assert.ok(ctx);
    assert.equal(ctx.priority, 'none');
    assert.ok(ctx.reason.includes(ReasonCode.FIRST_MONTH_SILENT));
  });

  it('deriveContext prefers first month over legacy coach on day 15', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      registryVersion: '2026-06-30-first-month-v1',
      opts: {
        firstMonthEnabled: true,
        celebrationShown: true,
        firstMonthDay: 17,
        firstMonthSignals: { hasNewDiscovery: true, childLedWeek: true },
        coachEnabled: true,
      },
    });
    assert.equal(ctx.recommended_experiences[0], 'fm_child_explores');
    assert.notEqual(ctx.recommended_experiences[0], 'coach_consistency');
  });

  it('flag off — no first month in deriveContext', () => {
    const ctx = deriveContext({
      phase: 'BUILDING_ROUTINE',
      milestones,
      opts: {
        firstMonthEnabled: false,
        firstMonthDay: 20,
        firstMonthSignals: { childCount: 2, siblingActivity: true },
        coachEnabled: true,
      },
    });
    assert.equal(ctx.first_month, undefined);
    assert.ok(!ctx.recommended_experiences?.some((k) => k.startsWith('fm_')));
  });
});

describe('first month — registry copy quality', () => {
  it('no gamification language in fm_* keys', () => {
    const registry = require('../config/journey-experience-registry.json');
    const fmKeys = Object.keys(registry.phases.BUILDING_ROUTINE).filter((k) => k.startsWith('fm_'));
    assert.ok(fmKeys.length >= 9);
    for (const key of fmKeys) {
      const exp = registry.phases.BUILDING_ROUTINE[key];
      const text = `${exp.headline} ${exp.body} ${exp.cta}`;
      assert.doesNotMatch(text, /streak/i);
      assert.doesNotMatch(text, /poäng/i);
      assert.doesNotMatch(text, /nivå/i);
      assert.doesNotMatch(text, /sammanfattning/i);
    }
  });
});

describe('first month — release readiness', () => {
  it('migration defaults family_journey_first_month_v1 to OFF', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../migrations/1809100000000_journey_first_month.js'),
      'utf8'
    );
    assert.match(src, /family_journey_first_month_v1/);
    assert.match(src, /VALUES \(\$1, false/);
    assert.match(src, /ON CONFLICT \(key\) DO NOTHING/);
  });

  it('frontend stops polling when flag off', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../public/js/journey-first-month.js'),
      'utf8'
    );
    assert.match(src, /flagOff/);
    assert.match(src, /capabilities\?\.first_month_v1/);
    assert.match(src, /month_reflection_completed/);
    assert.match(src, /first_month_moment_dismissed/);
  });

  it('flag OFF — context has no first_month block', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    try {
      await db.query(
        `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, false, 'test')
         ON CONFLICT (key) DO UPDATE SET enabled = false`,
        [FLAG_KEYS.firstMonthV1]
      );
      for (const key of [FLAG_KEYS.ingestEnabled, FLAG_KEYS.evaluatorEnabled, FLAG_KEYS.contextApi]) {
        await db.query(
          `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'test')
           ON CONFLICT (key) DO UPDATE SET enabled = true`,
          [key]
        );
      }

      const fam = await db.query(
        `INSERT INTO family (name, timezone, journey_phase) VALUES ('FM Flag Off', 'Europe/Stockholm', 'BUILDING_ROUTINE') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const fsAt = DateTime.now().setZone(TZ).minus({ days: 15 }).toISO();
      await db.query(
        `INSERT INTO family_milestones (family_id, milestone, occurred_at, source)
         VALUES ($1, 'first_success', $2, 'system')`,
        [familyId, fsAt]
      );
      await require('../db/family-milestones').markCelebrationShown(familyId);

      const { buildContextForFamily } = require('../src/lib/journey/context-builder');
      const ctx = await buildContextForFamily(familyId);
      assert.equal(ctx.capabilities.first_month_v1, false);
      assert.equal(ctx.first_month, undefined);
      assert.ok(!ctx.recommended_experiences?.some((k) => k.startsWith('fm_')));
    } finally {
      await db.cleanup();
    }
  });

  it('two children — sibling moment via evaluator day 20', () => {
    const ctx = tryFirstMonthExperience('BUILDING_ROUTINE', {
      first_success: fsAtDaysAgo(20).toISOString(),
      _celebration_shown: true,
    }, {
      firstMonthEnabled: true,
      celebrationShown: true,
      firstMonthDay: 20,
      firstMonthSignals: { childCount: 2, siblingActivity: true },
    });
    assert.equal(ctx.recommended_experiences[0], 'fm_sibling_moment');
  });

  it('return after vacation on day 12', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 12 });
    const day = effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true);
    assert.equal(day, 12);
    const pick = pickFirstMonthExperience({
      day,
      milestones: { _celebration_shown: true },
      signals: { returnedFromGap: true },
    });
    assert.equal(pick.experience, 'fm_welcome_back');
  });

  it('month reflection idempotent ingest', async (t) => {
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
        `INSERT INTO family (name, timezone) VALUES ('Month Reflect', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const { ingestClientIntent } = require('../src/lib/journey/ingest');
      const first = await ingestClientIntent({ familyId, intent: 'month_reflection_completed' });
      const second = await ingestClientIntent({ familyId, intent: 'month_reflection_completed' });
      assert.equal(first.inserted, true);
      assert.equal(second.inserted, false);
    } finally {
      await db.cleanup();
    }
  });

  it('moment dismiss scoped per experience key', async (t) => {
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
        `INSERT INTO family (name, timezone) VALUES ('Dismiss', 'Europe/Stockholm') RETURNING id`
      );
      const familyId = fam.rows[0].id;
      const { ingestClientIntent } = require('../src/lib/journey/ingest');
      await ingestClientIntent({
        familyId,
        intent: 'first_month_moment_dismissed',
        metadata: { moment: 'fm_own_initiative' },
      });
      const milestones = await require('../db/family-milestones').getMilestoneMap(familyId);
      assert.ok(milestones.fm_dismissed_fm_own_initiative);
      const pick = pickFirstMonthExperience({
        day: 10,
        milestones,
        signals: { hasCustomActivity: true },
      });
      assert.equal(pick.experience, null);
    } finally {
      await db.cleanup();
    }
  });

  it('constants match product window', () => {
    assert.equal(FIRST_MONTH_MIN_DAY, 8);
    assert.equal(FIRST_MONTH_MAX_DAY, 30);
    assert.ok(VACATION_GAP_DAYS >= 5);
  });

  it('day 8 anchor uses same calendar math as first week', () => {
    const fs = DateTime.now().setZone(TZ).minus({ days: 8 }).startOf('day');
    assert.equal(deriveFirstWeekDay(fs.toJSDate(), new Date(), TZ), 8);
    assert.equal(effectiveFirstMonthDay(fs.toJSDate(), new Date(), TZ, true), 8);
  });

  it('calibration — tryFirstMonthExperience whisper on day 8', () => {
    const ctx = tryFirstMonthExperience('BUILDING_ROUTINE', {
      first_success: fsAtDaysAgo(8).toISOString(),
      _celebration_shown: true,
    }, {
      firstMonthEnabled: true,
      celebrationShown: true,
      firstMonthDay: 8,
      firstMonthSignals: {},
    });
    assert.equal(ctx.recommended_experiences[0], 'fm_day8_bridge');
    assert.equal(ctx.priority, 'whisper');
  });

  it('calibration — frontend whisper has no CTA button', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../public/js/journey-first-month.js'),
      'utf8'
    );
    assert.match(src, /renderWhisperCard/);
    const whisperBlock = src.split('function renderWhisperCard')[1].split('function renderMomentCard')[0];
    assert.doesNotMatch(whisperBlock, /journey-fm-cta/);
  });

  it('calibration migration seeds whisper registry only — no new flag', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../migrations/1809110000000_first_month_calibration.js'),
      'utf8'
    );
    assert.match(src, /fm_day8_bridge/);
    assert.match(src, /fm_week4_presence/);
    assert.doesNotMatch(src, /feature_flag/);
  });
});
