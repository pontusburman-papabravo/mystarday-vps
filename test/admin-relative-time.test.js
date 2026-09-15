'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { formatAdminRelativeTime, toIsoUtc } = require('../public/admin/admin-relative-time');

const NOW = new Date('2026-09-15T05:47:00.000Z'); // 07:47 Europe/Stockholm (CEST)

test('toIsoUtc serializes Date and ISO strings', () => {
  assert.equal(toIsoUtc(new Date('2026-09-14T19:14:00.000Z')), '2026-09-14T19:14:00.000Z');
  assert.equal(toIsoUtc('2026-09-14T19:14:00.000Z'), '2026-09-14T19:14:00.000Z');
  assert.equal(toIsoUtc(null), null);
  assert.equal(toIsoUtc('not-a-date'), null);
});

test('same minute is just nu', () => {
  assert.equal(formatAdminRelativeTime('2026-09-15T05:47:00.000Z', NOW), 'just nu');
  assert.equal(formatAdminRelativeTime('2026-09-15T05:46:30.000Z', NOW), 'just nu');
});

test('small future clock skew is just nu, larger future is absolute', () => {
  assert.equal(formatAdminRelativeTime('2026-09-15T05:47:30.000Z', NOW), 'just nu');
  assert.match(
    formatAdminRelativeTime('2026-09-15T08:00:00.000Z', NOW),
    /15 sep\. 10:00/
  );
});

test('same Stockholm day uses min/hour labels', () => {
  assert.equal(formatAdminRelativeTime('2026-09-15T05:35:00.000Z', NOW), '12 min sedan');
  assert.equal(formatAdminRelativeTime('2026-09-14T23:47:00.000Z', NOW), '6 tim sedan');
});

test('previous Stockholm calendar day is igår with clock', () => {
  assert.equal(formatAdminRelativeTime('2026-09-14T19:14:00.000Z', NOW), 'igår 21:14');
  assert.equal(formatAdminRelativeTime('2026-09-14T05:50:00.000Z', NOW), 'igår 07:50');
});

test('older days use Stockholm date and time', () => {
  assert.equal(formatAdminRelativeTime('2026-09-12T10:00:00.000Z', NOW), '12 sep. 12:00');
});

test('invalid input is empty', () => {
  assert.equal(formatAdminRelativeTime('', NOW), '');
  assert.equal(formatAdminRelativeTime(null, NOW), '');
  assert.equal(formatAdminRelativeTime('bogus', NOW), '');
});

test('negative diffs never become just nu after one minute', () => {
  const label = formatAdminRelativeTime('2026-09-16T05:47:00.000Z', NOW);
  assert.notEqual(label, 'just nu');
  assert.match(label, /16 sep/);
});

test('admin Start wires live labels and the shared formatter', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/admin/admin-start.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../public/admin/index.html'), 'utf8');
  assert.match(html, /admin-relative-time\.js/);
  assert.match(js, /data-created-at/);
  assert.match(js, /formatAdminRelativeTime/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /refreshRelativeTimeLabels/);
});
