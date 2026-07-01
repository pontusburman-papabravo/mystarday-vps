#!/usr/bin/env node
'use strict';

/**
 * Backfill activity_template.for_dig_goal_slug for families that already
 * activated a För dig goal (for_dig_goal_install).
 *
 * Dry-run (default): node scripts/backfill-for-dig-goal-tags.js
 * Apply:            node scripts/backfill-for-dig-goal-tags.js --apply
 */

const db = require('../src/lib/db');
const { getGoalBySlug } = require('../src/lib/for-dig-config');

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

async function namesFromSchedule(scheduleName) {
  const schedule = await db.query(
    'SELECT id FROM default_schedule WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [scheduleName]
  );
  if (schedule.rows.length === 0) return [];
  const items = await db.query(
    'SELECT name FROM default_schedule_item WHERE default_schedule_id = $1',
    [schedule.rows[0].id]
  );
  return items.rows.map((r) => r.name);
}

async function tagFamilyActivities(client, familyId, goalSlug, names) {
  if (!names.length) return 0;

  const wanted = names.map(normalizeName);
  const existing = await client.query(
    `SELECT id, name, for_dig_goal_slug
     FROM activity_template
     WHERE family_id = $1`,
    [familyId]
  );

  let updated = 0;
  for (const row of existing.rows) {
    const n = normalizeName(row.name);
    const matches = wanted.some((w) => n.includes(w) || w.includes(n));
    if (!matches) continue;
    if (row.for_dig_goal_slug === goalSlug) continue;

    await client.query(
      `UPDATE activity_template SET for_dig_goal_slug = $1 WHERE id = $2`,
      [goalSlug, row.id]
    );
    updated += 1;
  }
  return updated;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const installs = await db.query(
    `SELECT DISTINCT family_id, goal_slug
     FROM for_dig_goal_install
     ORDER BY family_id, goal_slug`
  );

  console.log(`[for-dig-backfill] ${installs.rows.length} family×goal installs`);
  if (installs.rows.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  let totalUpdated = 0;
  const client = await db.getClient();

  try {
    if (apply) await client.query('BEGIN');

    for (const row of installs.rows) {
      const goal = getGoalBySlug(row.goal_slug);
      if (!goal) {
        console.warn(`  skip unknown goal: ${row.goal_slug}`);
        continue;
      }

      let names = [];
      if (goal.activityNames?.length) {
        names = goal.activityNames;
      } else if (goal.scheduleName) {
        names = await namesFromSchedule(goal.scheduleName);
      }

      if (names.length === 0) {
        console.log(`  ${row.family_id.slice(0, 8)}… ${row.goal_slug}: no activity names`);
        continue;
      }

      if (apply) {
        const n = await tagFamilyActivities(client, row.family_id, row.goal_slug, names);
        totalUpdated += n;
        console.log(`  ✓ ${row.family_id.slice(0, 8)}… ${row.goal_slug}: ${n} activities tagged`);
      } else {
        const preview = await db.query(
          `SELECT COUNT(*)::int AS cnt FROM activity_template at
           WHERE at.family_id = $1
             AND (at.for_dig_goal_slug IS NULL OR at.for_dig_goal_slug <> $2)
             AND EXISTS (
               SELECT 1 FROM unnest($3::text[]) AS w(name)
               WHERE LOWER(at.name) LIKE '%' || LOWER(w.name) || '%'
                  OR LOWER(w.name) LIKE '%' || LOWER(at.name) || '%'
             )`,
          [row.family_id, row.goal_slug, names]
        );
        const cnt = preview.rows[0].cnt;
        totalUpdated += cnt;
        console.log(`  ~ ${row.family_id.slice(0, 8)}… ${row.goal_slug}: would tag ${cnt} activities`);
      }
    }

    if (apply) await client.query('COMMIT');
  } catch (err) {
    if (apply) await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[for-dig-backfill] ${apply ? 'Updated' : 'Would update'} ${totalUpdated} activity rows`);
  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to write.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[for-dig-backfill] FAILED:', err.message);
    process.exit(1);
  });
