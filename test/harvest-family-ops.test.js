'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assessFamilyEnrichment } = require('../scripts/lib/harvest-family-ops');

describe('harvest-family-ops', () => {
  it('assessFamilyEnrichment requires history and streaks when children exist', () => {
    const harvest = {
      api: {
        family: { children: [{ id: 'c1', name: 'Astrid' }] },
        child_progress: {
          c1: { streak: { current_streak: 3, cycle_day: 1, last_active_date: '2026-05-30' } },
        },
        daily_log_details: {
          c1: {
            '2026-05-15': { log: { id: 'dl1' }, items: [{ id: 'i1' }] },
          },
        },
      },
    };
    const r = assessFamilyEnrichment(harvest);
    assert.equal(r.complete, true);
    assert.equal(r.missing.length, 0);
    assert.equal(r.history.items, 1);
  });

  it('assessFamilyEnrichment flags missing streaks and history', () => {
    const harvest = {
      api: {
        family: { children: [{ id: 'c1', name: 'Olle' }] },
      },
    };
    const r = assessFamilyEnrichment(harvest);
    assert.equal(r.complete, false);
    assert.ok(r.missing.includes('history'));
    assert.ok(r.missing.includes('streaks'));
  });
});
