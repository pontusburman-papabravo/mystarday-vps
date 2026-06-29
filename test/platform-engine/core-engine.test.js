'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PlatformEngine } = require('../../src/platform-engine');
const { ENGINE_STATES } = require('../../src/platform-engine/constants');

const FIXTURES = path.join(__dirname, 'fixtures');
const pack = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'child-se-pack.json'), 'utf8'));
const progression = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'routine-home-progression.json'), 'utf8'));

const CHILD_ID = '00000000-0000-4000-8000-000000000002';

describe('PlatformEngine skeleton (ADR-002)', () => {
  it('initializes runtimes and transitions state', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    assert.equal(engine.state, ENGINE_STATES.COLD);

    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    assert.equal(engine.state, ENGINE_STATES.READY);
    assert.equal(engine.packId, 'child_se');

    engine.start();
    assert.equal(engine.state, ENGINE_STATES.RUNNING);

    engine.shutdown();
    assert.equal(engine.state, ENGINE_STATES.TERMINATED);
  });

  it('emit flushes progression unlocks same tick', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    engine.start();

    const unlocked = [];
    engine.subscribe('onProgressionNodeUnlocked', 'integration:cap', (p) => {
      unlocked.push(p.node_id);
    });

    engine.emit('onActivityComplete', {
      child_id: CHILD_ID,
      section: 'morning',
      first_in_section: true,
      activity_id: 'wake_up',
      verified: true,
    });

    assert.deepEqual(unlocked, ['routine_home_welcome_mat']);
  });

  it('rejects initialize from running state', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({ manifest: pack });
    engine.start();
    await assert.rejects(
      () => engine.initialize({ manifest: pack }),
      /Cannot initialize from state running/
    );
  });
});
