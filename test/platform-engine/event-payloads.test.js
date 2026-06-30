'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PlatformEngine } = require('../../src/platform-engine');

const FIXTURES = path.join(__dirname, 'fixtures');
const golden = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'event-payloads/golden-v1.json'), 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'child-se-pack.json'), 'utf8'));
const progression = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'routine-home-progression.json'), 'utf8'));

describe('Platform engine golden event payloads (ADR-005)', () => {
  it('accepts all core event payload shapes without handler errors', async () => {
    const engine = new PlatformEngine({ enforceHandlerBudget: false });
    await engine.initialize({
      manifest: pack,
      progressionMaps: { routine_home: progression },
    });
    engine.start();

    for (const [eventName, payload] of Object.entries(golden)) {
      assert.doesNotThrow(() => engine.emit(eventName, payload), eventName);
    }
  });

  it('payload keys match ADR-005 contract', () => {
    assert.ok('child_id' in golden.onActivityComplete);
    assert.ok('verified' in golden.onActivityComplete);
    assert.ok('world_slug' in golden.onProgressionNodeUnlocked);
    assert.ok('node_id' in golden.onProgressionNodeUnlocked);
    assert.ok('milestone_type' in golden.onMilestone);
  });
});
