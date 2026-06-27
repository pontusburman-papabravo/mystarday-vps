'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ProductEngine } = require('../src/core-engine');
const { normalizeFamilyFacts } = require('../src/core-engine/1-facts/collector');

const GOLDEN_DIR = path.join(__dirname, 'engine', 'golden');

function loadGoldenTests() {
  return fs.readdirSync(GOLDEN_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, f), 'utf8'));
      return {
        ...raw,
        facts: normalizeFamilyFacts(raw.facts),
        context: {
          activePolicySet: raw.context.activePolicySet,
          currentDeviceTime: new Date(raw.context.currentDeviceTime),
        },
      };
    });
}

describe('ProductEngine — Golden Contracts', () => {
  const tests = loadGoldenTests();
  assert.ok(tests.length >= 5, 'expected at least 5 golden fixtures');

  for (const t of tests) {
    it(`matches contract: ${t.name}`, () => {
      const output = ProductEngine.evaluate(t.facts, t.context);

      assert.equal(output.trace.coreState, t.expected.coreState, 'coreState');
      assert.equal(output.trace.evaluatedNeed, t.expected.evaluatedNeed, 'evaluatedNeed');
      assert.equal(output.policy.name, t.expected.policyName, 'policyName');
      assert.equal(output.milestone, t.expected.milestone, 'milestone');
      assert.ok(output.trace.rulesTriggered.length > 0, 'trace must not be empty');
    });
  }

  it('is deterministic — same input yields identical output', () => {
    const t = tests.find((x) => x.name === 'first_success_flow');
    const a = ProductEngine.evaluate(t.facts, t.context);
    const b = ProductEngine.evaluate(t.facts, t.context);
    assert.deepEqual(
      {
        state: a.trace.coreState,
        need: a.trace.evaluatedNeed,
        policy: a.policy.name,
        id: a.policy.id,
      },
      {
        state: b.trace.coreState,
        need: b.trace.evaluatedNeed,
        policy: b.policy.name,
        id: b.policy.id,
      }
    );
  });
});

describe('ProductEngine — presentation adapters (dumb channels)', () => {
  it('push adapter blocks outside validity window', async () => {
    const { processDirective } = require('../src/core-engine/6-presentation/adapters/push');
    const t = loadGoldenTests().find((x) => x.name === 'first_success_flow');
    const output = ProductEngine.evaluate(t.facts, t.context);
    const result = await processDirective(output, 10, { send: async () => {} });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'outside_validity_window');
  });

  it('push adapter sends inside validity window', async () => {
    const { processDirective } = require('../src/core-engine/6-presentation/adapters/push');
    const t = loadGoldenTests().find((x) => x.name === 'first_success_flow');
    const output = ProductEngine.evaluate(t.facts, t.context);
    let sent = false;
    const result = await processDirective(output, 18, {
      send: async () => { sent = true; },
    });
    assert.equal(result.sent, true);
    assert.equal(sent, true);
  });
});
