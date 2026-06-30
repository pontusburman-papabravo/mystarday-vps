'use strict';

/**
 * Golden regression — config/experience-packs/child_se must match committed fixture.
 * Run: npm run check:experience-pack-golden
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadPack, clearPackCache } = require('../src/lib/experience-pack');

const GOLDEN_PATH = path.join(__dirname, 'fixtures/experience-packs/child_se.golden.json');

function snapshotPack(pack) {
  return {
    pack_id: pack.manifest.pack_id,
    manifest: pack.manifest,
    progression: pack.progression,
    rewards: pack.rewards,
    copy: pack.copy,
    worlds: pack.worlds,
  };
}

describe('experience pack golden fixture', () => {
  beforeEach(() => clearPackCache());

  it('child_se golden fixture exists', () => {
    assert.ok(fs.existsSync(GOLDEN_PATH), `missing golden fixture: ${GOLDEN_PATH}`);
  });

  it('loadPack(child_se) matches committed golden snapshot', () => {
    const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
    const actual = snapshotPack(loadPack('child_se'));

    assert.deepEqual(
      actual,
      golden,
      'prod pack drifted from golden fixture — run: npm run export:experience-pack-golden'
    );
  });

  it('golden snapshot includes runtime contract fields used by platform-runtime', () => {
    const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));

    assert.equal(golden.pack_id, 'child_se');
    assert.ok(golden.progression.worlds.length > 0, 'progression worlds required');
    assert.ok(golden.rewards.rewards.length > 0, 'rewards required');
    assert.ok(golden.copy.experiences.parent_ack_completion, 'parent_ack_completion copy required');
    assert.ok(golden.worlds.worlds.length > 0, 'world definitions required');

    const nodeIds = golden.progression.worlds.flatMap((w) => w.nodes.map((n) => n.node_id));
    const feedbackKeys = golden.worlds.worlds.flatMap((w) => Object.keys(w.unlock_feedback || {}));
    for (const key of feedbackKeys) {
      assert.ok(nodeIds.includes(key), `golden unlock_feedback orphan: ${key}`);
    }
  });
});
