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

test('buildActivationSuccessMessage for explore-only goal with copied activities', () => {
  const goal = getGoalBySlug('sjalvstandighet');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Emma',
    activities: { copied: 2, matched: 2, skipped: 0 },
  });
  assert.equal(msg, '2 aktiviteter tillagda i biblioteket. Lägg till dem i Emmas schema när ni är redo.');
});

test('buildActivationSuccessMessage for samarbete-hemma when activities already exist', () => {
  const goal = getGoalBySlug('samarbete-hemma');
  const msg = buildActivationSuccessMessage(goal, {
    child_name: 'Lucas',
    activities: { copied: 0, matched: 3, skipped: 3 },
  });
  assert.equal(msg, 'Aktiviteterna finns redan i biblioteket. Lägg till dem i Lucass schema när ni vill.');
});

test('buildActivationNextStep points activity goals to schedule', () => {
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
