'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { ProgressionRuntime } = require('../../src/platform-engine/progression');
const { MemoryProgressionStore } = require('../../src/platform-engine/progression/store');

const progression = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/routine-home-progression.json'), 'utf8')
);

describe('Platform engine performance budgets', () => {
  it('event bus flush with 50 handlers stays under 5ms', () => {
    const bus = new EventBus({ enforceBudget: false });
    for (let i = 0; i < 50; i += 1) {
      bus.subscribe('onActivityComplete', `perf:${i}`, () => {});
    }
    bus.emit('onActivityComplete', { child_id: 'x' });
    const start = performance.now();
    bus.flush();
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 5, `flush took ${elapsed}ms`);
  });

  it('progression rule evaluation stays under 5ms per event (WORLD_ENGINE)', () => {
    const bus = new EventBus({ enforceBudget: false });
    const runtime = new ProgressionRuntime({ eventBus: bus, store: new MemoryProgressionStore() });
    runtime.setPackConfig(() => ({ threshold: 3 }));
    runtime.loadMap('routine_home', progression);

    const payload = {
      child_id: '00000000-0000-4000-8000-000000000099',
      section: 'morning',
      first_in_section: true,
    };

    const start = performance.now();
    for (let i = 0; i < 200; i += 1) {
      runtime.evaluateEventSync('onActivityComplete', payload);
    }
    const elapsed = performance.now() - start;
    const perEvent = elapsed / 200;
    assert.ok(perEvent < 5, `per-event ${perEvent}ms exceeds 5ms budget`);
  });
});
