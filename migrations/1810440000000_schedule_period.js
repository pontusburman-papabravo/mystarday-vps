'use strict';

/**
 * Phase 2 — first-class Special Period domain entity.
 *
 * Current-state audit (docs/schedule-canonical-architecture.md "Phase 2") found that today's
 * "lovperiod" UX (schedule-period.js) and POST /api/children/:id/schedules/apply-date-range
 * (src/routes/schedules/child-bulk.js) materialize N unrelated `special_day_schedule` rows with
 * no shared identity, lifecycle, or grouping metadata — you cannot "edit the period" or "delete
 * the period" as one operation, only delete individual dates one at a time.
 *
 * `schedule_period` gives the period real identity (name, start/end, source, apply_mode) while
 * `special_day_schedule.period_id` (added below) lets the runtime keep materializing into the
 * EXACT SAME table the canonical resolveEffectiveSchedule() (Phase 1A) and calendar.js already
 * read — no second resolver, no new precedence rule, nothing for the runtime to "ignore". See
 * src/lib/schedule-period.js for the canonical write service.
 *
 * Scope decision (see docs, "Phase 2 custody"): NOT custody-home-scoped, matching the existing,
 * unchanged `special_day_schedule`/`schedule_date_exclusion` semantics — a date-specific
 * exception follows the child+date, not a specific custody home (avoids forcing parents to
 * duplicate the same exception per home; see docs for the full rationale).
 *
 * Rollback: down() drops schedule_period and the period_id column. Any special_day_schedule
 * rows a period had generated are NOT deleted by rollback (period_id simply disappears) — no
 * schedule data loss on rollback, matching the existing schedule_apply_operation migration's
 * rollback safety bar.
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
        apply_mode VARCHAR(32) NOT NULL DEFAULT 'replace_day',
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

    // Supports the overlap-rejection check in schedule-period.js (SELECT ... FOR UPDATE scanning
    // this child's existing periods before an insert/update — see that file's doc comment for
    // why an application-level check was chosen over a GIST exclusion constraint).
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_period_child_daterange
        ON schedule_period (child_id, start_date, end_date)
    `);

    await client.query(`
      ALTER TABLE special_day_schedule
        ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES schedule_period(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_special_day_schedule_period
        ON special_day_schedule (period_id)
        WHERE period_id IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_special_day_schedule_period');
    await client.query('ALTER TABLE special_day_schedule DROP COLUMN IF EXISTS period_id');
    await client.query('DROP TABLE IF EXISTS schedule_period');
  },
};
