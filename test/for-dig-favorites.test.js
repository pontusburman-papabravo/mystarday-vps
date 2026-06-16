'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getGoalBySlug } = require('../src/lib/for-dig-config');

test('getInstallLeaderboard maps unknown slugs safely', () => {
  const row = { goal_slug: 'unknown-slug', install_count: 10 };
  const goal = getGoalBySlug(row.goal_slug);
  assert.equal(goal, null);
  const title = goal ? goal.title : row.goal_slug;
  assert.equal(title, 'unknown-slug');
});

test('favorite goal slugs must exist in config', () => {
  const slugs = ['trygga-kvallar', 'bra-morgnar', 'motivation'];
  for (const slug of slugs) {
    assert.ok(getGoalBySlug(slug), `missing config for ${slug}`);
  }
});
