'use strict';

/**
 * Deterministic total order for RevenueCat webhook events (per family).
 *
 * Order (highest wins):
 * 1. event_timestamp_ms (higher wins)
 * 2. event type priority (documented below)
 * 3. revenuecat_event_id lexicographic (higher wins)
 *
 * Same revenuecat_event_id is always a duplicate (DB PK) — not ordered here.
 */

const EVENT_TYPE_PRIORITY = Object.freeze({
  EXPIRATION: 100,
  BILLING_ISSUE: 200,
  CANCELLATION: 300,
  SUBSCRIPTION_PAUSED: 400,
  NON_RENEWING_PURCHASE: 500,
  PRODUCT_CHANGE: 600,
  RENEWAL: 700,
  INITIAL_PURCHASE: 700,
  UNCANCELLATION: 750,
  SUBSCRIPTION_EXTENDED: 760,
  REFUND_REVERSED: 770,
});

function parseEventTimestampMs(event) {
  const raw = event?.event_timestamp_ms ?? event?.timestamp_ms ?? event?.purchased_at_ms;
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function eventTypePriority(eventType) {
  return EVENT_TYPE_PRIORITY[eventType] ?? 0;
}

/**
 * @returns {'incoming_newer'|'stale'|'tie_same_id'}
 */
function compareToStoredState(event, stored) {
  const incomingTs = parseEventTimestampMs(event);
  const lastTs = stored?.iap_last_event_timestamp_ms != null
    ? Number(stored.iap_last_event_timestamp_ms)
    : null;
  const lastType = stored?.iap_last_event_type || null;
  const lastId = stored?.iap_last_revenuecat_event_id || null;
  const incomingId = String(event?.id || '');
  const incomingType = event?.type || null;

  if (lastId && incomingId && lastId === incomingId) {
    return 'tie_same_id';
  }

  if (incomingTs == null && lastTs != null) {
    return 'stale';
  }

  if (lastTs == null) {
    return 'incoming_newer';
  }

  if (incomingTs == null) {
    return 'incoming_newer';
  }

  if (incomingTs > lastTs) {
    return 'incoming_newer';
  }
  if (incomingTs < lastTs) {
    return 'stale';
  }

  const incP = eventTypePriority(incomingType);
  const lastP = eventTypePriority(lastType);
  if (incP > lastP) return 'incoming_newer';
  if (incP < lastP) return 'stale';

  if (incomingId > (lastId || '')) return 'incoming_newer';
  if (incomingId < (lastId || '')) return 'stale';

  return 'tie_same_id';
}

function isDestructiveStatus(status) {
  return status === 'expired' || status === 'grace_period';
}

module.exports = {
  EVENT_TYPE_PRIORITY,
  parseEventTimestampMs,
  eventTypePriority,
  compareToStoredState,
  isDestructiveStatus,
};
