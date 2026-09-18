'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginAsAdmin(baseUrl, db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  if (loginRes.status !== 200) {
    throw new Error(`admin re-login failed ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginBody = JSON.parse(await loginRes.text());
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { ...session, cookies, csrfToken: loginBody.csrfToken };
}

function headers(session) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
}

const BRIEF = {
  name: 'Testkampanj SE',
  destination_url: 'https://mystarday.se/register', // pragma: allowlist secret
  daily_budget_sek: 40,
  countries: ['SE'],
  primary_text: 'En tydlig morgon med ett nästa steg för barnet.',
  headline: 'Ett nästa steg i morgon',
  hypothesis: 'Registrering leder till First Success inom sju dagar.',
  primary_metric: 'First Success 7d',
  image_url: 'https://mystarday.se/og-image.png', // pragma: allowlist secret
};

function mockGraphClient() {
  const calls = [];
  return {
    calls,
    async graph(method, objectPath, body) {
      calls.push({ method, path: objectPath, body });
      if (String(objectPath).includes('/adimages')) return { images: { file: { hash: 'h1' } } };
      if (String(objectPath).includes('/campaigns')) return { id: 'camp_live' };
      if (String(objectPath).includes('/adsets')) return { id: 'adset_live' };
      if (String(objectPath).includes('/adcreatives')) return { id: 'cr_live' };
      if (String(objectPath).includes('/ads')) return { id: 'ad_live' };
      if (String(objectPath).includes('/insights')) {
        return { data: [{ impressions: '12', clicks: '3', spend: '4.50' }] };
      }
      return { success: true };
    },
  };
}

test('admin meta ads approval API', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  t.after(() => db.cleanup());

  await t.test('parent cannot hit meta-ads; admin draft → submit → approve publishes via injected client', async () => {
    process.env.META_ADS_ACCESS_TOKEN = 'test-token';
    process.env.META_AD_ACCOUNT_ID = 'act_1';
    process.env.META_ADS_PAGE_ID = 'page_1';
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const graph = mockGraphClient();
    http.app.set('metaAdsGraphClient', graph);
    try {
      const parent = await registerAndLogin(http.baseUrl);
      const parentRes = await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        headers: { Cookie: cookieHeader(parent.cookies) },
      });
      assert.equal(parentRes.status, 403);

      const admin = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const createRes = await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify(BRIEF),
      });
      assert.equal(createRes.status, 201, await createRes.text());
      const created = await createRes.json();
      assert.equal(created.campaign.status, 'draft');
      assert.equal(created.campaign.daily_budget_sek, 40);

      const submitRes = await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/submit`, {
        method: 'POST',
        headers: headers(admin),
      });
      assert.equal(submitRes.status, 200, await submitRes.text());
      assert.equal((await submitRes.json()).campaign.status, 'pending_approval');

      const approveRes = await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/approve`, {
        method: 'POST',
        headers: headers(admin),
      });
      assert.equal(approveRes.status, 200, await approveRes.text());
      const approved = await approveRes.json();
      assert.equal(approved.campaign.status, 'live');
      assert.equal(approved.campaign.meta_campaign_id, 'camp_live');
      assert.ok(graph.calls.some((c) => String(c.path).endsWith('/campaigns')));

      const pauseRes = await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/pause`, {
        method: 'POST',
        headers: headers(admin),
      });
      assert.equal(pauseRes.status, 200, await pauseRes.text());
      assert.equal((await pauseRes.json()).campaign.status, 'paused');
    } finally {
      await http.close();
    }
  });

  await t.test('approve without Meta config stays honest (409) and does not mark live', async () => {
    delete process.env.META_ADS_ACCESS_TOKEN;
    delete process.env.META_AD_ACCOUNT_ID;
    delete process.env.META_ADS_PAGE_ID;
    delete process.env.FACEBOOK_PAGE_ID;
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const admin = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const createRes = await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ ...BRIEF, name: 'Okopplad kampanj' }),
      });
      assert.equal(createRes.status, 201, await createRes.text());
      const id = (await createRes.json()).campaign.id;
      await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}/submit`, {
        method: 'POST',
        headers: headers(admin),
      });
      const approveRes = await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}/approve`, {
        method: 'POST',
        headers: headers(admin),
      });
      assert.equal(approveRes.status, 409);
      const body = await approveRes.json();
      assert.equal(body.code, 'META_ADS_NOT_CONFIGURED');
      const getRes = await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}`, {
        headers: headers(admin),
      });
      const got = await getRes.json();
      assert.equal(got.campaign.status, 'pending_approval');
    } finally {
      await http.close();
    }
  });
});
