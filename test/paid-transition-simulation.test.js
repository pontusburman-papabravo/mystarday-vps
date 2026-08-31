'use strict';

/**
 * Same-family T0 → T1 → hold → T2 + purchase / cancel / restore / stale RC.
 * Isolated TEST_DATABASE_URL only. Does not flip live flags.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { enablePublicBillingForTest, disablePublicBillingForTest } = require('./helpers/public-billing');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const PASSWORD = 'testpass123';
const DEFAULT_IE_FI_START = '2026-10-15T00:00:00+02:00';
const FUTURE_START = '2099-10-15T00:00:00+02:00';
const LAUNCH_CREATED = '2026-07-01T00:00:00+02:00';
const CUTOFF_IN_PAST = '2026-08-01T00:00:00+02:00';

function uniqueEmail(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}@example.com`;
}

function reloadRuntimeModules() {
  for (const mod of [
    '../src/lib/db',
    '../db/app-settings',
    '../src/lib/billing-ui',
    '../db/family-entitlements',
    '../src/lib/payment-settings',
    '../src/lib/payment-audit',
    '../src/lib/family-entitlements',
    '../src/lib/paid-transition',
    '../app',
  ]) {
    delete require.cache[require.resolve(mod)];
  }
}

async function setMarketFlag(pg, key, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'paid-transition-sim')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

function jsonHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    ...(session.csrfToken ? { 'X-CSRF-Token': session.csrfToken } : {}),
  };
}

async function parseJson(res) {
  const text = await res.text();
  return { status: res.status, text, body: text ? JSON.parse(text) : null };
}

async function loginParent(baseUrl, email) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const parsed = await parseJson(res);
  let cookies = {};
  for (const header of getSetCookieHeaders(res)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { ...parsed, cookies, csrfToken: parsed.body?.csrfToken };
}

describe('same-family paid transition simulation', () => {
  for (const spec of [
    { countryCode: 'IE', locale: 'en-GB', flag: 'market_ie_open', childName: 'Aisling' },
    { countryCode: 'FI', locale: 'sv-SE', flag: 'market_fi_open', childName: 'Astrid' },
  ]) {
    it(`${spec.countryCode} T0/T1/hold/T2/purchase/cancel/restore/stale-RC`, async (t) => {
      const db = await setupTestDb();
      if (db.skip) {
        t.skip('No real TEST_DATABASE_URL');
        return;
      }

      reloadRuntimeModules();
      const pg = require('../src/lib/db');
      const appSettings = require('../db/app-settings');
      const { applyStoreEntitlementFromWebhook } = require('../src/lib/family-entitlements');
      const startKey = spec.countryCode === 'IE' ? 'market_ie_payment_start_at' : 'market_fi_payment_start_at';

      await setMarketFlag(pg, 'market_ie_open', false);
      await setMarketFlag(pg, 'market_fi_open', false);
      await appSettings.setPaymentEnabled(false);
      await appSettings.upsertSetting('market_ie_payment_start_at', FUTURE_START);
      await appSettings.upsertSetting('market_fi_payment_start_at', FUTURE_START);
      await setMarketFlag(pg, spec.flag, true);

      const { createApp } = require('../app');
      const email = uniqueEmail(`pt-${spec.countryCode.toLowerCase()}`);
      let http;

      try {
        http = await listenApp(createApp);
        const register = await parseJson(await fetch(`${http.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Transition Parent',
            email,
            password: PASSWORD,
            country_code: spec.countryCode,
            preferred_locale: spec.locale,
          }),
        }));
        assert.equal(register.status, 201, register.text);

        let parent = await loginParent(http.baseUrl, email);
        assert.equal(parent.status, 200, parent.text);

        const parentRow = await pg.query(
          `SELECT p.family_id FROM parent p WHERE p.email = $1`,
          [email.toLowerCase()]
        );
        const familyId = parentRow.rows[0].family_id;
        await pg.query(
          'UPDATE family SET created_at = $2::timestamptz WHERE id = $1',
          [familyId, LAUNCH_CREATED]
        );

        const t0 = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
          headers: jsonHeaders(parent),
        }));
        assert.equal(t0.status, 200, t0.text);
        assert.equal(t0.body.access_kind, 'prebilling');
        assert.equal(t0.body.requires_paywall, false);
        assert.equal(t0.body.paid_transition.kind, 'upcoming');
        assert.equal(t0.body.premium.is_grandfathered, false);

        const childRes = await parseJson(await fetch(`${http.baseUrl}/api/onboarding/child`, {
          method: 'POST',
          headers: jsonHeaders(parent),
          body: JSON.stringify({ name: spec.childName, emoji: '🌟', birthday: '2018-05-01' }),
        }));
        assert.equal(childRes.status, 201, childRes.text);
        assert.notEqual(childRes.status, 402);

        const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: childRes.body.username, pin: childRes.body.pin }),
        });
        const childLoginText = await childLoginRes.text();
        assert.equal(childLoginRes.status, 200, childLoginText);
        let childCookies = {};
        for (const header of getSetCookieHeaders(childLoginRes)) {
          childCookies = mergeCookies(childCookies, [header]);
        }
        const childSession = {
          cookies: childCookies,
          csrfToken: childLoginText ? JSON.parse(childLoginText).csrfToken : null,
        };

        const dailyT0 = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
          headers: jsonHeaders(childSession),
        }));
        assert.notEqual(dailyT0.status, 402);

        const familyT0 = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
          headers: jsonHeaders(parent),
        }));
        assert.equal(familyT0.status, 200, familyT0.text);

        await appSettings.upsertSetting(startKey, CUTOFF_IN_PAST);

        const hold = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
          headers: jsonHeaders(parent),
        }));
        assert.equal(hold.status, 200, hold.text);
        assert.equal(hold.body.access_kind, 'prebilling');
        assert.equal(hold.body.requires_paywall, false);
        assert.equal(hold.body.paid_transition.kind, 'hold');
        assert.equal(hold.body.paid_transition.hold_active, true);

        const familyHold = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
          headers: jsonHeaders(parent),
        }));
        assert.equal(familyHold.status, 200, 'clock crossing with billing OFF must not 402');

        const dailyHold = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
          headers: jsonHeaders(childSession),
        }));
        assert.notEqual(dailyHold.status, 402, 'child session must survive hold');

        const billingSnap = await enablePublicBillingForTest();
        try {
          const t2 = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(t2.status, 200, t2.text);
          assert.equal(t2.body.access_kind, 'limited');
          assert.equal(t2.body.requires_paywall, true);
          assert.equal(t2.body.paid_transition.kind, 'paywall');
          assert.equal(t2.body.upgrade_url, '/paywall');

          const locked = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(locked.status, 402);
          assert.equal(locked.body.paywall_url, '/paywall');

          await applyStoreEntitlementFromWebhook(familyId, {
            subscriptionStatus: 'active',
            eventType: 'INITIAL_PURCHASE',
            event: { id: `evt_${spec.countryCode}_buy`, period_type: 'NORMAL', store: 'APP_STORE' },
            productId: STORE_PRODUCT_MONTHLY,
            expirationAtMs: Date.now() + 7 * 86400000,
          });

          const paid = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(paid.body.access_kind, 'paid');
          assert.equal(paid.body.requires_paywall, false);
          assert.equal(paid.body.paid_transition.kind, 'none');

          const familyPaid = await parseJson(await fetch(`${http.baseUrl}/api/family`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(familyPaid.status, 200);

          await applyStoreEntitlementFromWebhook(familyId, {
            subscriptionStatus: 'active',
            eventType: 'CANCELLATION',
            event: { id: `evt_${spec.countryCode}_cancel`, period_type: 'NORMAL', store: 'APP_STORE' },
            productId: STORE_PRODUCT_MONTHLY,
            expirationAtMs: Date.now() + 3 * 86400000,
          });
          const cancelled = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(cancelled.body.access_kind, 'paid');

          const sync = await parseJson(await fetch(`${http.baseUrl}/api/iap/sync`, {
            method: 'POST',
            headers: jsonHeaders(parent),
          }));
          assert.ok([503, 502].includes(sync.status), `stale RC must fail safe, got ${sync.status} ${sync.text}`);
          assert.ok(['RC_NOT_CONFIGURED', 'RC_VERIFY_FAILED'].includes(sync.body.code));

          const afterStale = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(afterStale.body.access_kind, 'paid', 'failed RC sync must not revoke paid');

          await applyStoreEntitlementFromWebhook(familyId, {
            subscriptionStatus: 'active',
            eventType: 'INITIAL_PURCHASE',
            event: { id: `evt_${spec.countryCode}_restore`, period_type: 'NORMAL', store: 'APP_STORE' },
            productId: STORE_PRODUCT_MONTHLY,
            expirationAtMs: Date.now() + 14 * 86400000,
          });
          const restored = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(parent),
          }));
          assert.equal(restored.body.access_kind, 'paid');

          const logout = await parseJson(await fetch(`${http.baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: jsonHeaders(parent),
          }));
          assert.ok([200, 204].includes(logout.status), logout.text);
          const relog = await loginParent(http.baseUrl, email);
          assert.equal(relog.status, 200, relog.text);
          const relogStatus = await parseJson(await fetch(`${http.baseUrl}/api/subscription/status`, {
            headers: jsonHeaders(relog),
          }));
          assert.equal(relogStatus.body.access_kind, 'paid');

          const childAfterRestart = await parseJson(await fetch(`${http.baseUrl}/api/me/daily-log`, {
            headers: jsonHeaders(childSession),
          }));
          assert.notEqual(childAfterRestart.status, 401, 'child cookie must survive parent logout');
        } finally {
          await disablePublicBillingForTest(billingSnap);
        }
      } finally {
        await setMarketFlag(pg, spec.flag, false);
        await appSettings.setPaymentEnabled(false);
        await appSettings.upsertSetting('market_ie_payment_start_at', DEFAULT_IE_FI_START);
        await appSettings.upsertSetting('market_fi_payment_start_at', DEFAULT_IE_FI_START);
        if (http) await http.close();
        await db.cleanup();
      }
    });
  }
});
