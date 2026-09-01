'use strict';

/**
 * Canonical Premium entitlement resolver — single source of truth for product access.
 */
const db = require('./db');
const entitlementsDb = require('../../db/family-entitlements');
const familySubscriptions = require('../../db/family-subscriptions');
const { PREMIUM_ENTITLEMENT_KEY, PREMIUM_V1_COMPONENTS } = require('../../config/entitlements');
const { STORE_PRODUCT_MONTHLY, STORE_PRODUCT_YEARLY, planFromStoreProductId } = require('../../config/iap-product-contract');
const {
  getPaymentStartAt,
  getPaymentStartAtForCountry,
  isFamilyEligibleForGrandfathering,
  isFamilyEligibleForPrebillingAccess,
  isPrebillingAccessActive,
} = require('./payment-settings');
const { isPublicBillingUsable } = require('./market-launch-invariants');
const { appendPaymentAudit } = require('./payment-audit');
const { attachPaidTransition } = require('./paid-transition');
const { normalizeCountryCode } = require('./market-region');

const STORE_SOURCES = new Set(['apple', 'google']);
const ACTIVE_STORE_STATUSES = new Set(['trial', 'active', 'grace_period']);

function emptyPremium() {
  return {
    active: false,
    source: 'none',
    status: 'none',
    starts_at: null,
    expires_at: null,
    is_grandfathered: false,
    store: null,
    plan: null,
    trial: false,
    limited_account: true,
    label: 'Ingen Premium',
  };
}

function isRowActive(row, nowMs) {
  if (!row || row.revoked_at) return false;
  if (row.expires_at) {
    const exp = new Date(row.expires_at).getTime();
    if (Number.isFinite(exp) && exp <= nowMs) return false;
  }
  if (row.source === 'grandfathered') return true;
  if (row.source === 'admin') return row.status === 'active' || row.status === 'grandfathered';
  if (row.source === 'gift') {
    if (row.starts_at) {
      const start = new Date(row.starts_at).getTime();
      if (Number.isFinite(start) && start > nowMs) return false;
    }
    return row.status === 'gift' || row.status === 'active';
  }
  if (STORE_SOURCES.has(row.source)) {
    return ACTIVE_STORE_STATUSES.has(row.status) || row.status === 'gift';
  }
  return false;
}

function planFromProductId(productId) {
  return planFromStoreProductId(productId);
}

function buildPremiumFromRow(row) {
  const meta = row.metadata || {};
  const plan = meta.plan || planFromProductId(meta.product_id);
  const trial = row.status === 'trial' || meta.trial === true;
  const isGrandfathered = row.source === 'grandfathered';

  let label = 'Premium';
  if (isGrandfathered) label = 'Premium ingår permanent';
  else if (row.source === 'gift') label = 'Premium – presentkort';
  else if (trial) label = 'Premium – gratis provperiod';
  else if (row.source === 'prebilling') label = 'Premium – lanseringsperiod';
  else if (row.source === 'apple') label = plan === 'yearly' ? 'Premium – årsabonnemang via Apple' : 'Premium – månadsabonnemang via Apple';
  else if (row.source === 'google') label = plan === 'yearly' ? 'Premium – årsabonnemang via Google Play' : 'Premium – månadsabonnemang via Google Play';
  else if (row.status === 'grace_period') label = 'Premium – betalning behöver uppdateras';

  return {
    active: true,
    source: row.source,
    status: row.status,
    starts_at: row.starts_at || row.granted_at || null,
    expires_at: row.expires_at || null,
    is_grandfathered: isGrandfathered,
    store: STORE_SOURCES.has(row.source) ? row.source : null,
    plan,
    trial,
    limited_account: false,
    label,
    entitlement_row_id: row.id,
    metadata: meta,
  };
}

function buildPrebillingPremium(familyCreatedAt, paymentStartAt) {
  const expiresAt = paymentStartAt instanceof Date ? paymentStartAt : new Date(paymentStartAt);
  return {
    active: true,
    source: 'prebilling',
    status: 'active',
    starts_at: familyCreatedAt || null,
    expires_at: expiresAt,
    is_grandfathered: false,
    store: null,
    plan: null,
    trial: false,
    limited_account: false,
    label: 'Premium – lanseringsperiod',
  };
}

function accessKindFromPremium(premium) {
  if (!premium || !premium.active) return 'limited';
  if (premium.is_grandfathered || premium.source === 'grandfathered') return 'grandfathered';
  if (premium.source === 'prebilling') return 'prebilling';
  return 'paid';
}

function pickWinner(rows, nowMs) {
  const order = ['grandfathered', 'admin', 'apple', 'google', 'gift'];
  const active = rows.filter((r) => isRowActive(r, nowMs));
  for (const source of order) {
    const match = active.find((r) => r.source === source);
    if (match) return match;
  }
  return null;
}

/**
 * @param {string} familyId
 * @param {Date} [now]
 * @param {{ client?: import('pg').PoolClient | null }} [opts]
 */
async function resolveFamilyEntitlements(familyId, now = new Date(), opts = {}) {
  if (!familyId) {
    return { premium: emptyPremium(), payment_start_at: null };
  }

  const { client = null } = opts;
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const nowMs = now.getTime();
  const [rows, familyRow, publicBillingUsable] = await Promise.all([
    entitlementsDb.listActiveByFamily(familyId, PREMIUM_ENTITLEMENT_KEY, { client }),
    q('SELECT id, created_at, is_lifetime_free, country_code FROM family WHERE id = $1', [familyId])
      .then((r) => r.rows[0] || null),
    isPublicBillingUsable(),
  ]);

  let workingRows = rows;

  const familyCountryCode = normalizeCountryCode(familyRow?.country_code);
  const paymentStartAt = await getPaymentStartAtForCountry(familyCountryCode);

  // Lazy grandfather for pre-cutoff SE families missing row (should not happen post-migration)
  if (
    familyRow &&
    isFamilyEligibleForGrandfathering({
      countryCode: familyCountryCode,
      createdAt: familyRow.created_at,
      paymentStartAt,
    }) &&
    !rows.some((r) => r.source === 'grandfathered' && !r.revoked_at)
  ) {
    const inserted = await entitlementsDb.upsertGrandfathered(familyId, {
      client,
      metadata: { lazy_backfill: true },
    });
    if (inserted) workingRows = [...workingRows, inserted];
  }

  const winner = pickWinner(workingRows, nowMs);
  const premium = winner ? buildPremiumFromRow(winner) : emptyPremium();
  const paymentStartIso = paymentStartAt ? paymentStartAt.toISOString() : null;

  if (
    !premium.active &&
    familyRow &&
    isFamilyEligibleForGrandfathering({
      countryCode: familyCountryCode,
      createdAt: familyRow.created_at,
      paymentStartAt,
    })
  ) {
    // Safety net — SE cutoff families must never lose access
    const computed = buildPremiumFromRow({
      source: 'grandfathered',
      status: 'grandfathered',
      granted_at: familyRow.created_at,
      starts_at: familyRow.created_at,
      expires_at: null,
      metadata: { computed_fallback: true },
    });
    return attachPaidTransition({
      premium: computed,
      payment_start_at: paymentStartIso,
      requires_paywall: false,
      access_kind: 'grandfathered',
    }, { now, publicBillingUsable });
  }

  if (
    !premium.active &&
    familyRow &&
    isPrebillingAccessActive({
      countryCode: familyCountryCode,
      createdAt: familyRow.created_at,
      paymentStartAt,
      now,
      publicBillingUsable,
    })
  ) {
    const computed = buildPrebillingPremium(familyRow.created_at, paymentStartAt);
    return attachPaidTransition({
      premium: computed,
      payment_start_at: paymentStartIso,
      requires_paywall: false,
      access_kind: 'prebilling',
    }, { now, publicBillingUsable });
  }

  return attachPaidTransition({
    premium,
    payment_start_at: paymentStartIso,
    requires_paywall: Boolean(
      !premium.active &&
      familyRow &&
      !isFamilyEligibleForGrandfathering({
        countryCode: familyCountryCode,
        createdAt: familyRow.created_at,
        paymentStartAt,
      }) &&
      !isPrebillingAccessActive({
        countryCode: familyCountryCode,
        createdAt: familyRow.created_at,
        paymentStartAt,
        now,
        publicBillingUsable,
      })
    ),
    access_kind: accessKindFromPremium(premium),
  }, { now, publicBillingUsable });
}

async function hasPremiumAccess(familyId, now = new Date()) {
  const { premium } = await resolveFamilyEntitlements(familyId, now);
  return premium.active === true;
}

async function syncLegacyFamilyMirror(familyId, premium, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  if (premium.is_grandfathered || premium.source === 'grandfathered') {
    await q(
      `UPDATE family SET is_lifetime_free = true, subscription_status = 'none', updated_at = NOW()
       WHERE id = $1`,
      [familyId]
    );
    return;
  }

  if (premium.source === 'prebilling') {
    await q(
      `UPDATE family SET is_lifetime_free = false, subscription_status = 'none', updated_at = NOW()
       WHERE id = $1`,
      [familyId]
    );
    return;
  }

  let subscriptionStatus = 'none';
  if (premium.active) {
    if (premium.status === 'grace_period') subscriptionStatus = 'grace_period';
    else if (premium.trial) subscriptionStatus = 'active';
    else if (premium.status === 'active' || premium.status === 'trial') subscriptionStatus = 'active';
    else if (premium.source === 'gift') subscriptionStatus = 'active';
    else if (premium.source === 'admin') subscriptionStatus = 'active';
  } else {
    subscriptionStatus = 'expired';
  }

  await q(
    `UPDATE family SET is_lifetime_free = false, subscription_status = $2, updated_at = NOW()
     WHERE id = $1`,
    [familyId, subscriptionStatus]
  );
}

/**
 * Mirror family_subscriptions.components for backward compatibility (not source of truth).
 */
async function syncSubscriptionComponentsMirror(familyId, premium, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const nowIso = new Date().toISOString();
  const components = [];

  if (premium.active) {
    for (const slug of PREMIUM_V1_COMPONENTS) {
      components.push({
        component: slug,
        granted_at: nowIso,
        expires_at: premium.expires_at || null,
        state: 'active',
      });
    }
  }

  let tier = 'expired';
  if (premium.is_grandfathered) tier = 'lifetime_free';
  else if (premium.source === 'prebilling') tier = 'trial';
  else if (premium.active && premium.trial) tier = 'trial';
  else if (premium.active && premium.source === 'gift') tier = 'paid';
  else if (premium.active) tier = 'paid';

  const trialExpiresAt = premium.trial && premium.expires_at ? premium.expires_at : null;

  await q(
    `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (family_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       trial_expires_at = EXCLUDED.trial_expires_at,
       components = EXCLUDED.components,
       updated_at = NOW()`,
    [familyId, tier, trialExpiresAt, JSON.stringify(components)]
  );
}

async function syncAllLegacyMirrors(familyId, premium, opts = {}) {
  await syncLegacyFamilyMirror(familyId, premium, opts);
  await syncSubscriptionComponentsMirror(familyId, premium, opts);
}

/** After mutating entitlement source rows, sync legacy mirrors from resolver winner. */
async function syncMirrorsFromResolver(familyId, opts = {}) {
  const { premium } = await resolveFamilyEntitlements(familyId, new Date(), opts);
  await syncAllLegacyMirrors(familyId, premium, opts);
  return premium;
}

async function syncCreatedFamilyAccessMirrors(familyId, familyCreatedAt, countryCode, { client = null } = {}) {
  const grandfatherRow = await grantGrandfatheredOnCreate(familyId, familyCreatedAt, {
    client,
    countryCode,
  });
  if (grandfatherRow) {
    return { kind: 'grandfathered', row: grandfatherRow };
  }

  const paymentStartAt = await getPaymentStartAtForCountry(countryCode);
  if (isFamilyEligibleForPrebillingAccess({
    countryCode,
    createdAt: familyCreatedAt,
    paymentStartAt,
  })) {
    const premium = buildPrebillingPremium(familyCreatedAt, paymentStartAt);
    await syncAllLegacyMirrors(familyId, premium, { client });
    return { kind: 'prebilling', premium };
  }

  await syncAllLegacyMirrors(familyId, emptyPremium(), { client });
  return { kind: 'limited' };
}

async function grantGrandfatheredOnCreate(familyId, familyCreatedAt, { client = null, countryCode = null } = {}) {
  let resolvedCountry = countryCode;
  if (resolvedCountry == null || resolvedCountry === '') {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const fam = await q('SELECT country_code FROM family WHERE id = $1', [familyId]);
    resolvedCountry = fam.rows[0] ? fam.rows[0].country_code : null;
  }
  const paymentStartAt = await getPaymentStartAt();
  if (!isFamilyEligibleForGrandfathering({
    countryCode: resolvedCountry,
    createdAt: familyCreatedAt,
    paymentStartAt,
  })) {
    return null;
  }
  const row = await entitlementsDb.upsertGrandfathered(familyId, { client, metadata: { on_create: true } });
  const premium = buildPremiumFromRow(row || {
    source: 'grandfathered',
    status: 'grandfathered',
    granted_at: familyCreatedAt,
    starts_at: familyCreatedAt,
    expires_at: null,
    metadata: {},
  });
  await syncAllLegacyMirrors(familyId, premium, { client });
  await appendPaymentAudit({
    familyId,
    source: 'grandfathered',
    eventType: 'grandfather_granted',
    status: 'grandfathered',
    metadata: { on_create: true },
  }, client);
  return row;
}

function mapStoreFromEvent(event) {
  const store = event?.store ? String(event.store).toUpperCase() : '';
  if (store.includes('APP_STORE') || store.includes('MAC') || store === 'IOS') return 'apple';
  if (store.includes('PLAY') || store.includes('GOOGLE') || store === 'ANDROID') return 'google';
  const appId = String(event?.app_id || '').toLowerCase();
  if (appId.includes('ios') || appId.includes('apple')) return 'apple';
  if (appId.includes('android') || appId.includes('google')) return 'google';
  return 'apple';
}

function mapStoreStatus(subscriptionStatus, eventType, event) {
  if (subscriptionStatus === 'grace_period') return 'grace_period';
  if (subscriptionStatus === 'expired') return 'expired';
  const periodType = event?.period_type ? String(event.period_type).toUpperCase() : '';
  if (periodType === 'TRIAL' || periodType === 'INTRO') return 'trial';
  if (eventType === 'INITIAL_PURCHASE' && periodType === 'TRIAL') return 'trial';
  return 'active';
}

async function applyStoreEntitlementFromWebhook(familyId, {
  subscriptionStatus,
  eventType,
  event,
  productId,
  expirationAtMs,
}, { client = null } = {}) {
  const grandfather = await entitlementsDb.listActiveByFamily(familyId, PREMIUM_ENTITLEMENT_KEY, { client });
  if (grandfather.some((r) => r.source === 'grandfathered' && !r.revoked_at)) {
    return { skipped: true, reason: 'grandfathered' };
  }

  if (subscriptionStatus === 'expired') {
    await entitlementsDb.revokeStoreEntitlement(familyId, { client });
    const premium = await syncMirrorsFromResolver(familyId, { client });
    return { revoked: true, premium };
  }

  const storeSource = mapStoreFromEvent(event);
  const status = mapStoreStatus(subscriptionStatus, eventType, event);
  const expiresAt = expirationAtMs ? new Date(Number(expirationAtMs)) : null;
  const plan = planFromProductId(productId);

  await entitlementsDb.upsertStoreEntitlement(familyId, {
    source: storeSource,
    status,
    expiresAt,
    sourceReference: event?.id || null,
    metadata: {
      product_id: productId,
      plan,
      trial: status === 'trial',
      event_type: eventType,
      environment: event?.environment || null,
    },
  }, { client });

  const premium = await syncMirrorsFromResolver(familyId, { client });
  return { applied: true, premium };
}

async function grantAdminPremium(familyId, {
  expiresAt = null,
  permanent = false,
  adminId,
  reason,
  sourceReference = null,
}, { client = null } = {}) {
  const grandfather = await entitlementsDb.listActiveByFamily(familyId, PREMIUM_ENTITLEMENT_KEY, { client });
  if (grandfather.some((r) => r.source === 'grandfathered' && !r.revoked_at) && !permanent) {
    return { skipped: true, reason: 'grandfathered_immutable' };
  }

  await entitlementsDb.upsertAdminGrant(familyId, {
    expiresAt,
    permanent,
    sourceReference,
    metadata: { admin_id: adminId, reason },
  }, { client });

  const premium = await syncMirrorsFromResolver(familyId, { client });
  await appendPaymentAudit({
    familyId,
    source: 'admin',
    eventType: permanent ? 'admin_grant_permanent' : 'admin_grant_temporary',
    status: 'active',
    adminId,
    reason,
    metadata: { expires_at: expiresAt },
  }, client);
  return { applied: true, premium };
}

module.exports = {
  resolveFamilyEntitlements,
  hasPremiumAccess,
  syncLegacyFamilyMirror,
  syncSubscriptionComponentsMirror,
  syncAllLegacyMirrors,
  syncMirrorsFromResolver,
  syncCreatedFamilyAccessMirrors,
  grantGrandfatheredOnCreate,
  buildPrebillingPremium,
  accessKindFromPremium,
  grantAdminPremium,
  applyStoreEntitlementFromWebhook,
  buildPremiumFromRow,
  emptyPremium,
  planFromProductId,
  mapStoreFromEvent,
  mapStoreStatus,
};
