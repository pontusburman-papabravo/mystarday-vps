/**
 * Payment policy — Model A:
 *   founder_limit unset/null/0  → unlimited lifetime free (Grundarmedlem) for all signups
 *   family signup # <= limit    → lifetime free (Grundarmedlem)
 *   family signup # >  limit    → subscription required (59 kr/mån)
 */

const appSettings = require('../../db/app-settings');
const { getTotalFamilyCount } = require('../../db/family-stats');

function parseLimit(value) {
  if (value == null || value === '' || value === false) return null;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function isUnlimitedFounderLimit(founderLimit) {
  return founderLimit == null;
}

async function getFounderFamilyLimitWithClient(client) {
  const r = await client.query(
    `SELECT value FROM app_settings WHERE key = 'founder_family_limit'`
  );
  const raw = r.rows[0]?.value;
  if (raw == null) return null;
  return parseLimit(typeof raw === 'number' ? raw : raw);
}

async function getFounderFamilyLimit() {
  const value = await appSettings.getFounderFamilyLimit();
  return parseLimit(value);
}

function qualifiesForLifetimeFree(familyCountBeforeInsert, founderLimit) {
  if (isUnlimitedFounderLimit(founderLimit)) return true;
  return familyCountBeforeInsert < founderLimit;
}

async function getFounderStatus() {
  const [count, limit, price_sek, payment_enabled] = await Promise.all([
    getTotalFamilyCount(),
    getFounderFamilyLimit(),
    appSettings.getBasicPrice(),
    appSettings.getPaymentEnabled(),
  ]);
  const unlimited = isUnlimitedFounderLimit(limit);
  const spots_remaining = unlimited ? null : Math.max(0, limit - count);
  return {
    count,
    limit,
    unlimited,
    spots_remaining,
    price_sek: price_sek ?? 59,
    payment_enabled: !!payment_enabled,
    founder_program_active: unlimited || (spots_remaining != null && spots_remaining > 0),
  };
}

module.exports = {
  parseLimit,
  isUnlimitedFounderLimit,
  getFounderFamilyLimit,
  getFounderFamilyLimitWithClient,
  qualifiesForLifetimeFree,
  getFounderStatus,
};
