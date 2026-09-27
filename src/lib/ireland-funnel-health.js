/**
 * Ireland landing funnel health — window math, CTR, and descriptive signals.
 * Session identity for anonymous /en traffic is analytics_events.family_id
 * (the client session_id nonce). This module never returns session values.
 *
 * Attribution: a session's canonical UTM is the earliest landing_view in the
 * period. Orphan store-click sessions (no landing in-period) use the earliest
 * store_cta_clicked UTM. Conversions are never split across campaign rows.
 */
'use strict';

const MARKET = 'IE';
const LANDING_EVENT = 'landing_view';
const STORE_EVENT = 'store_cta_clicked';
const UTM_DIRECT = '(direct)';
const SOURCE_LIMIT = 20;
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const PERIOD_KEYS = ['current_24h', 'previous_24h', 'current_7d', 'previous_7d'];

const ATTRIBUTION_RULE =
  'canonical UTM = earliest landing_view in the period; orphan store clicks use earliest store_cta_clicked UTM';

function toIso(date) {
  return new Date(date).toISOString();
}

/**
 * Half-open windows [from, to) so comparison pairs never overlap.
 * current_24h ⊂ current_7d is expected (different lengths, not a pair).
 */
function buildIrelandFunnelWindows(now = new Date()) {
  const end = new Date(now);
  const current24hFrom = new Date(end.getTime() - MS_DAY);
  const previous24hFrom = new Date(end.getTime() - (2 * MS_DAY));
  const current7dFrom = new Date(end.getTime() - (7 * MS_DAY));
  const previous7dFrom = new Date(end.getTime() - (14 * MS_DAY));

  return {
    current_24h: { from: current24hFrom, to: end },
    previous_24h: { from: previous24hFrom, to: current24hFrom },
    current_7d: { from: current7dFrom, to: end },
    previous_7d: { from: previous7dFrom, to: current7dFrom },
  };
}

function windowsOverlap(a, b) {
  return a.from < b.to && b.from < a.to;
}

/**
 * Funnel CTR: converted_store_sessions / landing_sessions * 100.
 * Does not clamp. Callers must pass converted ⊆ landing (SQL intersection).
 */
function storeCtrPct(convertedStoreSessions, landingSessions) {
  const landing = Number(landingSessions) || 0;
  if (landing === 0) return null;
  const converted = Number(convertedStoreSessions) || 0;
  return Math.round((converted / landing) * 10000) / 100;
}

function normalizeUtmValue(value) {
  if (value == null) return UTM_DIRECT;
  const trimmed = String(value).trim();
  return trimmed === '' ? UTM_DIRECT : trimmed;
}

function emptyPeriod(window) {
  return {
    from: toIso(window.from),
    to: toIso(window.to),
    landing_events: 0,
    landing_sessions: 0,
    store_click_events: 0,
    store_click_sessions: 0,
    converted_store_sessions: 0,
    orphan_store_click_sessions: 0,
    store_ctr_pct: null,
    platforms: { ios: 0, android: 0, unknown: 0 },
    sources: [],
  };
}

function buildSignals(current24h) {
  const landingSessions = Number(current24h?.landing_sessions) || 0;
  const storeClickSessions = Number(current24h?.store_click_sessions) || 0;
  const landingEvents = Number(current24h?.landing_events) || 0;
  const storeClickEvents = Number(current24h?.store_click_events) || 0;
  const orphanStoreClickSessions = Number(current24h?.orphan_store_click_sessions) || 0;
  return {
    has_traffic: landingSessions > 0,
    has_store_clicks: storeClickSessions > 0,
    measurement_alive: landingEvents > 0 || storeClickEvents > 0,
    has_orphan_store_clicks: orphanStoreClickSessions > 0,
  };
}

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

module.exports = {
  MARKET,
  LANDING_EVENT,
  STORE_EVENT,
  UTM_DIRECT,
  SOURCE_LIMIT,
  PERIOD_KEYS,
  ATTRIBUTION_RULE,
  MS_DAY,
  toIso,
  toInt,
  buildIrelandFunnelWindows,
  windowsOverlap,
  storeCtrPct,
  normalizeUtmValue,
  emptyPeriod,
  buildSignals,
};
