'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FOR_DIG_GOALS, getGoalBySlug, getGoalsForLocale, VALID_INTENT_REASONS } = require('../src/lib/for-dig-config');

test('for-dig config has 6 unique goals', () => {
  assert.equal(FOR_DIG_GOALS.length, 6);
  const slugs = FOR_DIG_GOALS.map((g) => g.slug);
  assert.equal(new Set(slugs).size, 6);
});

test('for-dig config ageMin <= ageMax for all goals', () => {
  for (const goal of FOR_DIG_GOALS) {
    assert.ok(goal.ageMin <= goal.ageMax, `${goal.slug}: ageMin > ageMax`);
  }
});

test('for-dig schedule goals have unique scheduleName', () => {
  const names = FOR_DIG_GOALS.filter((g) => g.scheduleName).map((g) => g.scheduleName);
  assert.equal(new Set(names).size, names.length);
});

test('helrutin goals declare scheduleSection', () => {
  const helrutin = FOR_DIG_GOALS.filter((g) => g.scheduleName);
  assert.equal(helrutin.length, 3);
  const expected = {
    'trygga-kvallar': 'kvall',
    'bra-morgnar': 'morgon',
    skolansvar: 'dag',
  };
  for (const goal of helrutin) {
    assert.equal(goal.scheduleSection, expected[goal.slug], goal.slug);
  }
});

test('getGoalBySlug returns goal or null', () => {
  assert.ok(getGoalBySlug('trygga-kvallar'));
  assert.equal(getGoalBySlug('finns-inte'), null);
});

test('intent reasons set is complete', () => {
  assert.equal(VALID_INTENT_REASONS.size, 5);
});

test('each goal has accent color pair for UI badges', () => {
  for (const goal of FOR_DIG_GOALS) {
    assert.match(goal.accentColor, /^#[0-9A-Fa-f]{6}$/, goal.slug);
    assert.match(goal.accentBg, /^#[0-9A-Fa-f]{6}$/, goal.slug);
  }
});

test('each goal has outcome headline for parents', () => {
  for (const goal of FOR_DIG_GOALS) {
    assert.ok(goal.headline && goal.headline.length > 5, goal.slug);
  }
});

test('getGoalsForLocale returns Swedish by default and English overlays for en-GB', () => {
  const sv = getGoalsForLocale('sv-SE');
  const en = getGoalsForLocale('en-GB');
  assert.equal(sv.length, 6);
  assert.equal(en.length, 6);
  const svMotivation = sv.find((g) => g.slug === 'motivation');
  const enMotivation = en.find((g) => g.slug === 'motivation');
  assert.match(svMotivation.headline, /motivationen/i);
  assert.match(enMotivation.headline, /motivation/i);
  assert.notEqual(svMotivation.headline, enMotivation.headline);
  assert.equal(svMotivation.activityNames, enMotivation.activityNames);
});
