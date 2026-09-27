/**
 * Ireland funnel health — aggregated SELECT-only queries on analytics_events.
 * Hardcoded market IE and event types. No request-derived SQL.
 * Distinct sessions use family_id (anonymous landing session_id nonce).
 *
 * converted_store_sessions = distinct sessions with both landing_view and
 * store_cta_clicked in the same period (intersection — CTR cannot exceed 100).
 * orphan_store_click_sessions = store clicks without an in-period landing.
 *
 * Source attribution: earliest landing_view UTM in the period is canonical.
 * Orphan store-click sessions use earliest store_cta_clicked UTM.
 */
'use strict';

const db = require('../src/lib/db');
const {
  MARKET,
  LANDING_EVENT,
  STORE_EVENT,
  SOURCE_LIMIT,
  UTM_DIRECT,
  PERIOD_KEYS,
  toIso,
  toInt,
  buildIrelandFunnelWindows,
  storeCtrPct,
  normalizeUtmValue,
  emptyPeriod,
  buildSignals,
} = require('../src/lib/ireland-funnel-health');

const PERIOD_VALUES_SQL = `VALUES
  ('current_24h', $1::timestamptz, $2::timestamptz),
  ('previous_24h', $3::timestamptz, $4::timestamptz),
  ('current_7d', $5::timestamptz, $6::timestamptz),
  ('previous_7d', $7::timestamptz, $8::timestamptz)`;

const PERIOD_EVENTS_SQL = `
  periods AS (
    SELECT * FROM (${PERIOD_VALUES_SQL}) AS p(period, t_from, t_to)
  ),
  events AS (
    SELECT
      p.period,
      e.family_id,
      e.event_type,
      e.created_at,
      COALESCE(NULLIF(TRIM(e.metadata->>'utm_source'), ''), '${UTM_DIRECT}') AS utm_source,
      COALESCE(NULLIF(TRIM(e.metadata->>'utm_medium'), ''), '${UTM_DIRECT}') AS utm_medium,
      COALESCE(NULLIF(TRIM(e.metadata->>'utm_campaign'), ''), '${UTM_DIRECT}') AS utm_campaign,
      lower(coalesce(e.metadata->>'platform', '')) AS platform
    FROM periods p
    INNER JOIN analytics_events e
      ON e.created_at >= p.t_from
     AND e.created_at < p.t_to
     AND e.event_type IN ('${LANDING_EVENT}', '${STORE_EVENT}')
     AND e.metadata->>'market' = '${MARKET}'
  ),
  session_flags AS (
    SELECT
      period,
      family_id,
      bool_or(event_type = '${LANDING_EVENT}') AS has_landing,
      bool_or(event_type = '${STORE_EVENT}') AS has_store
    FROM events
    GROUP BY period, family_id
  )`;

function windowParams(windows) {
  return [
    windows.current_24h.from,
    windows.current_24h.to,
    windows.previous_24h.from,
    windows.previous_24h.to,
    windows.current_7d.from,
    windows.current_7d.to,
    windows.previous_7d.from,
    windows.previous_7d.to,
  ];
}

async function loadPeriodTotals(windows) {
  const result = await db.query(
    `
    WITH ${PERIOD_EVENTS_SQL},
    session_counts AS (
      SELECT
        period,
        COUNT(*) FILTER (WHERE has_landing)::int AS landing_sessions,
        COUNT(*) FILTER (WHERE has_store)::int AS store_click_sessions,
        COUNT(*) FILTER (WHERE has_landing AND has_store)::int AS converted_store_sessions,
        COUNT(*) FILTER (WHERE has_store AND NOT has_landing)::int AS orphan_store_click_sessions
      FROM session_flags
      GROUP BY period
    )
    SELECT
      p.period,
      COUNT(*) FILTER (WHERE e.event_type = '${LANDING_EVENT}')::int AS landing_events,
      COUNT(*) FILTER (WHERE e.event_type = '${STORE_EVENT}')::int AS store_click_events,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}' AND e.platform = 'ios'
      )::int AS platform_ios,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}' AND e.platform = 'android'
      )::int AS platform_android,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}'
          AND e.platform NOT IN ('ios', 'android')
      )::int AS platform_unknown,
      COALESCE(s.landing_sessions, 0)::int AS landing_sessions,
      COALESCE(s.store_click_sessions, 0)::int AS store_click_sessions,
      COALESCE(s.converted_store_sessions, 0)::int AS converted_store_sessions,
      COALESCE(s.orphan_store_click_sessions, 0)::int AS orphan_store_click_sessions
    FROM periods p
    LEFT JOIN events e ON e.period = p.period
    LEFT JOIN session_counts s ON s.period = p.period
    GROUP BY
      p.period,
      s.landing_sessions,
      s.store_click_sessions,
      s.converted_store_sessions,
      s.orphan_store_click_sessions
    `,
    windowParams(windows)
  );
  return result.rows;
}

async function loadPeriodSources(windows) {
  const result = await db.query(
    `
    WITH ${PERIOD_EVENTS_SQL},
    landing_attr AS (
      SELECT DISTINCT ON (period, family_id)
        period, family_id, utm_source, utm_medium, utm_campaign
      FROM events
      WHERE event_type = '${LANDING_EVENT}'
      ORDER BY period, family_id, created_at ASC
    ),
    store_attr AS (
      SELECT DISTINCT ON (period, family_id)
        period, family_id, utm_source, utm_medium, utm_campaign
      FROM events
      WHERE event_type = '${STORE_EVENT}'
      ORDER BY period, family_id, created_at ASC
    ),
    attributed AS (
      SELECT
        f.period,
        f.has_landing,
        f.has_store,
        COALESCE(l.utm_source, s.utm_source, '${UTM_DIRECT}') AS utm_source,
        COALESCE(l.utm_medium, s.utm_medium, '${UTM_DIRECT}') AS utm_medium,
        COALESCE(l.utm_campaign, s.utm_campaign, '${UTM_DIRECT}') AS utm_campaign
      FROM session_flags f
      LEFT JOIN landing_attr l
        ON l.period = f.period AND l.family_id = f.family_id
      LEFT JOIN store_attr s
        ON s.period = f.period AND s.family_id = f.family_id
    )
    SELECT period, utm_source, utm_medium, utm_campaign,
           landing_sessions, store_click_sessions,
           converted_store_sessions, orphan_store_click_sessions
    FROM (
      SELECT
        period,
        utm_source,
        utm_medium,
        utm_campaign,
        COUNT(*) FILTER (WHERE has_landing)::int AS landing_sessions,
        COUNT(*) FILTER (WHERE has_store)::int AS store_click_sessions,
        COUNT(*) FILTER (WHERE has_landing AND has_store)::int AS converted_store_sessions,
        COUNT(*) FILTER (WHERE has_store AND NOT has_landing)::int AS orphan_store_click_sessions,
        ROW_NUMBER() OVER (
          PARTITION BY period
          ORDER BY
            COUNT(*) FILTER (WHERE has_landing) DESC,
            COUNT(*) FILTER (WHERE has_landing AND has_store) DESC
        ) AS rn
      FROM attributed
      GROUP BY period, utm_source, utm_medium, utm_campaign
    ) ranked
    WHERE rn <= ${SOURCE_LIMIT}
    ORDER BY period, landing_sessions DESC, converted_store_sessions DESC
    `,
    windowParams(windows)
  );
  return result.rows;
}

function mapSourceRow(row) {
  const landingSessions = toInt(row.landing_sessions);
  const storeClickSessions = toInt(row.store_click_sessions);
  const convertedStoreSessions = toInt(row.converted_store_sessions);
  const orphanStoreClickSessions = toInt(row.orphan_store_click_sessions);
  return {
    utm_source: normalizeUtmValue(row.utm_source),
    utm_medium: normalizeUtmValue(row.utm_medium),
    utm_campaign: normalizeUtmValue(row.utm_campaign),
    landing_sessions: landingSessions,
    store_click_sessions: storeClickSessions,
    converted_store_sessions: convertedStoreSessions,
    orphan_store_click_sessions: orphanStoreClickSessions,
    store_ctr_pct: storeCtrPct(convertedStoreSessions, landingSessions),
  };
}

function mapSources(rows, period) {
  return rows.filter((row) => row.period === period).map(mapSourceRow);
}

function mapPeriod(windows, totalsByPeriod, sourceRows, period) {
  const base = emptyPeriod(windows[period]);
  const row = totalsByPeriod.get(period);
  if (!row) return base;
  const landingSessions = toInt(row.landing_sessions);
  const storeClickSessions = toInt(row.store_click_sessions);
  const convertedStoreSessions = toInt(row.converted_store_sessions);
  const orphanStoreClickSessions = toInt(row.orphan_store_click_sessions);
  return {
    from: toIso(windows[period].from),
    to: toIso(windows[period].to),
    landing_events: toInt(row.landing_events),
    landing_sessions: landingSessions,
    store_click_events: toInt(row.store_click_events),
    store_click_sessions: storeClickSessions,
    converted_store_sessions: convertedStoreSessions,
    orphan_store_click_sessions: orphanStoreClickSessions,
    store_ctr_pct: storeCtrPct(convertedStoreSessions, landingSessions),
    platforms: {
      ios: toInt(row.platform_ios),
      android: toInt(row.platform_android),
      unknown: toInt(row.platform_unknown),
    },
    sources: mapSources(sourceRows, period),
  };
}

async function getIrelandFunnelHealth({ now = new Date() } = {}) {
  const generatedAt = new Date(now);
  const windows = buildIrelandFunnelWindows(generatedAt);
  const [totalRows, sourceRows] = await Promise.all([
    loadPeriodTotals(windows),
    loadPeriodSources(windows),
  ]);
  const totalsByPeriod = new Map(totalRows.map((row) => [row.period, row]));
  const payload = {
    ok: true,
    generated_at: toIso(generatedAt),
    market: MARKET,
  };
  for (const period of PERIOD_KEYS) {
    payload[period] = mapPeriod(windows, totalsByPeriod, sourceRows, period);
  }
  payload.signals = buildSignals(payload.current_24h);
  return payload;
}

module.exports = {
  getIrelandFunnelHealth,
};
