/**
 * Analytics DB module.
 * Owns: analytics_events inserts + analytics_daily_snapshots read/write.
 * Does NOT own: any other table or business logic — pure data layer.
 */

const db = require('../src/lib/db');

// ─── Event recording ──────────────────────────────────────

/**
 * Record a single analytics event. Fire-and-forget safe: never throws to caller.
 * @param {string} familyId  UUID of the family (anonymised key)
 * @param {string} eventType e.g. 'funnel_landing_visit'
 * @param {object} metadata  arbitrary JSONB — no PII
 */
async function recordEvent(familyId, eventType, metadata = {}) {
  try {
    await db.query(
      `INSERT INTO analytics_events (family_id, event_type, metadata)
       VALUES ($1, $2, $3)`,
      [familyId, eventType, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Silent: analytics must never break product flows
    console.error('[analytics] recordEvent failed:', err.message);
  }
}

/**
 * Record an event with a surrogate/anonymous family UUID derived from a real ID.
 * Use this when the caller only has a real family_id that's already a UUID.
 */
async function track(familyId, eventType, metadata = {}) {
  if (!familyId) return;
  return recordEvent(familyId, eventType, metadata);
}

// ─── Funnel counts ────────────────────────────────────────

/**
 * Returns funnel step counts for the onboarding funnel.
 * Steps: landing_visit, signup_started, email_verified, first_child_created
 */
async function getFunnelCounts() {
  const [eventsResult, fallbackResult] = await Promise.all([
    db.query(`
      SELECT event_type, COUNT(DISTINCT family_id) AS unique_families
      FROM analytics_events
      WHERE event_type IN (
        'funnel_landing_visit',
        'funnel_signup_started',
        'funnel_email_verified',
        'funnel_first_child_created'
      )
      GROUP BY event_type
    `),
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM family WHERE archived_at IS NULL) AS families_registered,
        (SELECT COUNT(DISTINCT p.family_id)::int FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE f.archived_at IS NULL AND p.verified = true AND p.is_admin = false) AS families_verified,
        (SELECT COUNT(DISTINCT c.family_id)::int FROM child c
         JOIN family f ON f.id = c.family_id WHERE f.archived_at IS NULL) AS families_with_child
    `),
  ]);

  const map = {};
  for (const row of eventsResult.rows) {
    map[row.event_type] = parseInt(row.unique_families, 10);
  }
  const fb = fallbackResult.rows[0] || {};

  // Use analytics events when tracked; fall back to real DB counts for older families.
  return [
    { step: 'Landningssida besökt', event: 'funnel_landing_visit', count: map.funnel_landing_visit || 0 },
    { step: 'Registrering påbörjad', event: 'funnel_signup_started', count: map.funnel_signup_started || fb.families_registered || 0 },
    { step: 'E-post verifierad', event: 'funnel_email_verified', count: map.funnel_email_verified || fb.families_verified || 0 },
    { step: 'Första barn skapat', event: 'funnel_first_child_created', count: map.funnel_first_child_created || fb.families_with_child || 0 },
  ];
}

// ─── Feature popularity ───────────────────────────────────

/**
 * Returns feature usage counts, sorted by frequency (last 30 days).
 */
async function getFeaturePopularity() {
  const result = await db.query(`
    SELECT event_type, COUNT(*) AS total_uses, COUNT(DISTINCT family_id) AS unique_families
    FROM analytics_events
    WHERE event_type IN (
      'feature_child_view',
      'feature_treasure_chest',
      'feature_schedule_edit',
      'feature_daily_log'
    )
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY event_type
    ORDER BY total_uses DESC
  `);

  const labels = {
    feature_child_view:      'Barnvy',
    feature_treasure_chest:  'Skattkammaren',
    feature_schedule_edit:   'Schema/Planering',
    feature_daily_log:       'Daglig logg',
  };

  return result.rows.map(row => ({
    event:           row.event_type,
    label:           labels[row.event_type] || row.event_type,
    total_uses:      parseInt(row.total_uses),
    unique_families: parseInt(row.unique_families),
  }));
}

// ─── Daily snapshots ──────────────────────────────────────

/**
 * Write (upsert) a daily snapshot. Called by the analytics scheduler each midnight.
 */
async function upsertDailySnapshot(snapshot) {
  const {
    date,
    active_families_24h,
    active_families_7d,
    total_stars_given,
    total_rewards_claimed,
    conversion_rate,
    pwa_installed_count,
    pwa_browser_count,
    newsletter_subscribers_count,
  } = snapshot;

  await db.query(
    `INSERT INTO analytics_daily_snapshots (
       date, active_families_24h, active_families_7d,
       total_stars_given, total_rewards_claimed, conversion_rate,
       pwa_installed_count, pwa_browser_count, newsletter_subscribers_count,
       updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (date) DO UPDATE SET
       active_families_24h          = EXCLUDED.active_families_24h,
       active_families_7d           = EXCLUDED.active_families_7d,
       total_stars_given            = EXCLUDED.total_stars_given,
       total_rewards_claimed        = EXCLUDED.total_rewards_claimed,
       conversion_rate              = EXCLUDED.conversion_rate,
       pwa_installed_count          = EXCLUDED.pwa_installed_count,
       pwa_browser_count            = EXCLUDED.pwa_browser_count,
       newsletter_subscribers_count = EXCLUDED.newsletter_subscribers_count,
       updated_at                   = NOW()`,
    [
      date,
      active_families_24h,
      active_families_7d,
      total_stars_given,
      total_rewards_claimed,
      conversion_rate,
      pwa_installed_count,
      pwa_browser_count,
      newsletter_subscribers_count,
    ]
  );
}

/**
 * Returns the last N days of snapshots (oldest first — chart order).
 */
async function getRecentSnapshots(days = 7) {
  const result = await db.query(
    `SELECT * FROM analytics_daily_snapshots
     WHERE date >= CURRENT_DATE - ($1 - 1)
     ORDER BY date ASC`,
    [days]
  );
  return result.rows;
}

// ─── Live KPI aggregation ─────────────────────────────────

/**
 * Computes today's KPI figures directly from source tables.
 * Used to populate today's snapshot and for the live dashboard view.
 */
async function computeLiveKpis() {
  const [
    activity24h,
    activity7d,
    starsResult,
    rewardsResult,
    funnelResult,
    pwaResult,
    newsletterResult,
  ] = await Promise.all([
    // Active families: analytics events OR real usage (completions, logins)
    db.query(`
      SELECT COUNT(DISTINCT family_id) AS count FROM (
        SELECT family_id FROM analytics_events WHERE created_at >= NOW() - INTERVAL '24 hours'
        UNION
        SELECT c.family_id FROM daily_log_item dli
        JOIN daily_log dl ON dl.id = dli.daily_log_id
        JOIN child c ON c.id = dl.child_id
        WHERE dli.completed = true AND dli.completed_at >= NOW() - INTERVAL '24 hours'
        UNION
        SELECT family_id FROM login_event WHERE occurred_at >= NOW() - INTERVAL '24 hours'
      ) active
    `),
    db.query(`
      SELECT COUNT(DISTINCT family_id) AS count FROM (
        SELECT family_id FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION
        SELECT c.family_id FROM daily_log_item dli
        JOIN daily_log dl ON dl.id = dli.daily_log_id
        JOIN child c ON c.id = dl.child_id
        WHERE dli.completed = true AND dli.completed_at >= NOW() - INTERVAL '7 days'
        UNION
        SELECT family_id FROM login_event WHERE occurred_at >= NOW() - INTERVAL '7 days'
      ) active
    `),
    // Total stars given (all time from daily_log_item)
    db.query(`
      SELECT COALESCE(SUM(star_value), 0) AS total
      FROM daily_log_item
      WHERE completed = true
    `),
    // Total reward redemptions
    db.query(`SELECT COUNT(*) AS total FROM reward_redemption`),
    // Funnel: signup_started vs first_child_created for conversion rate
    db.query(`
      SELECT event_type, COUNT(DISTINCT family_id) AS cnt
      FROM analytics_events
      WHERE event_type IN ('funnel_signup_started','funnel_first_child_created')
      GROUP BY event_type
    `),
    // PWA events breakdown
    db.query(`
      SELECT event_type, COUNT(DISTINCT family_id) AS cnt
      FROM analytics_events
      WHERE event_type IN ('pwa_installed','pwa_browser')
      GROUP BY event_type
    `),
    // Newsletter subscribers (default on — parents without a row count as subscribed)
    db.query(`
      SELECT COUNT(*) AS total
      FROM parent p
      LEFT JOIN email_subscriptions es ON es.parent_id = p.id
      WHERE p.email IS NOT NULL AND TRIM(p.email) <> ''
        AND COALESCE(es.subscribed, true) = true
    `),
  ]);

  const funnelMap = {};
  for (const row of funnelResult.rows) funnelMap[row.event_type] = parseInt(row.cnt);
  let started = funnelMap['funnel_signup_started'] || 0;
  let completed = funnelMap['funnel_first_child_created'] || 0;
  if (started === 0 || completed === 0) {
    const fb = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM family WHERE archived_at IS NULL) AS families_registered,
        (SELECT COUNT(DISTINCT c.family_id)::int FROM child c
         JOIN family f ON f.id = c.family_id WHERE f.archived_at IS NULL) AS families_with_child
    `);
    if (started === 0) started = fb.rows[0]?.families_registered || 0;
    if (completed === 0) completed = fb.rows[0]?.families_with_child || 0;
  }
  const conversionRate = started > 0 ? Math.round((completed / started) * 10000) / 100 : 0;

  const pwaMap = {};
  for (const row of pwaResult.rows) pwaMap[row.event_type] = parseInt(row.cnt);

  return {
    active_families_24h:          parseInt(activity24h.rows[0].count),
    active_families_7d:           parseInt(activity7d.rows[0].count),
    total_stars_given:            parseInt(starsResult.rows[0].total),
    total_rewards_claimed:        parseInt(rewardsResult.rows[0].total),
    conversion_rate:              conversionRate,
    pwa_installed_count:          pwaMap['pwa_installed'] || 0,
    pwa_browser_count:            pwaMap['pwa_browser'] || 0,
    newsletter_subscribers_count: parseInt(newsletterResult.rows[0].total),
  };
}

// ─── Family Dynamics (Case C) ───────────────────────────

/**
 * Multi-parent family stats + correlation with engagement.
 * Returns families grouped by parent count and their average activity index.
 */
async function getFamilyDynamics() {
  const result = await db.query(`
    WITH family_parents AS (
      SELECT f.id AS family_id,
             COUNT(DISTINCT pc.parent_id) AS parent_count
      FROM family f
      JOIN child c ON c.family_id = f.id
      JOIN parent_child pc ON pc.child_id = c.id
      GROUP BY f.id
    ),
    family_activity AS (
      SELECT ae.family_id,
             COUNT(*) AS event_count,
             COUNT(DISTINCT DATE(ae.created_at)) AS active_days
      FROM analytics_events ae
      WHERE ae.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY ae.family_id
    )
    SELECT
      fp.parent_count,
      COUNT(DISTINCT fp.family_id) AS family_count,
      ROUND(AVG(fa.active_days)::numeric, 1) AS avg_active_days,
      ROUND(AVG(fa.event_count)::numeric, 1) AS avg_event_count,
      SUM(fa.event_count) AS total_events
    FROM family_parents fp
    LEFT JOIN family_activity fa ON fa.family_id = fp.family_id
    GROUP BY fp.parent_count
    ORDER BY fp.parent_count
  `);

  // Overall comparison: 1-parent vs 2+ parents
  const total = result.rows.reduce((acc, r) => ({
    families: acc.families + parseInt(r.family_count),
    events: acc.events + parseInt(r.total_events || 0),
    activeDays: acc.activeDays + parseFloat(r.avg_active_days || 0) * parseInt(r.family_count),
  }), { families: 0, events: 0, activeDays: 0 });

  const oneParent = result.rows.find(r => parseInt(r.parent_count) === 1);
  const multiParent = result.rows.filter(r => parseInt(r.parent_count) >= 2);

  const multiCount = multiParent.reduce((s, r) => s + parseInt(r.family_count), 0);
  const multiEvents = multiParent.reduce((s, r) => s + parseInt(r.total_events || 0), 0);

  const avg1 = oneParent
    ? (parseFloat(oneParent.avg_active_days) || 0)
    : 0;
  const avgMulti = multiCount > 0
    ? (multiParent.reduce((s, r) => s + parseFloat(r.avg_active_days || 0) * parseInt(r.family_count), 0) / multiCount)
    : 0;

  return {
    breakdown: result.rows.map(r => ({
      parent_count:    parseInt(r.parent_count),
      family_count:    parseInt(r.family_count),
      avg_active_days: parseFloat(r.avg_active_days) || 0,
      avg_events:      parseFloat(r.avg_event_count) || 0,
    })),
    comparison: {
      single_parent_avg_active_days: Math.round(avg1 * 10) / 10,
      multi_parent_avg_active_days:  Math.round(avgMulti * 10) / 10,
      multi_parent_more_engaged:      avgMulti > avg1,
      engagement_delta_pct: avg1 > 0 ? Math.round(((avgMulti - avg1) / avg1) * 100) : null,
    },
  };
}

/**
 * Activity heatmap: count of events per hour × weekday (last 30 days).
 * Returns 7 rows (Mon–Sun), each with 24 hour buckets.
 */
async function getActivityHeatmap() {
  const result = await db.query(`
    SELECT
      EXTRACT(DOW FROM created_at) AS dow,        -- 0=Sun, 1=Mon, ..., 6=Sat
      time_bucket AS hour,
      COUNT(*) AS event_count
    FROM analytics_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY dow, hour
    ORDER BY dow, hour
  `);

  // Build 7×24 matrix, fill zeros
  const matrix = {};
  const DOW_LABELS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  for (let dow = 1; dow <= 7; dow++) {   // Mon=1 ... Sun=7 (Postgres DOW)
    matrix[dow] = {};
    for (let h = 0; h < 24; h++) matrix[dow][h] = 0;
  }

  for (const row of result.rows) {
    const dow = parseInt(row.dow);
    const hour = parseInt(row.hour);
    if (matrix[dow] !== undefined) matrix[dow][hour] = parseInt(row.event_count);
  }

  const rows = [];
  for (let dow = 1; dow <= 7; dow++) {
    rows.push({ day: DOW_LABELS[dow - 1], dayIndex: dow, hours: Array.from({ length: 24 }, (_, h) => matrix[dow][h]) });
  }

  // Find peak hour for context
  let maxCount = 0, peakHour = 0;
  for (let h = 0; h < 24; h++) {
    let total = 0;
    for (let dow = 1; dow <= 7; dow++) total += matrix[dow][h];
    if (total > maxCount) { maxCount = total; peakHour = h; }
  }

  return { rows, peak_hour: peakHour };
}

/**
 * Ghost families: created account but never opened child_view.
 * Also includes families inactive >7 days.
 */
async function getWarningFamilies() {
  // Ghost: registered (funnel_signup_started) but never feature_child_view
  const ghosts = await db.query(`
    WITH registered AS (
      SELECT DISTINCT family_id
      FROM analytics_events
      WHERE event_type = 'funnel_signup_started'
    ),
    child_viewed AS (
      SELECT DISTINCT family_id
      FROM analytics_events
      WHERE event_type = 'feature_child_view'
    )
    SELECT
      f.id AS family_id,
      f.name AS family_name,
      f.created_at AS registered_at,
      COALESCE(MIN(ae.created_at), NULL) AS last_activity_at,
      'ghost' AS flag_type
    FROM registered r
    JOIN family f ON f.id = r.family_id
    LEFT JOIN child_viewed cv ON cv.family_id = r.family_id
    LEFT JOIN analytics_events ae ON ae.family_id = r.family_id
    WHERE cv.family_id IS NULL
    GROUP BY f.id, f.name, f.created_at
    ORDER BY f.created_at DESC
    LIMIT 100
  `);

  // Dropped: families with no events in last 3 days but had events before
  const dropped = await db.query(`
    WITH active_families AS (
      SELECT family_id, MAX(created_at) AS last_event
      FROM analytics_events
      GROUP BY family_id
    )
    SELECT
      f.id AS family_id,
      f.name AS family_name,
      af.last_event AS last_activity_at,
      EXTRACT(DAY FROM (NOW() - af.last_event)) AS days_inactive,
      'dropped' AS flag_type
    FROM active_families af
    JOIN family f ON f.id = af.family_id
    WHERE af.last_event < NOW() - INTERVAL '3 days'
    ORDER BY af.last_event ASC
    LIMIT 100
  `);

  // Weekly churn trend: count of newly "dropped" families per week (last 8 weeks)
  const churnTrend = await db.query(`
    WITH week_bounds AS (
      SELECT
        date_trunc('week', d)::date AS week_start,
        date_trunc('week', d)::date + 6 AS week_end
      FROM generate_series(
        CURRENT_DATE - 56,
        CURRENT_DATE,
        '1 week'::interval
      ) d
    ),
    inactive_families AS (
      SELECT family_id, MAX(created_at) AS last_event
      FROM analytics_events
      GROUP BY family_id
    ),
    weekly_churn AS (
      SELECT
        wb.week_start,
        COUNT(DISTINCT af.family_id) AS dropped_count
      FROM week_bounds wb
      LEFT JOIN inactive_families af
        ON af.last_event >= wb.week_start - INTERVAL '3 days'
        AND af.last_event < wb.week_start
      GROUP BY wb.week_start
      ORDER BY wb.week_start ASC
    )
    SELECT
      week_start,
      week_start + 6 AS week_end,
      dropped_count,
      dropped_count > LAG(dropped_count) OVER (ORDER BY week_start) AS increasing
    FROM weekly_churn
  `);

  return {
    ghost: ghosts.rows.map(r => ({
      family_id:          r.family_id,
      family_name:        r.family_name,
      registered_at:      r.registered_at,
      flag_type:          'ghost',
    })),
    dropped: dropped.rows.map(r => ({
      family_id:          r.family_id,
      family_name:        r.family_name,
      last_activity_at:   r.last_activity_at,
      days_inactive:      parseInt(r.days_inactive),
      flag_type:          'dropped',
    })),
    churn_trend: churnTrend.rows.map(r => ({
      week_start:       r.week_start,
      week_end:         r.week_end,
      dropped_count:    parseInt(r.dropped_count),
      increasing:       r.increasing,
    })),
  };
}

// ─── Retention Cohort Curve (Case 3) ───────────────────

/**
 * Weekly cohort retention: families grouped by registration week,
 * then tracked week by week. Active = at least 1 event that period.
 */
async function getRetentionCurve() {
  const result = await db.query(`
    WITH cohort AS (
      SELECT DISTINCT
        family_id,
        DATE_TRUNC('week', MIN(created_at))::date AS cohort_week
      FROM analytics_events
      WHERE event_type = 'funnel_signup_started'
        AND created_at >= CURRENT_DATE - 98  -- 14 weeks back
      GROUP BY family_id
    ),
    weekly_activity AS (
      SELECT
        ae.family_id,
        DATE_TRUNC('week', ae.created_at)::date AS activity_week
      FROM analytics_events ae
      WHERE ae.created_at >= CURRENT_DATE - 98
    ),
    cohort_weeks AS (
      SELECT
        c.cohort_week,
        c.family_id,
        generate_series(0, 13) AS week_offset
      FROM cohort c
    ),
    weekly_retention AS (
      SELECT
        cw.cohort_week,
        cw.week_offset,
        COUNT(DISTINCT cw.family_id) AS cohort_size,
        COUNT(DISTINCT wa.family_id) AS active_count
      FROM cohort_weeks cw
      LEFT JOIN weekly_activity wa
        ON wa.family_id = cw.family_id
        AND wa.activity_week = cw.cohort_week + (cw.week_offset || ' weeks')::interval
      GROUP BY cw.cohort_week, cw.week_offset
      ORDER BY cw.cohort_week, cw.week_offset
    )
    SELECT
      cohort_week,
      week_offset,
      cohort_size,
      active_count,
      CASE WHEN cohort_size > 0
           THEN ROUND((active_count::numeric / cohort_size * 100), 1)
           ELSE 0 END AS retention_pct
    FROM weekly_retention
    ORDER BY cohort_week DESC, week_offset ASC
  `);

  // Group into periods: W0, W1, W2, W4, M2, M3 (offset >= 8 = month)
  const cohortMap = {};
  for (const row of result.rows) {
    const key = row.cohort_week.toISOString().slice(0, 10);
    if (!cohortMap[key]) cohortMap[key] = {};
    cohortMap[key][row.week_offset] = {
      cohort_size:   parseInt(row.cohort_size),
      active_count:  parseInt(row.active_count),
      retention_pct: parseFloat(row.retention_pct),
    };
  }

  // Pivot to columns: week0, week1, week2, week4, month2, month3
  const cohorts = Object.keys(cohortMap)
    .sort()
    .map(week => {
      const d = cohortMap[week];
      return {
        cohort_week:    week,
        week_0:         d[0]  || null,
        week_1:         d[1]  || null,
        week_2:         d[2]  || null,
        week_4:         d[4]  || null,
        month_2:        d[8]  || null,
        month_3:        d[12] || null,
      };
    });

  // Aggregate summary
  function avgRetention(weeks) {
    const vals = cohorts.map(c => (c[weeks] || {}).retention_pct).filter(v => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }

  return {
    cohorts,
    summary: {
      avg_week_1_retention:  avgRetention('week_1'),
      avg_week_2_retention:  avgRetention('week_2'),
      avg_week_4_retention:  avgRetention('week_4'),
      avg_month_2_retention: avgRetention('month_2'),
      avg_month_3_retention: avgRetention('month_3'),
    },
  };
}

// ─── Historical Trend Data (Case 4) ────────────────────

/**
 * Full snapshot history for trend charts — 7/30/90 day range.
 */
async function getTrendData(days = 30) {
  const result = await db.query(
    `SELECT * FROM analytics_daily_snapshots
     WHERE date >= CURRENT_DATE - ($1 - 1)
     ORDER BY date ASC`,
    [days]
  );
  return result.rows;
}

// ─── Newsletter Effect (Case 5) ───────────────────────

/**
 * Per-dispatch newsletter stats + activity correlation.
 */
async function getNewsletterEffect() {
  // Dispatches: from dagens_nyhet where email was sent
  const dispatches = await db.query(`
    SELECT
      id,
      title,
      publish_at,
      email_sent_at,
      email_sent_count,
      email_failed
    FROM dagens_nyhet
    WHERE email_sent_at IS NOT NULL
    ORDER BY publish_at DESC
    LIMIT 20
  `);

  // Activity lift: compare day-after vs 7-day average
  const lifts = await Promise.all(
    dispatches.rows.slice(0, 10).map(d => {
      const nextDay = new Date(d.email_sent_at);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      const weekBefore = new Date(d.email_sent_at);
      weekBefore.setDate(weekBefore.getDate() - 7);
      const weekBeforeStr = weekBefore.toISOString().slice(0, 10);
      return db.query(`
        WITH post_send AS (
          SELECT COUNT(DISTINCT family_id) AS active_after
          FROM analytics_events
          WHERE created_at::date = $1::date
        ),
        baseline AS (
          SELECT COUNT(DISTINCT family_id) / 7.0 AS daily_avg
          FROM analytics_events
          WHERE created_at::date BETWEEN $2::date AND ($2::date + 6)
        )
        SELECT
          COALESCE(ps.active_after, 0) AS active_after,
          COALESCE(bl.daily_avg, 0) AS daily_avg,
          CASE WHEN bl.daily_avg > 0
               THEN ROUND(((ps.active_after - bl.daily_avg) / bl.daily_avg * 100)::numeric, 1)
               ELSE 0 END AS lift_pct
        FROM (SELECT 1) dummy
        LEFT JOIN post_send ps ON true
        LEFT JOIN baseline bl ON true
      `, [nextDayStr, weekBeforeStr]);
    })
  );

  return {
    dispatches: dispatches.rows.map((d, i) => {
      const lift = lifts[i]?.rows[0];
      return {
        id:              d.id,
        title:           d.title,
        publish_at:      d.publish_at,
        email_sent_at:   d.email_sent_at,
        recipients:      parseInt(d.email_sent_count) || 0,
        failed:          parseInt(d.email_failed) || 0,
        active_after:    parseInt(lift?.active_after || 0),
        daily_avg:       parseFloat(lift?.daily_avg || 0),
        lift_pct:        parseFloat(lift?.lift_pct || 0),
      };
    }),
  };
}

module.exports = {
  track,
  recordEvent,
  getFunnelCounts,
  getFeaturePopularity,
  upsertDailySnapshot,
  getRecentSnapshots,
  computeLiveKpis,
  getFamilyDynamics,
  getActivityHeatmap,
  getWarningFamilies,
  getRetentionCurve,
  getTrendData,
  getNewsletterEffect,
};
