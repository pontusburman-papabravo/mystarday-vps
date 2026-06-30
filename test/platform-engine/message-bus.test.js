'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MessageBus } = require('../../src/platform-engine/message-bus');

describe('MessageBus (ADR-005)', () => {
  it('routes point-to-point commands', () => {
    const bus = new MessageBus();
    bus.register('camera.transitionTo', (payload) => ({ scene: payload.scene }));
    const res = bus.send('camera.transitionTo', { scene: 'routine_home' });
    assert.equal(res.ok, true);
    assert.deepEqual(res.result, { scene: 'routine_home' });
  });

  it('returns route_not_found for unknown routes', () => {
    const bus = new MessageBus();
    const res = bus.send('animation.play', { id: 'wave' });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'route_not_found');
  });

  it('rejects duplicate route registration', () => {
    const bus = new MessageBus();
    bus.register('asset.preload', () => {});
    assert.throws(() => bus.register('asset.preload', () => {}), /already registered/);
  });
});
