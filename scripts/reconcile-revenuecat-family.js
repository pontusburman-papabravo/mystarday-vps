#!/usr/bin/env node
/**
 * Manual reconciliation: fetch current RevenueCat subscriber state and update family row.
 * Does not replay webhooks — use after orphan events or suspected drift.
 *
 * Usage:
 *   node scripts/reconcile-revenuecat-family.js <family-uuid>
 *   npm run reconcile:revenuecat -- <family-uuid>
 *
 * Requires: DATABASE_URL, REVENUECAT_SECRET_API_KEY (or sk_-prefixed REVENUECAT_API_KEY)
 */
'use strict';

const db = require('../src/lib/db');
const {
  deriveSubscriptionStatusFromSubscriber,
  fetchRevenueCatSubscriber,
} = require('../src/lib/revenuecat-subscriber-sync');

async function main() {
  const familyId = process.argv[2];
  if (!familyId) {
    console.error('Usage: node scripts/reconcile-revenuecat-family.js <family-uuid>');
    process.exit(1);
  }

  const { rows } = await db.query(
    `SELECT id, is_lifetime_free, subscription_status, rc_customer_id
     FROM family WHERE id = $1`,
    [familyId]
  );
  const family = rows[0];
  if (!family) {
    console.error(`Family not found: ${familyId}`);
    process.exit(1);
  }
  if (family.is_lifetime_free) {
    console.log(`Family ${familyId} is lifetime_free — no subscription sync applied.`);
    process.exit(0);
  }

  const appUserId = family.rc_customer_id || family.id;
  console.log(`→ Fetching RevenueCat subscriber for app_user_id=${appUserId}`);

  const subscriber = await fetchRevenueCatSubscriber(appUserId);
  if (!subscriber) {
    console.error('RevenueCat returned no subscriber payload');
    process.exit(1);
  }

  const nextStatus = deriveSubscriptionStatusFromSubscriber(subscriber);
  const previousStatus = family.subscription_status;

  if (nextStatus === previousStatus) {
    console.log(`OK: subscription_status already ${nextStatus}`);
    process.exit(0);
  }

  await db.query(
    `UPDATE family
     SET subscription_status = $1,
         rc_customer_id = COALESCE(rc_customer_id, $2),
         updated_at = NOW()
     WHERE id = $3`,
    [nextStatus, appUserId, family.id]
  );

  console.log(
    `Updated family ${family.id}: subscription_status ${previousStatus} → ${nextStatus}`
  );
}

main().catch((err) => {
  console.error('[reconcile-revenuecat-family]', err.message);
  process.exit(1);
});
