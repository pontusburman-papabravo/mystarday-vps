'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { HandlerBudgetExceededError } = require('../../src/platform-engine/errors');
const { HANDLER_BUDGET_MS } = require('../../src/platform-engine/constants');

describe('EventBus (ADR-005)', () => {
  it('queues and flushes same tick', () => {
    const bus = new EventBus();
    const seen = [];
    bus.subscribe('onMilestone', 'test:1', (payload) => {
      seen.push(payload.milestone_type);
    });
    bus.emit('onMilestone', { milestone_type: 'sprout' });
    assert.equal(seen.length, 0);
    assert.equal(bus.flush(), 1);
    assert.deepEqual(seen, ['sprout']);
  });

  it('freezes payload at emit time', () => {
    const bus = new EventBus({ enforceBudget: false });
    const payload = { child_id: 'a' };
    bus.subscribe('onWorldEnter', 'test:freeze', (p) => {
      assert.throws(() => { p.child_id = 'b'; });
    });
    bus.emit('onWorldEnter', payload);
    bus.flush();
  });

  it('rejects async handlers', () => {
    const bus = new EventBus();
    bus.subscribe('onStarGranted', 'async:bad', async () => {});
    bus.emit('onStarGranted', { child_id: 'x' });
    assert.throws(() => bus.flush(), /Async handlers not allowed/);
  });

  it('enforces handler budget', () => {
    const bus = new EventBus({ enforceBudget: true, handlerBudgetMs: 0 });
    bus.subscribe('onActivityComplete', 'slow:1', () => {
      const start = Date.now();
      while (Date.now() - start < HANDLER_BUDGET_MS + 5) { /* spin */ }
    });
    bus.emit('onActivityComplete', { child_id: 'x' });
    assert.throws(() => bus.flush(), HandlerBudgetExceededError);
  });

  it('rejects duplicate handler registration', () => {
    const bus = new EventBus();
    bus.subscribe('onMilestone', 'dup', () => {});
    assert.throws(() => bus.subscribe('onMilestone', 'dup', () => {}), /already registered/);
  });

  it('allows dotted extension events', () => {
    const bus = new EventBus();
    const seen = [];
    bus.subscribe('world.progression_changed', 'world:1', (p) => seen.push(p.node_id));
    bus.emit('world.progression_changed', { node_id: 'n1' });
    bus.flush();
    assert.deepEqual(seen, ['n1']);
  });

  it('rejects re-entrant flush', () => {
    const bus = new EventBus();
    bus.subscribe('onMilestone', 'reentrant', () => bus.flush());
    bus.emit('onMilestone', {});
    assert.throws(() => bus.flush(), /Re-entrant flush/);
  });
});
