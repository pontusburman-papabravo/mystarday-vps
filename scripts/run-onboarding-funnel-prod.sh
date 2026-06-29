#!/usr/bin/env bash
# One-off prod funnel report (uses code already on VPS).
set -euo pipefail
cd "$(dirname "$0")/.."
node <<'NODE'
const { loadEnvFile } = require('./src/lib/load-env');
loadEnvFile();
const db = require('./src/lib/db');
const { getActivationFunnelCohorts } = require('./db/activation-funnel');

function pct(n, d) {
  if (!d) return '—';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

(async () => {
  const overall = await db.query(`
    SELECT COUNT(*)::int AS signup,
      COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL)::int AS schema_saved,
      COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL)::int AS child_access,
      COUNT(*) FILTER (WHERE s.first_completion_at IS NOT NULL)::int AS first_completion,
      COUNT(*) FILTER (WHERE s.p0_activated_within_48h)::int AS p0_48h
    FROM family f
    LEFT JOIN family_activation_state s ON s.family_id = f.id
    WHERE f.archived_at IS NULL`);

  const stuck = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL AND s.first_completion_at IS NULL)::int AS schema_no_completion,
      COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL AND s.first_completion_at IS NULL)::int AS child_access_no_completion,
      COUNT(*) FILTER (WHERE s.schema_saved_at IS NULL)::int AS no_schema
    FROM family f
    LEFT JOIN family_activation_state s ON s.family_id = f.id
    WHERE f.archived_at IS NULL`);

  const o = overall.rows[0];
  const st = stuck.rows[0];
  console.log('=== Onboarding funnel (prod) ===');
  console.log('Signup:', o.signup);
  console.log('Schema:', o.schema_saved, pct(o.schema_saved, o.signup));
  console.log('Child access:', o.child_access, pct(o.child_access, o.signup));
  console.log('First completion:', o.first_completion, pct(o.first_completion, o.signup));
  console.log('P0 48h:', o.p0_48h, pct(o.p0_48h, o.signup));
  console.log('Stuck no schema:', st.no_schema);
  console.log('Stuck schema no completion:', st.schema_no_completion);
  console.log('Stuck child access no completion:', st.child_access_no_completion);

  const funnel = await getActivationFunnelCohorts(8);
  const totals = funnel.steps.reduce((acc, step) => {
    acc[step.key] = funnel.cohorts.reduce((s, c) => s + (c.counts[step.key] || 0), 0);
    return acc;
  }, {});
  console.log('\n8v cohort aggregate:');
  for (const step of funnel.steps) {
    console.log(step.label, totals[step.key], pct(totals[step.key], totals.signup));
  }
  await db.pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
