'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  loadPack,
  clearPackCache,
  getAllProgressionNodes,
  getRewardBySignal,
  interpolateTemplate,
  resolveExperienceCopy,
} = require('../src/lib/experience-pack');
const { evaluateUnlockSignal, findUnlockableNodes } = require('../src/lib/platform-runtime/unlock-signals');
const { buildWorldFeedback } = require('../src/lib/platform-runtime/world-runtime');

describe('Experience Pack loader', () => {
  beforeEach(() => clearPackCache());

  it('loads child_se pack with manifest and includes', () => {
    const pack = loadPack('child_se');
    assert.equal(pack.manifest.pack_id, 'child_se');
    assert.equal(pack.manifest.locale, 'sv-SE');
    assert.ok(pack.progression.worlds.length > 0);
    assert.ok(pack.rewards.rewards.length > 0);
    assert.ok(pack.copy.experiences.parent_ack_completion);
    assert.ok(pack.livingObjects.worlds.some((w) => w.world_slug === 'garden'));
  });

  it('progression nodes come from pack only — no hardcoded IDs in loader', () => {
    const pack = loadPack('child_se');
    const nodes = getAllProgressionNodes(pack);
    assert.ok(nodes.some((n) => n.node_id === 'routine_home_welcome_mat'));
    assert.equal(nodes[0].unlock_signal, 'first_activity_complete');
  });

  it('interpolates parent message template from pack copy', () => {
    const pack = loadPack('child_se');
    const reward = getRewardBySignal(pack, 'first_activity_complete');
    const msg = interpolateTemplate(reward.parent_message_template, { child_name: 'Alma' });
    assert.equal(msg, 'Idag tog Alma sitt första steg.');
  });

  it('resolveExperienceCopy uses pack templates', () => {
    const pack = loadPack('child_se');
    const copy = resolveExperienceCopy(pack, 'parent_ack_completion', {
      child_name: 'Alma',
      activity_name: 'Tänder',
    });
    assert.equal(copy.headline, 'Idag tog Alma sitt första steg.');
    assert.match(copy.body, /vardagshandling|rutinen/);
    assert.equal(copy.cta, 'Det ser jag');
  });
});

describe('Unlock signal evaluator', () => {
  it('first_activity_complete fires on exactly one child completion', () => {
    assert.equal(evaluateUnlockSignal('first_activity_complete', { stats: { child_completions: 1 } }), true);
    assert.equal(evaluateUnlockSignal('first_activity_complete', { stats: { child_completions: 2 } }), false);
    assert.equal(evaluateUnlockSignal('first_activity_complete', { stats: { child_completions: 0 } }), false);
  });

  it('node_unlocked chain resolves from pack manifest', () => {
    const pack = loadPack('child_se');
    const nodes = getAllProgressionNodes(pack);
    const first = findUnlockableNodes(nodes, {
      stats: { child_completions: 1 },
      unlockedNodeIds: [],
    });
    assert.equal(first.length, 1);
    assert.equal(first[0].node_id, 'routine_home_welcome_mat');

    const second = findUnlockableNodes(nodes, {
      stats: { child_completions: 1 },
      unlockedNodeIds: ['routine_home_welcome_mat'],
    });
    assert.equal(second.length, 1);
    assert.equal(second[0].node_id, 'routine_home_first_light');
  });

  it('buildWorldFeedback reads from pack worlds config', () => {
    const pack = loadPack('child_se');
    const feedback = buildWorldFeedback(pack, [{
      world_slug: 'routine_home',
      node_id: 'routine_home_welcome_mat',
    }]);
    assert.equal(feedback[0].world_name, 'Morgonhuset');
    assert.match(feedback[0].child_message, /Morgonhuset/i);
  });
});
