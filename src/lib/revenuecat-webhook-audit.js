'use strict';

function buildWebhookLogFields(event, { skipReason = null, processingOutcome = null } = {}) {
  return {
    app_user_id: event?.app_user_id ? String(event.app_user_id) : null,
    original_app_user_id: event?.original_app_user_id
      ? String(event.original_app_user_id)
      : null,
    product_id: event?.product_id ? String(event.product_id) : null,
    expiration_at_ms: Number.isFinite(event?.expiration_at_ms)
      ? Number(event.expiration_at_ms)
      : null,
    skip_reason: skipReason,
    processing_outcome: processingOutcome,
  };
}

function formatOrphanWarnFields(event) {
  return {
    event_id: event?.id || 'unknown',
    event_type: event?.type || 'unknown',
    app_user_id: event?.app_user_id || 'n/a',
    original_app_user_id: event?.original_app_user_id || 'n/a',
    product_id: event?.product_id || 'n/a',
    expiration_at_ms: event?.expiration_at_ms ?? 'n/a',
    skip_reason: 'family_not_found',
  };
}

module.exports = {
  buildWebhookLogFields,
  formatOrphanWarnFields,
};
