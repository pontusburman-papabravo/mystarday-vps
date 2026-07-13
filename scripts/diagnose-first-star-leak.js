#!/usr/bin/env node
/**
 * Read-only: segment families with schema but no first star within 14d.
 * Answers what DB can tell us before interviews ("why didn't they use it together?").
 *
 * Run: cd $VPS_APP_PATH && node scripts/diagnose-first-star-leak.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();
const db = require('../src/lib/db');

function parseArg(name, defaultVal) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return defaultVal;
  const n = parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : defaultVal;
}

function pct(n, d) {
  if (!d) return '–';
  return `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  const minAgeDays = parseArg('min-age-days', 35);
  const starWindowDays = parseArg('star-window-days', 14);

  const { rows } = await db.query(
    `
    WITH base AS (
      SELECT
        f.id AS family_id,
        f.created_at,
        (f.created_at AT TIME ZONE COALESCE(f.timezone, 'Europe/Stockholm'))::date AS signup_date,
        COALESCE(f.timezone, 'Europe/Stockholm') AS tz
      FROM family f
      WHERE f.archived_at IS NULL
        AND f.created_at <= NOW() - ($1::int || ' days')::interval
    ),
    has_schema AS (
      SELECT DISTINCT b.family_id
      FROM base b
      WHERE EXISTS (SELECT 1 FROM child c WHERE c.family_id = b.family_id)
        AND (
          EXISTS (
            SELECT 1 FROM family_activation_state s
            WHERE s.family_id = b.family_id AND s.schema_saved_at IS NOT NULL
          )
          OR EXISTS (
            SELECT 1 FROM weekly_schedule ws
            JOIN child c ON c.id = ws.child_id
            WHERE c.family_id = b.family_id
          )
        )
    ),
    first_completion AS (
      SELECT DISTINCT c.family_id
      FROM daily_log_item dli
      JOIN daily_log dl ON dl.id = dli.daily_log_id
      JOIN child c ON c.id = dl.child_id
      JOIN base b ON b.family_id = c.family_id
      WHERE dli.completed = true
        AND COALESCE(
          dli.completed_date,
          (dli.completed_at AT TIME ZONE b.tz)::date
        ) - b.signup_date BETWEEN 0 AND $2 - 1
    ),
    leak AS (
      SELECT hs.family_id
      FROM has_schema hs
      LEFT JOIN first_completion fc ON fc.family_id = hs.family_id
      WHERE fc.family_id IS NULL
    ),
    signals AS (
      SELECT
        l.family_id,
        s.child_access_completed_at IS NOT NULL AS verified_child_access,
        EXISTS (
          SELECT 1 FROM login_event le
          WHERE le.family_id = l.family_id AND le.role = 'child'
            AND le.occurred_at <= b.created_at + ($2::int || ' days')::interval
        ) AS child_login_14d,
        EXISTS (
          SELECT 1 FROM login_event le
          WHERE le.family_id = l.family_id AND le.role = 'parent'
            AND le.occurred_at <= b.created_at + ($2::int || ' days')::interval
        ) AS parent_login_14d,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type = 'child_handoff_started'
            AND ae.created_at <= b.created_at + ($2::int || ' days')::interval
        ) AS handoff_started,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type = 'child_handoff_skipped'
            AND ae.created_at <= b.created_at + ($2::int || ' days')::interval
        ) AS handoff_skipped,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type = 'child_view_opened'
            AND ae.created_at <= b.created_at + ($2::int || ' days')::interval
        ) AS child_view_opened,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type LIKE 'child_%'
            AND ae.created_at <= b.created_at + ($2::int || ' days')::interval
        ) AS any_child_analytics,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type = 'feature_schedule_edit'
            AND ae.created_at <= b.created_at + ($2::int || ' days')::interval
        ) AS schedule_edit_after_setup,
        EXISTS (
          SELECT 1 FROM analytics_events ae
          WHERE ae.family_id = l.family_id
            AND ae.event_type = 'win_back_returned'
        ) AS win_back_returned,
        s.activation_nudge_sent_at IS NOT NULL
          AND s.activation_nudge_sent_at <= b.created_at + ($2::int || ' days')::interval AS nudge_sent_14d
      FROM leak l
      JOIN base b ON b.family_id = l.family_id
      LEFT JOIN family_activation_state s ON s.family_id = l.family_id
    )
    SELECT
      COUNT(*)::int AS total_leak,
      COUNT(*) FILTER (WHERE NOT any_child_analytics)::int AS no_child_analytics,
      COUNT(*) FILTER (WHERE NOT handoff_started AND NOT handoff_skipped)::int AS never_handoff_signal,
      COUNT(*) FILTER (WHERE handoff_skipped)::int AS handoff_skipped,
      COUNT(*) FILTER (WHERE handoff_started)::int AS handoff_started,
      COUNT(*) FILTER (WHERE child_view_opened)::int AS child_view_opened,
      COUNT(*) FILTER (WHERE child_login_14d)::int AS any_child_login,
      COUNT(*) FILTER (WHERE verified_child_access)::int AS verified_child_access,
      COUNT(*) FILTER (WHERE schedule_edit_after_setup)::int AS schedule_edit_after_setup,
      COUNT(*) FILTER (WHERE win_back_returned)::int AS win_back_returned,
      COUNT(*) FILTER (WHERE NOT parent_login_14d)::int AS no_parent_login_event
    FROM signals
    `,
    [minAgeDays, starWindowDays]
  );

  const r = rows[0] || {};
  const n = r.total_leak || 0;

  console.log('\n=== FIRST STAR LEAK (schema men ingen stjärna) ===');
  console.log(`Kohort ≥ ${minAgeDays}d · stjärnfönster ${starWindowDays}d · n=${n}\n`);
  console.log('Vad databasen kan se (överlappande segment):');
  console.log(`  Inga child_* analytics (14d):       ${r.no_child_analytics} (${pct(r.no_child_analytics, n)})`);
  console.log(`  Aldrig handoff-signal:              ${r.never_handoff_signal} (${pct(r.never_handoff_signal, n)})`);
  console.log(`  Handoff hoppad över:                ${r.handoff_skipped} (${pct(r.handoff_skipped, n)})`);
  console.log(`  Handoff startad:                    ${r.handoff_started} (${pct(r.handoff_started, n)})`);
  console.log(`  Barnvy öppnad (event):             ${r.child_view_opened} (${pct(r.child_view_opened, n)})`);
  console.log(`  Barn login (login_event, 14d):     ${r.any_child_login} (${pct(r.any_child_login, n)})`);
  console.log(`  Verifierad barnåtkomst:            ${r.verified_child_access} (${pct(r.verified_child_access, n)})`);
  console.log(`  Schema redigerat efter setup:      ${r.schedule_edit_after_setup} (${pct(r.schedule_edit_after_setup, n)})`);
  console.log(`  Win-back return (någonsin):        ${r.win_back_returned} (${pct(r.win_back_returned, n)})`);
  console.log(`  Ingen parent login_event (14d)*:    ${r.no_parent_login_event} (${pct(r.no_parent_login_event, n)})`);
  console.log('\n* login_event täcker inte alla äldre familjer — använd child_* analytics som primär signal.');

  await db.pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
