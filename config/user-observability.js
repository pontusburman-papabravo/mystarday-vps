'use strict';

/**
 * User observability constants — authentication vs session vs activity.
 * See docs/adr/user-observability-trusted-device.md
 */

const SESSION_EVENT_TYPES = Object.freeze([
  'parent_session_started',
  'child_session_started',
]);

/** Meaningful product activity (excludes token refresh, polling, health). */
const ACTIVITY_ANALYTICS_EVENT_TYPES = Object.freeze([
  'feature_child_view',
  'feature_treasure_chest',
  'feature_schedule_edit',
  'feature_daily_log',
  'first_completion_recorded',
  'widget_completion_succeeded',
  'child_context_switched',
  'widget_child_switched',
]);

const ALL_ACTIVITY_EVENT_TYPES = Object.freeze([
  ...SESSION_EVENT_TYPES,
  ...ACTIVITY_ANALYTICS_EVENT_TYPES,
]);

const INTERVAL_MAP = Object.freeze({
  '24h': "INTERVAL '24 hours'",
  '7d': "INTERVAL '7 days'",
  '30d': "INTERVAL '30 days'",
});

/** Trusted-device access friction — conservative attribution only (see TRUSTED_DEVICE_FRICTION_EVENT_SQL). */
const TRUSTED_DEVICE_FRICTION_EVENT_TYPES = Object.freeze([
  'child_context_restore_failed',
  'child_access_denied',
  'device_access_revoked',
]);

/**
 * SQL predicate on analytics_events alias `ae` — TD/device-access friction only.
 * Excludes generic login failures without TD attribution.
 */
const TRUSTED_DEVICE_FRICTION_EVENT_SQL = `(
  ae.event_type = 'child_context_restore_failed'
  OR (
    ae.event_type = 'child_access_denied'
    AND COALESCE(ae.metadata->>'source', '') IN (
      'shared_device_select', 'cold_start', 'picker', 'entry_orchestrator'
    )
  )
  OR (
    ae.event_type = 'device_access_revoked'
    AND COALESCE(ae.metadata->>'scope', '') IN ('this_device', 'other_device')
  )
)`;

module.exports = {
  SESSION_EVENT_TYPES,
  ACTIVITY_ANALYTICS_EVENT_TYPES,
  ALL_ACTIVITY_EVENT_TYPES,
  INTERVAL_MAP,
  TRUSTED_DEVICE_FRICTION_EVENT_TYPES,
  TRUSTED_DEVICE_FRICTION_EVENT_SQL,
};
