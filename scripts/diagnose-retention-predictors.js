#!/usr/bin/env node
/**
 * Read-only: which early behaviors best predict D30 retention?
 *
 * Compares candidate leading indicators (Aha, Aha², SRD week 1/2, co-parent, etc.)
 * and prints leak analysis + SRD week-1 → D30 curve.
 *
 * Run on VPS (prod .env):
 *   cd $VPS_APP_PATH && node scripts/diagnose-retention-predictors.js
 *
 * Options:
 *   --min-age-days=35   Only families old enough to measure D30 (default 35)
 *   --d30-start=20      Start of D30 measurement window (days after signup)
 *   --d30-end=40        End of D30 window (days after signup)
 *
 * 100% read-only (SELECT only). Safe on live prod DB.
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

function bar(rate, width = 12) {
  const filled = Math.min(width, Math.round(rate * width));
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}

function lift(withRate, withoutRate) {
  if (!withoutRate) return withRate ? Infinity : 0;
  return withRate / withoutRate;
}

/**
 * @param {Array<{ id: string, d30: boolean, [key: string]: unknown }>} rows
 * @param {string} key
 */
function predictorStats(rows, key) {
  const withSig = rows.filter((r) => r[key]);
  const withoutSig = rows.filter((r) => !r[key]);
  const withRet = withSig.filter((r) => r.d30).length;
  const withoutRet = withoutSig.filter((r) => r.d30).length;
  const withRate = withSig.length ? withRet / withSig.length : 0;
  const withoutRate = withoutSig.length ? withoutRet / withoutSig.length : 0;
  return {
    key,
    withN: withSig.length,
    withRet,
    withRate,
    withoutN: withoutSig.length,
    withoutRet,
    withoutRate,
    lift: lift(withRate, withoutRate),
    deltaPp: (withRate - withoutRate) * 100,
  };
}

async function fetchFamilyFeatures(minAgeDays, d30Start, d30End) {
  const result = await db.query(
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
    -- Any completion on calendar date (child activity)
    completion_days AS (
      SELECT DISTINCT
        c.family_id,
        COALESCE(
          dli.completed_date,
          (dli.completed_at AT TIME ZONE b.tz)::date
        ) AS activity_date
      FROM daily_log_item dli
      JOIN daily_log dl ON dl.id = dli.daily_log_id
      JOIN child c ON c.id = dl.child_id
      JOIN base b ON b.family_id = c.family_id
      WHERE dli.completed = true
    ),
    completion_offsets AS (
      SELECT
        cd.family_id,
        cd.activity_date,
        (cd.activity_date - b.signup_date) AS day_offset
      FROM completion_days cd
      JOIN base b ON b.family_id = cd.family_id
    ),
    -- SRD-Morgon: all morgon items completed, at least one item
    srd_morgon_days AS (
      SELECT
        c.family_id,
        dl.date AS activity_date,
        (dl.date - b.signup_date) AS day_offset
      FROM daily_log dl
      JOIN child c ON c.id = dl.child_id
      JOIN base b ON b.family_id = c.family_id
      JOIN daily_log_item dli ON dli.daily_log_id = dl.id
      WHERE dl.is_paused = false
        AND dli.section = 'morgon'
      GROUP BY c.family_id, dl.date, b.signup_date
      HAVING COUNT(*) > 0
         AND COUNT(*) = COUNT(*) FILTER (WHERE dli.completed = true)
    ),
    family_srd_week1 AS (
      SELECT family_id, COUNT(DISTINCT activity_date)::int AS srd_days_week1
      FROM srd_morgon_days
      WHERE day_offset BETWEEN 0 AND 6
      GROUP BY family_id
    ),
    family_srd_week2 AS (
      SELECT family_id, COUNT(DISTINCT activity_date)::int AS srd_days_week2
      FROM srd_morgon_days
      WHERE day_offset BETWEEN 7 AND 13
      GROUP BY family_id
    ),
    parent_logins AS (
      SELECT
        le.family_id,
        (le.occurred_at AT TIME ZONE b.tz)::date AS login_date,
        le.user_id
      FROM login_event le
      JOIN base b ON b.family_id = le.family_id
      WHERE le.role = 'parent'
    ),
    parent_login_offsets AS (
      SELECT
        pl.family_id,
        pl.user_id,
        (pl.login_date - b.signup_date) AS day_offset
      FROM parent_logins pl
      JOIN base b ON b.family_id = pl.family_id
      WHERE pl.login_date IS NOT NULL
    ),
    two_parents_week2 AS (
      SELECT family_id, true AS two_parents_active
      FROM parent_login_offsets
      WHERE day_offset BETWEEN 0 AND 13
      GROUP BY family_id
      HAVING COUNT(DISTINCT user_id) >= 2
    ),
    co_parent_signals AS (
      SELECT
        b.family_id,
        true AS co_parent_signal
      FROM base b
      WHERE EXISTS (
        SELECT 1 FROM family_invite fi
        WHERE fi.family_id = b.family_id
          AND fi.created_at <= b.created_at + interval '7 days'
      )
      OR (
        SELECT COUNT(*)::int FROM parent p
        WHERE p.family_id = b.family_id
      ) >= 2
      OR EXISTS (
        SELECT 1 FROM parent_login_offsets plo
        WHERE plo.family_id = b.family_id
          AND plo.day_offset BETWEEN 0 AND 6
        GROUP BY plo.family_id
        HAVING COUNT(DISTINCT plo.user_id) >= 2
      )
    ),
    first_redemption AS (
      SELECT DISTINCT c.family_id, true AS has_redemption_14d
      FROM reward_redemption rr
      JOIN child c ON c.id = rr.child_id
      JOIN base b ON b.family_id = c.family_id
      WHERE rr.status IN ('approved', 'auto')
        AND COALESCE(rr.redeemed_at, rr.created_at) <= b.created_at + interval '14 days'
    ),
    d30_activity AS (
      SELECT DISTINCT x.family_id, true AS d30_retained
      FROM (
        SELECT plo.family_id
        FROM parent_login_offsets plo
        WHERE plo.day_offset BETWEEN $2 AND $3
        UNION
        SELECT co.family_id
        FROM completion_offsets co
        WHERE co.day_offset BETWEEN $2 AND $3
      ) x
    ),
    three_day_streak AS (
      SELECT s.family_id, true AS three_consecutive_days
      FROM (
        SELECT
          cd.family_id,
          cd.activity_date,
          cd.activity_date - (ROW_NUMBER() OVER (PARTITION BY cd.family_id ORDER BY cd.activity_date))::int AS grp
        FROM completion_days cd
        JOIN base b ON b.family_id = cd.family_id
        WHERE (cd.activity_date - b.signup_date) BETWEEN 0 AND 13
      ) s
      GROUP BY s.family_id, s.grp
      HAVING COUNT(*) >= 3
    ),
    features AS (
      SELECT
        b.family_id,
        b.signup_date,
        EXISTS (SELECT 1 FROM child c WHERE c.family_id = b.family_id) AS has_child,
        (s.schema_saved_at IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM weekly_schedule ws
            JOIN child c ON c.id = ws.child_id
            WHERE c.family_id = b.family_id
          )) AS has_schema,
        (s.first_completion_at IS NOT NULL
          AND s.first_completion_at <= b.created_at + interval '14 days') AS first_star_14d,
        COALESCE(fr.has_redemption_14d, false) AS first_redemption_14d,
        COALESCE(w1.srd_days_week1, 0) AS srd_days_week1,
        COALESCE(w2.srd_days_week2, 0) AS srd_days_week2,
        COALESCE(tp.two_parents_active, false) AS two_parents_active_14d,
        COALESCE(cp.co_parent_signal, false) AS co_parent_signal_7d,
        COALESCE(st.three_consecutive_days, false) AS three_consecutive_days_14d,
        COALESCE(d30.d30_retained, false) AS d30_retained
      FROM base b
      LEFT JOIN family_activation_state s ON s.family_id = b.family_id
      LEFT JOIN family_srd_week1 w1 ON w1.family_id = b.family_id
      LEFT JOIN family_srd_week2 w2 ON w2.family_id = b.family_id
      LEFT JOIN two_parents_week2 tp ON tp.family_id = b.family_id
      LEFT JOIN co_parent_signals cp ON cp.family_id = b.family_id
      LEFT JOIN first_redemption fr ON fr.family_id = b.family_id
      LEFT JOIN d30_activity d30 ON d30.family_id = b.family_id
      LEFT JOIN three_day_streak st ON st.family_id = b.family_id
    )
    SELECT * FROM features
    ORDER BY signup_date
    `,
    [minAgeDays, d30Start, d30End]
  );
  return result.rows;
}

function printLeakAnalysis(rows) {
  const n = rows.length;
  const noChild = rows.filter((r) => !r.has_child).length;
  const hasChildNoSchema = rows.filter((r) => r.has_child && !r.has_schema).length;
  const schemaNoStar = rows.filter((r) => r.has_schema && !r.first_star_14d).length;
  const starNoRedemption = rows.filter((r) => r.first_star_14d && !r.first_redemption_14d).length;
  const streakChurned = rows.filter(
    (r) => r.three_consecutive_days_14d && !r.d30_retained
  ).length;
  const streakTotal = rows.filter((r) => r.three_consecutive_days_14d).length;

  console.log('--- Negativ analys (var läcker det?) ---');
  console.log(`Kohort (mogen för D30):     ${n}`);
  console.log(`Aldrig skapat barn:         ${noChild} (${pct(noChild, n)})`);
  console.log(`Barn men inget schema:      ${hasChildNoSchema} (${pct(hasChildNoSchema, n)})`);
  console.log(`Schema men ej första stjärna (14d): ${schemaNoStar} (${pct(schemaNoStar, n)})`);
  console.log(`Första stjärna men ej belöning (14d): ${starNoRedemption} (${pct(starNoRedemption, n)})`);
  console.log(
    `3 dagar i rad (14d) men borta D30: ${streakChurned}/${streakTotal}` +
      (streakTotal ? ` (${pct(streakChurned, streakTotal)} av streak-kohort)` : '')
  );
  console.log('');
}

function printPredictorTable(rows) {
  const predictors = [
    { key: 'first_star_14d', label: 'Första stjärnan (14d)' },
    { key: 'first_redemption_14d', label: 'Första belöning / Aha² (14d)' },
    { key: 'srd3_week1', label: '≥3 lyckade morgnar vecka 1' },
    { key: 'srd5_week2', label: '≥5 SRD vecka 2 (dag 8–14)' },
    { key: 'two_parents_active_14d', label: 'Två vuxna aktiva (14d)' },
    { key: 'co_parent_signal_7d', label: 'Co-parent signal (7d)' },
    { key: 'three_consecutive_days_14d', label: '3 dagar completion i rad (14d)' },
  ];

  const enriched = rows.map((r) => ({
    ...r,
    srd3_week1: r.srd_days_week1 >= 3,
    srd5_week2: r.srd_days_week2 >= 5,
  }));

  const stats = predictors.map((p) => ({
    ...predictorStats(enriched, p.key),
    label: p.label,
  }));

  stats.sort((a, b) => b.deltaPp - a.deltaPp);

  console.log('--- Tidiga signaler → D30-retention ---');
  console.log(
    'Signal'.padEnd(36) +
      'Med'.padStart(6) +
      'D30%'.padStart(8) +
      'Utan'.padStart(6) +
      'D30%'.padStart(8) +
      'Δpp'.padStart(7) +
      'Lift'.padStart(7)
  );
  for (const s of stats) {
    const liftStr = s.lift === Infinity ? '∞' : s.lift.toFixed(2);
    console.log(
      s.label.padEnd(36) +
        String(s.withN).padStart(6) +
        pct(s.withRet, s.withN).padStart(8) +
        String(s.withoutN).padStart(6) +
        pct(s.withoutRet, s.withoutN).padStart(8) +
        `${s.deltaPp >= 0 ? '+' : ''}${s.deltaPp.toFixed(1)}`.padStart(7) +
        liftStr.padStart(7)
    );
  }
  console.log('');
  if (stats[0]) {
    console.log(
      `Starkaste prediktor (Δpp): ${stats[0].label} (${stats[0].deltaPp >= 0 ? '+' : ''}${stats[0].deltaPp.toFixed(1)} pp)`
    );
  }
  console.log('');
}

function printSrdCurve(rows) {
  const buckets = [
    { label: '0', min: 0, max: 0 },
    { label: '1', min: 1, max: 1 },
    { label: '2', min: 2, max: 2 },
    { label: '3', min: 3, max: 3 },
    { label: '4', min: 4, max: 4 },
    { label: '5+', min: 5, max: 99 },
  ];

  console.log('--- Lyckade morgnar vecka 1 → D30 ---');
  console.log('Antal SRD (dag 0–6)'.padEnd(22) + 'n'.padStart(5) + '  D30');
  for (const b of buckets) {
    const grp = rows.filter(
      (r) => r.srd_days_week1 >= b.min && r.srd_days_week1 <= b.max
    );
    const retained = grp.filter((r) => r.d30_retained).length;
    const rate = grp.length ? retained / grp.length : 0;
    console.log(
      `${b.label.padEnd(22)}${String(grp.length).padStart(5)}  ${bar(rate)}  ${pct(retained, grp.length)}`
    );
  }
  console.log('');
}

async function main() {
  const minAgeDays = parseArg('min-age-days', 35);
  const d30Start = parseArg('d30-start', 20);
  const d30End = parseArg('d30-end', 40);

  console.log('\n=== RETENTION PREDICTORS (read-only) ===');
  console.log(
    `Kohort: familjer ≥ ${minAgeDays} dagar gamla · D30-fönster: dag ${d30Start}–${d30End} efter signup`
  );
  console.log(
    'Aktiv = förälder-login eller barn-completion · SRD = alla morgonaktiviteter klara\n'
  );

  const rows = await fetchFamilyFeatures(minAgeDays, d30Start, d30End);
  if (!rows.length) {
    console.log('Inga familjer i kohorten (för ung bas eller tom DB).');
    await db.pool.end();
    return;
  }

  const d30Base = rows.filter((r) => r.d30_retained).length;
  console.log(`Bas-D30: ${pct(d30Base, rows.length)} (${d30Base}/${rows.length})\n`);

  printLeakAnalysis(rows);
  printSrdCurve(rows);
  printPredictorTable(rows);

  console.log('--- Tolkning ---');
  console.log('• Hög Δpp + lift → prioritera onboarding mot den signalen.');
  console.log('• Platt SRD-kurva → morgon-SRD predicerar inte retention (ännu); testa Aha²/co-parent.');
  console.log('• Största läckan i negativ analys → fixa det steget först.');
  console.log('• Kör veckovis på prod: node scripts/diagnose-retention-predictors.js\n');

  await db.pool.end();
}

main().catch((err) => {
  console.error('diagnose-retention-predictors failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
