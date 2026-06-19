/**
 * package_interest + preview-data tests (§9.8, §9.6).
 * Run: node --test test/package-interest.test.js
 */

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'REDACTED/mock_test';

let queryStack = [];

function pushRows(rows) {
  queryStack.push({ rows });
}

const mockDb = {
  query: async () => {
    const entry = queryStack.shift();
    return entry || { rows: [] };
  },
  getClient: async () => { throw new Error('getClient not mocked'); },
  pool: {},
};

const dbPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: mockDb, children: [], parent: null, paths: [],
};

function loadPackageInterest() {
  const modPath = path.join(__dirname, '../db/package-interest');
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

beforeEach(() => {
  queryStack = [];
});

test('registerInterest inserts new row', async () => {
  pushRows([]);
  pushRows([{ id: 'pi-1', component: 'reporting', family_id: 'fam-1' }]);

  const pi = loadPackageInterest();
  const result = await pi.registerInterest('fam-1', 'parent-1', 'reporting', 'bottom_nav_preview', null);

  assert.equal(result.alreadyRegistered, false);
  assert.equal(result.row.component, 'reporting');
});

test('registerInterest detects existing row', async () => {
  pushRows([{ id: 'pi-old' }]);
  pushRows([{ id: 'pi-1', component: 'pedagog' }]);

  const pi = loadPackageInterest();
  const result = await pi.registerInterest('fam-1', 'parent-1', 'pedagog', 'upgrade_page', 'Hej');

  assert.equal(result.alreadyRegistered, true);
});

test('getInterestMapForFamily returns flags', async () => {
  pushRows([
    { component: 'reporting' },
    { component: 'teacch' },
  ]);

  const pi = loadPackageInterest();
  const map = await pi.getInterestMapForFamily('fam-1');

  assert.deepEqual(map, { reporting: true, pedagog: false, teacch: true });
});

test('preview-data has all three packages with fictional content', () => {
  const data = require('../config/preview-data');
  const all = data.getAllPreviewPackages();

  assert.ok(all.reporting);
  assert.ok(all.pedagog);
  assert.ok(all.teacch);
  assert.match(all.reporting.body.childName, /exempel/i);
  assert.ok(all.pedagog.body.notePreview);
  assert.ok(all.teacch.body.questions.length >= 3);
});

test('preview-shell.js exports PreviewShell API', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/preview-shell.js'), 'utf8');
  assert.match(src, /global\.PreviewShell/);
  assert.match(src, /preview_shown/);
  assert.match(src, /Jag är intresserad/);
  assert.match(src, /\/api\/subscription\/interest/);
  assert.doesNotMatch(src, /kr\/mån|Köp nu.*pris/i);
});

test('migration creates package_interest table', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1806900000000_package_interest.js'),
    'utf8'
  );
  assert.match(mig, /package_interest/);
  assert.match(mig, /UNIQUE \(family_id, component\)/);
});

test('analytics whitelist includes preview events', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/routes/analytics.js'), 'utf8');
  assert.match(src, /preview_shown/);
  assert.match(src, /interest_registered/);
});
