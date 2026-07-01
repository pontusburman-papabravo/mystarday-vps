'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  mergeScheduleSection,
  normalizeSection,
  planMergeMode,
  belongsToSection,
} = require('../src/lib/merge-schedule-section');

const MONDAY = [
  { activityTemplateId: 't1', section: 'morgon', sortOrder: 0 },
  { activityTemplateId: 't2', section: 'morgon', sortOrder: 1 },
  { activityTemplateId: 't3', section: 'dag', sortOrder: 0 },
  { activityTemplateId: 't4', section: 'dag', sortOrder: 1 },
  { activityTemplateId: 't5', section: 'kvall', sortOrder: 0 },
  { activityTemplateId: 't6', section: 'kvall', sortOrder: 1 },
];

const KVALL_PACKAGE = [
  { activityTemplateId: 'p1', section: 'kvall', sortOrder: 0 },
  { activityTemplateId: 'p2', section: 'kvall', sortOrder: 1 },
];

test('normalizeSection maps null to dag', () => {
  assert.equal(normalizeSection(null), 'dag');
  assert.equal(normalizeSection(''), 'dag');
  assert.equal(normalizeSection('morgon'), 'morgon');
});

test('planMergeMode: empty kvall section → append', () => {
  const day = MONDAY.filter((i) => i.section !== 'kvall');
  assert.equal(planMergeMode(day, 'kvall'), 'append');
});

test('planMergeMode: existing kvall items → replace', () => {
  assert.equal(planMergeMode(MONDAY, 'kvall'), 'replace');
});

test('Trygga kvällar: replace only kvall, morgon and dag untouched', () => {
  const result = mergeScheduleSection({
    existingItems: MONDAY,
    targetSection: 'kvall',
    packageItems: KVALL_PACKAGE,
  });

  assert.equal(result.mode, 'replace');
  assert.equal(result.removedInSection, 2);
  assert.equal(result.addedInSection, 2);

  const morgon = result.items.filter((i) => belongsToSection(i, 'morgon'));
  const dag = result.items.filter((i) => belongsToSection(i, 'dag'));
  const kvall = result.items.filter((i) => belongsToSection(i, 'kvall'));

  assert.deepEqual(morgon.map((i) => i.activityTemplateId), ['t1', 't2']);
  assert.deepEqual(dag.map((i) => i.activityTemplateId), ['t3', 't4']);
  assert.deepEqual(kvall.map((i) => i.activityTemplateId), ['p1', 'p2']);
});

test('append to empty section leaves other sections unchanged', () => {
  const partial = MONDAY.filter((i) => i.section !== 'kvall');
  const result = mergeScheduleSection({
    existingItems: partial,
    targetSection: 'kvall',
    packageItems: KVALL_PACKAGE,
  });

  assert.equal(result.mode, 'append');
  assert.equal(result.removedInSection, 0);
  assert.equal(result.items.length, partial.length + 2);
});

test('replace removes custom evening activities and inserts package', () => {
  const existing = [
    { activityTemplateId: 't1', section: 'morgon', sortOrder: 0 },
    { activityTemplateId: 'custom-kvall', section: 'kvall', sortOrder: 0 },
  ];
  const result = mergeScheduleSection({
    existingItems: existing,
    targetSection: 'kvall',
    packageItems: KVALL_PACKAGE,
  });

  assert.equal(result.mode, 'replace');
  assert.deepEqual(result.items.filter((i) => i.section === 'morgon').map((i) => i.activityTemplateId), ['t1']);
  assert.deepEqual(result.items.filter((i) => i.section === 'kvall').map((i) => i.activityTemplateId), ['p1', 'p2']);
});

test('empty package returns emptyPackage flag without mutation', () => {
  const result = mergeScheduleSection({
    existingItems: MONDAY,
    targetSection: 'kvall',
    packageItems: [],
  });

  assert.equal(result.emptyPackage, true);
  assert.equal(result.items.length, MONDAY.length);
  assert.deepEqual(result.items.map((i) => i.activityTemplateId), MONDAY.map((i) => i.activityTemplateId));
});

test('legacy null section treated as dag', () => {
  const legacy = [{ activityTemplateId: 'x', section: null, sortOrder: 0 }];
  const result = mergeScheduleSection({
    existingItems: legacy,
    targetSection: 'dag',
    packageItems: [{ activityTemplateId: 'y', section: 'dag', sortOrder: 0 }],
  });

  assert.equal(result.mode, 'replace');
  assert.deepEqual(result.items.map((i) => i.activityTemplateId), ['y']);
});
