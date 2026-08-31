'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  isRewardActive,
  isRewardVisibleToChild,
  selectNearestReward,
  activeRewardsForAssignment,
  visibilityLabelKind,
  editorCheckboxIdsForReward,
  visibleToChildrenFromEditorChecks,
} = require('../src/lib/reward-visible-children');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const cheapHidden = { id: 'h', name: 'Hidden', star_cost: 5, is_active: true, family_id: 'f1', visible_to_children: [] };
const midSibling = { id: 's', name: 'Sibling', star_cost: 10, is_active: true, family_id: 'f1', visible_to_children: ['child-a'] };
const familyWide = { id: 'w', name: 'Wide', star_cost: 20, is_active: true, family_id: 'f1', visible_to_children: null };
const inactive = { id: 'i', name: 'Gone', star_cost: 1, is_active: false, family_id: 'f1', visible_to_children: null };
const otherFamily = { id: 'o', name: 'Other', star_cost: 2, is_active: true, family_id: 'f2', visible_to_children: null };

describe('A4+D1 rewards hub + library editor', () => {
  it('nearest reward is active, visible to that child, and same family', () => {
    const pool = [cheapHidden, midSibling, familyWide, inactive, otherFamily];
    assert.equal(selectNearestReward(pool, { childId: 'child-b', familyId: 'f1', balance: 0 }).id, 'w');
    assert.equal(selectNearestReward(pool, { childId: 'child-a', familyId: 'f1', balance: 0 }).id, 's');
    assert.equal(selectNearestReward(pool, { childId: 'child-a', familyId: 'f1', balance: 15 }).id, 'w');
    assert.equal(selectNearestReward(pool, { childId: 'child-a', familyId: 'f2', balance: 0 }).id, 'o');
    assert.equal(selectNearestReward(pool, { childId: 'child-a', familyId: 'f1', balance: 0, }).name, 'Sibling');
    assert.equal(isRewardVisibleToChild(cheapHidden, 'child-a'), false);
    assert.equal(isRewardVisibleToChild(familyWide, 'child-a'), true);
    assert.equal(isRewardActive(inactive), false);
    assert.deepEqual(activeRewardsForAssignment(pool).map((r) => r.id).sort(), ['h', 'o', 's', 'w']);
  });

  it('[] means hidden from all, not all children', () => {
    assert.equal(visibilityLabelKind(null), 'all');
    assert.equal(visibilityLabelKind([]), 'none');
    assert.equal(visibilityLabelKind(['child-a']), 'some');
    assert.deepEqual(editorCheckboxIdsForReward(null, ['a', 'b']), ['a', 'b']);
    assert.deepEqual(editorCheckboxIdsForReward([], ['a', 'b']), []);
    assert.deepEqual(editorCheckboxIdsForReward(['b'], ['a', 'b']), ['b']);
    assert.equal(visibleToChildrenFromEditorChecks([], 2, true), null);
    assert.deepEqual(visibleToChildrenFromEditorChecks([], 2, false), []);
    assert.equal(visibleToChildrenFromEditorChecks(['a', 'b'], 2, false), null);
    assert.deepEqual(visibleToChildrenFromEditorChecks(['a'], 2, false), ['a']);
  });

  it('dashboard-stats uses per-child nearest selection', () => {
    const core = read('src/routes/family/core.js');
    assert.match(core, /selectNearestReward/);
    assert.match(core, /visible_to_children/);
    assert.match(core, /c\.family_id/);
  });

  it('hub manage CTA stays on canonical library editor', () => {
    const hub = read('public/js/rewards-hub.js');
    assert.match(hub, /href: '\/library#rewards'/);
    const magic = read('public/js/library-magic-hub.js');
    assert.match(magic, /hash === 'standard' \|\| hash === 'activities' \|\| hash === 'rewards'/);
    assert.match(magic, /rewards: 'rewards'/);
  });

  it('assignment UIs drop inactive rewards so delete is not stale', () => {
    const family = read('public/js/family.js');
    assert.match(family, /is_active !== false/);
    const settings = read('public/js/child-settings.js');
    assert.match(settings, /is_active !== false/);
    const setup = read('public/js/child-profile-setup.js');
    assert.match(setup, /is_active !== false/);
  });

  it('library editor does not label hidden rewards as all children', () => {
    const lib = read('public/js/library.js');
    assert.match(lib, /library\.rewards\.hiddenFromAll/);
    assert.match(lib, /vtc == null/);
    assert.match(lib, /visible_to_children = id \? \[\] : null/);
    assert.doesNotMatch(lib, /!r\.visible_to_children \|\| r\.visible_to_children\.length === 0/);
  });
});
