/**
 * Payment policy — Model A:
 *   family signup # <= founder_limit  → lifetime free (Grundarmedlem)
 *   family signup # >  founder_limit  → subscription required (59 kr/mån)
 */

const appSettings = require('../../db/app-settings');
const { getTotalFamilyCount } = require('../../db/family-stats');

const DEFAULT_FOUNDER_LIMIT = 200;

function parseLimit(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FOUNDER_LIMIT;
}

async function getFounderFamilyLimitWithClient(client) {
  const r = await client.query(
    `SELECT value FROM app_settings WHERE key = 'founder_family_limit'`
  );
  const raw = r.rows[0]?.value;
  if (raw == null) return DEFAULT_FOUNDER_LIMIT;
  return parseLimit(typeof raw === 'number' ? raw : raw);
}

async function getFounderFamilyLimit() {
  const value = await appSettings.getFounderFamilyLimit();
  return parseLimit(value);
}

function qualifiesForLifetimeFree(familyCountBeforeInsert, founderLimit) {
  return familyCountBeforeInsert < founderLimit;
}

async function getFounderStatus() {
  const [count, limit, price_sek, payment_enabled] = await Promise.all([
    getTotalFamilyCount(),
    getFounderFamilyLimit(),
    appSettings.getBasicPrice(),
    appSettings.getPaymentEnabled(),
  ]);
  const spots_remaining = Math.max(0, limit - count);
  return {
    count,
    limit,
    spots_remaining,
    price_sek: price_sek ?? 59,
    payment_enabled: !!payment_enabled,
    founder_program_active: spots_remaining > 0,
  };
}

module.exports = {
  DEFAULT_FOUNDER_LIMIT,
  getFounderFamilyLimit,
  getFounderFamilyLimitWithClient,
  qualifiesForLifetimeFree,
  getFounderStatus,
};
