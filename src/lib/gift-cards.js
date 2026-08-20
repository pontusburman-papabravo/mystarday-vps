'use strict';

const crypto = require('crypto');
const db = require('./db');
const { appendPaymentAudit } = require('./payment-audit');
const { getGiftSettings } = require('./payment-settings');
const {
  resolveFamilyEntitlements,
  syncAllLegacyMirrors,
  buildPremiumFromRow,
} = require('./family-entitlements');
const entitlementsDb = require('../../db/family-entitlements');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeGiftCode(raw) {
  return String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
}

function hashGiftCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function fingerprintGiftCode(code) {
  return hashGiftCode(code).slice(0, 16);
}

function generateGiftCode() {
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 16; i += 1) {
    out += CODE_ALPHABET[bytes[i % bytes.length] % CODE_ALPHABET.length];
    if (i === 3 || i === 7 || i === 11) out += '-';
  }
  return out;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function getStorePaidThrough(familyId, { client = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const { rows } = await q(
    `SELECT expires_at, status, source
     FROM family_entitlements
     WHERE family_id = $1
       AND source IN ('apple', 'google')
       AND revoked_at IS NULL
     ORDER BY granted_at DESC
     LIMIT 1`,
    [familyId]
  );
  const row = rows[0];
  if (!row || !row.expires_at) return null;
  const exp = new Date(row.expires_at);
  if (Number.isNaN(exp.getTime()) || exp <= new Date()) return null;
  if (row.status === 'expired') return null;
  return exp;
}

async function computeGiftStartDate(familyId, { client = null } = {}) {
  const storeThrough = await getStorePaidThrough(familyId, { client });
  const now = new Date();
  if (storeThrough && storeThrough > now) {
    return storeThrough;
  }

  const { premium } = await resolveFamilyEntitlements(familyId, now);
  if (premium.active && premium.trial && premium.expires_at) {
    const trialEnd = new Date(premium.expires_at);
    if (trialEnd > now) return trialEnd;
  }

  return now;
}

async function logRedemptionAttempt({ codeFingerprint, familyId, ipAddress, success, failureReason }, client) {
  await client.query(
    `INSERT INTO gift_redemption_attempts (code_fingerprint, family_id, ip_address, success, failure_reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [codeFingerprint, familyId, ipAddress || null, success, failureReason || null]
  );
}

async function redeemGiftCode(familyId, rawCode, { ipAddress = null } = {}) {
  const code = normalizeGiftCode(rawCode);
  if (!code || code.length < 8) {
    return { ok: false, code: 'INVALID_CODE', message: 'Ogiltig presentkod' };
  }

  const settings = await getGiftSettings();
  if (!settings.gift_cards_enabled) {
    return { ok: false, code: 'GIFTS_DISABLED', message: 'Presentkort är tillfälligt avstängda' };
  }

  const codeHash = hashGiftCode(code);
  const fingerprint = fingerprintGiftCode(code);
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const attemptCount = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM gift_redemption_attempts
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [ipAddress]
    );
    if (ipAddress && attemptCount.rows[0].count >= 20) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: 'rate_limited',
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'RATE_LIMITED', message: 'För många försök. Vänta en stund.' };
    }

    const cardRes = await client.query(
      `SELECT gc.*, go.payment_status
       FROM gift_cards gc
       JOIN gift_orders go ON go.id = gc.order_id
       WHERE gc.code_hash = $1
       FOR UPDATE`,
      [codeHash]
    );
    const card = cardRes.rows[0];

    if (!card) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: 'not_found',
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'NOT_FOUND', message: 'Presentkoden hittades inte' };
    }

    if (card.status === 'redeemed' || card.redeemed_at) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: 'already_redeemed',
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'ALREADY_REDEEMED', message: 'Presentkoden är redan inlöst' };
    }

    if (['blocked', 'refunded', 'chargeback'].includes(card.status) || card.blocked_at) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: card.status,
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'BLOCKED', message: 'Presentkoden kan inte användas' };
    }

    if (card.status === 'expired' || (card.redemption_expires_at && new Date(card.redemption_expires_at) <= new Date())) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: 'expired',
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'EXPIRED', message: 'Presentkoden har gått ut' };
    }

    if (card.payment_status && !['paid', 'succeeded', 'complete'].includes(card.payment_status)) {
      await logRedemptionAttempt({
        codeFingerprint: fingerprint,
        familyId,
        ipAddress,
        success: false,
        failureReason: 'payment_incomplete',
      }, client);
      await client.query('COMMIT');
      return { ok: false, code: 'PAYMENT_INCOMPLETE', message: 'Presentkortet är inte betalt' };
    }

    const months = card.premium_months || settings.gift_premium_months || 12;
    const startsAt = await computeGiftStartDate(familyId, { client });
    const expiresAt = addMonths(startsAt, months);

    await client.query(
      `UPDATE gift_cards
       SET status = 'redeemed',
           redeemed_at = NOW(),
           redeemed_family_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [card.id, familyId]
    );

    const entRow = await entitlementsDb.upsertGiftEntitlement(familyId, {
      startsAt,
      expiresAt,
      sourceReference: card.id,
      metadata: {
        gift_card_id: card.id,
        premium_months: months,
        queued_after_store: startsAt > new Date(),
      },
    }, { client });

    const premium = buildPremiumFromRow(entRow);
    await syncAllLegacyMirrors(familyId, premium, { client });

    await appendPaymentAudit({
      familyId,
      giftCardId: card.id,
      giftOrderId: card.order_id,
      source: 'gift',
      eventType: 'gift_redeemed',
      status: 'gift',
      metadata: { starts_at: startsAt, expires_at: expiresAt },
      correlationId: card.id,
    }, client);

    await logRedemptionAttempt({
      codeFingerprint: fingerprint,
      familyId,
      ipAddress,
      success: true,
      failureReason: null,
    }, client);

    await client.query('COMMIT');

    return {
      ok: true,
      premium: {
        label: premium.label,
        starts_at: startsAt,
        expires_at: expiresAt,
        queued_after_store: startsAt > new Date(),
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeGiftCode,
  hashGiftCode,
  fingerprintGiftCode,
  generateGiftCode,
  computeGiftStartDate,
  redeemGiftCode,
};
