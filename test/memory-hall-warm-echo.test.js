'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { injectMockDb } = require('./helpers/setup.js');
const { clearPackCache } = require('../src/lib/experience-pack');

const CHILD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function loadWarmEcho() {
  const paths = [
    '../src/lib/memory-hall-warm-echo',
    '../src/lib/memory-hall-exhibit-resolver',
    '../db/child-universe',
  ];
  paths.forEach(function (p) {
    delete require.cache[require.resolve(p)];
  });
  return {
    warmEcho: require('../src/lib/memory-hall-warm-echo'),
    resolver: require('../src/lib/memory-hall-exhibit-resolver'),
  };
}

describe('memory-hall-warm-echo (BL-042 backend prep)', () => {
  beforeEach(() => clearPackCache());

  it('omits warm_echo when parent opt-in is false', async () => {
    injectMockDb().setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('child_view_config')) return { rows: [{ child_view_config: {} }] };
      if (q.includes('child_achievement')) return { rows: [] };
      if (q.includes('reward_redemption')) return { rows: [] };
      if (q.includes('daily_log_item')) return { rows: [{ day_count: '7' }] };
      return { rows: [] };
    });

    const { warmEcho } = loadWarmEcho();
    const exhibit = await warmEcho.resolveWarmEchoExhibit(CHILD_ID, {});
    assert.equal(exhibit, null);
  });

  it('includes at most one warm_echo when enabled and milestone qualifies', async () => {
    injectMockDb().setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('child_view_config')) {
        return { rows: [{ child_view_config: { memory_hall: { warm_echo_enabled: true } } }] };
      }
      if (q.includes('child_achievement')) {
        return { rows: [{ slug: 'a', name: 'Steg', emoji: '⭐' }] };
      }
      if (q.includes('reward_redemption') && q.includes('LIMIT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (q.includes('reward_redemption')) return { rows: [] };
      if (q.includes('daily_log_item')) return { rows: [{ day_count: '3' }] };
      return { rows: [] };
    });

    const { resolver } = loadWarmEcho();
    const exhibits = await resolver.resolveExhibitsForChild(CHILD_ID, {
      childViewConfig: { memory_hall: { warm_echo_enabled: true } },
    });

    const warm = exhibits.filter((e) => e.slot_type === 'warm_echo');
    assert.equal(warm.length, 1);
    assert.equal(warm[0].content.kind, 'warm_echo');
    assert.equal(warm[0].source.milestone_key, 'first_reward_remembered');
    assert.ok(exhibits.length <= resolver.MAX_PRIDE_EXHIBITS);
  });

  it('prefers first_week_complete over first_reward_remembered', async () => {
    injectMockDb().setQuery(async (sql) => {
      const q = String(sql);
      if (q.includes('reward_redemption') && q.includes('LIMIT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (q.includes('daily_log_item')) return { rows: [{ day_count: '7' }] };
      return { rows: [] };
    });

    const { warmEcho } = loadWarmEcho();
    const exhibit = await warmEcho.resolveWarmEchoExhibit(CHILD_ID, {
      memory_hall: { warm_echo_enabled: true },
    });
    assert.equal(exhibit.source.milestone_key, 'first_week_complete');
  });

  it('does not query streak table for warm_echo milestones', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/lib/memory-hall-warm-echo.js'),
      'utf8'
    );
    assert.doesNotMatch(src, /FROM streak/i);
    assert.doesNotMatch(src, /JOIN streak/i);
  });
});

describe('child-view-config merge', () => {
  it('deep-merges memory_hall without clobbering sibling keys', () => {
    const { mergeChildViewConfig, applyWarmEchoOptInMetadata } = require('../src/lib/child-view-config');
    const merged = mergeChildViewConfig(
      { view_mode: 'classic', memory_hall: { warm_echo_enabled: false } },
      { memory_hall: { warm_echo_enabled: true } }
    );
    assert.equal(merged.view_mode, 'classic');
    assert.equal(merged.memory_hall.warm_echo_enabled, true);

    const stamped = applyWarmEchoOptInMetadata(
      merged,
      { memory_hall: { warm_echo_enabled: false } },
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    );
    assert.ok(stamped.memory_hall.warm_echo_opted_in_at);
    assert.equal(stamped.memory_hall.warm_echo_opted_in_by_parent_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });
});
