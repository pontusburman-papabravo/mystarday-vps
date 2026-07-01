'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildActivationSuccessMessage,
  buildActivationNextStep,
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

test('buildActivationSuccessMessage for activity goal with schedule append', () => {
  const goal = getGoalBySlug('sjalvstandighet');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Emma',
    child_names: ['Emma'],
    activities: { copied: 2, matched: 2, skipped: 0 },
    activitySchedule: { filledDays: [1, 2, 3, 4, 5], child_count: 1 },
  });
  assert.equal(msg, '2 aktiviteter tillagda i Emmas schema!');
});

test('buildActivationSuccessMessage for samarbete-hemma when activities already exist', () => {
  const goal = getGoalBySlug('samarbete-hemma');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Lucas',
    child_names: ['Lucas'],
    activities: { copied: 0, matched: 3, skipped: 3 },
    activitySchedule: { filledDays: [0, 1, 2, 3, 4, 5, 6], child_count: 1 },
  });
  assert.equal(msg, 'Aktiviteterna finns nu i Lucass schema.');
});

test('buildActivationSuccessMessage for multiple children', () => {
  const goal = getGoalBySlug('samarbete-hemma');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Anna, Erik',
    child_names: ['Anna', 'Erik'],
    activities: { copied: 3, matched: 3, skipped: 0 },
    activitySchedule: { filledDays: [1, 2, 3], child_count: 2 },
  });
  assert.equal(msg, '3 aktiviteter tillagda i barnens schema!');
});

test('buildActivationNextStep points activity goals with schedule to schedule view', () => {
  const step = buildActivationNextStep(
    {
      activities: { copied: 2, matched: 2, skipped: 0 },
      activitySchedule: { filledDays: [1, 2, 3, 4, 5] },
    },
    'child-uuid-1'
  );
  assert.deepEqual(step, {
    label: 'Visa schema',
    href: '/schedule?child=child-uuid-1',
    hint: 'Aktiviteterna är inlagda i veckoschemat.',
  });
});

test('buildActivationNextStep points library-only activity goals to schedule', () => {
  const step = buildActivationNextStep(
    { activities: { copied: 2, matched: 2, skipped: 0 } },
    'child-uuid-1'
  );
  assert.deepEqual(step, {
    label: 'Lägg till i schema',
    href: '/schedule?child=child-uuid-1',
    hint: 'Aktiviteterna finns i biblioteket — lägg till dem i schemat när ni vill börja.',
  });
});

test('buildActivationNextStep points schedule goals to schedule', () => {
  const step = buildActivationNextStep(
    { schedule: { scheduleName: 'Kvällsrutin' } },
    'child-uuid-2'
  );
  assert.deepEqual(step, {
    label: 'Visa schema',
    href: '/schedule?child=child-uuid-2',
    hint: 'Rutinen är redan inlagd i veckoschemat.',
  });
});
