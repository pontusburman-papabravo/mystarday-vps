'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  computeHoursSinceCompletion,
  mapCompletionRow,
} = require('../src/lib/activation-program-aha');

describe('activation-program-aha', () => {
  describe('computeHoursSinceCompletion', () => {
    it('returns 0 when completedAt is missing', () => {
      assert.equal(computeHoursSinceCompletion(null), 0);
      assert.equal(computeHoursSinceCompletion(undefined), 0);
    });

    it('returns 0 for future completion times', () => {
      const now = new Date('2026-06-01T12:00:00.000Z');
      const future = new Date('2026-06-01T14:00:00.000Z');
      assert.equal(computeHoursSinceCompletion(future, now), 0);
    });

    it('rounds to one decimal place', () => {
      const now = new Date('2026-06-01T12:00:00.000Z');
      const completed = new Date('2026-06-01T10:15:00.000Z'); // 1.75 h
      assert.equal(computeHoursSinceCompletion(completed, now), 1.8);
    });

    it('accepts ISO string completedAt', () => {
      const now = new Date('2026-06-01T14:00:00.000Z');
      assert.equal(
        computeHoursSinceCompletion('2026-06-01T12:00:00.000Z', now),
        2
      );
    });
  });

  describe('mapCompletionRow', () => {
    it('maps DB row to API shape with hours_since_completion', () => {
      const now = new Date('2026-06-01T16:00:00.000Z');
      const row = {
        daily_log_item_id: 'item-1',
        child_id: 'child-1',
        child_name: 'Estelle',
        activity_name: 'Borsta tänderna',
        completed_at: new Date('2026-06-01T14:00:00.000Z'),
      };

      assert.deepEqual(mapCompletionRow(row, now), {
        daily_log_item_id: 'item-1',
        child_id: 'child-1',
        child_name: 'Estelle',
        activity_name: 'Borsta tänderna',
        hours_since_completion: 2,
      });
    });
  });
});
