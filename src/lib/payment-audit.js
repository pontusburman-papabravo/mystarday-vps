'use strict';

/**
 * Append-only payment audit log.
 */
const db = require('./db');

/**
 * @param {object} entry
 * @param {import('pg').PoolClient} [client]
 */
async function appendPaymentAudit(entry, client = null) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const {
    familyId = null,
    giftOrderId = null,
    giftCardId = null,
    source = null,
    store = null,
    plan = null,
    eventType,
    status = null,
    amountMinor = null,
    currency = null,
    occurredAt = null,
    externalEventId = null,
    externalTransactionId = null,
    adminId = null,
    reason = null,
    correlationId = null,
    metadata = {},
  } = entry;

  if (!eventType) {
    throw new Error('payment audit eventType required');
  }

  const { rows } = await q(
    `INSERT INTO payment_audit_log (
       family_id, gift_order_id, gift_card_id, source, store, plan,
       event_type, status, amount_minor, currency, occurred_at,
       external_event_id, external_transaction_id, admin_id, reason,
       correlation_id, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()),
             $12, $13, $14, $15, $16, $17::jsonb)
     RETURNING id, received_at`,
    [
      familyId,
      giftOrderId,
      giftCardId,
      source,
      store,
      plan,
      eventType,
      status,
      amountMinor,
      currency,
      occurredAt,
      externalEventId,
      externalTransactionId,
      adminId,
      reason,
      correlationId,
      JSON.stringify(metadata || {}),
    ]
  );
  return rows[0];
}

module.exports = { appendPaymentAudit };
