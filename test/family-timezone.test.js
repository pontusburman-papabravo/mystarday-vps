'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveFamilyTimezone } = require('../src/lib/family-timezone');
const { getMarketConfig } = require('../src/lib/market-config');

describe('family-timezone', () => {
  it('IE family resolves to Europe/Dublin', () => {
    const tz = resolveFamilyTimezone({ country_code: 'IE', market_region: 'EU' });
    assert.equal(tz, 'Europe/Dublin');
  });

  it('SE family resolves to Europe/Stockholm (G)', () => {
    const tz = resolveFamilyTimezone({ country_code: 'SE', market_region: 'EU' });
    assert.equal(tz, 'Europe/Stockholm');
  });

  it('explicit family timezone wins over country default', () => {
    const tz = resolveFamilyTimezone({
      timezone: 'Europe/Helsinki',
      country_code: 'IE',
    });
    assert.equal(tz, 'Europe/Helsinki');
  });

  it('Dublin and Stockholm can differ on local calendar day near DST boundary', () => {
    const instant = new Date('2026-03-28T22:45:00.000Z');
    const fmt = (zone) => new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(instant);
    const dublin = fmt('Europe/Dublin');
    const stockholm = fmt('Europe/Stockholm');
    const dublinHour = Number(dublin.find((p) => p.type === 'hour').value);
    const stockholmHour = Number(stockholm.find((p) => p.type === 'hour').value);
    assert.equal(stockholmHour - dublinHour, 1, 'Stockholm is one hour ahead of Dublin at this instant');
  });
});

describe('getMarketConfig timezone contract', () => {
  it('IE config timezone is Europe/Dublin (E)', () => {
    assert.equal(getMarketConfig({ countryCode: 'IE' }).timezone, 'Europe/Dublin');
  });

  it('SE config timezone is Europe/Stockholm', () => {
    assert.equal(getMarketConfig({ countryCode: 'SE' }).timezone, 'Europe/Stockholm');
  });
});
