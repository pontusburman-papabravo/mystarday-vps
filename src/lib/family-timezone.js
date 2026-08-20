'use strict';

const { getMarketConfig } = require('./market-config');

/**
 * Resolve timezone for a family row (explicit DB value wins).
 * @param {{ timezone?: string|null, country_code?: string|null, market_region?: string|null, preferred_locale?: string|null }|null|undefined} familyRow
 */
function resolveFamilyTimezone(familyRow) {
  if (familyRow?.timezone) return familyRow.timezone;
  const config = getMarketConfig({
    countryCode: familyRow?.country_code || 'SE',
    marketRegion: familyRow?.market_region,
    locale: familyRow?.preferred_locale,
  });
  return config.timezone;
}

/**
 * @param {import('pg').PoolClient|import('pg').Pool} dbOrClient
 * @param {string} familyId
 */
async function fetchFamilyTimezone(dbOrClient, familyId) {
  const result = await dbOrClient.query(
    `SELECT timezone, country_code, market_region, preferred_locale
     FROM family WHERE id = $1`,
    [familyId]
  );
  return resolveFamilyTimezone(result.rows[0]);
}

module.exports = {
  resolveFamilyTimezone,
  fetchFamilyTimezone,
};
