'use strict';

/**
 * READY BUT OFF — regression tests proving that with the intended live-deploy
 * defaults (`payment_enabled=false` DB setting, `BILLING_UI_DISABLED=true` env),
 * a normal family can never reach a real purchase, and that the sandbox reviewer
 * allowlist requires BOTH an explicit flag AND an exact family UUID match — never
 * a wildcard — and never mutates canonical entitlement state by itself.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { getNativePurchaseEligibility } = require('../src/lib/iap-native-purchase-gate');
const {
  isFamilyInStrictSandboxAllowlist,
  getStrictSandboxFamilyAllowlist,
} = require('../src/lib/iap-sandbox-allowlist');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function withEnv(overrides, fn) {
  const prev = {};
  for (const key of Object.keys(overrides)) {
    prev[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(prev)) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    });
}

describe('READY BUT OFF — /api/iap/config never exposes purchase to a normal family', () => {
  test('payment_enabled=false + BILLING_UI_DISABLED=true → nativePurchasesEnabled=false, apiKey=null, no SDK key leaks (iOS)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await withEnv(
        {
          BILLING_UI_DISABLED: 'true',
          REVENUECAT_SANDBOX_FAMILY_IDS: undefined,
          REVENUECAT_SANDBOX_PURCHASES_ENABLED: undefined,
          REVENUECAT_IOS_PUBLIC_SDK_KEY: 'appl_should_never_be_returned',
        },
        async () => {
          const appSettings = require('../db/app-settings');
          await appSettings.setPaymentEnabled(false);

          const session = await registerAndLogin(http.baseUrl);
          const res = await fetch(`${http.baseUrl}/api/iap/config?platform=ios`, {
            headers: { Cookie: cookieHeader(session.cookies) },
          });
          assert.equal(res.status, 200);
          const body = await res.json();
          assert.equal(body.nativePurchasesEnabled, false, 'READY BUT OFF: native purchase must be disabled for a normal family');
          assert.equal(body.apiKey, null, 'READY BUT OFF: SDK key must never reach a normal family');
          assert.ok(!JSON.stringify(body).includes('appl_should_never_be_returned'), 'SDK key value must not leak anywhere in the response');
        }
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('payment_enabled=false + BILLING_UI_DISABLED=true → nativePurchasesEnabled=false, apiKey=null, no SDK key leaks (Android)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await withEnv(
        {
          BILLING_UI_DISABLED: 'true',
          REVENUECAT_SANDBOX_FAMILY_IDS: undefined,
          REVENUECAT_SANDBOX_PURCHASES_ENABLED: undefined,
          REVENUECAT_ANDROID_PUBLIC_SDK_KEY: 'goog_should_never_be_returned',
        },
        async () => {
          const appSettings = require('../db/app-settings');
          await appSettings.setPaymentEnabled(false);

          const session = await registerAndLogin(http.baseUrl);
          const res = await fetch(`${http.baseUrl}/api/iap/config?platform=android`, {
            headers: { Cookie: cookieHeader(session.cookies) },
          });
          assert.equal(res.status, 200);
          const body = await res.json();
          assert.equal(body.nativePurchasesEnabled, false, 'READY BUT OFF: native purchase must be disabled for a normal family');
          assert.equal(body.apiKey, null, 'READY BUT OFF: SDK key must never reach a normal family');
          assert.ok(!JSON.stringify(body).includes('goog_should_never_be_returned'));
        }
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('BILLING_UI_DISABLED wins even if payment_enabled is accidentally left true (defense in depth)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await withEnv(
        {
          BILLING_UI_DISABLED: 'true',
          REVENUECAT_SANDBOX_FAMILY_IDS: undefined,
          REVENUECAT_SANDBOX_PURCHASES_ENABLED: undefined,
        },
        async () => {
          const appSettings = require('../db/app-settings');
          await appSettings.setPaymentEnabled(true); // simulate operator mistake
          try {
            const session = await registerAndLogin(http.baseUrl);
            const res = await fetch(`${http.baseUrl}/api/iap/config?platform=ios`, {
              headers: { Cookie: cookieHeader(session.cookies) },
            });
            const body = await res.json();
            assert.equal(body.nativePurchasesEnabled, false, 'BILLING_UI_DISABLED env must override payment_enabled DB setting');
          } finally {
            await appSettings.setPaymentEnabled(false);
          }
        }
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('READY BUT OFF — sandbox reviewer allowlist requires BOTH flag AND exact UUID', () => {
  it('flag true + matching UUID → allowed', async () => {
    const familyId = '11111111-1111-4111-8111-111111111111';
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: familyId },
      async () => {
        const result = await getNativePurchaseEligibility(familyId);
        assert.equal(result.allowed, true);
        assert.equal(result.reason, 'sandbox_family');
      }
    );
  });

  it('flag true + non-matching UUID → rejected (exact match required, not prefix/substring)', async () => {
    const allowed = '11111111-1111-4111-8111-111111111111';
    const other = '22222222-2222-4222-8222-222222222222';
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: allowed },
      async () => {
        const result = await getNativePurchaseEligibility(other);
        assert.equal(result.allowed, false);
        assert.equal(result.reason, 'not_sandbox_family');
      }
    );
  });

  it('flag false + matching UUID → rejected (flag alone is insufficient without exact UUID; UUID alone is insufficient without the flag)', async () => {
    const familyId = '11111111-1111-4111-8111-111111111111';
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'false', REVENUECAT_SANDBOX_FAMILY_IDS: familyId },
      async () => {
        const result = await getNativePurchaseEligibility(familyId);
        assert.equal(result.allowed, false);
        assert.equal(result.reason, 'sandbox_purchases_disabled', 'flag must be explicitly true — presence in the UUID list alone is not enough');
      }
    );
  });

  it('flag true + allowlist unset → rejected (no default-allow when list is empty)', async () => {
    const familyId = '11111111-1111-4111-8111-111111111111';
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: undefined },
      async () => {
        const result = await getNativePurchaseEligibility(familyId);
        assert.equal(result.allowed, false);
      }
    );
  });

  it('wildcard "*" is never a valid allowlist entry — no family is granted access via wildcard', async () => {
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: '*' },
      async () => {
        const { ids, invalidEntries } = getStrictSandboxFamilyAllowlist();
        assert.equal(ids.size, 0, 'wildcard must never populate the effective allowlist');
        assert.deepEqual(invalidEntries, ['*']);

        // A handful of real-looking family UUIDs must all be rejected — "*" cannot
        // accidentally act as an allow-all even for confirmed-valid UUIDs.
        for (const candidate of [
          '11111111-1111-4111-8111-111111111111',
          crypto.randomUUID(),
          crypto.randomUUID(),
        ]) {
          assert.equal(isFamilyInStrictSandboxAllowlist(candidate), false);
          const result = await getNativePurchaseEligibility(candidate);
          assert.equal(result.allowed, false);
        }
      }
    );
  });

  it('wildcard mixed with a real UUID: the real UUID still works, "*" grants nothing extra', async () => {
    const realFamily = '33333333-3333-4333-8333-333333333333';
    await withEnv(
      { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: `*,${realFamily}` },
      async () => {
        const { ids, invalidEntries } = getStrictSandboxFamilyAllowlist();
        assert.deepEqual([...ids], [realFamily]);
        assert.deepEqual(invalidEntries, ['*']);
        const otherFamily = crypto.randomUUID();
        assert.equal((await getNativePurchaseEligibility(otherFamily)).allowed, false);
        assert.equal((await getNativePurchaseEligibility(realFamily)).allowed, true);
      }
    );
  });
});

describe('READY BUT OFF — sandbox allowlist membership never mutates canonical entitlement state', () => {
  test('an allowlisted-but-never-purchased sandbox family has no Premium of its own accord', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      for (const mod of ['../src/lib/db', '../db/family-entitlements', '../src/lib/family-entitlements']) {
        try { delete require.cache[require.resolve(mod)]; } catch (_) { /* not loaded yet */ }
      }
      const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');

      const { rows } = await db.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Sandbox Allowlist Family', 'none', false, '2026-11-05T00:00:00+02:00'::timestamptz, 'SE', 'EU')
         RETURNING id`
      );
      const familyId = rows[0].id;

      await withEnv(
        { REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true', REVENUECAT_SANDBOX_FAMILY_IDS: familyId },
        async () => {
          // Being on the allowlist only grants *purchase eligibility* — it must never
          // itself write to family_entitlements or flip the resolver's verdict.
          const eligibility = await getNativePurchaseEligibility(familyId);
          assert.equal(eligibility.allowed, true);

          const { premium } = await resolveFamilyEntitlements(familyId);
          assert.equal(premium.active, false, 'sandbox allowlist membership must not itself grant Premium');
          assert.equal(premium.source, 'none');
        }
      );
    } finally {
      await db.cleanup();
    }
  });
});

describe('READY BUT OFF — purchase_enabled add-on rollout mode does not bypass native purchase gate', () => {
  it('rollout_mode=purchase for add-on packages cannot reach IapManager.purchaseComponent (function does not exist)', () => {
    const fs = require('fs');
    const path = require('path');
    const iapManagerSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'iap-manager.js'), 'utf8');
    assert.doesNotMatch(
      iapManagerSrc,
      /purchaseComponent\s*[:=]\s*(async\s+)?function|function\s+purchaseComponent/,
      'IapManager must not expose a purchaseComponent bypass of the native purchase gate'
    );
  });
});
