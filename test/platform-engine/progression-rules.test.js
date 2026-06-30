'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseUnlockSignal,
  evaluateRulePart,
  evaluateRuleAccumulating,
  ruleEventSubscriptions,
} = require('../../src/platform-engine/progression/rules');

describe('Progression rules engine (ADR-004)', () => {
  it('parses milestone signals', () => {
    const rule = parseUnlockSignal('milestone:sprout');
    assert.equal(rule.type, 'milestone');
    assert.equal(rule.value, 'sprout');
    assert.deepEqual(ruleEventSubscriptions(rule), ['onMilestone']);
  });

  it('parses compound signals', () => {
    const rule = parseUnlockSignal('milestone:root + first_world_enter');
    assert.equal(rule.type, 'compound');
    assert.equal(rule.parts.length, 2);
    const events = ruleEventSubscriptions(rule);
    assert.ok(events.includes('onMilestone'));
    assert.ok(events.includes('onWorldEnter'));
  });

  it('matches first_activity_complete', () => {
    const rule = parseUnlockSignal('first_activity_complete:morning');
    const matched = evaluateRulePart(rule, 'onActivityComplete', {
      section: 'morning',
      first_in_section: true,
    });
    assert.equal(matched, true);
  });

  it('uses pack config for activity_streak threshold', () => {
    const rule = parseUnlockSignal('activity_streak:brush_teeth:3');
    const packConfig = (key) => (key === 'progression.routine_home.mirror' ? { threshold: 3 } : null);
    const matched = evaluateRulePart(
      rule,
      'onActivityComplete',
      { activity_id: 'brush_teeth', streak_count: 3 },
      { packConfig, packConfigKey: 'progression.routine_home.mirror' }
    );
    assert.equal(matched, true);
  });

  it('accumulates compound parts across events', () => {
    const rule = parseUnlockSignal('milestone:root + first_world_enter');
    const satisfied = new Set();
    let result = evaluateRuleAccumulating(
      rule,
      'onMilestone',
      { milestone_type: 'root' },
      { satisfiedParts: satisfied }
    );
    assert.equal(result.matched, false);
    assert.equal(result.satisfiedParts.size, 1);

    result = evaluateRuleAccumulating(
      rule,
      'onWorldEnter',
      { world_slug: 'routine_home' },
      { satisfiedParts: result.satisfiedParts }
    );
    assert.equal(result.matched, true);
  });
});
