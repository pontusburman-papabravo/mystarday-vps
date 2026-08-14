'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isValidPictogramKey } = require('../config/pictogram-library');
const {
  loadAndValidateStandardLibraryManifest,
  DEFAULT_MANIFEST_PATH,
  readManifestFile,
} = require('../src/lib/standard-library-manifest');

const REQUIRED_SCHEDULE_IDS = [
  'preschool_weekday',
  'school_weekday',
  'weekend',
  'morning_routine',
  'evening_routine',
  'school_break',
  'summer_break',
  'christmas_break',
];

const REQUIRED_ACTIVITY_IDS = [
  'wake_up',
  'get_dressed',
  'toilet',
  'breakfast',
  'brush_teeth',
  'wash_hands',
  'pack_school_bag',
  'outerwear',
  'leave_home',
  'preschool',
  'school',
  'after_school',
  'snack',
  'lunch',
  'dinner',
  'free_time',
  'homework',
  'shower',
  'pajamas',
  'calm_time',
  'bedtime_reading',
  'sleep',
  'excursion',
  'family_activity',
  'craft_or_game',
  'swim_water',
  'outdoor_play',
  'ice_cream_or_snack',
  'evening_activity',
  'christmas_craft',
  'christmas_cozy_snack',
];

const ZERO_STAR_ACTIVITIES = new Set([
  'free_time',
  'calm_time',
  'sleep',
  'excursion',
  'family_activity',
  'craft_or_game',
  'swim_water',
  'outdoor_play',
  'ice_cream_or_snack',
  'evening_activity',
  'christmas_craft',
  'christmas_cozy_snack',
]);

const FORBIDDEN_SOCIAL_STRINGS = [
  /gör dig redo/i,
  /förbered dig/i,
  /gör det/i,
  /göra en aktivitet/i,
  /do an activity/i,
  /kom ihåg allt/i,
  /var duktig/i,
  /säg hej/i,
  /säg hejdå/i,
  /säg godnatt/i,
  /titta i ögonen/i,
  /förskola \/ skola/i,
  /^kort morgon$/i,
  /^familjaktivitet$/i,
  /julmys & fika/i,
  /yoga/i,
  /stretching/i,
];

/** Frozen v1.1 schedule item contract — order, times, sections, optional flags. */
const FROZEN_SCHEDULE_CONTRACT = {
  morning_routine: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '07:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '07:05', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '07:15', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '07:30', end_time: null, is_optional: false, variant_key: null },
  ],
  preschool_weekday: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '07:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '07:05', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '07:20', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '07:35', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'outerwear', section: 'morgon', start_time: '07:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'leave_home', section: 'morgon', start_time: '07:45', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'preschool', section: 'dag', start_time: '08:00', end_time: '15:00', is_optional: false, variant_key: null },
    { activity_id: 'snack', section: 'dag', start_time: '15:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '16:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '17:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:10', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:20', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '19:45', end_time: null, is_optional: false, variant_key: null },
  ],
  school_weekday: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '06:45', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '06:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '07:05', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '07:20', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pack_school_bag', section: 'morgon', start_time: '07:25', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'outerwear', section: 'morgon', start_time: '07:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'leave_home', section: 'morgon', start_time: '07:35', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'school', section: 'dag', start_time: '08:00', end_time: '15:00', is_optional: false, variant_key: null },
    { activity_id: 'after_school', section: 'dag', start_time: null, end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'snack', section: 'dag', start_time: '15:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '16:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'homework', section: 'dag', start_time: '16:30', end_time: null, is_optional: true, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '18:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'shower', section: 'kvall', start_time: '19:00', end_time: null, is_optional: true, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:25', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:45', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '20:30', end_time: null, is_optional: false, variant_key: null },
  ],
  weekend: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '08:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '08:45', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '09:15', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '09:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'excursion', section: 'dag', start_time: '11:00', end_time: null, is_optional: true, variant_key: null },
    { activity_id: 'lunch', section: 'dag', start_time: '12:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'family_activity', section: 'dag', start_time: '14:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '18:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '20:15', end_time: null, is_optional: false, variant_key: null },
  ],
  evening_routine: [
    { activity_id: 'dinner', section: 'kvall', start_time: '18:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'shower', section: 'kvall', start_time: '19:00', end_time: null, is_optional: true, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:25', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'calm_time', section: 'kvall', start_time: '19:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '20:15', end_time: null, is_optional: false, variant_key: null },
  ],
  school_break: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '08:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '08:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '09:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '09:20', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '09:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'snack', section: 'dag', start_time: '11:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'lunch', section: 'dag', start_time: '12:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'excursion', section: 'dag', start_time: '13:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'craft_or_game', section: 'dag', start_time: '16:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '17:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '20:15', end_time: null, is_optional: false, variant_key: null },
  ],
  summer_break: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '09:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '09:10', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '09:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '09:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'swim_water', section: 'dag', start_time: '10:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'lunch', section: 'dag', start_time: '12:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'outdoor_play', section: 'dag', start_time: '13:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'ice_cream_or_snack', section: 'dag', start_time: '15:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '16:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '18:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'evening_activity', section: 'kvall', start_time: '19:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '20:15', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '20:25', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '20:35', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '21:00', end_time: null, is_optional: false, variant_key: null },
  ],
  christmas_break: [
    { activity_id: 'wake_up', section: 'morgon', start_time: '08:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'get_dressed', section: 'morgon', start_time: '08:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'breakfast', section: 'morgon', start_time: '09:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'morgon', start_time: '09:20', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'christmas_craft', section: 'dag', start_time: '10:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'free_time', section: 'dag', start_time: '11:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'lunch', section: 'dag', start_time: '12:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'family_activity', section: 'dag', start_time: '14:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'christmas_cozy_snack', section: 'dag', start_time: '15:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'dinner', section: 'kvall', start_time: '18:00', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'brush_teeth', section: 'kvall', start_time: '19:30', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'pajamas', section: 'kvall', start_time: '19:40', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'bedtime_reading', section: 'kvall', start_time: '19:50', end_time: null, is_optional: false, variant_key: null },
    { activity_id: 'sleep', section: 'kvall', start_time: '20:15', end_time: null, is_optional: false, variant_key: null },
  ],
};

function normalizeScheduleItem(item) {
  return {
    activity_id: item.activity_id,
    section: item.section,
    start_time: item.start_time ?? null,
    end_time: item.end_time ?? null,
    is_optional: item.is_optional === true,
    variant_key: item.variant_key ?? null,
  };
}

function scheduleItemsContract(schedule) {
  return schedule.items.map(normalizeScheduleItem);
}

function activityById(manifest, id) {
  return manifest.activities.find((a) => a.activity_id === id);
}

function scheduleById(manifest, id) {
  return manifest.schedules.find((s) => s.schedule_id === id);
}

function scheduleActivityIds(schedule) {
  return schedule.items.map((item) => item.activity_id);
}

function morningItems(schedule) {
  return schedule.items.filter((item) => item.section === 'morgon');
}

function collectAllText(manifest) {
  const texts = [];
  for (const schedule of manifest.schedules) {
    texts.push(schedule.name_i18n.sv, schedule.name_i18n['en-GB']);
    texts.push(schedule.description_i18n.sv, schedule.description_i18n['en-GB']);
  }
  for (const activity of manifest.activities) {
    texts.push(activity.name_i18n.sv, activity.name_i18n['en-GB']);
    for (const step of activity.sub_steps || []) {
      texts.push(step.name_i18n.sv, step.name_i18n['en-GB']);
    }
    for (const variant of activity.variants || []) {
      texts.push(variant.name_i18n.sv, variant.name_i18n['en-GB']);
      for (const step of variant.sub_steps || []) {
        texts.push(step.name_i18n.sv, step.name_i18n['en-GB']);
      }
    }
  }
  return texts;
}

describe('standard library v1.1 canonical content', () => {
  const manifest = loadAndValidateStandardLibraryManifest(DEFAULT_MANIFEST_PATH);

  it('has exactly 8 canonical schedules', () => {
    assert.equal(manifest.schedules.length, 8);
    assert.deepEqual(
      manifest.schedules.map((s) => s.schedule_id).sort(),
      [...REQUIRED_SCHEDULE_IDS].sort()
    );
  });

  it('has exactly 31 canonical activities', () => {
    assert.equal(manifest.activities.length, 31);
    assert.deepEqual(
      manifest.activities.map((a) => a.activity_id).sort(),
      [...REQUIRED_ACTIVITY_IDS].sort()
    );
  });

  it('covers sv and en-GB on all user-visible strings', () => {
    for (const text of collectAllText(manifest)) {
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 0);
    }
  });

  it('uses only valid pictogram icon_keys', () => {
    for (const activity of manifest.activities) {
      assert.ok(isValidPictogramKey(activity.icon_key), activity.activity_id);
    }
  });

  it('allows only 0 or 1 default_stars', () => {
    for (const activity of manifest.activities) {
      assert.ok([0, 1].includes(activity.default_stars), activity.activity_id);
    }
    assert.equal(
      manifest.activities.filter((a) => a.default_stars === 2).length,
      0
    );
  });

  it('assigns 0 stars to leisure activities', () => {
    for (const id of ZERO_STAR_ACTIVITIES) {
      assert.equal(activityById(manifest, id).default_stars, 0, id);
    }
  });

  it('enforces brush_teeth.brush = 120 and wash_hands.wash = 20', () => {
    const brush = activityById(manifest, 'brush_teeth');
    const wash = activityById(manifest, 'wash_hands');
    assert.equal(
      brush.sub_steps.find((s) => s.step_id === 'brush_teeth.brush').duration_seconds,
      120
    );
    assert.equal(
      wash.sub_steps.find((s) => s.step_id === 'wash_hands.wash').duration_seconds,
      20
    );
  });

  it('after_school has exactly two variants without top-level sub_steps', () => {
    const afterSchool = activityById(manifest, 'after_school');
    assert.equal(afterSchool.sub_steps.length, 0);
    assert.equal(afterSchool.variants.length, 2);
    assert.deepEqual(
      afterSchool.variants.map((v) => v.variant_key).sort(),
      ['after_school_club', 'after_school_home']
    );
    assert.equal(afterSchool.name_i18n.sv, 'Efter skolan');
    assert.doesNotMatch(afterSchool.name_i18n.sv, /fritids.*\/.*hem/i);
  });

  it('school_weekday uses school and pack_school_bag without toilet in morning', () => {
    const schedule = scheduleById(manifest, 'school_weekday');
    const morning = morningItems(schedule).map((i) => i.activity_id);
    assert.ok(scheduleActivityIds(schedule).includes('school'));
    assert.ok(scheduleActivityIds(schedule).includes('pack_school_bag'));
    assert.ok(scheduleActivityIds(schedule).includes('after_school'));
    assert.equal(morning.includes('toilet'), false);
    const afterSchoolItem = schedule.items.find((i) => i.activity_id === 'after_school');
    assert.equal(afterSchoolItem.variant_key, undefined);
  });

  it('preschool_weekday morning excludes toilet', () => {
    const morning = morningItems(scheduleById(manifest, 'preschool_weekday')).map((i) => i.activity_id);
    assert.equal(morning.includes('toilet'), false);
  });

  it('weekend includes pajamas', () => {
    assert.ok(scheduleActivityIds(scheduleById(manifest, 'weekend')).includes('pajamas'));
  });

  it('holiday schedules include lunch', () => {
    for (const id of ['school_break', 'summer_break', 'christmas_break']) {
      assert.ok(scheduleActivityIds(scheduleById(manifest, id)).includes('lunch'), id);
    }
  });

  it('evening_routine includes calm_time', () => {
    assert.ok(scheduleActivityIds(scheduleById(manifest, 'evening_routine')).includes('calm_time'));
  });

  it('optional items match contract', () => {
    const school = scheduleById(manifest, 'school_weekday');
    const homework = school.items.find((i) => i.activity_id === 'homework');
    const shower = school.items.find((i) => i.activity_id === 'shower');
    assert.equal(homework.is_optional, true);
    assert.equal(shower.is_optional, true);

    const weekendExcursion = scheduleById(manifest, 'weekend').items.find((i) => i.activity_id === 'excursion');
    assert.equal(weekendExcursion.is_optional, true);

    const eveningShower = scheduleById(manifest, 'evening_routine').items.find((i) => i.activity_id === 'shower');
    assert.equal(eveningShower.is_optional, true);
  });

  it('evening ordering follows brush → pajamas → reading → sleep when shower optional', () => {
    const ids = scheduleById(manifest, 'evening_routine').items.map((i) => i.activity_id);
    const brushIdx = ids.indexOf('brush_teeth');
    const pajamasIdx = ids.indexOf('pajamas');
    const readingIdx = ids.indexOf('bedtime_reading');
    const sleepIdx = ids.indexOf('sleep');
    assert.ok(brushIdx < pajamasIdx);
    assert.ok(pajamasIdx < readingIdx);
    assert.ok(readingIdx < sleepIdx);
  });

  it('christmas_cozy_snack uses natural Swedish without ampersand', () => {
    const activity = activityById(manifest, 'christmas_cozy_snack');
    assert.equal(activity.name_i18n.sv, 'Julmys och fika');
    assert.doesNotMatch(activity.name_i18n.sv, /&/);
  });

  it('excludes legacy schedule aliases and forbidden exact labels', () => {
    for (const schedule of manifest.schedules) {
      assert.notEqual(schedule.schedule_id, 'short_morning');
      assert.notEqual(schedule.name_i18n.sv, 'Kort morgon');
    }
  });

  it('excludes forbidden vague or social-demand strings', () => {
    const joined = collectAllText(manifest).join('\n');
    for (const pattern of FORBIDDEN_SOCIAL_STRINGS) {
      assert.doesNotMatch(joined, pattern, pattern.toString());
    }
  });

  it('has exactly 98 canonical schedule items', () => {
    const total = manifest.schedules.reduce((n, s) => n + s.items.length, 0);
    assert.equal(total, 98);
  });

  it('matches frozen schedule item contract for every schedule', () => {
    for (const scheduleId of REQUIRED_SCHEDULE_IDS) {
      const schedule = scheduleById(manifest, scheduleId);
      const expected = FROZEN_SCHEDULE_CONTRACT[scheduleId];
      assert.ok(expected, `missing frozen contract for ${scheduleId}`);
      assert.deepEqual(
        scheduleItemsContract(schedule),
        expected,
        `schedule item contract mismatch: ${scheduleId}`
      );
    }
  });

  it('after_school in school_weekday has no invented start or end time', () => {
    const item = scheduleById(manifest, 'school_weekday').items.find(
      (i) => i.activity_id === 'after_school'
    );
    assert.equal(item.start_time ?? null, null);
    assert.equal(item.end_time ?? null, null);
  });

  it('preschool and school interval items use 08:00–15:00', () => {
    const preschool = scheduleById(manifest, 'preschool_weekday').items.find(
      (i) => i.activity_id === 'preschool'
    );
    const school = scheduleById(manifest, 'school_weekday').items.find(
      (i) => i.activity_id === 'school'
    );
    assert.deepEqual(
      { start_time: preschool.start_time, end_time: preschool.end_time },
      { start_time: '08:00', end_time: '15:00' }
    );
    assert.deepEqual(
      { start_time: school.start_time, end_time: school.end_time },
      { start_time: '08:00', end_time: '15:00' }
    );
  });

  it('morning_routine has four morning steps without done activity', () => {
    const schedule = scheduleById(manifest, 'morning_routine');
    assert.equal(schedule.items.length, 4);
    assert.deepEqual(scheduleItemsContract(schedule), FROZEN_SCHEDULE_CONTRACT.morning_routine);
  });
});

describe('standard library v1.1 content file integrity', () => {
  it('raw JSON matches validated manifest loader', () => {
    const raw = readManifestFile(DEFAULT_MANIFEST_PATH);
    assert.equal(raw.content_version, '1.1');
    assert.equal(raw.activities.length, 31);
    assert.equal(raw.schedules.length, 8);
  });
});
