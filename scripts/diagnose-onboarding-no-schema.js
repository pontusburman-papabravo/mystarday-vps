#!/usr/bin/env node
/**
 * Deep dive: families without schema_saved_at (ADR §6).
 * Usage: node scripts/diagnose-onboarding-no-schema.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();
const db = require('../src/lib/db');

function pct(n, d) {
  if (!d) return '—';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

async function main() {
  const base = await db.query(`
    WITH no_schema AS (
      SELECT f.id AS family_id, f.created_at,
             COALESCE(s.activation_variant, 'legacy') AS variant
      FROM family f
      LEFT JOIN family_activation_state s ON s.family_id = f.id
      WHERE f.archived_at IS NULL
        AND (s.schema_saved_at IS NULL)
    ),
    enriched AS (
      SELECT
        ns.family_id,
        ns.created_at,
        ns.variant,
        BOOL_OR(p.onboarding_completed) AS onboarding_completed,
        COUNT(DISTINCT c.id)::int AS child_count,
        EXISTS (SELECT 1 FROM weekly_schedule ws JOIN child c2 ON c2.id = ws.child_id WHERE c2.family_id = ns.family_id) AS has_weekly_schedule,
        EXISTS (SELECT 1 FROM login_event le WHERE le.family_id = ns.family_id) AS has_login,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'funnel_onboarding_started') AS ev_funnel_onboarding_started,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'activation_onboarding_started') AS ev_activation_onboarding_started,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'funnel_onboarding_abandoned') AS ev_onboarding_abandoned,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'funnel_onboarding_completed') AS ev_onboarding_completed,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'starter_template_selected') AS ev_template_selected,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'funnel_first_child_created') AS ev_first_child,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'funnel_signup_started') AS ev_signup_started,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'child_profile_created') AS ev_child_profile,
        EXISTS (SELECT 1 FROM analytics_events ae WHERE ae.family_id = ns.family_id AND ae.event_type = 'activation_question_answered') AS ev_act_question
      FROM no_schema ns
      JOIN parent p ON p.family_id = ns.family_id
      LEFT JOIN child c ON c.family_id = ns.family_id
      GROUP BY ns.family_id, ns.created_at, ns.variant
    )
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE child_count = 0)::int AS no_child,
      COUNT(*) FILTER (WHERE child_count > 0)::int AS has_child,
      COUNT(*) FILTER (WHERE onboarding_completed)::int AS onboarding_flag_done,
      COUNT(*) FILTER (WHERE NOT onboarding_completed)::int AS onboarding_flag_not_done,
      COUNT(*) FILTER (WHERE has_weekly_schedule)::int AS has_schedule_rows,
      COUNT(*) FILTER (WHERE has_login)::int AS has_login,
      COUNT(*) FILTER (WHERE ev_funnel_onboarding_started OR ev_activation_onboarding_started)::int AS opened_onboarding,
      COUNT(*) FILTER (WHERE NOT ev_funnel_onboarding_started AND NOT ev_activation_onboarding_started)::int AS never_opened_onboarding,
      COUNT(*) FILTER (WHERE ev_onboarding_abandoned)::int AS abandoned,
      COUNT(*) FILTER (WHERE ev_onboarding_completed)::int AS completed_event,
      COUNT(*) FILTER (WHERE ev_template_selected)::int AS template_selected,
      COUNT(*) FILTER (WHERE ev_first_child)::int AS first_child_event,
      COUNT(*) FILTER (WHERE ev_signup_started)::int AS signup_event,
      COUNT(*) FILTER (WHERE ev_child_profile)::int AS child_profile_event,
      COUNT(*) FILTER (WHERE ev_act_question)::int AS act_question_event,
      COUNT(*) FILTER (WHERE child_count > 0 AND NOT ev_funnel_onboarding_started AND NOT ev_activation_onboarding_started)::int AS child_never_opened_onboarding,
      COUNT(*) FILTER (WHERE (ev_funnel_onboarding_started OR ev_activation_onboarding_started) AND child_count > 0 AND NOT ev_template_selected)::int AS opened_no_template,
      COUNT(*) FILTER (WHERE ev_template_selected AND NOT has_weekly_schedule)::int AS template_but_no_schedule_db
    FROM enriched
  `);

  const r = base.rows[0];
  const total = r.total;

  console.log('=== Utan schema_saved_at (prod) ===');
  console.log(`Totalt: ${total} familjer\n`);

  const rows = [
    ['Barn skapat (child_count > 0)', r.has_child, r.has_child],
    ['Inget barn', r.no_child, r.no_child],
    ['onboarding_completed = true (parent)', r.onboarding_flag_done, r.onboarding_flag_done],
    ['onboarding_completed = false', r.onboarding_flag_not_done, r.onboarding_flag_not_done],
    ['Har weekly_schedule i DB', r.has_schedule_rows, r.has_schedule_rows],
    ['Har login_event', r.has_login, r.has_login],
    ['Öppnat onboarding (analytics)', r.opened_onboarding, r.opened_onboarding],
    ['Aldrig öppnat onboarding', r.never_opened_onboarding, r.never_opened_onboarding],
    ['funnel_onboarding_abandoned', r.abandoned, r.abandoned],
    ['funnel_onboarding_completed', r.completed_event, r.completed_event],
    ['starter_template_selected', r.template_selected, r.template_selected],
    ['funnel_first_child_created', r.first_child_event, r.first_child_event],
    ['funnel_signup_started', r.signup_event, r.signup_event],
    ['child_profile_created', r.child_profile_event, r.child_profile_event],
    ['activation_question_answered', r.act_question_event, r.act_question_event],
  ];

  console.log('Segment'.padEnd(42), 'Antal'.padStart(6), '  Andel');
  console.log('-'.repeat(58));
  for (const [label, n] of rows) {
    console.log(label.padEnd(42), String(n).padStart(6), `  ${pct(n, total)}`);
  }

  console.log('\n--- Diagnostiska kluster ---');
  console.log(`Barn men aldrig öppnat onboarding:     ${r.child_never_opened_onboarding} (${pct(r.child_never_opened_onboarding, total)})`);
  console.log(`Öppnat onboarding, ej mall vald:        ${r.opened_no_template} (${pct(r.opened_no_template, total)})`);
  console.log(`Mall vald men inget weekly_schedule:    ${r.template_but_no_schedule_db} (${pct(r.template_but_no_schedule_db, total)})`);

  const variants = await db.query(`
    SELECT COALESCE(s.activation_variant, 'legacy') AS variant, COUNT(*)::int AS n
    FROM family f
    LEFT JOIN family_activation_state s ON s.family_id = f.id
    WHERE f.archived_at IS NULL AND s.schema_saved_at IS NULL
    GROUP BY 1 ORDER BY n DESC
  `);
  console.log('\n--- activation_variant ---');
  for (const row of variants.rows) {
    console.log(`  ${row.variant}: ${row.n} (${pct(row.n, total)})`);
  }

  const topEvents = await db.query(`
    SELECT ae.event_type, COUNT(DISTINCT f.id)::int AS families
    FROM family f
    LEFT JOIN family_activation_state s ON s.family_id = f.id
    JOIN analytics_events ae ON ae.family_id = f.id
    WHERE f.archived_at IS NULL AND s.schema_saved_at IS NULL
    GROUP BY ae.event_type
    ORDER BY families DESC
    LIMIT 25
  `);
  console.log('\n--- Topp analytics-events (familjer utan schema) ---');
  for (const row of topEvents.rows) {
    console.log(`  ${row.event_type.padEnd(40)} ${String(row.families).padStart(4)} (${pct(row.families, total)})`);
  }

  const age = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE f.created_at > NOW() - interval '7 days')::int AS last_7d,
      COUNT(*) FILTER (WHERE f.created_at BETWEEN NOW() - interval '30 days' AND NOW() - interval '7 days')::int AS d7_30,
      COUNT(*) FILTER (WHERE f.created_at < NOW() - interval '30 days')::int AS older_30d
    FROM family f
    LEFT JOIN family_activation_state s ON s.family_id = f.id
    WHERE f.archived_at IS NULL AND s.schema_saved_at IS NULL
  `);
  const a = age.rows[0];
  console.log('\n--- Ålder (utan schema) ---');
  console.log(`  Senaste 7d: ${a.last_7d}`);
  console.log(`  7–30d:      ${a.d7_30}`);
  console.log(`  >30d:       ${a.older_30d}`);

  const mismatch = await db.query(`
    SELECT COUNT(DISTINCT f.id)::int AS n
    FROM family f
    JOIN family_activation_state s ON s.family_id = f.id
    JOIN parent p ON p.family_id = f.id
    WHERE f.archived_at IS NULL
      AND s.schema_saved_at IS NULL
      AND BOOL_OR(p.onboarding_completed)
    GROUP BY f.id
    HAVING BOOL_OR(p.onboarding_completed) = true
  `).catch(() => ({ rows: [{ n: 0 }] }));

  // Fix query - use subquery
  const mismatch2 = await db.query(`
    SELECT COUNT(*)::int AS n FROM (
      SELECT f.id
      FROM family f
      JOIN parent p ON p.family_id = f.id
      LEFT JOIN family_activation_state s ON s.family_id = f.id
      WHERE f.archived_at IS NULL
        AND (s.schema_saved_at IS NULL)
      GROUP BY f.id
      HAVING BOOL_OR(p.onboarding_completed) = true
    ) x
  `);
  console.log(`\n--- Datakvalitet: onboarding_completed=true men schema_saved saknas: ${mismatch2.rows[0].n} ---`);

  await db.pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
