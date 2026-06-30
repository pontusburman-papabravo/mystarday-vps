'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { RewardRuntime } = require('../../src/platform-engine/reward');

const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/child-se-pack.json'), 'utf8'));
const CHILD_ID = '00000000-0000-4000-8000-000000000003';

describe('RewardRuntime skeleton', () => {
  it('records pack-driven reward signals without hardcoded gameplay', () => {
    const bus = new EventBus();
    const reward = new RewardRuntime({ eventBus: bus });
    reward.attach(pack);

    bus.emit('onStarGranted', { child_id: CHILD_ID, amount: 1, source_activity_id: 'a1' });
    bus.flush();

    const pending = reward.pendingSignals;
    assert.equal(pending.length, 1);
    assert.equal(pending[0].source, 'onStarGranted');
    assert.deepEqual(pending[0].payload.reward_config, { presentation: 'star_burst' });
  });

  it('does not emit reward.signal when config missing', () => {
    const bus = new EventBus();
    const signals = [];
    bus.subscribe('reward.signal', 'test:reward', (p) => signals.push(p));

    const reward = new RewardRuntime({ eventBus: bus });
    reward.attach(pack);
    bus.emit('onProgressionNodeUnlocked', {
      child_id: CHILD_ID,
      world_slug: 'routine_home',
      node_id: 'unknown_node',
    });
    bus.flush();

    assert.equal(signals.length, 0);
    assert.equal(reward.pendingSignals.length, 1);
  });
});
