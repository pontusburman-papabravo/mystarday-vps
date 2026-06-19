'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { VACATION_SCHEDULES } = require('../src/lib/default-vacation-schedules');

const VALID_SECTIONS = new Set(['morgon', 'dag', 'kvall']);

describe('default-vacation-schedules', () => {
  it('defines Lov, Sommarlov and Jullov', () => {
    const names = VACATION_SCHEDULES.map((s) => s.name);
    assert.deepEqual(names, ['Lov', 'Sommarlov', 'Jullov']);
  });

  it('each schedule has items with valid sections and sub_steps arrays', () => {
    for (const schedule of VACATION_SCHEDULES) {
      assert.ok(schedule.description, `${schedule.name} should have description`);
      assert.ok(schedule.icon, `${schedule.name} should have icon`);
      assert.ok(schedule.items.length >= 10, `${schedule.name} should have at least 10 activities`);

      for (const item of schedule.items) {
        assert.ok(VALID_SECTIONS.has(item.section), `${schedule.name}/${item.name}: invalid section`);
        assert.ok(Array.isArray(item.sub_steps), `${schedule.name}/${item.name}: sub_steps must be array`);
        for (const step of item.sub_steps) {
          assert.ok(step.name, `${schedule.name}/${item.name}: sub-step needs name`);
        }
      }

      const withSubSteps = schedule.items.filter((i) => i.sub_steps.length > 0);
      assert.ok(withSubSteps.length >= 3, `${schedule.name} should have routine activities with delsteg`);
    }
  });

  it('migration is idempotent by schedule name', async () => {
    const migration = require('../migrations/1806800000000_seed_vacation_schedules');
    const queries = [];

    const client = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT id FROM default_schedule')) {
          const name = params[0];
          if (name === 'Lov') return { rows: [{ id: 'existing-lov' }] };
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO default_schedule')) {
          return { rows: [{ id: `new-${params[0]}` }] };
        }
        return { rows: [] };
      },
    };

    await migration.up(client);

    const scheduleInserts = queries.filter(
      (q) => q.sql.includes('INSERT INTO default_schedule') && !q.sql.includes('default_schedule_item')
    );
    assert.equal(scheduleInserts.length, 2, 'should skip existing Lov and insert Sommarlov + Jullov');
    assert.equal(scheduleInserts[0].params[0], 'Sommarlov');
    assert.equal(scheduleInserts[1].params[0], 'Jullov');
  });
});
