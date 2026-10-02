'use strict';

/**
 * Complimentary launch access for the English free period.
 * One setting, one instant. Not a 14-day trial and not an auto-renewing subscription.
 * Ireland and Canada share this cutoff. Sweden does not.
 *
 * English free period ends at 2027-01-01T00:00:00Z for all IE/CA accounts,
 * regardless of household timezone. Dublin is on GMT that day, so this is
 * 2027-01-01 00:00 Europe/Dublin. The whole of 31 December is included in
 * Dublin only. America/Toronto and other household zones affect the family
 * schedule, not this instant. Do not move Canada to local midnight.
 */

const { DateTime } = require('luxon');
const appSettings = require('../../db/app-settings');
const { normalizeCountryCode } = require('./market-region');

const IRELAND_FREE_UNTIL_KEY = 'market_ie_free_until';
const IRELAND_FREE_UNTIL_ZONE = 'Europe/Dublin';
const DEFAULT_IRELAND_FREE_UNTIL = '2027-01-01T00:00:00.000Z';
const COMPLIMENTARY_UNTIL_COUNTRY_CODES = Object.freeze(new Set(['IE', 'CA']));
const LAUNCH_OFFER_KIND = 'complimentary_until';

function parseIrelandFreeUntil(raw) {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? new Date(DEFAULT_IRELAND_FREE_UNTIL) : raw;
  }
  if (raw == null || raw === '') return new Date(DEFAULT_IRELAND_FREE_UNTIL);
  const iso = (typeof raw === 'string' ? raw : String(raw)).replace(/^"|"$/g, '').trim();
  if (!iso) return new Date(DEFAULT_IRELAND_FREE_UNTIL);
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso)) {
    const zoned = DateTime.fromISO(iso, { zone: IRELAND_FREE_UNTIL_ZONE });
    if (zoned.isValid) return zoned.toJSDate();
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date(DEFAULT_IRELAND_FREE_UNTIL);
  return parsed;
}

async function getIrelandFreeUntil() {
  const raw = await appSettings.getSetting(IRELAND_FREE_UNTIL_KEY);
  return parseIrelandFreeUntil(raw);
}

async function setIrelandFreeUntil(isoString, { updatedByAdminId } = {}) {
  const instant = parseIrelandFreeUntil(isoString);
  if (!isoString || Number.isNaN(instant.getTime())) {
    throw new Error('Invalid market_ie_free_until');
  }
  const stored = instant.toISOString();
  await appSettings.upsertSetting(IRELAND_FREE_UNTIL_KEY, stored);
  const appConfig = require('../../db/app-config');
  await appConfig.set(IRELAND_FREE_UNTIL_KEY, stored, {
    description: 'Ireland complimentary launch access ends at this instant (2027-01-01 00:00 Europe/Dublin). Does not create a subscription.',
    updatedBy: updatedByAdminId || null,
  }).catch(() => {});
  return instant;
}

function isComplimentaryUntilCountry(countryCode) {
  const cc = normalizeCountryCode(countryCode);
  return COMPLIMENTARY_UNTIL_COUNTRY_CODES.has(cc);
}

/**
 * Full product access, no payment method, no automatic conversion.
 * Active only while now is strictly before the cutoff.
 */
function isIrelandComplimentaryActive({ countryCode, now, freeUntil } = {}) {
  if (!isComplimentaryUntilCountry(countryCode)) return false;
  const ends = parseIrelandFreeUntil(freeUntil == null ? DEFAULT_IRELAND_FREE_UNTIL : freeUntil);
  const clock = now instanceof Date ? now : new Date(now || Date.now());
  if (Number.isNaN(ends.getTime()) || Number.isNaN(clock.getTime())) return false;
  return clock.getTime() < ends.getTime();
}

function describeComplimentaryLaunchOffer(countryCode, freeUntil, now = new Date()) {
  const cc = normalizeCountryCode(countryCode);
  const ends = parseIrelandFreeUntil(freeUntil == null ? DEFAULT_IRELAND_FREE_UNTIL : freeUntil);
  return {
    kind: LAUNCH_OFFER_KIND,
    ends_at: ends.toISOString(),
    payment_method_required: false,
    auto_converts: false,
    active: isIrelandComplimentaryActive({ countryCode: cc, now, freeUntil: ends }),
  };
}

function describeIrelandLaunchOffer(freeUntil, now = new Date()) {
  return describeComplimentaryLaunchOffer('IE', freeUntil, now);
}

module.exports = {
  IRELAND_FREE_UNTIL_KEY,
  IRELAND_FREE_UNTIL_ZONE,
  DEFAULT_IRELAND_FREE_UNTIL,
  COMPLIMENTARY_UNTIL_COUNTRY_CODES,
  LAUNCH_OFFER_KIND,
  parseIrelandFreeUntil,
  getIrelandFreeUntil,
  setIrelandFreeUntil,
  isComplimentaryUntilCountry,
  isIrelandComplimentaryActive,
  describeComplimentaryLaunchOffer,
  describeIrelandLaunchOffer,
};
