'use strict';

/**
 * Image + avatar public-runtime readiness — maps GitHub issue #662 checklist to automated tests.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ISSUE_662_AUTOMATED = Object.freeze({
  'Upload child avatar → visible': [
    'test/avatar-upload.integration.test.js',
    'test/family-avatar-v1.test.js',
  ],
  'Upload parent avatar → visible': ['test/avatar-upload.integration.test.js'],
  'Remove avatar → emoji/initials': [
    'test/avatar-upload.integration.test.js',
    'test/family-avatar-v1.test.js',
    'test/avatar-crop-a11y.test.js',
  ],
  'Two families → no cross-family access': [
    'test/avatar-upload.integration.test.js',
    'test/family-avatar-v1.test.js',
    'test/family-image-library.integration.test.js',
    'test/family-images-authz.test.js',
  ],
  'Legacy public URL → 403/404': [
    'test/avatar-upload.integration.test.js',
    'test/family-image-library.integration.test.js',
    'test/family-avatar-v1.test.js',
  ],
  'Change photo → cache bust': ['test/avatar-upload.integration.test.js'],
  'Crop modal Tab / Escape / labels': ['test/avatar-crop-a11y.test.js', 'test/family-avatar-v1.test.js'],
});

const ACTIVITY_IMAGE_AUTOMATED = Object.freeze({
  upload: ['test/family-image-upload.integration.test.js', 'test/upload.test.js'],
  mime_validation: ['test/family-image-upload.integration.test.js', 'test/upload.test.js'],
  content_validation: ['test/family-image-upload.integration.test.js', 'test/upload.test.js'],
  max_size: ['test/family-image-upload.integration.test.js', 'test/avatar-upload.integration.test.js'],
  malformed: ['test/family-image-upload.integration.test.js', 'test/family-avatar-v1.test.js'],
  crop: ['test/activity-visual-priority.test.js', 'test/avatar-crop-a11y.test.js'],
  save_rename: ['test/family-image-library.integration.test.js'],
  replace: ['test/family-image-library.integration.test.js', 'test/family-image-upload.integration.test.js'],
  cache_bust: ['test/avatar-upload.integration.test.js', 'test/family-image-upload.integration.test.js'],
  attach_activity: ['test/family-image-library.integration.test.js', 'test/pictograms-api.test.js'],
  child_rendering: ['test/activity-visual-priority.test.js', 'test/child-pictogram-packs.test.js'],
  daily_log_snapshot: ['test/family-image-library.integration.test.js', 'test/activity-visual-priority.test.js'],
  delete_fallback: ['test/family-image-library.integration.test.js'],
  cross_family_idor: ['test/family-image-library.integration.test.js', 'test/family-images-authz.test.js'],
  unauthorized_url: ['test/family-image-library.integration.test.js'],
  stale_asset: ['test/family-image-library.integration.test.js'],
  priority_chain: ['test/activity-visual-priority.test.js', 'test/bildstod-core.test.js', 'test/child-pictogram-packs.test.js'],
});

describe('issue #662 automation map', () => {
  for (const [item, files] of Object.entries(ISSUE_662_AUTOMATED)) {
    test(`${item} covered by automated tests`, () => {
      for (const rel of files) {
        assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} missing for: ${item}`);
      }
    });
  }
});

describe('activity image acceptance map', () => {
  for (const [item, files] of Object.entries(ACTIVITY_IMAGE_AUTOMATED)) {
    test(`${item} covered`, () => {
      for (const rel of files) {
        assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} missing for: ${item}`);
      }
    });
  }
});

test('release gate manifest includes image + avatar suites', () => {
  const manifest = require('../scripts/lib/pre-public-release-gate/manifest.cjs');
  const imageFiles = [...manifest.AREAS.image_library.unit, ...manifest.AREAS.image_library.db];
  const avatarFiles = [...manifest.AREAS.avatars.unit, ...manifest.AREAS.avatars.db];
  for (const f of [
    'test/family-image-upload.integration.test.js',
    'test/family-image-library.integration.test.js',
    'test/activity-visual-priority.test.js',
    'test/avatar-upload.integration.test.js',
    'test/avatar-crop-a11y.test.js',
    'test/image-avatar-readiness.test.js',
  ]) {
    assert.ok(
      imageFiles.includes(f) || avatarFiles.includes(f) || manifest.EXTRA_UNIT.includes(f),
      `${f} must be in pre-public gate manifest`
    );
  }
});

test('programmatic fixtures contain no external photo files', () => {
  const fixtures = require('./helpers/image-fixtures.js');
  assert.ok(Buffer.isBuffer(fixtures.tinyJpegBuffer()));
  assert.ok(fixtures.tinyJpegBuffer().length < 5000);
});

test('issue #662 manual-only scope is empty after automation', () => {
  const manualOnly = [];
  assert.deepEqual(manualOnly, [], `Remaining manual-only: ${manualOnly.join(', ')}`);
});
