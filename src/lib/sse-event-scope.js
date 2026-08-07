'use strict';

/**
 * Central SSE event scope registry — fail closed for child-scoped events without childId.
 */

/** @type {Record<string, 'child' | 'family' | 'system'>} */
const EVENT_SCOPE = {
  DAILY_LOG_ITEM_COMPLETED: 'child',
  SCHEDULE_UPDATED: 'child',
  STAR_GRANTED: 'child',
  PIN_FAILED_WARNING: 'child',
  SYSTEM_ALERT: 'family',
  CONNECTED: 'system',
  GOAL_PROGRESS_UPDATE: 'child',
};

function getEventScope(type) {
  const scope = EVENT_SCOPE[type];
  if (!scope) return null;
  return scope;
}

function isKnownEventType(type) {
  return Object.prototype.hasOwnProperty.call(EVENT_SCOPE, type);
}

function isChildScopedEvent(type) {
  return getEventScope(type) === 'child';
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function validateBroadcastPayload(type, data) {
  if (!isKnownEventType(type)) {
    return { ok: false, reason: 'unknown_event_type' };
  }
  if (!isChildScopedEvent(type)) {
    return { ok: true };
  }
  const childId = data?.childId;
  if (!childId || typeof childId !== 'string') {
    return { ok: false, reason: 'missing_child_id' };
  }
  return { ok: true };
}

function listChildScopedEventTypes() {
  return Object.keys(EVENT_SCOPE).filter((k) => EVENT_SCOPE[k] === 'child');
}

module.exports = {
  EVENT_SCOPE,
  getEventScope,
  isKnownEventType,
  isChildScopedEvent,
  validateBroadcastPayload,
  listChildScopedEventTypes,
};
