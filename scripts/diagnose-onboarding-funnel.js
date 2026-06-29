#!/usr/bin/env node
/**
 * Onboarding funnel drop-off report (ADR §6).
 * Usage: node scripts/diagnose-onboarding-funnel.js [weeks]
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const { getActivationFunnelCohorts } = require('../db/activation-funnel');

function pct(n, d) {
  if (!d) return '—';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

function rateDrop(from, to) {
  if (!from) return '—';
  const drop = Math.round((1 - to / from) * 1000) / 10;
  return `${drop}% drop`;
}

async function getOverallFunnel() {
  const result = await db.query(
    `WITH families AS (
       SELECT f.id AS family_id, f.created_at
       FROM family f
       WHERE f.archived_at IS NULL
     )
     SELECT
       COUNT(*)::int AS signup,
       COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL)::int AS schema_saved,
       COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL)::int AS child_access,
       COUNT(*) FILTER (WHERE s.first_completion_at IS NOT NULL)::int AS first_completion,
       COUNT(*) FILTER (WHERE s.p0_activated_within_48h)::int AS p0_48h
     FROM families fam
     LEFT JOIN family_activation_state s ON s.family_id = fam.family_id`
  );
  return result.rows[0] || {};
}

async function getStuckWithoutCompletion() {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL AND s.first_completion_at IS NULL)::int AS schema_no_completion,
       COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL AND s.first_completion_at IS NULL)::int AS child_access_no_completion,
       COUNT(*) FILTER (WHERE s.schema_saved_at IS NULL)::int AS no_schema
     FROM family f
     LEFT JOIN family_activation_state s ON s.family_id = f.family_id
     WHERE f.archived_at IS NULL`
  );
  return result.rows[0] || {};
}

async function main() {
  const weeks = Math.min(12, Math.max(4, parseInt(process.argv[2], 10) || 8));
  console.log(`=== Onboarding funnel (${weeks} veckor + totalt) ===\n`);

  const overall = await getOverallFunnel();
  const stuck = await getStuckWithoutCompletion();
  const funnel = await getActivationFunnelCohorts(weeks);

  console.log('--- Totalt (alla familjer) ---');
  console.log(`Signup:           ${overall.signup}`);
  console.log(`Schema sparat:    ${overall.schema_saved} (${pct(overall.schema_saved, overall.signup)})`);
  console.log(`Child access:     ${overall.child_access} (${pct(overall.child_access, overall.signup)})`);
  console.log(`Första avbockning:${overall.first_completion} (${pct(overall.first_completion, overall.signup)})`);
  console.log(`P0 inom 48h:      ${overall.p0_48h} (${pct(overall.p0_48h, overall.signup)}) ← North Star`);
  console.log('');
  console.log('--- Fastnat (utan avbockning) ---');
  console.log(`Utan schema:              ${stuck.no_schema}`);
  console.log(`Schema men ej avbockning:${stuck.schema_no_completion}`);
  console.log(`Child access men ej avb.: ${stuck.child_access_no_completion}`);
  console.log('');

  if (funnel.cohorts?.length) {
    const totals = funnel.steps.reduce((acc, step) => {
      acc[step.key] = funnel.cohorts.reduce((s, c) => s + (c.counts[step.key] || 0), 0);
      return acc;
    }, {});
    const signup = totals.signup || 1;

    console.log(`--- Kohort ${weeks}v (aggregerat) ---`);
    for (const step of funnel.steps) {
      const n = totals[step.key] || 0;
      console.log(`${step.label.padEnd(22)} ${String(n).padStart(5)} (${pct(n, signup)})`);
    }
    console.log('');
    console.log('--- Största steget-drop (kohort) ---');
    const pairs = [
      ['signup', 'schema_saved'],
      ['schema_saved', 'child_access'],
      ['child_access', 'first_completion'],
      ['first_completion', 'p0_activated_48h'],
    ];
    let worst = { label: '', drop: 0 };
    for (const [fromKey, toKey] of pairs) {
      const from = totals[fromKey] || 0;
      const to = totals[toKey] || 0;
      if (!from) continue;
      const dropPct = (1 - to / from) * 100;
      const fromLabel = funnel.steps.find((s) => s.key === fromKey)?.label || fromKey;
      const toLabel = funnel.steps.find((s) => s.key === toKey)?.label || toKey;
      console.log(`${fromLabel} → ${toLabel}: ${rateDrop(from, to)}`);
      if (dropPct > worst.drop) {
        worst = { label: `${fromLabel} → ${toLabel}`, drop: dropPct };
      }
    }
    console.log(`\nStörsta friktion: ${worst.label} (${Math.round(worst.drop * 10) / 10}% drop)`);
  }

  if (funnel.childAccessDiagnostics?.counts) {
    console.log('\n--- Child access diagnostik ---');
    for (const m of funnel.childAccessDiagnostics.metrics || []) {
      console.log(`${m.label.padEnd(22)} ${funnel.childAccessDiagnostics.counts[m.key] || 0}`);
    }
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
