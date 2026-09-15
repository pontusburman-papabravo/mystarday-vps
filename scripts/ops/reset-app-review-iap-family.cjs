#!/usr/bin/env node
'use strict';

/**
 * Reset IAP review family to limited (no Premium) so sandbox purchase can be repeated.
 * Does NOT change billing switches or sandbox allowlist.
 *
 * Usage (on VPS):
 *   cd $VPS_APP_PATH && source .env && node scripts/ops/reset-app-review-iap-family.cjs
 *
 * Required (one of):
 *   APP_REVIEW_IAP_EMAIL=...  (from secret store)
 *   FAMILY_ID=...             (sandbox allowlist UUID)
 *   DRY_RUN=1                 (print actions only)
 */

const db = require('../../src/lib/db');
const entitlementsDb = require('../../db/family-entitlements');
const {
  syncMirrorsFromResolver,
  resolveFamilyEntitlements,
} = require('../../src/lib/family-entitlements');
const { getNativePurchaseEligibility } = require('../../src/lib/iap-native-purchase-gate');
const { resolveSubscriptionUiVisibility } = require('../../src/lib/subscription-ui-visibility');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email.slice(0, 3)}***@${email.slice(at + 1)}`;
}

async function resolveFamilyId() {
  if (process.env.FAMILY_ID) {
    return String(process.env.FAMILY_ID).trim().toLowerCase();
  }

  const email = (process.env.APP_REVIEW_IAP_EMAIL || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Set APP_REVIEW_IAP_EMAIL or FAMILY_ID');
  }
  const { rows } = await db.query(
    'SELECT family_id::text AS family_id FROM parent WHERE LOWER(email) = $1 LIMIT 1',
    [email]
  );
  if (!rows[0]) {
    throw new Error(`No parent found for email ${maskEmail(email)}`);
  }
  return rows[0].family_id;
}

async function deleteRevenueCatSubscriber(appUserId) {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    return { skipped: true, reason: 'no_secret_key' };
  }

  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    return { deleted: false, reason: 'not_found', status: 404 };
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RevenueCat DELETE ${res.status}: ${text.slice(0, 200)}`);
  }

  return { deleted: true, status: res.status };
}

async function familyState(familyId) {
  const { premium } = await resolveFamilyEntitlements(familyId);
  const eligibility = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });
  const ui = await resolveSubscriptionUiVisibility(familyId, { active: premium.active });
  const ents = await entitlementsDb.listByFamily(familyId);
  const fam = await db.query(
    'SELECT subscription_status, rc_customer_id, is_lifetime_free FROM family WHERE id = $1',
    [familyId]
  );
  const subs = await db.query(
    'SELECT tier, components FROM family_subscriptions WHERE family_id = $1',
    [familyId]
  );
  return {
    family: fam.rows[0] || null,
    premium,
    entitlements: ents.map((e) => ({
      source: e.source,
      status: e.status,
      revoked_at: e.revoked_at,
      expires_at: e.expires_at,
    })),
    family_subscriptions: subs.rows[0] || null,
    native_purchase_eligibility: eligibility,
    subscription_ui: ui,
  };
}

async function main() {
  const familyId = await resolveFamilyId();
  const before = await familyState(familyId);

  const out = {
    dry_run: DRY_RUN,
    family_id: familyId,
    before: {
      premium_active: before.premium.active,
      subscription_status: before.family?.subscription_status,
      tier: before.family_subscriptions?.tier,
    },
    actions: [],
    after: null,
  };

  const appUserId = before.family?.rc_customer_id || familyId;

  if (DRY_RUN) {
    out.actions.push('would_delete_revenuecat_subscriber', 'would_revoke_store_entitlement', 'would_sync_mirrors');
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const rcResult = await deleteRevenueCatSubscriber(appUserId);
  out.actions.push({ revenuecat_delete: rcResult });

  await entitlementsDb.revokeStoreEntitlement(familyId);
  out.actions.push({ db: 'revoke_store_entitlement' });

  const premium = await syncMirrorsFromResolver(familyId);
  out.actions.push({ db: 'sync_mirrors', premium_active: premium.active });

  const after = await familyState(familyId);
  out.after = {
    premium_active: after.premium.active,
    subscription_status: after.family?.subscription_status,
    tier: after.family_subscriptions?.tier,
    native_purchase_eligible: after.subscription_ui.native_purchase_eligible,
    subscription_ui_visible: after.subscription_ui.subscription_ui_visible,
  };

  console.log(JSON.stringify(out, null, 2));

  if (after.premium.active) {
    process.exitCode = 1;
    console.error('Reset incomplete: premium still active after revoke');
  }
}

main()
  .then(() => process.exit(process.exitCode || 0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
