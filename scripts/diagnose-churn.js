#!/usr/bin/env node
/**
 * Read-only churn / retention diagnostic for all (non-archived) families.
 *
 * "Active" uses the SAME signals as the win-back scheduler + retention
 * dashboard: a parent login_event OR a completed daily_log_item.
 *
 * Run on the VPS (where the prod .env lives):
 *   cd /var/www/mystarday && node scripts/diagnose-churn.js
 *
 * 100% read-only (only SELECTs). Safe to run on production.
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');

const DAY_MS = 24 * 60 * 60 * 1000;

function pct(n, d) {
  if (!d) return '–';
  return `${((n / d) * 100).toFixed(1)}%`;
}

function bar(rate, width = 24) {
  const filled = Math.round(rate * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}

async function main() {
  const now = Date.now();

  const { rows } = await db.query(`
    SELECT
      fam.id,
      fam.created_at,
      GREATEST(
        COALESCE((SELECT MAX(le.occurred_at) FROM login_event le
                  WHERE le.family_id = fam.id), TIMESTAMPTZ 'epoch'),
        COALESCE((SELECT MAX(dli.completed_at)
                  FROM daily_log_item dli
                  JOIN daily_log dl ON dl.id = dli.daily_log_id
                  JOIN child c ON c.id = dl.child_id
                  WHERE c.family_id = fam.id AND dli.completed = true), TIMESTAMPTZ 'epoch')
      ) AS last_active,
      EXISTS (
        SELECT 1 FROM daily_log_item dli2
        JOIN daily_log dl2 ON dl2.id = dli2.daily_log_id
        JOIN child c2 ON c2.id = dl2.child_id
        WHERE c2.family_id = fam.id AND dli2.completed = true
      ) AS ever_completed
    FROM (SELECT id, created_at FROM family WHERE archived_at IS NULL) fam
    ORDER BY fam.created_at
  `);

  const fams = rows.map((r) => {
    const created = new Date(r.created_at).getTime();
    const lastActive = new Date(r.last_active).getTime();
    const hasActivity = lastActive > new Date('1971-01-01').getTime();
    return {
      ageDays: (now - created) / DAY_MS,
      daysSinceActive: hasActivity ? (now - lastActive) / DAY_MS : null,
      everCompleted: r.ever_completed === true,
      createdWeek: new Date(created).toISOString().slice(0, 10),
    };
  });

  const total = fams.length;
  const activeWithin = (w) =>
    fams.filter((f) => f.daysSinceActive !== null && f.daysSinceActive <= w).length;

  const a7 = activeWithin(7);
  const a14 = activeWithin(14);
  const a30 = activeWithin(30);
  const everCompleted = fams.filter((f) => f.everCompleted).length;
  const neverActive = fams.filter((f) => f.daysSinceActive === null).length;

  console.log('\n=== CHURN / RETENTION DIAGNOSTIC ===');
  console.log(`Total active families (non-archived): ${total}\n`);

  console.log('Currently active (parent login OR child completion):');
  console.log(`  last 7 days   ${bar(a7 / total)}  ${a7}/${total}  (${pct(a7, total)})`);
  console.log(`  last 14 days  ${bar(a14 / total)}  ${a14}/${total}  (${pct(a14, total)})`);
  console.log(`  last 30 days  ${bar(a30 / total)}  ${a30}/${total}  (${pct(a30, total)})`);
  console.log(`  → churned 30d+ : ${total - a30}/${total}  (${pct(total - a30, total)})\n`);

  console.log('Activation ("aha" = ever completed an activity / gave a star):');
  console.log(`  ever activated : ${everCompleted}/${total}  (${pct(everCompleted, total)})`);
  console.log(`  never any activity signal at all : ${neverActive}/${total}  (${pct(neverActive, total)})\n`);

  // Retention wall: of families old enough (>=14d), does activation predict survival?
  const mature = fams.filter((f) => f.ageDays >= 14);
  const split = (pred) => {
    const grp = mature.filter(pred);
    const alive = grp.filter((f) => f.daysSinceActive !== null && f.daysSinceActive <= 14).length;
    return { n: grp.length, alive };
  };
  const withAha = split((f) => f.everCompleted);
  const withoutAha = split((f) => !f.everCompleted);

  console.log('Retention wall (families >=14 days old, still active in last 14 days):');
  console.log(`  WITH activation    ${bar(withAha.alive / (withAha.n || 1))}  ${withAha.alive}/${withAha.n}  (${pct(withAha.alive, withAha.n)})`);
  console.log(`  WITHOUT activation ${bar(withoutAha.alive / (withoutAha.n || 1))}  ${withoutAha.alive}/${withoutAha.n}  (${pct(withoutAha.alive, withoutAha.n)})`);
  console.log('  → big gap = churn is an ACTIVATION problem (fix onboarding / first-star).');
  console.log('  → small gap + low overall = a RETENTION problem (fix week-2+ engagement).\n');

  // Signup-week cohorts (only mature enough to judge 14d retention)
  const byWeek = new Map();
  for (const f of fams) {
    const wk = f.createdWeek;
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk).push(f);
  }
  console.log('Signup-day cohorts (alive = active in last 14 days):');
  const weeks = [...byWeek.keys()].sort().slice(-14);
  for (const wk of weeks) {
    const g = byWeek.get(wk);
    const alive = g.filter((f) => f.daysSinceActive !== null && f.daysSinceActive <= 14).length;
    console.log(`  ${wk}  n=${String(g.length).padStart(3)}  alive ${String(alive).padStart(3)}  (${pct(alive, g.length)})`);
  }
  console.log('');

  await db.pool.end();
}

main().catch((err) => {
  console.error('diagnose-churn failed:', err.message);
  process.exit(1);
});
