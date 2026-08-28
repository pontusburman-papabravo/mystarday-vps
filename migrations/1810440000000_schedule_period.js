'use strict';

/**
 * Phase 2 — first-class Special Period domain entity (REVISED after architecture review).
 *
 * First cut of this migration made schedule_period materialize into `special_day_schedule`
 * (via a `period_id` FK on that table). Review found two correctness blockers with that design:
 *
 * 1. `resolveEffectiveSchedule()` treats ANY non-empty `special_day_schedule` row as a FULL
 *    base replacement. A period applied with `merge`/`replace_sections` MUST compose with the
 *    custody-aware weekly base (e.g. a "kväll" period must never erase "morgon"/"dag") — reusing
 *    `special_day_schedule` as-is makes that composition impossible without changing what an
 *    EXPLICIT Special Day means, which would be a much bigger and riskier change.
 * 2. Stamping `period_id` onto a `special_day_schedule` row conflated "explicit Special Day"
 *    and "period-materialized day" into the same row — an explicit manual edit on that date and
 *    a later `deleteSchedulePeriod()` would fight over the same row, risking exactly the bug
 *    class §6 ("explicit Special Day must survive period delete") warns about.
 *
 * Revised design: `schedule_period` NEVER writes into `special_day_schedule`. The period's
 * resolved source items are stored ONCE per period (not once per date — every date in the range
 * shares the identical item set) in the new `schedule_period_item` table. `resolveEffectiveSchedule()`
 * (src/lib/effective-schedule.js) composes weekly + period at READ time according to
 * `apply_mode`, and an explicit `special_day_schedule` row (created via the existing, completely
 * untouched special-day-schedules.js routes) simply lives in its own table — nothing to
 * "detach": the two tables were never the same row to begin with, so a period delete can never
 * touch an explicit Special Day.
 *
 * Nothing in this revision was ever deployed (Phase 2 has not merged/deployed) — this migration
 * file is edited in place rather than layering a second migration on top of an unreleased one.
 *
 * Rollback: down() drops both new tables. No existing table (special_day_schedule,
 * schedule_date_exclusion, etc.) is touched in either direction — no historical Special Day
 * data was ever migrated into this table, so there is nothing to lose on rollback.
 */

module.exports = {
  name: '1810440000000_schedule_period',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_period (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
        child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        source_id UUID NOT NULL,
        apply_mode VARCHAR(32) NOT NULL DEFAULT 'merge',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT schedule_period_date_range_check CHECK (end_date >= start_date),
        CONSTRAINT schedule_period_source_type_check CHECK (source_type IN ('family_template', 'standard_schedule')),
        CONSTRAINT schedule_period_apply_mode_check CHECK (apply_mode IN ('merge', 'replace_sections', 'replace_day'))
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_period_child
        ON schedule_period (child_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_period_family
        ON schedule_period (family_id)
    `);

    // Supports the child-scoped overlap check in schedule-period.js.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_period_child_daterange
        ON schedule_period (child_id, start_date, end_date)
    `);

    // One row per resolved source item, stored ONCE per period (every date in [start_date,
    // end_date] shares the identical item set — see resolveEffectiveSchedule()'s period
    // composition). Mirrors special_day_schedule_item's denormalized shape (name/icon/
    // star_value) for the same reason that table does: the source activity_template may
    // later be edited/deleted, but the period's historical content should not silently change.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_period_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_id UUID NOT NULL REFERENCES schedule_period(id) ON DELETE CASCADE,
        activity_template_id UUID REFERENCES activity_template(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(64) DEFAULT '⭐',
        start_time VARCHAR(8),
        end_time VARCHAR(8),
        star_value INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        section VARCHAR(32) NOT NULL DEFAULT 'dag'
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_period_item_period
        ON schedule_period_item (period_id)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS schedule_period_item');
    await client.query('DROP TABLE IF EXISTS schedule_period');
  },
};
