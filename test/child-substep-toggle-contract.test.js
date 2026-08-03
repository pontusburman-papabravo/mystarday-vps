'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SUBSTEPS_SRC = path.join(__dirname, '../public/js/child-dashboard-substeps.js');
const OFFLINE_SRC = path.join(__dirname, '../public/js/offline-queue.js');
const SUPPORT_SRC = path.join(__dirname, '../public/js/child-support-layer.js');
const CHILD_SELF_SRC = path.join(__dirname, '../src/routes/daily-logs/child-self.js');

test('toggleSubStep guards duplicate in-flight taps', () => {
  const src = fs.readFileSync(SUBSTEPS_SRC, 'utf8');
  assert.match(src, /_substepInFlight/);
  assert.match(src, /substepInFlightKey/);
  assert.match(src, /_substepInFlight\.has\(flightKey\)/);
  assert.match(src, /_substepInFlight\.delete\(flightKey\)/);
});

test('toggleSubStep prefers subStepCache over stale done arg', () => {
  const src = fs.readFileSync(SUBSTEPS_SRC, 'utf8');
  assert.match(src, /currentSubStepDone/);
  assert.match(src, /currentSubStepDone\(itemId, subStepId, isCurrentlyDone\)/);
});

test('toggleSubStep applies pending and error row classes', () => {
  const src = fs.readFileSync(SUBSTEPS_SRC, 'utf8');
  assert.match(src, /setSubstepRowUi\(subStepId, 'pending'/);
  assert.match(src, /setSubstepRowUi\(subStepId, 'error'/);
});

test('toggleSubStep queues offline substep mutations', () => {
  const src = fs.readFileSync(SUBSTEPS_SRC, 'utf8');
  assert.match(src, /queueSubstepComplete/);
  assert.match(src, /queueSubstepUncomplete/);
});

test('offline-queue maps substep actions to PUT complete/uncomplete routes', () => {
  const src = fs.readFileSync(OFFLINE_SRC, 'utf8');
  assert.match(src, /COMPLETE_SUBSTEP/);
  assert.match(src, /UNCOMPLETE_SUBSTEP/);
  assert.match(src, /sub-steps\/\$\{subStepId\}\/complete/);
  assert.match(src, /sub-steps\/\$\{subStepId\}\/uncomplete/);
  assert.match(src, /'substep:' \+ action\.payload\.itemId \+ ':' \+ action\.payload\.subStepId/);
  assert.match(src, /queueSubstepComplete/);
  assert.match(src, /queueSubstepUncomplete/);
});

test('child-support-layer uses cache-derived done and a11y on rows', () => {
  const src = fs.readFileSync(SUPPORT_SRC, 'utf8');
  assert.match(src, /window\.subStepCache/);
  assert.match(src, /role="button"/);
  assert.match(src, /aria-pressed/);
});

test('child sub-steps GET orders by sort_order then id', () => {
  const src = fs.readFileSync(CHILD_SELF_SRC, 'utf8');
  assert.match(src, /ORDER BY s\.sort_order, s\.id/);
});
