'use strict';

/**
 * Atomic first-25 slot ledger.
 * assigned_count only increases. A rollback undoes the increment.
 * An inactive or deleted family does not return a place.
 */

const db = require('../src/lib/db');
const { normalizeCountryCode, isMarketOpenForRegistration } = require('../src/lib/market-region');
const {
  LAUNCH_COHORT_FLAG_KEY,
  LAUNCH_COHORT_SLOT_LIMIT,
  LAUNCH_COHORT_EXPIRING_SOON_DAYS,
  LAUNCH_COHORT_PROTECTED_SOURCES,
  isLaunchCohortEligibleCountry,
  isLaunchCohortExcludedCountry,
  offerTimeZoneForCountry,
  launchCohortEndsAt,
} = require('../src/lib/launch-cohort-offer');
const { describeLaunchCohortAcquisition } = require('../src/lib/launch-cohort-offer-copy');

function queryOf(client) {
  return client ? client.query.bind(client) : db.query.bind(db);
}

async function isLaunchCohortFlagEnabled({ client = null } = {}) {
  const q = queryOf(client);
  const { rows } = await q(
    'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
    [LAUNCH_COHORT_FLAG_KEY]
  );
  return rows[0] ? rows[0].enabled === true : false;
}

async function getLaunchCohortConfig(countryCode, { client = null } = {}) {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) return null;
  const q = queryOf(client);
  const { rows } = await q(
    `SELECT country_code, enabled, slot_limit, assigned_count, updated_at
     FROM market_launch_cohort_config
     WHERE country_code = $1`,
    [cc]
  );
  return rows[0] || null;
}

/**
 * Non-locking read used by the signup gate. The transaction claim is authoritative.
 * Missing table or flag fails closed.
 */
async function isLaunchCohortAssignable(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  if (!isLaunchCohortEligibleCountry(cc) || isLaunchCohortExcludedCountry(cc)) return false;
  try {
    const enabled = await isLaunchCohortFlagEnabled();
    if (!enabled) return false;
    const row = await getLaunchCohortConfig(cc);
    if (!row || row.enabled !== true) return false;
    return Number(row.assigned_count) < Number(row.slot_limit);
  } catch (err) {
    console.error('[launch-cohort] assignable read failed:', err.message);
    return false;
  }
}

async function getLaunchCohortGrantByFamily(familyId, { client = null } = {}) {
  const q = queryOf(client);
  const { rows } = await q(
    `SELECT g.family_id, g.country_code, g.slot_number, g.time_zone,
            g.granted_at, g.starts_at, g.expires_at, g.created_at,
            f.preferred_locale
     FROM family_launch_cohort_grant g
     LEFT JOIN family f ON f.id = g.family_id
     WHERE g.family_id = $1`,
    [familyId]
  );
  return rows[0] || null;
}

/**
 * Claim one place inside the caller's transaction.
 * Same family returns the existing row and does not increment.
 * @returns {Promise<{ granted: boolean, idempotent?: boolean, reason?: string, source?: string, grant?: object }>}
 */
async function claimLaunchCohortSlot(client, { familyId, countryCode, grantedAt }) {
  if (!client) throw new Error('claimLaunchCohortSlot requires the registration transaction');
  const cc = normalizeCountryCode(countryCode);
  if (!isLaunchCohortEligibleCountry(cc)) {
    return {
      granted: false,
      reason: isLaunchCohortExcludedCountry(cc) ? 'excluded_market' : 'ineligible_country',
    };
  }

  await client.query('SELECT id FROM family WHERE id = $1 FOR UPDATE', [familyId]);

  const existing = await getLaunchCohortGrantByFamily(familyId, { client });
  if (existing) {
    return { granted: true, idempotent: true, grant: existing };
  }

  const flagOn = await isLaunchCohortFlagEnabled({ client });
  if (!flagOn) return { granted: false, reason: 'flag_off' };

  const protectedSources = await client.query(
    `SELECT source
     FROM family_entitlements
     WHERE family_id = $1
       AND entitlement_key = 'basic'
       AND revoked_at IS NULL
       AND source = ANY($2::text[])
     LIMIT 1`,
    [familyId, LAUNCH_COHORT_PROTECTED_SOURCES]
  );
  if (protectedSources.rows[0]) {
    return {
      granted: false,
      reason: 'existing_entitlement',
      source: protectedSources.rows[0].source,
    };
  }

  const updated = await client.query(
    `UPDATE market_launch_cohort_config
     SET assigned_count = assigned_count + 1,
         updated_at = NOW()
     WHERE country_code = $1
       AND enabled = true
       AND assigned_count < slot_limit
     RETURNING assigned_count, slot_limit`,
    [cc]
  );
  if (!updated.rows[0]) return { granted: false, reason: 'unavailable' };

  const slotNumber = Number(updated.rows[0].assigned_count);
  const starts = grantedAt instanceof Date ? grantedAt : new Date(grantedAt);
  if (Number.isNaN(starts.getTime())) {
    throw new Error('Launch cohort grant instant is not a valid date');
  }
  const timeZone = offerTimeZoneForCountry(cc);
  const expires = launchCohortEndsAt(starts, timeZone);

  const inserted = await client.query(
    `INSERT INTO family_launch_cohort_grant (
       family_id, country_code, slot_number, time_zone, granted_at, starts_at, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $5, $6)
     RETURNING family_id, country_code, slot_number, time_zone,
               granted_at, starts_at, expires_at, created_at`,
    [familyId, cc, slotNumber, timeZone, starts, expires]
  );

  return { granted: true, idempotent: false, grant: inserted.rows[0] };
}

function presentConfig(row) {
  if (!row) return null;
  const assigned = Number(row.assigned_count);
  const limit = Number(row.slot_limit);
  return {
    country_code: row.country_code,
    enabled: row.enabled === true,
    slot_limit: limit,
    slots_assigned: assigned,
    slots_remaining: Math.max(0, limit - assigned),
    updated_at: row.updated_at,
  };
}

async function listLaunchCohortConfigs() {
  const { rows } = await db.query(
    `SELECT country_code, enabled, slot_limit, assigned_count, updated_at
     FROM market_launch_cohort_config
     ORDER BY country_code ASC`
  );
  return rows.map(presentConfig);
}

async function setLaunchCohortCountryEnabled(countryCode, enabled) {
  const cc = normalizeCountryCode(countryCode);
  if (isLaunchCohortExcludedCountry(cc)) {
    const err = new Error('Launch cohort cannot be enabled for this market');
    err.code = 'LAUNCH_COHORT_EXCLUDED';
    throw err;
  }
  if (!isLaunchCohortEligibleCountry(cc)) {
    const err = new Error('Launch cohort is not offered in this country');
    err.code = 'LAUNCH_COHORT_INELIGIBLE';
    throw err;
  }
  if (typeof enabled !== 'boolean') {
    const err = new Error('enabled must be boolean');
    err.code = 'LAUNCH_COHORT_ENABLED_REQUIRED';
    throw err;
  }
  const { rows } = await db.query(
    `UPDATE market_launch_cohort_config
     SET enabled = $2, updated_at = NOW()
     WHERE country_code = $1
     RETURNING country_code, enabled, slot_limit, assigned_count, updated_at`,
    [cc, enabled]
  );
  if (!rows[0]) {
    const err = new Error('Launch cohort country is not configured');
    err.code = 'LAUNCH_COHORT_NOT_CONFIGURED';
    throw err;
  }
  return presentConfig(rows[0]);
}

async function listLaunchCohortFamilies(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  const { rows } = await db.query(
    `SELECT g.family_id, g.country_code, g.slot_number, g.time_zone,
            g.granted_at, g.starts_at, g.expires_at,
            f.name AS family_name, f.preferred_locale
     FROM family_launch_cohort_grant g
     JOIN family f ON f.id = g.family_id
     WHERE g.country_code = $1
     ORDER BY g.slot_number ASC`,
    [cc]
  );
  return rows;
}

/**
 * Public acquisition view. Remaining places are included only from the ledger
 * while a place can still be assigned. Otherwise the count is null.
 */
async function describePublicLaunchCohortOffer(countryCode, locale) {
  const cc = normalizeCountryCode(countryCode);
  const excluded = isLaunchCohortExcludedCountry(cc);
  if (!cc || excluded || !isLaunchCohortEligibleCountry(cc)) {
    return {
      country_code: cc,
      excluded,
      show: false,
      offer_enabled: false,
      slots_remaining: null,
      slots_assigned: null,
      slot_limit: null,
      copy: null,
    };
  }
  let row = null;
  let flagOn = false;
  try {
    flagOn = await isLaunchCohortFlagEnabled();
    row = await getLaunchCohortConfig(cc);
  } catch (err) {
    console.error('[launch-cohort] public read failed:', err.message);
    return {
      country_code: cc,
      excluded: false,
      show: false,
      offer_enabled: false,
      slots_remaining: null,
      slots_assigned: null,
      slot_limit: null,
      copy: null,
    };
  }
  const enabled = flagOn && row && row.enabled === true;
  const remaining = row ? Math.max(0, Number(row.slot_limit) - Number(row.assigned_count)) : null;
  let marketOpen = false;
  try {
    marketOpen = await isMarketOpenForRegistration(cc);
  } catch (err) {
    console.error('[launch-cohort] market gate read failed:', err.message);
    marketOpen = false;
  }
  const show = marketOpen === true
    && enabled === true
    && Number.isInteger(remaining)
    && remaining > 0;
  return {
    country_code: cc,
    excluded: false,
    show,
    offer_enabled: enabled,
    slot_limit: show ? LAUNCH_COHORT_SLOT_LIMIT : null,
    slots_assigned: show ? Number(row.assigned_count) : null,
    slots_remaining: show ? remaining : null,
    copy: show ? describeLaunchCohortAcquisition(locale, remaining) : null,
  };
}

async function listLaunchCohortExpiring(withinDays = LAUNCH_COHORT_EXPIRING_SOON_DAYS) {
  const days = Number.isInteger(withinDays) ? withinDays : LAUNCH_COHORT_EXPIRING_SOON_DAYS;
  const bounded = Math.min(90, Math.max(1, days));
  const { rows } = await db.query(
    `SELECT g.family_id, g.country_code, g.slot_number, g.time_zone,
            g.starts_at, g.expires_at, f.name AS family_name, f.preferred_locale
     FROM family_launch_cohort_grant g
     JOIN family f ON f.id = g.family_id
     WHERE g.expires_at > NOW()
       AND g.expires_at <= NOW() + ($1::int * INTERVAL '1 day')
     ORDER BY g.expires_at ASC`,
    [bounded]
  );
  return rows;
}

module.exports = {
  LAUNCH_COHORT_SLOT_LIMIT,
  isLaunchCohortFlagEnabled,
  isLaunchCohortAssignable,
  getLaunchCohortConfig,
  getLaunchCohortGrantByFamily,
  claimLaunchCohortSlot,
  listLaunchCohortConfigs,
  setLaunchCohortCountryEnabled,
  listLaunchCohortFamilies,
  listLaunchCohortExpiring,
  describePublicLaunchCohortOffer,
  presentConfig,
};
