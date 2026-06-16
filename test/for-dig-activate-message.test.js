'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildActivationSuccessMessage,
  scheduleActivatableLabel,
} = require('../src/lib/for-dig-activate');
const { getGoalBySlug } = require('../src/lib/for-dig-config');

test('scheduleActivatableLabel strips Aktivera prefix', () => {
  const goal = getGoalBySlug('trygga-kvallar');
  assert.equal(scheduleActivatableLabel(goal), 'Kvällsrutinen');
});

test('buildActivationSuccessMessage for schedule goal', () => {
  const goal = getGoalBySlug('trygga-kvallar');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Emma',
    schedule: { scheduleName: 'Kvällsrutin' },
  });
  assert.equal(msg, 'Kvällsrutinen är nu igång för Emma!');
});

test('buildActivationSuccessMessage for explore-only goal', () => {
  const goal = getGoalBySlug('sjalvstandighet');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Emma',
    activities: { copied: 2 },
  });
  assert.equal(msg, 'Material för Självständighet finns nu i biblioteket.');
});
