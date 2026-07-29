'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Collect unique identity candidates from a RevenueCat event (canonical structure).
 */
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

/**
 * Derive subscription_status from event type and expiration.
 * Cancellation does not revoke access before the paid period ends.
 */
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

/**
 * Look up family by app user id candidates (family.id or rc_customer_id).
 */
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

/**
 * Process a validated RevenueCat event idempotently.
 * Returns { duplicate, familyId, subscriptionStatus }.
 */
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
        `INSERT INTO iap_webhook_log (revenuecat_event_id, event_type, family_id)
         VALUES ($1, $2, NULL)
         ON CONFLICT (revenuecat_event_id) DO NOTHING
         RETURNING revenuecat_event_id`,
        [eventId, eventType]
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
      `INSERT INTO iap_webhook_log (revenuecat_event_id, event_type, family_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (revenuecat_event_id) DO NOTHING
       RETURNING revenuecat_event_id`,
      [eventId, eventType, family.id]
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
};
