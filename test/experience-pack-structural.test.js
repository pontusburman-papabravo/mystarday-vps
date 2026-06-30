'use strict';

/**
 * Structural regression gate for config/experience-packs/*.
 * Validates real on-disk packs against ADR-004 node rules and platform-runtime contracts.
 * Run: npm run validate:experience-packs
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadPack, clearPackCache, getAllProgressionNodes } = require('../src/lib/experience-pack');
const { validateProgressionMap, AUDIENCE_BANDS } = require('../src/platform-engine/pack/validate');
const { evaluateUnlockSignal } = require('../src/lib/platform-runtime/unlock-signals');

const PACKS_ROOT = path.join(__dirname, '../config/experience-packs');

/** Copy keys required by platform-runtime orchestrator and journey evaluator. */
const REQUIRED_COPY_KEYS = [
  'parent_ack_completion',
  'celebrate_first_success',
  'child_first_completion',
];

/**
 * Signals only understood by platform-engine skeleton — not platform-runtime unlock-signals.js.
 * Document new entries here when authoring platform-engine-only packs.
 */
const PLATFORM_ENGINE_ONLY_SIGNALS = new Set([
  'explore:taps:5',
  'activity_streak:3',
  'first_activity_complete:morning',
]);

function discoverPackIds() {
  return fs.readdirSync(PACKS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

function isRuntimeEvaluableUnlockSignal(signal) {
  if (!signal || typeof signal !== 'string') return false;
  if (PLATFORM_ENGINE_ONLY_SIGNALS.has(signal)) return false;
  if (signal === 'first_activity_complete' || signal === 'first_reward_granted') return true;
  if (signal.startsWith('node_unlocked:')) return true;
  if (signal.startsWith('activity_count:')) return true;
  if (signal.startsWith('milestone:')) return true;
  return false;
}

function collectProgressionErrors(pack) {
  const errors = [];
  for (const world of pack.progression.worlds || []) {
    validateProgressionMap(world, world.world_slug, errors);
  }
  return errors;
}

function formatValidationErrors(errors) {
  return errors.map((e) => `${e.path}: ${e.message}`).join('\n');
}

describe('experience pack structural validation', () => {
  beforeEach(() => clearPackCache());

  it('discovers at least one pack under config/experience-packs', () => {
    const packIds = discoverPackIds();
    assert.ok(packIds.length > 0, 'expected at least one experience pack directory');
    assert.ok(packIds.includes('child_se'), 'child_se pack must exist');
  });

  for (const packId of discoverPackIds()) {
    describe(`pack: ${packId}`, () => {
      let pack;

      beforeEach(() => {
        pack = loadPack(packId);
      });

      it('manifest matches directory and required fields', () => {
        assert.equal(pack.manifest.pack_id, packId, 'manifest.pack_id must match directory name');
        assert.ok(pack.manifest.locale, 'manifest.locale is required');
        assert.ok(AUDIENCE_BANDS.has(pack.manifest.audience_band), 'invalid audience_band');

        const packDir = path.join(PACKS_ROOT, packId);
        for (const [key, filename] of Object.entries(pack.manifest.includes || {})) {
          const filePath = path.join(packDir, filename);
          assert.ok(fs.existsSync(filePath), `includes.${key} file missing: ${filename}`);
        }
      });

      it('progression maps pass ADR-004 node validation', () => {
        const errors = collectProgressionErrors(pack);
        assert.equal(
          errors.length,
          0,
          `progression validation failed:\n${formatValidationErrors(errors)}`
        );
      });

      it('progression world_slug values exist in worlds.json', () => {
        const worldSlugs = new Set((pack.worlds.worlds || []).map((w) => w.world_slug));
        for (const world of pack.progression.worlds || []) {
          assert.ok(
            worldSlugs.has(world.world_slug),
            `progression world "${world.world_slug}" missing from worlds.json`
          );
        }
      });

      it('world unlock_feedback keys match progression node_ids', () => {
        const nodesByWorld = new Map();
        for (const world of pack.progression.worlds || []) {
          nodesByWorld.set(
            world.world_slug,
            new Set((world.nodes || []).map((n) => n.node_id))
          );
        }

        for (const world of pack.worlds.worlds || []) {
          const nodeIds = nodesByWorld.get(world.world_slug) || new Set();
          for (const nodeId of Object.keys(world.unlock_feedback || {})) {
            assert.ok(
              nodeIds.has(nodeId),
              `orphan unlock_feedback key "${nodeId}" in world "${world.world_slug}"`
            );
          }
        }
      });

      it('required runtime copy experiences exist', () => {
        const experiences = pack.copy.experiences || {};
        for (const key of REQUIRED_COPY_KEYS) {
          assert.ok(experiences[key], `missing required copy experience: ${key}`);
        }
      });

      it('progression unlock_signal values are runtime-evaluable or explicitly allowlisted', () => {
        const nodes = getAllProgressionNodes(pack);
        for (const node of nodes) {
          const signal = node.unlock_signal;
          if (PLATFORM_ENGINE_ONLY_SIGNALS.has(signal)) {
            assert.fail(
              `node ${node.node_id} uses platform-engine-only signal "${signal}" — not evaluable in platform-runtime`
            );
          }
          assert.ok(
            isRuntimeEvaluableUnlockSignal(signal),
            `node ${node.node_id} unlock_signal "${signal}" is not evaluable in platform-runtime`
          );
          // Smoke: evaluator accepts the signal shape without throwing
          evaluateUnlockSignal(signal, {
            stats: { child_completions: 1 },
            unlockedNodeIds: ['routine_home_welcome_mat'],
            milestones: { root: true },
            firstRewardGranted: true,
          });
        }
      });

      it('reward trigger_signal values are runtime-evaluable or explicitly allowlisted', () => {
        for (const reward of pack.rewards.rewards || []) {
          const signal = reward.trigger_signal;
          if (PLATFORM_ENGINE_ONLY_SIGNALS.has(signal)) {
            assert.fail(
              `reward ${reward.reward_id} uses platform-engine-only signal "${signal}"`
            );
          }
          assert.ok(
            isRuntimeEvaluableUnlockSignal(signal),
            `reward ${reward.reward_id} trigger_signal "${signal}" is not runtime-evaluable`
          );
        }
      });
    });
  }
});
