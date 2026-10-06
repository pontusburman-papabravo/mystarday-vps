'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('crypto');
const { DateTime } = require('luxon');
const {
  deriveMarketRegion,
  gateKeyForCountry,
  GATE_DEFAULTS,
  GATE_KEYS,
  isKnownRegistrationCountryCode,
  resolveRegistrationCountry,
  MARKET_REGIONS,
} = require('../src/lib/market-region');
const { getMarketConfig } = require('../src/lib/market-config');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('../src/lib/market-commercial-policy');
const {
  COMPLIMENTARY_UNTIL_COUNTRY_CODES,
  DEFAULT_IRELAND_FREE_UNTIL,
  isIrelandComplimentaryActive,
} = require('../src/lib/ireland-launch-offer');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');
const { evaluateMarketPurchaseAllowed } = require('../src/lib/payment-settings');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { resolveNewAccountRegistrationContext } = require('../src/lib/registration-market-context');
const { REGISTRATION_COUNTRIES } = require('../config/market-countries');
const { MARKET } = require('../src/lib/ireland-funnel-health');

const CUTOFF = new Date(DEFAULT_IRELAND_FREE_UNTIL);
const BEFORE = new Date(CUTOFF.getTime() - 1000);

describe('Canada registration country', () => {
  it('accepts CA as an explicit registration country on the English locale', () => {
    assert.equal(isKnownRegistrationCountryCode('CA'), true);
    assert.ok(REGISTRATION_COUNTRIES.some((c) => c.code === 'CA' && c.group === 'featured'));
    const ctx = resolveNewAccountRegistrationContext(
      { headers: { 'accept-language': 'en-GB' } },
      { country_code: 'ca', preferred_locale: 'en-GB', name: 'Alex' },
      { requireExplicitCountry: true }
    );
    assert.equal(ctx.ok, true);
    assert.equal(ctx.countryResolved.country_code, 'CA');
    assert.equal(ctx.familyLocale, 'en-GB');
    assert.equal(ctx.marketConfig.defaultLocale, 'en-GB');
    assert.equal(ctx.marketConfig.timezone, 'America/Toronto');
  });

  it('stores the chosen country as CA and does not fall through to Sweden', () => {
    const row = resolveRegistrationCountry({
      countryCodeRaw: 'CA',
      localeExplicitlyChosen: true,
    });
    assert.equal(row.country_code, 'CA');
    assert.equal(row.country_selection_source, 'registration');
    assert.equal(deriveMarketRegion('CA'), MARKET_REGIONS.OTHER);
    assert.notEqual(row.country_code, 'SE');
  });

  it('uses its own gate, not the Ireland gate', () => {
    assert.equal(gateKeyForCountry('CA'), GATE_KEYS.CA);
    assert.equal(GATE_KEYS.CA, 'market_ca_open');
    assert.notEqual(gateKeyForCountry('CA'), gateKeyForCountry('IE'));
    assert.equal(GATE_DEFAULTS.market_ca_open, true);
    assert.equal(GATE_DEFAULTS.market_ie_open, false);
    assert.equal(GATE_DEFAULTS.market_se_open, true);
  });
});

describe('Canada complimentary period', () => {
  it('is free through the shared English cutoff and blocked from purchase before it', () => {
    assert.equal(COMPLIMENTARY_UNTIL_COUNTRY_CODES.has('CA'), true);
    assert.equal(getMarketCommercialPolicy('CA').entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(getMarketCommercialPolicy('CA').requiresBillingReady, false);
    assert.equal(getMarketCommercialPolicy('CA').trialDays, 0);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'CA', now: BEFORE }), true);
    assert.equal(isIrelandComplimentaryActive({
      countryCode: 'CA',
      now: new Date('2026-12-31T23:59:59.000Z'),
    }), true);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'CA', now: CUTOFF }), false);
    const open = evaluateSignupCompleteness({
      countryCode: 'CA',
      marketOpen: true,
      publicBillingUsable: false,
      marketBillingReady: false,
      now: BEFORE,
    });
    assert.equal(open.allowed, true);
    assert.equal(open.reason, 'complimentary_until');
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'CA',
      now: BEFORE,
      irelandFreeUntil: CUTOFF,
    }), false);
  });

  it('ends at the shared UTC instant, not at America/Toronto midnight', () => {
    assert.equal(DEFAULT_IRELAND_FREE_UNTIL, '2027-01-01T00:00:00.000Z');
    const torontoMidnight = DateTime.fromObject(
      { year: 2027, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: 'America/Toronto' }
    );
    assert.equal(torontoMidnight.toUTC().toISO(), '2027-01-01T05:00:00.000Z');
    assert.notEqual(torontoMidnight.toMillis(), CUTOFF.getTime());
    assert.equal(getMarketConfig({ countryCode: 'CA' }).timezone, 'America/Toronto');

    const torontoEvening = DateTime.fromObject(
      { year: 2026, month: 12, day: 31, hour: 19, minute: 0, second: 0 },
      { zone: 'America/Toronto' }
    );
    assert.equal(torontoEvening.toUTC().toISO(), '2027-01-01T00:00:00.000Z');
    for (const code of ['IE', 'CA']) {
      assert.equal(isIrelandComplimentaryActive({
        countryCode: code,
        now: new Date(CUTOFF.getTime() - 1000),
      }), true, code);
      assert.equal(isIrelandComplimentaryActive({
        countryCode: code,
        now: torontoEvening.toJSDate(),
      }), false, code);
      assert.equal(isIrelandComplimentaryActive({
        countryCode: code,
        now: torontoMidnight.toJSDate(),
      }), false, code);
    }
  });

  it('is not blocked when the Ireland registration gate is closed', () => {
    const closedIe = evaluateSignupCompleteness({
      countryCode: 'IE',
      marketOpen: false,
      publicBillingUsable: false,
      now: BEFORE,
    });
    const openCa = evaluateSignupCompleteness({
      countryCode: 'CA',
      marketOpen: true,
      publicBillingUsable: false,
      now: BEFORE,
    });
    assert.equal(closedIe.allowed, false);
    assert.equal(closedIe.code, 'MARKET_IE_CLOSED');
    assert.equal(openCa.allowed, true);
  });
});

describe('Sweden and Ireland stay on their current commercial policy', () => {
  it('keeps Sweden on intro year and Ireland on the same complimentary cutoff', () => {
    assert.equal(getMarketCommercialPolicy('SE').entitlement, ENTITLEMENT.INTRO_YEAR);
    assert.equal(getMarketCommercialPolicy('IE').entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(getMarketConfig({ countryCode: 'SE' }).timezone, 'Europe/Stockholm');
    assert.equal(getMarketConfig({ countryCode: 'IE' }).timezone, 'Europe/Dublin');
    assert.equal(getMarketConfig({ countryCode: 'IE' }).defaultLocale, 'en-GB');
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'IE', now: BEFORE }), true);
    assert.equal(isIrelandComplimentaryActive({ countryCode: 'SE', now: BEFORE }), false);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: BEFORE,
      irelandFreeUntil: CUTOFF,
    }), false);
    assert.equal(evaluateMarketPurchaseAllowed({
      countryCode: 'IE',
      now: CUTOFF,
      irelandFreeUntil: CUTOFF,
    }), true);
  });
});

describe('Canada analytics can be separated from Ireland', () => {
  it('stamps landing market CA when the visitor chose Canada, and leaves anonymous /en as IE', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/landing-events.js'), 'utf8');
    assert.match(src, /\/en\/ca/);
    const posts = [];
    const sandbox = {
      console,
      Math,
      Date,
      URLSearchParams,
      fetch(url, opts) {
        posts.push(JSON.parse(opts.body));
        return Promise.resolve({ ok: true });
      },
      localStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, val) { this.store[key] = String(val); },
      },
      sessionStorage: {
        store: { sd_country_code: 'CA' },
        getItem(key) { return this.store[key] || null; },
        setItem(key, val) { this.store[key] = String(val); },
      },
      location: { pathname: '/en', search: '?country=CA' },
      document: {
        readyState: 'complete',
        querySelectorAll() { return []; },
        addEventListener() {},
      },
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'landing-events.js' });
    const landing = posts.find((body) => body.event_type === 'landing_view');
    assert.ok(landing);
    assert.equal(landing.metadata.market, 'CA');
    assert.equal(MARKET, 'IE');
    const funnel = fs.readFileSync(path.join(__dirname, '../db/activation-funnel.js'), 'utf8');
    assert.match(funnel, /f\.country_code = \$2/);
    assert.doesNotMatch(funnel, /country_code = 'IE'/);
    const admin = fs.readFileSync(path.join(__dirname, '../public/admin/admin-market-gates.js'), 'utf8');
    assert.match(admin, /'CA'/);
  });
});

describe('Canada English privacy documents stay reachable', () => {
  it('points CA at the existing English privacy and terms routes', () => {
    const routes = resolveLegalRoutes({
      countryCode: 'CA',
      marketRegion: 'OTHER',
      locale: 'en-GB',
    });
    assert.equal(routes.privacy, '/en/eea/privacy');
    assert.equal(routes.terms, '/en/eea/terms');
    assert.equal(routes.childPrivacy, '/en/eea/child-privacy');
    assert.equal(routes.status, 'draft');
    const html = fs.readFileSync(path.join(__dirname, '../public/en.html'), 'utf8');
    assert.match(html, /href="\/en\/eea\/privacy"/);
  });
});

test('CA registration creates a parent-owned family with complimentary access', async (t) => {
  const { setupTestDb } = require('./helpers/setup.js');
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real DATABASE_URL');
    return;
  }
  const { listenApp } = require('./helpers/http.js');
  const pg = require('../src/lib/db');
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('market_ca_open', true, 'canada-market test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
  const { createApp } = require('../app');
  const http = await listenApp(createApp);
  const email = `ca-${crypto.randomBytes(6).toString('hex')}@example.com`;
  try {
    const res = await fetch(`${http.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Casey Parent',
        email,
        password: 'testpass123',
        country_code: 'CA',
        preferred_locale: 'en-GB',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    const fam = await pg.query(
      `SELECT f.id, f.country_code, f.market_region, f.timezone, f.preferred_locale
         FROM family f
         JOIN parent p ON p.family_id = f.id
        WHERE LOWER(p.email) = $1`,
      [email]
    );
    assert.equal(fam.rowCount, 1);
    assert.equal(fam.rows[0].country_code, 'CA');
    assert.equal(fam.rows[0].preferred_locale, 'en-GB');
    assert.equal(fam.rows[0].timezone, 'America/Toronto');
    const children = await pg.query('SELECT id FROM child WHERE family_id = $1', [fam.rows[0].id]);
    assert.equal(children.rowCount, 0);
    const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');
    const resolved = await resolveFamilyEntitlements(fam.rows[0].id, BEFORE);
    assert.equal(resolved.access_kind, 'complimentary');
    assert.equal(resolved.requires_paywall, false);
    assert.equal(resolved.premium.active, true);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
