'use strict';

/**
 * /review/subscription-preview — non-purchasable App Store/Google Play review
 * screenshot aid. Proves: admin-only access, no RevenueCat init path, no
 * purchase/restore endpoint reachable, no secret exposure, and no impact on
 * the real /paywall route.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function loginAsAdmin(baseUrl, db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const { cookieHeader: buildCookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  if (loginRes.status !== 200) {
    throw new Error(`admin re-login failed ${loginRes.status}: ${await loginRes.text()}`);
  }
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  return { ...session, cookies };
}

describe('GET /review/subscription-preview — access control', () => {
  test('unauthenticated request is rejected (401)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const res = await fetch(`${http.baseUrl}/review/subscription-preview`);
      assert.equal(res.status, 401);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('authenticated non-admin parent is rejected (403)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await registerAndLogin(http.baseUrl);
      const res = await fetch(`${http.baseUrl}/review/subscription-preview`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(res.status, 403);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('authenticated admin can load the preview (200, HTML)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const res = await fetch(`${http.baseUrl}/review/subscription-preview`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /text\/html/);
      const body = await res.text();
      assert.match(body, /My Starday Premium/);
      assert.match(body, /noindex/);
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('served HTML never fetches /api/iap/config and has no live purchase click handlers', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const session = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const res = await fetch(`${http.baseUrl}/review/subscription-preview`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      const body = await res.text();

      // Page must not include paywall.js (the real purchase-capable controller)
      assert.doesNotMatch(body, /src="\/js\/paywall\.js/);
      // Page's own dedicated controller only
      assert.match(body, /src="\/js\/review-subscription-preview\.js/);
      // The primary CTA and restore control must be rendered non-interactive
      assert.match(body, /id="paywallPurchaseBtn"[^>]*\bdisabled\b/);
      assert.match(body, /id="paywallRestoreBtn"[^>]*\bdisabled\b/);
      // Plan cards are non-interactive containers, not clickable buttons
      assert.doesNotMatch(body, /<button[^>]*id="planYearlyBtn"/);
      assert.doesNotMatch(body, /<button[^>]*id="planMonthlyBtn"/);
      // No API key or secret-shaped value ever appears in the response
      assert.doesNotMatch(body, /sk_[A-Za-z0-9]/);
      assert.doesNotMatch(body, /rcsk_[A-Za-z0-9]/);
      assert.doesNotMatch(body, /apiKey\s*[:=]\s*["'][^"']+["']/);
      // The developer-only footer must not appear in the actual served response.
      assert.doesNotMatch(
        body,
        /App Review preview — static, non-purchasable\. No RevenueCat SDK is loaded on this page\./
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});

describe('review-subscription-preview.js — static safety proof (no purchase path)', () => {
  const fullSrc = fs.readFileSync(path.join(ROOT, 'public/js/review-subscription-preview.js'), 'utf8');
  // Strip the file's own leading /** ... */ doc comment (which documents what
  // the file deliberately does NOT do, and therefore mentions the very terms
  // these tests must prove are absent from the *executable* code) before
  // asserting on actual behavior.
  const src = fullSrc.replace(/\/\*\*[\s\S]*?\*\//, '');

  test('never references IAPManager, Purchases, or RevenueCat SDK calls', () => {
    assert.doesNotMatch(src, /IAPManager/);
    assert.doesNotMatch(src, /purchasePackage/);
    assert.doesNotMatch(src, /restorePurchases/);
    assert.doesNotMatch(src, /Purchases\.(configure|logIn|logOut)/);
  });

  test('never fetches /api/iap/config or any purchase/sync endpoint', () => {
    assert.doesNotMatch(src, /fetch\(/);
    assert.doesNotMatch(src, /\/api\/iap/);
  });

  test('the doc comment accurately describes the safety guarantees (documentation stays honest)', () => {
    assert.match(fullSrc, /Deliberately does NOT/);
    assert.match(fullSrc, /reference window\.IAPManager/);
  });

  test('never attaches a click listener to the CTA/restore buttons', () => {
    assert.doesNotMatch(src, /paywallPurchaseBtn['"]\)\s*\.?\s*addEventListener/);
    assert.doesNotMatch(src, /paywallRestoreBtn['"]\)\s*\.?\s*addEventListener/);
    assert.doesNotMatch(src, /addEventListener\(['"]click['"]/);
  });

  test('uses only the intended hardcoded reference prices from the product contract', () => {
    const { PREMIUM_PRICE_MONTHLY_SEK, PREMIUM_PRICE_YEARLY_SEK } = require('../config/iap-product-contract');
    assert.match(src, new RegExp(String(PREMIUM_PRICE_MONTHLY_SEK)));
    assert.match(src, new RegExp(String(PREMIUM_PRICE_YEARLY_SEK)));
  });
});

describe('review-subscription-preview.html — markup safety proof', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/review-subscription-preview.html'), 'utf8');
  // Only <body> content (with HTML comments stripped) is what actually renders
  // on screen and could appear in a screenshot — the safety documentation in
  // <!-- --> comments and <head> is invisible to a screenshot/browser render.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  const visibleBody = (bodyMatch ? bodyMatch[1] : '').replace(/<!--[\s\S]*?-->/g, '');

  test('does not include paywall.js, iap-manager.js, or iap-native-client-logic.js as explicit script tags', () => {
    assert.doesNotMatch(html, /src="\/js\/paywall\.js/);
    assert.doesNotMatch(html, /src="\/js\/iap-manager\.js/);
    assert.doesNotMatch(html, /src="\/js\/iap-native-client-logic\.js/);
  });

  test('has robots noindex meta tag', () => {
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  });

  test('shows both monthly and yearly plan price placeholders', () => {
    assert.match(html, /id="planYearlyPrice"/);
    assert.match(html, /id="planMonthlyPrice"/);
    assert.match(html, /id="planYearlyBadge"/);
  });

  test('CTA and restore controls are disabled with aria-disabled and not keyboard-focusable', () => {
    assert.match(html, /id="paywallPurchaseBtn"[^>]*disabled[^>]*aria-disabled="true"[^>]*tabindex="-1"/);
    assert.match(html, /id="paywallRestoreBtn"[^>]*disabled[^>]*aria-disabled="true"[^>]*tabindex="-1"/);
  });

  test('the developer-only footer disclaimer is not rendered in the visible page', () => {
    assert.doesNotMatch(
      visibleBody,
      /App Review preview — static, non-purchasable\. No RevenueCat SDK is loaded on this page\./
    );
  });

  test('no "preview"/"sandbox"/"test"/"non-purchasable"/"admin"/RevenueCat wording appears in the visible screenshot UI', () => {
    assert.doesNotMatch(visibleBody, /\bpreview\b/i);
    assert.doesNotMatch(visibleBody, /\bsandbox\b/i);
    assert.doesNotMatch(visibleBody, /\bnon-purchasable\b/i);
    assert.doesNotMatch(visibleBody, /\badmin\b/i);
    assert.doesNotMatch(visibleBody, /RevenueCat/i);
    // A bare "test" match would also hit i18n keys like "test-secret" fixtures
    // elsewhere, so scope this specifically to standalone word usage in copy.
    assert.doesNotMatch(visibleBody, /\btest\b/i);
  });

  test('default (Apple) legal disclosure does not mention Google Play', () => {
    assert.doesNotMatch(visibleBody, /Google Play/i);
  });
});

describe('route registration — admin-gated, no impact on real routes', () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');

  test("/review/subscription-preview is mounted behind requireAdmin", () => {
    const match = indexSrc.match(/app\.get\('\/review\/subscription-preview',\s*requireAdmin,/);
    assert.ok(match, 'route must be mounted with requireAdmin middleware');
  });

  test('/paywall route registration is unchanged (still public, still serves paywall.html)', () => {
    assert.match(indexSrc, /app\.get\('\/paywall', \(req, res\) => \{\s*res\.sendFile\(join\(__dirname, '\.\.\/\.\.\/public', 'paywall\.html'\)\);/);
  });

  test('the review preview route is not referenced from any nav/menu/sitemap file', () => {
    const candidates = [
      'public/js/parent-nav-sidebar.js',
      'public/js/native-tab-bar.js',
      'public/js/parent-avatar-menu.js',
      'src/lib/seo-pages.js',
    ];
    for (const rel of candidates) {
      const p = path.join(ROOT, rel);
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, 'utf8');
      assert.doesNotMatch(content, /review\/subscription-preview/, `${rel} must not link to the review preview route`);
    }
  });
});
