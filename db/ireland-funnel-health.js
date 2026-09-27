/**
 * Ireland funnel health — aggregated SELECT-only queries on analytics_events.
 * Hardcoded market IE and event types. No request-derived SQL.
 * Distinct sessions use family_id (anonymous landing session_id nonce).
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
    SELECT
      p.period,
      COUNT(*) FILTER (WHERE e.event_type = '${LANDING_EVENT}')::int AS landing_events,
      COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${LANDING_EVENT}')::int AS landing_sessions,
      COUNT(*) FILTER (WHERE e.event_type = '${STORE_EVENT}')::int AS store_click_events,
      COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${STORE_EVENT}')::int AS store_click_sessions,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}'
          AND lower(coalesce(e.metadata->>'platform', '')) = 'ios'
      )::int AS platform_ios,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}'
          AND lower(coalesce(e.metadata->>'platform', '')) = 'android'
      )::int AS platform_android,
      COUNT(*) FILTER (
        WHERE e.event_type = '${STORE_EVENT}'
          AND lower(coalesce(e.metadata->>'platform', '')) NOT IN ('ios', 'android')
      )::int AS platform_unknown
    FROM (${PERIOD_VALUES_SQL}) AS p(period, t_from, t_to)
    LEFT JOIN analytics_events e
      ON e.created_at >= p.t_from
     AND e.created_at < p.t_to
     AND e.event_type IN ('${LANDING_EVENT}', '${STORE_EVENT}')
     AND e.metadata->>'market' = '${MARKET}'
    GROUP BY p.period
    `,
    windowParams(windows)
  );
  return result.rows;
}

async function loadPeriodSources(windows) {
  const result = await db.query(
    `
    SELECT period, utm_source, utm_medium, utm_campaign,
           landing_sessions, store_click_sessions
    FROM (
      SELECT
        p.period,
        COALESCE(NULLIF(TRIM(e.metadata->>'utm_source'), ''), '${UTM_DIRECT}') AS utm_source,
        COALESCE(NULLIF(TRIM(e.metadata->>'utm_medium'), ''), '${UTM_DIRECT}') AS utm_medium,
        COALESCE(NULLIF(TRIM(e.metadata->>'utm_campaign'), ''), '${UTM_DIRECT}') AS utm_campaign,
        COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${LANDING_EVENT}')::int AS landing_sessions,
        COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${STORE_EVENT}')::int AS store_click_sessions,
        ROW_NUMBER() OVER (
          PARTITION BY p.period
          ORDER BY
            COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${LANDING_EVENT}') DESC,
            COUNT(DISTINCT e.family_id) FILTER (WHERE e.event_type = '${STORE_EVENT}') DESC
        ) AS rn
      FROM (${PERIOD_VALUES_SQL}) AS p(period, t_from, t_to)
      INNER JOIN analytics_events e
        ON e.created_at >= p.t_from
       AND e.created_at < p.t_to
       AND e.event_type IN ('${LANDING_EVENT}', '${STORE_EVENT}')
       AND e.metadata->>'market' = '${MARKET}'
      GROUP BY p.period, 2, 3, 4
    ) ranked
    WHERE rn <= ${SOURCE_LIMIT}
    ORDER BY period, landing_sessions DESC, store_click_sessions DESC
    `,
    windowParams(windows)
  );
  return result.rows;
}

function mapSources(rows, period) {
  return rows
    .filter((row) => row.period === period)
    .map((row) => {
      const landingSessions = toInt(row.landing_sessions);
      const storeClickSessions = toInt(row.store_click_sessions);
      return {
        utm_source: normalizeUtmValue(row.utm_source),
        utm_medium: normalizeUtmValue(row.utm_medium),
        utm_campaign: normalizeUtmValue(row.utm_campaign),
        landing_sessions: landingSessions,
        store_click_sessions: storeClickSessions,
        store_ctr_pct: storeCtrPct(storeClickSessions, landingSessions),
      };
    });
}

function mapPeriod(windows, totalsByPeriod, sourceRows, period) {
  const base = emptyPeriod(windows[period]);
  const row = totalsByPeriod.get(period);
  if (!row) return base;
  const landingSessions = toInt(row.landing_sessions);
  const storeClickSessions = toInt(row.store_click_sessions);
  return {
    from: toIso(windows[period].from),
    to: toIso(windows[period].to),
    landing_events: toInt(row.landing_events),
    landing_sessions: landingSessions,
    store_click_events: toInt(row.store_click_events),
    store_click_sessions: storeClickSessions,
    store_ctr_pct: storeCtrPct(storeClickSessions, landingSessions),
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
