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

async function readJson(res) {
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, text, body };
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
      const createRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify(BRIEF),
      }));
      assert.equal(createRes.status, 201, createRes.text);
      const created = createRes.body;
      assert.equal(created.campaign.status, 'draft');
      assert.equal(created.campaign.daily_budget_sek, 40);

      const submitRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/submit`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(submitRes.status, 200, submitRes.text);
      assert.equal(submitRes.body.campaign.status, 'pending_approval');

      const approveRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/approve`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(approveRes.status, 200, approveRes.text);
      const approved = approveRes.body;
      assert.equal(approved.campaign.status, 'live');
      assert.equal(approved.campaign.meta_campaign_id, 'camp_live');
      assert.ok(graph.calls.some((c) => String(c.path).endsWith('/campaigns')));

      const secondApprove = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/approve`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(secondApprove.status, 409, secondApprove.text);
      const campaignCreates = graph.calls.filter((c) => String(c.path).endsWith('/campaigns'));
      assert.equal(campaignCreates.length, 1);

      const pauseRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.campaign.id}/pause`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(pauseRes.status, 200, pauseRes.text);
      assert.equal(pauseRes.body.campaign.status, 'paused');
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
      const createRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ ...BRIEF, name: 'Okopplad kampanj' }),
      }));
      assert.equal(createRes.status, 201, createRes.text);
      const id = createRes.body.campaign.id;
      const submitRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}/submit`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(submitRes.status, 200, submitRes.text);
      const approveRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}/approve`, {
        method: 'POST',
        headers: headers(admin),
      }));
      assert.equal(approveRes.status, 409);
      assert.equal(approveRes.body.code, 'META_ADS_NOT_CONFIGURED');
      const getRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}`, {
        headers: headers(admin),
      }));
      assert.equal(getRes.body.campaign.status, 'pending_approval');

      const rejectRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${id}/reject`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ reason: 'Saknar Meta-nycklar' }),
      }));
      assert.equal(rejectRes.status, 200, rejectRes.text);
      assert.equal(rejectRes.body.campaign.status, 'rejected');
    } finally {
      await http.close();
    }
  });

  await t.test('copy guard blocks spend-path create; draft PUT updates before submit', async () => {
    delete process.env.META_ADS_ACCESS_TOKEN;
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const admin = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const blocked = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ ...BRIEF, name: 'Sista chansen test', headline: 'Sista chansen idag' }),
      }));
      assert.equal(blocked.status, 400, blocked.text);
      assert.ok(Array.isArray(blocked.body.violations));

      const created = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({ ...BRIEF, name: 'Redigerbar kampanj' }),
      }));
      assert.equal(created.status, 201, created.text);
      const updated = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/${created.body.campaign.id}`, {
        method: 'PUT',
        headers: headers(admin),
        body: JSON.stringify({
          ...BRIEF,
          name: 'Redigerad kampanj',
          daily_budget_sek: 60,
        }),
      }));
      assert.equal(updated.status, 200, updated.text);
      assert.equal(updated.body.campaign.name, 'Redigerad kampanj');
      assert.equal(updated.body.campaign.daily_budget_sek, 60);
      assert.equal(updated.body.campaign.status, 'draft');
    } finally {
      await http.close();
    }
  });

  await t.test('boost queues from a page post, publishes via story id, and caches insights', async () => {
    process.env.META_ADS_ACCESS_TOKEN = 'test-token';
    process.env.META_AD_ACCOUNT_ID = 'act_1';
    process.env.META_ADS_PAGE_ID = 'page_1';
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    const graph = mockGraphClient();
    http.app.set('metaAdsGraphClient', graph);
    try {
      const admin = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const nyhet = await db.query(
        `INSERT INTO dagens_nyhet (
           title, body, show_landing, send_push, post_to_facebook, status,
           facebook_post_id, published_at, expires_at
         ) VALUES (
           $1, $2, false, false, true, 'published',
           $3, NOW(), NOW() + INTERVAL '2 days'
         ) RETURNING id`,
        [
          'Boostbar nyhet',
          'En tydlig morgon for familjen i vardagen.',
          '555_666',
        ]
      );
      const posts = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/boostable-posts`, {
        headers: headers(admin),
      }));
      assert.equal(posts.status, 200, posts.text);
      assert.ok((posts.body.posts || []).some((p) => p.facebook_post_id === '555_666'));

      const boostRes = await readJson(await fetch(`${http.baseUrl}/api/admin/meta-ads/boost`, {
        method: 'POST',
        headers: headers(admin),
        body: JSON.stringify({
          dagens_nyhet_id: nyhet.rows[0].id,
          daily_budget_sek: 40,
        }),
      }));
      assert.equal(boostRes.status, 201, boostRes.text);
      assert.equal(boostRes.body.campaign.status, 'pending_approval');
      assert.equal(boostRes.body.campaign.kind, 'boost');
      assert.equal(boostRes.body.campaign.source_post_id, '555_666');

      const approveRes = await readJson(await fetch(
        `${http.baseUrl}/api/admin/meta-ads/${boostRes.body.campaign.id}/approve`,
        { method: 'POST', headers: headers(admin) }
      ));
      assert.equal(approveRes.status, 200, approveRes.text);
      assert.equal(approveRes.body.campaign.status, 'live');
      assert.equal(graph.calls.filter((c) => String(c.path).includes('/adimages')).length, 0);
      const creative = graph.calls.find((c) => String(c.path).endsWith('/adcreatives'));
      assert.equal(creative.body.object_story_id, '555_666');

      const firstInsights = await readJson(await fetch(
        `${http.baseUrl}/api/admin/meta-ads/${boostRes.body.campaign.id}/insights`,
        { headers: headers(admin) }
      ));
      assert.equal(firstInsights.status, 200, firstInsights.text);
      assert.equal(firstInsights.body.cached, undefined);
      const insightCalls = graph.calls.filter((c) => String(c.path).includes('/insights')).length;
      const secondInsights = await readJson(await fetch(
        `${http.baseUrl}/api/admin/meta-ads/${boostRes.body.campaign.id}/insights`,
        { headers: headers(admin) }
      ));
      assert.equal(secondInsights.status, 200, secondInsights.text);
      assert.equal(secondInsights.body.cached, true);
      assert.equal(
        graph.calls.filter((c) => String(c.path).includes('/insights')).length,
        insightCalls
      );
    } finally {
      await http.close();
    }
  });
});
