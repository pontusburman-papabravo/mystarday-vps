'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ExperiencePackLoader } = require('../../src/platform-engine/pack');
const { ManifestValidationError } = require('../../src/platform-engine/errors');

const FIXTURES = path.join(__dirname, 'fixtures');
const pack = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'child-se-pack.json'), 'utf8'));
const progression = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'routine-home-progression.json'), 'utf8'));

describe('ExperiencePackLoader (ADR-001)', () => {
  it('loads and validates child_se manifest', () => {
    const loader = new ExperiencePackLoader();
    const active = loader.load('child_se', pack, { progressionMaps: { routine_home: progression } });
    assert.equal(active.pack_id, 'child_se');
    assert.equal(loader.state, 'active');
  });

  it('resolves pacing config by dot path', () => {
    const loader = new ExperiencePackLoader();
    loader.load('child_se', pack);
    const cfg = loader.getConfig('progression.routine_home.mirror');
    assert.deepEqual(cfg, { threshold: 3 });
  });

  it('resolves copy tables', () => {
    const loader = new ExperiencePackLoader();
    loader.load('child_se', pack);
    assert.equal(loader.getCopy('ui', 'welcome'), 'Välkommen!');
  });

  it('rejects numeric threshold without pack_config_key', () => {
    const badMap = {
      world_slug: 'routine_home',
      progression_model: 'test',
      nodes: [{
        node_id: 'bad_node',
        order: 1,
        node_type: 'build',
        emotional_beat: 'x',
        unlock_signal: 'explore:taps:5',
      }],
    };
    assert.throws(
      () => new ExperiencePackLoader().load('child_se', pack, { progressionMaps: { routine_home: badMap } }),
      ManifestValidationError
    );
  });

  it('rejects pack_id mismatch', () => {
    assert.throws(
      () => new ExperiencePackLoader().load('teen_se', pack),
      /pack_id mismatch/
    );
  });
});
