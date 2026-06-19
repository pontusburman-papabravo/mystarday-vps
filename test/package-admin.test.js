'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

test('admin package-interest routes exist', () => {
  const rollout = fs.readFileSync(path.join(ROOT, 'src/routes/admin/package-rollout.js'), 'utf8');
  const interest = fs.readFileSync(path.join(ROOT, 'src/routes/admin/package-interest.js'), 'utf8');
  const stats = fs.readFileSync(path.join(ROOT, 'db/subscription-admin-stats.js'), 'utf8');
  assert.match(rollout, /PACKAGES_ROLLOUT_MODE/);
  assert.match(interest, /export\.csv/);
  assert.match(stats, /by_component/);
});

test('admin UI has package interest table', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'public/admin/admin-subscription-settings.js'), 'utf8');
  assert.match(html, /packageInterestTableBody/);
  assert.match(js, /loadPackageInterest/);
  assert.match(js, /Intressefas/);
});

test('native-tab-bar has v1.2 tabs', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
  assert.match(src, /V12_TABS/);
  assert.match(src, /Utveckling/);
  assert.match(src, /Samarbete/);
  assert.match(src, /Barn\/Stöd/);
});
