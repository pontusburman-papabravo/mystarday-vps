'use strict';

const { buildWebhookLogFields } = require('./revenuecat-webhook-audit');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INSERT_WEBHOOK_LOG_SQL = `
  INSERT INTO iap_webhook_log (
    revenuecat_event_id,
    event_type,
    family_id,
    app_user_id,
    original_app_user_id,
    product_id,
    expiration_at_ms,
    skip_reason,
    processing_outcome
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (revenuecat_event_id) DO NOTHING
  RETURNING revenuecat_event_id
`;

function collectAppUserIds(event) {
  const ids = [];
  if (event?.app_user_id) ids.push(String(event.app_user_id));
  if (event?.original_app_user_id) ids.push(String(event.original_app_user_id));
  if (Array.isArray(event?.aliases)) {
    for (const alias of event.aliases) {
      if (alias) ids.push(String(alias));
    }
  }
  return [...new Set(ids)];
}

function resolveSubscriptionStatus(eventType, expirationAtMs, nowMs = Date.now()) {
  const notExpired = !expirationAtMs || expirationAtMs > nowMs;

  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'REFUND_REVERSED':
    case 'NON_RENEWING_PURCHASE':
      return 'active';
    case 'CANCELLATION':
      return notExpired ? 'active' : 'expired';
    case 'EXPIRATION':
      return 'expired';
    case 'BILLING_ISSUE':
      return 'grace_period';
    default:
      return null;
  }
}

function isUuid(value) {
  return UUID_RE.test(String(value));
}

async function findFamilyForAppUserIds(db, appUserIds) {
  for (const candidate of appUserIds) {
    if (!isUuid(candidate)) {
      continue;
    }
    const byId = await db.query(
      'SELECT id, is_lifetime_free, subscription_status, rc_customer_id FROM family WHERE id = $1',
      [candidate]
    );
    if (byId.rows[0]) {
      return byId.rows[0];
    }

    const byRc = await db.query(
      'SELECT id, is_lifetime_free, subscription_status, rc_customer_id FROM family WHERE rc_customer_id = $1',
      [candidate]
    );
    if (byRc.rows[0]) {
      return byRc.rows[0];
    }
  }
  return null;
}

function webhookLogParams(event, eventType, familyId, audit) {
  const fields = buildWebhookLogFields(event, audit);
  return [
    event.id,
    eventType,
    familyId,
    fields.app_user_id,
    fields.original_app_user_id,
    fields.product_id,
    fields.expiration_at_ms,
    fields.skip_reason,
    fields.processing_outcome,
  ];
}

async function processRevenueCatEvent(db, event) {
  const eventId = event.id;
  const eventType = event.type;
  const appUserIds = collectAppUserIds(event);

  if (!eventId || !eventType) {
    const err = new Error('Missing event id or type');
    err.code = 'INVALID_EVENT';
    throw err;
  }
  if (appUserIds.length === 0) {
    const err = new Error('Missing app user identity');
    err.code = 'MISSING_IDENTITY';
    throw err;
  }

  const newStatus = resolveSubscriptionStatus(eventType, event.expiration_at_ms);
  if (!newStatus) {
    return { duplicate: false, skipped: true, reason: 'unhandled_event_type' };
  }

  const family = await findFamilyForAppUserIds(db, appUserIds);
  if (!family) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertResult = await client.query(
        INSERT_WEBHOOK_LOG_SQL,
        webhookLogParams(event, eventType, null, {
          skipReason: 'family_not_found',
          processingOutcome: 'skipped_orphan',
        })
      );
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, skipped: true, reason: 'family_not_found' };
      }
      return { duplicate: false, skipped: true, reason: 'family_not_found' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  if (family.is_lifetime_free) {
    return { duplicate: false, skipped: true, familyId: family.id, reason: 'lifetime_free' };
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      INSERT_WEBHOOK_LOG_SQL,
      webhookLogParams(event, eventType, family.id, {
        skipReason: null,
        processingOutcome: 'applied',
      })
    );

    if (insertResult.rowCount === 0) {
      await client.query('COMMIT');
      return { duplicate: true, familyId: family.id };
    }

    const updateFields = ['subscription_status = $1', 'updated_at = NOW()'];
    const params = [newStatus];

    if (eventType === 'INITIAL_PURCHASE' && event.app_user_id) {
      updateFields.push(`rc_customer_id = $${params.length + 1}`);
      params.push(String(event.app_user_id));
    }

    params.push(family.id);
    await client.query(
      `UPDATE family SET ${updateFields.join(', ')} WHERE id = $${params.length}`,
      params
    );

    await client.query('COMMIT');
    return {
      duplicate: false,
      familyId: family.id,
      subscriptionStatus: newStatus,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  collectAppUserIds,
  resolveSubscriptionStatus,
  findFamilyForAppUserIds,
  processRevenueCatEvent,
  isUuid,
  INSERT_WEBHOOK_LOG_SQL,
};
