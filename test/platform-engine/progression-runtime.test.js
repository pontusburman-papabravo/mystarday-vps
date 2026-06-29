'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { ProgressionRuntime } = require('../../src/platform-engine/progression');
const { MemoryProgressionStore } = require('../../src/platform-engine/progression/store');

const FIXTURES = path.join(__dirname, 'fixtures');
const progression = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'routine-home-progression.json'), 'utf8'));

const CHILD_ID = '00000000-0000-4000-8000-000000000001';

describe('ProgressionRuntime (ADR-004)', () => {
  it('unlocks node on matching event and emits onProgressionNodeUnlocked', () => {
    const bus = new EventBus();
    const unlocked = [];
    bus.subscribe('onProgressionNodeUnlocked', 'test:cap', (p) => unlocked.push(p.node_id));

    const runtime = new ProgressionRuntime({ eventBus: bus, store: new MemoryProgressionStore() });
    runtime.setPackConfig((key) => {
      if (key === 'progression.routine_home.mirror') return { threshold: 3 };
      if (key === 'progression.routine_home.bird') return { threshold: 5 };
      return { threshold: 1 };
    });
    runtime.loadMap('routine_home', progression);
    runtime.attach();

    runtime.evaluateEventSync('onActivityComplete', {
      child_id: CHILD_ID,
      section: 'morning',
      first_in_section: true,
      activity_id: 'wake_up',
      verified: true,
    });
    bus.flush();

    assert.deepEqual(unlocked, ['routine_home_welcome_mat']);
    assert.equal(runtime.isUnlocked(CHILD_ID, 'routine_home', 'routine_home_welcome_mat'), true);
  });

  it('does not double-unlock the same node', () => {
    const bus = new EventBus();
    let count = 0;
    bus.subscribe('onProgressionNodeUnlocked', 'test:dup', () => { count += 1; });

    const runtime = new ProgressionRuntime({ eventBus: bus, store: new MemoryProgressionStore() });
    runtime.loadMap('routine_home', progression);
    runtime.attach();

    const payload = {
      child_id: CHILD_ID,
      milestone_type: 'sprout',
    };
    runtime.evaluateEventSync('onMilestone', payload);
    bus.flush();
    runtime.evaluateEventSync('onMilestone', payload);
    bus.flush();

    assert.equal(count, 1);
  });

  it('indexes events for O(candidates) not O(all nodes)', () => {
    const bus = new EventBus();
    const runtime = new ProgressionRuntime({ eventBus: bus, store: new MemoryProgressionStore() });
    runtime.loadMap('routine_home', progression);

    const start = performance.now();
    for (let i = 0; i < 500; i += 1) {
      runtime.evaluateEventSync('onStarGranted', { child_id: CHILD_ID, amount: 1 });
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 50, `expected fast no-match scan, took ${elapsed}ms`);
  });
});
