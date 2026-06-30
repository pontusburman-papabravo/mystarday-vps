'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../src/platform-engine/event-bus');
const { MessageBus } = require('../../src/platform-engine/message-bus');
const { WorldRuntime } = require('../../src/platform-engine/world');

const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/child-se-pack.json'), 'utf8'));
const CHILD_ID = '00000000-0000-4000-8000-000000000004';

describe('WorldRuntime skeleton', () => {
  it('loads worlds from pack and tracks enter/exit', () => {
    const bus = new EventBus();
    const msg = new MessageBus();
    const world = new WorldRuntime({ eventBus: bus, messageBus: msg });
    world.attach(pack);

    assert.equal(world.listWorlds().length, 2);

    const enters = [];
    bus.subscribe('onWorldEnter', 'test:enter', (p) => enters.push(p.world_slug));
    world.enter(CHILD_ID, 'routine_home');
    bus.flush();
    assert.deepEqual(enters, ['routine_home']);

    const exits = [];
    bus.subscribe('onWorldExit', 'test:exit', (p) => exits.push(p.world_slug));
    world.exit(CHILD_ID);
    bus.flush();
    assert.deepEqual(exits, ['routine_home']);
  });

  it('updates progression overlay on node unlock', () => {
    const bus = new EventBus();
    const world = new WorldRuntime({ eventBus: bus, messageBus: new MessageBus() });
    world.attach(pack);

    bus.emit('onProgressionNodeUnlocked', {
      child_id: CHILD_ID,
      world_slug: 'routine_home',
      node_id: 'routine_home_welcome_mat',
    });
    bus.flush();

    const state = world.getProgressionState(CHILD_ID, 'routine_home');
    assert.deepEqual(state.unlocked_nodes, ['routine_home_welcome_mat']);
  });
});
