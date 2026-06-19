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

test('admin family-components API and UI exist', () => {
  const api = fs.readFileSync(path.join(ROOT, 'src/routes/admin/family-components.js'), 'utf8');
  const familiesJs = fs.readFileSync(path.join(ROOT, 'public/admin/admin-families.js'), 'utf8');
  assert.match(api, /\/families\/:familyId\/subscription/);
  assert.match(api, /component_archived/);
  assert.match(familiesJs, /loadFamilyComponents/);
  assert.match(familiesJs, /Paket-komponenter/);
});

test('child seven questions tryRender is synchronous', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/child-seven-questions.js'), 'utf8');
  assert.doesNotMatch(src, /async function tryRender/);
  assert.match(src, /ready:\s*\(\)\s*=>\s*readyPromise/);
});

test('pedagog-notes publish uses correct db path', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/routes/pedagog-notes.js'), 'utf8');
  assert.match(src, /require\('\.\.\/lib\/db'\)/);
  assert.doesNotMatch(src, /\.\.\/\.\.\/src\/lib\/db/);
});

test('E12 pedagog routes exist', () => {
  const school = fs.readFileSync(path.join(ROOT, 'src/routes/pedagog-school-activities.js'), 'utf8');
  const absence = fs.readFileSync(path.join(ROOT, 'src/routes/pedagog-absence.js'), 'utf8');
  const lock = fs.readFileSync(path.join(ROOT, 'src/lib/pedagog-note-lock.js'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
  assert.match(school, /pedagog_school_activity/);
  assert.match(absence, /pedagog_day_absence/);
  assert.match(lock, /note_status = 'locked'/);
  assert.match(index, /pedagog-school-activities/);
});

test('E7 library seven questions editor exists', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public/js/library-seven-questions.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/library.html'), 'utf8');
  assert.match(js, /LibrarySevenQuestions/);
  assert.match(html, /libSevenQuestionsSection/);
});

test('E10 contextual interest triggers exist', () => {
  const triggers = fs.readFileSync(path.join(ROOT, 'public/js/package-interest-triggers.js'), 'utf8');
  const dash = fs.readFileSync(path.join(ROOT, 'public/js/dashboard-package-triggers.js'), 'utf8');
  assert.match(triggers, /guardAction/);
  assert.match(dash, /reporting_14d/);
});

test('family export includes pedagog audit tables', () => {
  const exp = fs.readFileSync(path.join(ROOT, 'src/lib/family-export.js'), 'utf8');
  assert.match(exp, /pedagog_audit_log/);
  assert.match(exp, /pedagog_school_activity/);
});

test('family-components rejects basic_app mutations', () => {
  const api = fs.readFileSync(path.join(ROOT, 'src/routes/admin/family-components.js'), 'utf8');
  assert.match(api, /basic_app kan inte ändras via admin/);
});
