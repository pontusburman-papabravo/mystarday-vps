'use strict';

const { buildWebhookLogFields } = require('./revenuecat-webhook-audit');
const {
  getEntitlementId,
  isAllowedAppId,
  hasAppAllowlistConfigured,
  isAllowedProductId,
  eventHasEntitlement,
  isSandboxTestFamily,
  getNonRenewingSubscriptionProductIds,
} = require('../../config/revenuecat-iap');
const { appendPaymentAudit } = require('./payment-audit');
const { applyStoreEntitlementFromWebhook } = require('./family-entitlements');
const {
  parseEventTimestampMs,
  compareToStoredState,
  isDestructiveStatus,
} = require('./revenuecat-event-ordering');

const GRANDFATHER_CHECK_SQL = `
  SELECT 1 FROM family_entitlements
  WHERE family_id = $1
    AND source = 'grandfathered'
    AND revoked_at IS NULL
  LIMIT 1
`;

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
    processing_outcome,
    event_timestamp_ms,
    environment
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  ON CONFLICT (revenuecat_event_id) DO NOTHING
  RETURNING revenuecat_event_id
`;

const HANDLED_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'REFUND_REVERSED',
  'REFUND',
  'NON_RENEWING_PURCHASE',
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
  'TRANSFER',
]);

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
      return 'active';
    case 'REFUND':
      return 'expired';
    case 'NON_RENEWING_PURCHASE':
      return 'active';
    case 'CANCELLATION':
      return notExpired ? 'active' : 'expired';
    case 'EXPIRATION':
      return 'expired';
    case 'BILLING_ISSUE':
      return 'grace_period';
    case 'SUBSCRIPTION_PAUSED':
      return notExpired ? 'active' : 'expired';
    case 'TRANSFER':
      return null;
    default:
      return null;
  }
}

function isUuid(value) {
  return UUID_RE.test(String(value));
}

async function findFamilyForAppUserIds(db, appUserIds) {
  const seen = new Set();
  for (const candidate of appUserIds) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    if (isUuid(candidate)) {
      const byId = await db.query(
        'SELECT id, is_lifetime_free, subscription_status, rc_customer_id, iap_last_event_timestamp_ms, iap_last_revenuecat_event_id, iap_last_event_type FROM family WHERE id = $1',
        [candidate]
      );
      if (byId.rows[0]) return byId.rows[0];
    }

    const byRc = await db.query(
      'SELECT id, is_lifetime_free, subscription_status, rc_customer_id, iap_last_event_timestamp_ms, iap_last_revenuecat_event_id, iap_last_event_type FROM family WHERE rc_customer_id = $1',
      [candidate]
    );
    if (byRc.rows[0]) return byRc.rows[0];
  }
  return null;
}

function validateEventScope(event) {
  if (!hasAppAllowlistConfigured()) {
    return { ok: false, skipReason: 'iap_app_allowlist_not_configured' };
  }

  const productId = event?.product_id ? String(event.product_id) : null;
  const appId = event?.app_id ? String(event.app_id) : null;
  const environment = event?.environment ? String(event.environment) : null;

  if (!isAllowedAppId(appId)) {
    return { ok: false, skipReason: 'invalid_app_id' };
  }

  if (event.type === 'NON_RENEWING_PURCHASE') {
    const nonRenewSubs = getNonRenewingSubscriptionProductIds();
    if (!productId || !nonRenewSubs.has(productId)) {
      return { ok: false, skipReason: 'non_renewing_not_subscription' };
    }
  } else if (HANDLED_EVENT_TYPES.has(event.type) && event.type !== 'TRANSFER') {
    if (productId && !isAllowedProductId(productId)) {
      return { ok: false, skipReason: 'invalid_product_id' };
    }
    if (!eventHasEntitlement(event, getEntitlementId())) {
      return { ok: false, skipReason: 'invalid_entitlement' };
    }
  }

  return { ok: true, productId, environment };
}

function webhookLogParams(event, eventType, familyId, audit, eventTimestampMs, environment) {
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
    eventTimestampMs,
    environment,
  ];
}

async function insertWebhookLog(client, event, eventType, familyId, audit, eventTimestampMs, environment) {
  return client.query(
    INSERT_WEBHOOK_LOG_SQL,
    webhookLogParams(event, eventType, familyId, audit, eventTimestampMs, environment)
  );
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

  const eventTimestampMs = parseEventTimestampMs(event);
  const environment = event?.environment ? String(event.environment) : null;

  const scope = validateEventScope(event);
  if (!scope.ok) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertResult = await insertWebhookLog(client, event, eventType, null, {
        skipReason: scope.skipReason,
        processingOutcome: 'skipped_policy',
      }, eventTimestampMs, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, skipped: true, reason: scope.skipReason };
      }
      return { duplicate: false, skipped: true, reason: scope.skipReason };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  if (eventType === 'TRANSFER') {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertResult = await insertWebhookLog(client, event, eventType, null, {
        skipReason: 'transfer_not_implemented',
        processingOutcome: 'skipped_policy',
      }, eventTimestampMs, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, skipped: true, reason: 'transfer_not_implemented' };
      }
      return { duplicate: false, skipped: true, reason: 'transfer_not_implemented' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const newStatus = resolveSubscriptionStatus(eventType, event.expiration_at_ms);
  if (!newStatus) {
    if (!HANDLED_EVENT_TYPES.has(eventType)) {
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        const insertResult = await insertWebhookLog(client, event, eventType, null, {
          skipReason: 'unhandled_event_type',
          processingOutcome: 'skipped_policy',
        }, eventTimestampMs, environment);
        await client.query('COMMIT');
        if (insertResult.rowCount === 0) {
          return { duplicate: true, skipped: true, reason: 'unhandled_event_type' };
        }
        return { duplicate: false, skipped: true, reason: 'unhandled_event_type' };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    return { duplicate: false, skipped: true, reason: 'unhandled_event_type' };
  }

  const family = await findFamilyForAppUserIds(db, appUserIds);
  if (!family) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertResult = await insertWebhookLog(client, event, eventType, null, {
        skipReason: 'family_not_found',
        processingOutcome: 'skipped_orphan',
      }, eventTimestampMs, environment);
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

  if (environment === 'SANDBOX' && !isSandboxTestFamily(family.id)) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertResult = await insertWebhookLog(client, event, eventType, family.id, {
        skipReason: 'sandbox_on_live_family',
        processingOutcome: 'skipped_policy',
      }, eventTimestampMs, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, skipped: true, familyId: family.id, reason: 'sandbox_on_live_family' };
      }
      return { duplicate: false, skipped: true, familyId: family.id, reason: 'sandbox_on_live_family' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const gfCheck = await db.query(GRANDFATHER_CHECK_SQL, [family.id]);
  if (gfCheck.rows.length > 0 || family.is_lifetime_free) {
    const skipClient = await db.getClient();
    try {
      await skipClient.query('BEGIN');
      const insertResult = await insertWebhookLog(skipClient, event, eventType, family.id, {
        skipReason: 'grandfathered',
        processingOutcome: 'skipped_policy',
      }, eventTimestampMs, environment);
      await skipClient.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, skipped: true, familyId: family.id, reason: 'grandfathered' };
      }
      return { duplicate: false, skipped: true, familyId: family.id, reason: 'grandfathered' };
    } catch (err) {
      await skipClient.query('ROLLBACK');
      throw err;
    } finally {
      skipClient.release();
    }
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `SELECT id, subscription_status, iap_last_event_timestamp_ms, iap_last_revenuecat_event_id,
              iap_last_event_type, rc_customer_id
       FROM family WHERE id = $1 FOR UPDATE`,
      [family.id]
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return { duplicate: false, skipped: true, reason: 'family_not_found' };
    }

    const orderCmp = compareToStoredState(event, row);
    if (orderCmp === 'stale') {
      const insertResult = await insertWebhookLog(client, event, eventType, family.id, {
        skipReason: 'skipped_stale',
        processingOutcome: 'skipped_stale',
      }, eventTimestampMs, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, familyId: family.id, reason: 'skipped_stale' };
      }
      return { duplicate: false, skipped: true, familyId: family.id, reason: 'skipped_stale' };
    }

    if (eventTimestampMs == null && row.iap_last_event_timestamp_ms != null && !isDestructiveStatus(newStatus)) {
      const insertResult = await insertWebhookLog(client, event, eventType, family.id, {
        skipReason: 'insufficient_ordering',
        processingOutcome: 'skipped_manual_reconciliation',
      }, null, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, familyId: family.id, reason: 'insufficient_ordering' };
      }
      return { duplicate: false, skipped: true, familyId: family.id, reason: 'insufficient_ordering' };
    }

    if (eventTimestampMs == null && row.iap_last_event_timestamp_ms != null && isDestructiveStatus(newStatus)) {
      const insertResult = await insertWebhookLog(client, event, eventType, family.id, {
        skipReason: 'skipped_stale',
        processingOutcome: 'skipped_stale_no_timestamp',
      }, null, environment);
      await client.query('COMMIT');
      if (insertResult.rowCount === 0) {
        return { duplicate: true, familyId: family.id, reason: 'skipped_stale' };
      }
      return { duplicate: false, skipped: true, familyId: family.id, reason: 'skipped_stale' };
    }

    const insertResult = await insertWebhookLog(client, event, eventType, family.id, {
      skipReason: null,
      processingOutcome: 'applied',
    }, eventTimestampMs, environment);

    if (insertResult.rowCount === 0) {
      await client.query('COMMIT');
      return { duplicate: true, familyId: family.id };
    }

    const updateFields = [
      'subscription_status = $1',
      'updated_at = NOW()',
      'iap_last_applied_product_id = $2',
      'iap_last_applied_environment = $3',
    ];
    const params = [newStatus, scope.productId || null, environment || null];

    if (eventTimestampMs != null) {
      updateFields.push(`iap_last_event_timestamp_ms = $${params.length + 1}`);
      params.push(eventTimestampMs);
    }

    updateFields.push(`iap_last_revenuecat_event_id = $${params.length + 1}`);
    params.push(String(eventId));
    updateFields.push(`iap_last_event_type = $${params.length + 1}`);
    params.push(String(eventType));

    const rcId = event.app_user_id || event.original_app_user_id
      || (Array.isArray(event.aliases) && event.aliases[0]);
    if (rcId && (!row.rc_customer_id || eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL')) {
      updateFields.push(`rc_customer_id = $${params.length + 1}`);
      params.push(String(rcId));
    }

    params.push(family.id);
    await client.query(
      `UPDATE family SET ${updateFields.join(', ')} WHERE id = $${params.length}`,
      params
    );

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: newStatus,
      eventType,
      event,
      productId: scope.productId || event.product_id || null,
      expirationAtMs: event.expiration_at_ms,
    }, { client });

    await appendPaymentAudit({
      familyId: family.id,
      source: event.store ? String(event.store).toLowerCase().includes('play') ? 'google' : 'apple' : null,
      store: event.store || null,
      plan: scope.productId || null,
      eventType: `rc_${String(eventType).toLowerCase()}`,
      status: newStatus,
      externalEventId: String(eventId),
      correlationId: String(eventId),
      metadata: {
        product_id: scope.productId || event.product_id || null,
        environment,
      },
    }, client);

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
  validateEventScope,
  isUuid,
  INSERT_WEBHOOK_LOG_SQL,
  HANDLED_EVENT_TYPES,
};
