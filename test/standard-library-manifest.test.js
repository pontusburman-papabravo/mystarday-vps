'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateStandardLibraryManifest,
  readManifestFile,
  DEFAULT_MANIFEST_PATH,
} = require('../src/lib/standard-library-manifest');

function cloneManifest() {
  return structuredClone(readManifestFile(DEFAULT_MANIFEST_PATH));
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
    delete manifest.activities[0].name_i18n.sv;
    expectInvalid(manifest, /sv/i);
  });

  it('missing en-GB fails', () => {
    const manifest = cloneManifest();
    delete manifest.activities[0].name_i18n['en-GB'];
    expectInvalid(manifest, /en-GB/i);
  });

  it('empty icon_key fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].icon_key = '';
    expectInvalid(manifest, /icon_key/i);
  });

  it('invalid icon_key fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].icon_key = 'does_not_exist';
    expectInvalid(manifest, /icon_key/i);
  });

  it('activity_id invalid fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].activity_id = 'BrushTeeth';
    expectInvalid(manifest, /activity_id|must match/i);
  });

  it('duplicate activity_id fails', () => {
    const manifest = cloneManifest();
    manifest.activities.push(structuredClone(manifest.activities[0]));
    expectInvalid(manifest, /duplicate activity_id/i);
  });

  it('duplicate schedule_id fails', () => {
    const manifest = cloneManifest();
    manifest.schedules.push(structuredClone(manifest.schedules[0]));
    expectInvalid(manifest, /duplicate schedule_id/i);
  });

  it('duplicate step_id fails', () => {
    const manifest = cloneManifest();
    manifest.activities[1].variants[1].sub_steps[0].step_id =
      manifest.activities[1].variants[0].sub_steps[0].step_id;
    expectInvalid(manifest, /duplicate global step_id/i);
  });

  it('nested/variant step_id with multiple dots works', () => {
    const manifest = cloneManifest();
    manifest.activities[1].variants[0].sub_steps.push({
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
    manifest.schedules[0].items.push({
      activity_id: 'after_school',
      section: 'dag',
      variant_key: 'after_school_unknown',
    });
    expectInvalid(manifest, /unknown variant_key/i);
  });

  it('stars=2 fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].default_stars = 2;
    expectInvalid(manifest, /default_stars|literal/i);
  });

  it('bad section fails', () => {
    const manifest = cloneManifest();
    manifest.schedules[0].items[0].section = 'natt';
    expectInvalid(manifest, /section/i);
  });

  it('duration 4 fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].sub_steps[0].duration_seconds = 4;
    expectInvalid(manifest, /duration_seconds|5/i);
  });

  it('duration 3601 fails', () => {
    const manifest = cloneManifest();
    manifest.activities[0].sub_steps[0].duration_seconds = 3601;
    expectInvalid(manifest, /duration_seconds|3600/i);
  });

  it('brush_teeth.brush != 120 fails when step exists', () => {
    const manifest = cloneManifest();
    manifest.activities[0].sub_steps[0].duration_seconds = 90;
    expectInvalid(manifest, /brush_teeth\.brush.*120/i);
  });
});
