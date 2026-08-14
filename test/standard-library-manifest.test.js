'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStandardLibraryManifest,
  readManifestFile,
  DEFAULT_MANIFEST_PATH,
} = require('../src/lib/standard-library-manifest');
const { ScheduleTimeSchema } = require('../src/lib/standard-library-manifest-schema');

function cloneManifest() {
  return structuredClone(readManifestFile(DEFAULT_MANIFEST_PATH));
}

function findActivity(manifest, activityId) {
  return manifest.activities.find((a) => a.activity_id === activityId);
}

function findSchedule(manifest, scheduleId) {
  return manifest.schedules.find((s) => s.schedule_id === scheduleId);
}

function expectValid(manifest) {
  const result = validateStandardLibraryManifest(manifest);
  assert.equal(result.ok, true, result.errors.join('\n'));
}

function expectInvalid(manifest, matcher) {
  const result = validateStandardLibraryManifest(manifest);
  assert.equal(result.ok, false);
  const joined = result.errors.join('\n');
  if (typeof matcher === 'string') {
    assert.match(joined, new RegExp(matcher, 'i'));
  } else if (matcher instanceof RegExp) {
    assert.match(joined, matcher);
  }
}

describe('standard library manifest contract', () => {
  it('valid fixture passes', () => {
    expectValid(cloneManifest());
  });

  it('missing sv fails', () => {
    const manifest = cloneManifest();
    delete findActivity(manifest, 'brush_teeth').name_i18n.sv;
    expectInvalid(manifest, /sv/i);
  });

  it('missing en-GB fails', () => {
    const manifest = cloneManifest();
    delete findActivity(manifest, 'brush_teeth').name_i18n['en-GB'];
    expectInvalid(manifest, /en-GB/i);
  });

  it('empty icon_key fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').icon_key = '';
    expectInvalid(manifest, /icon_key/i);
  });

  it('invalid icon_key fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').icon_key = 'does_not_exist';
    expectInvalid(manifest, /icon_key/i);
  });

  it('activity_id invalid fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').activity_id = 'BrushTeeth';
    expectInvalid(manifest, /activity_id|must match/i);
  });

  it('duplicate activity_id fails', () => {
    const manifest = cloneManifest();
    manifest.activities.push(structuredClone(findActivity(manifest, 'brush_teeth')));
    expectInvalid(manifest, /duplicate activity_id/i);
  });

  it('duplicate schedule_id fails', () => {
    const manifest = cloneManifest();
    manifest.schedules.push(structuredClone(manifest.schedules[0]));
    expectInvalid(manifest, /duplicate schedule_id/i);
  });

  it('duplicate step_id fails', () => {
    const manifest = cloneManifest();
    const afterSchool = findActivity(manifest, 'after_school');
    afterSchool.variants[1].sub_steps[0].step_id = afterSchool.variants[0].sub_steps[0].step_id;
    expectInvalid(manifest, /duplicate global step_id/i);
  });

  it('duplicate nested variant step_id across variants fails', () => {
    const manifest = cloneManifest();
    const afterSchool = findActivity(manifest, 'after_school');
    afterSchool.variants[1].sub_steps.push({
      step_id: 'after_school.after_school_club.arrive',
      name_i18n: {
        sv: 'Dublett',
        'en-GB': 'Duplicate',
      },
    });
    expectInvalid(manifest, /duplicate global step_id/i);
  });

  it('nested/variant step_id with multiple dots works', () => {
    const manifest = cloneManifest();
    const afterSchool = findActivity(manifest, 'after_school');
    afterSchool.variants[0].sub_steps.push({
      step_id: 'after_school.after_school_club.play_outside',
      name_i18n: {
        sv: 'Lek ute',
        'en-GB': 'Play outside',
      },
    });
    expectValid(manifest);
  });

  it('unknown activity ref fails', () => {
    const manifest = cloneManifest();
    manifest.schedules[0].items.push({
      activity_id: 'unknown_activity',
      section: 'morgon',
    });
    expectInvalid(manifest, /unknown activity_id/i);
  });

  it('unknown variant fails', () => {
    const manifest = cloneManifest();
    findSchedule(manifest, 'school_weekday').items.push({
      activity_id: 'after_school',
      section: 'dag',
      variant_key: 'after_school_unknown',
    });
    expectInvalid(manifest, /unknown variant_key/i);
  });

  it('stars=2 fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').default_stars = 2;
    expectInvalid(manifest, /default_stars|literal/i);
  });

  it('bad section fails', () => {
    const manifest = cloneManifest();
    findSchedule(manifest, 'morning_routine').items[0].section = 'natt';
    expectInvalid(manifest, /section/i);
  });

  it('section eftermiddag fails', () => {
    const manifest = cloneManifest();
    findSchedule(manifest, 'morning_routine').items[0].section = 'eftermiddag';
    expectInvalid(manifest, /section/i);
  });

  it('duration 4 fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').sub_steps.find((s) => s.step_id === 'brush_teeth.brush').duration_seconds = 4;
    expectInvalid(manifest, /duration_seconds|5/i);
  });

  it('duration 3601 fails', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').sub_steps.find((s) => s.step_id === 'brush_teeth.brush').duration_seconds = 3601;
    expectInvalid(manifest, /duration_seconds|3600/i);
  });

  it('brush_teeth.brush != 120 fails when step exists', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'brush_teeth').sub_steps.find((s) => s.step_id === 'brush_teeth.brush').duration_seconds = 90;
    expectInvalid(manifest, /brush_teeth\.brush.*120/i);
  });

  it('wash_hands.wash != 20 fails when step exists', () => {
    const manifest = cloneManifest();
    findActivity(manifest, 'wash_hands').sub_steps.find((s) => s.step_id === 'wash_hands.wash').duration_seconds = 15;
    expectInvalid(manifest, /wash_hands\.wash.*20/i);
  });
});

describe('standard library schedule time schema', () => {
  const validTimes = ['00:00', '07:05', '15:30', '23:59'];
  const invalidTimes = ['7:05', '07:5', '24:00', '12:60', 'abc', ''];

  for (const time of validTimes) {
    it(`accepts valid time ${time}`, () => {
      const result = ScheduleTimeSchema.safeParse(time);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });
  }

  for (const time of invalidTimes) {
    it(`rejects invalid time ${time || '(empty string)'}`, () => {
      const result = ScheduleTimeSchema.safeParse(time);
      assert.equal(result.success, false);
    });
  }

  it('accepts null and undefined for optional schedule times', () => {
    assert.equal(ScheduleTimeSchema.safeParse(null).success, true);
    assert.equal(ScheduleTimeSchema.safeParse(undefined).success, true);
  });

  it('valid manifest schedule item accepts omitted start_time and end_time', () => {
    const manifest = cloneManifest();
    const afterSchool = findSchedule(manifest, 'school_weekday').items.find(
      (i) => i.activity_id === 'after_school'
    );
    delete afterSchool.start_time;
    delete afterSchool.end_time;
    expectValid(manifest);
  });

  it('invalid start_time on schedule item fails', () => {
    const manifest = cloneManifest();
    findSchedule(manifest, 'morning_routine').items[0].start_time = '7:05';
    expectInvalid(manifest, /start_time|HH:MM/i);
  });

  it('invalid end_time on schedule item fails', () => {
    const manifest = cloneManifest();
    findSchedule(manifest, 'preschool_weekday').items.find(
      (i) => i.activity_id === 'preschool'
    ).end_time = '25:00';
    expectInvalid(manifest, /end_time|HH:MM/i);
  });

  it('null start_time and end_time on schedule item passes', () => {
    const manifest = cloneManifest();
    const afterSchool = findSchedule(manifest, 'school_weekday').items.find(
      (i) => i.activity_id === 'after_school'
    );
    afterSchool.start_time = null;
    afterSchool.end_time = null;
    expectValid(manifest);
  });
});
