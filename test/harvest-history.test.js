'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  collectLogDates,
  buildDailyLogItemRows,
  buildManualStarRows,
} = require('../src/lib/harvest-history');

describe('harvest-history', () => {
  it('collectLogDates skips empty days', () => {
    const dates = collectLogDates([
      {
        data: [
          { date: '2026-05-15', total_items: 3, completed_items: 2 },
          { date: '2026-05-16', total_items: 0, completed_items: 0 },
        ],
      },
    ]);
    assert.deepEqual(dates, ['2026-05-15']);
  });

  it('buildDailyLogItemRows maps API daily-log payloads', () => {
    const childId = '770e8400-e29b-41d4-a716-446655440002';
    const logId = 'aa0e8400-e29b-41d4-a716-446655440005';
    const itemId = 'bb0e8400-e29b-41d4-a716-446655440006';
    const actId = '880e8400-e29b-41d4-a716-446655440003';

    const { rows } = buildDailyLogItemRows(
      [{ id: childId, name: 'Astrid' }],
      {
        daily_log_details: {
          [childId]: {
            '2026-05-15': {
              log: { id: logId, date: '2026-05-15' },
              items: [
                {
                  id: itemId,
                  activity_template_id: actId,
                  name: 'Tänder',
                  icon: '🦷',
                  star_value: 1,
                  completed: true,
                  completed_at: '2026-05-15T07:00:00.000Z',
                  section: 'morgon',
                  sort_order: 0,
                },
              ],
            },
          },
        },
      }
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, itemId);
    assert.equal(rows[0].completed_date, '2026-05-15');
  });

  it('buildManualStarRows maps grant lists', () => {
    const childId = '770e8400-e29b-41d4-a716-446655440002';
    const parentId = '660e8400-e29b-41d4-a716-446655440001';
    const rows = buildManualStarRows(
      [{ id: childId, name: 'Astrid' }],
      {
        manual_star_grants: {
          [childId]: {
            grants: [{ id: 'g1', star_count: 3, reason: 'Bra!', created_at: '2026-05-15T10:00:00.000Z' }],
          },
        },
      },
      parentId
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].star_count, 3);
  });
});
