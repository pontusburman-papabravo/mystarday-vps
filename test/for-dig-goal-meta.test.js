'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { attachGoalMeta, goalMetaFromSlug } = require('../src/lib/for-dig-goal-meta');
const { lookupStarOverride, starValueForItem } = require('../src/lib/for-dig-activate');

test('goalMetaFromSlug returns icon and colors for samarbete-hemma', () => {
  const meta = goalMetaFromSlug('samarbete-hemma');
  assert.ok(meta);
  assert.equal(meta.icon, '🏠');
  assert.equal(meta.title, 'Samarbete hemma');
  assert.match(meta.accentColor, /^#/);
  assert.match(meta.accentBg, /^#/);
});

test('attachGoalMeta adds for_dig_goal when slug present', () => {
  const row = attachGoalMeta({
    id: '1',
    name: 'Städa rum',
    for_dig_goal_slug: 'samarbete-hemma',
  });
  assert.equal(row.for_dig_goal.slug, 'samarbete-hemma');
  assert.equal(row.for_dig_goal.icon, '🏠');
});

test('lookupStarOverride matches case-insensitive activity names', () => {
  const overrides = { 'Städa rum': 3 };
  assert.equal(lookupStarOverride(overrides, 'städa rum'), 3);
  assert.equal(starValueForItem({ name: 'Städa rum', star_value: 1 }, overrides), 3);
});

test('each for-dig goal has distinct accent colors', () => {
  const { FOR_DIG_GOALS } = require('../src/lib/for-dig-config');
  const colors = FOR_DIG_GOALS.map((g) => g.accentColor);
  assert.equal(new Set(colors).size, FOR_DIG_GOALS.length);
  for (const goal of FOR_DIG_GOALS) {
    assert.ok(goal.accentColor && goal.accentBg, `${goal.slug} missing accent`);
  }
});
