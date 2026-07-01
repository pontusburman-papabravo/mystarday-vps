#!/usr/bin/env node
/**
 * FEAT-1 boendeschema — manual QA against live site (staging/prod).
 * Registers a throwaway account, configures custody via API, checks UI surfaces.
 *
 * Usage:
 *   PROD_BASE_URL=https://example.com node scripts/feat1-qa-prod.mjs
 */
import puppeteer from 'puppeteer';

const BASE = process.env.PROD_BASE_URL;
if (!BASE) {
  console.error('Set PROD_BASE_URL (e.g. your staging origin) before running prod QA.');
  process.exit(1);
}
const email = `feat1-qa-${Date.now()}@example.com`;
const password = 'feat1-qa-pass-32chars-minimum!';

const results = [];

function record(area, check, status, detail) {
  results.push({ area, check, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⊘';
  console.log(`${icon} [${area}] ${check}: ${detail}`);
}

function parseCookies(setCookie) {
  const jar = {};
  const headers = Array.isArray(setCookie) ? setCookie : (setCookie ? [setCookie] : []);
  for (const header of headers) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(jar, setCookie) {
  return { ...jar, ...parseCookies(setCookie) };
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

async function api(path, { method = 'GET', jar = {}, body, csrf } = {}) {
  const headers = { Cookie: cookieHeader(jar) };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { res, json, text };
}

async function main() {
  console.log(`FEAT-1 prod QA → ${BASE}\n`);
  let jar = {};
  let csrf = '';
  let childId = '';

  // ── Auth ──
  let { res, json } = await api('/api/auth/register', {
    method: 'POST',
    body: { email, password, name: 'FEAT-1 Prod QA' },
  });
  if (res.status !== 201) {
    record('Auth', 'register', 'FAIL', `${res.status} ${json?.error || json?.message || ''}`);
    process.exitCode = 1;
    return;
  }
  record('Auth', 'register', 'PASS', email);

  ({ res, json } = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  }));
  if (res.status !== 200) {
    record('Auth', 'login', 'FAIL', `${res.status}`);
    process.exitCode = 1;
    return;
  }
  for (const h of getSetCookieHeaders(res)) jar = mergeCookies(jar, [h]);
  csrf = json.csrfToken;
  record('Auth', 'login', 'PASS', 'session ok');

  // ── Child + onboarding ──
  ({ res, json } = await api('/api/children', {
    method: 'POST', jar, csrf,
    body: { name: 'QA-Barn', emoji: '🧒', birthday: '2018-06-01' },
  }));
  if (res.status !== 201) {
    record('Setup', 'create child', 'FAIL', `${res.status} ${JSON.stringify(json)}`);
    process.exitCode = 1;
    return;
  }
  childId = json.id;
  record('Setup', 'create child', 'PASS', childId);

  ({ res, json } = await api('/api/onboarding/complete', { method: 'POST', jar, csrf }));
  record('Setup', 'onboarding complete', res.status === 200 ? 'PASS' : 'FAIL', `status ${res.status}`);

  ({ res, json } = await api('/api/auth/me', { jar }));
  const onboardingDone = json?.onboardingComplete === true || json?.onboarding_complete === true;
  record('Setup', 'me onboarding flag', onboardingDone ? 'PASS' : 'FAIL', JSON.stringify({
    onboardingComplete: json?.onboardingComplete,
    onboarding_complete: json?.onboarding_complete,
  }));

  // ── Custody API ──
  ({ res, json } = await api('/api/family/custody/setup', { method: 'POST', jar, csrf }));
  if (res.status === 404) {
    record('API', 'custody setup', 'BLOCKED', '404 — flag off or route missing');
  } else if (res.status !== 200) {
    record('API', 'custody setup', 'FAIL', `${res.status} ${JSON.stringify(json)}`);
  } else {
    const homes = json.homes || [];
    record('API', 'custody setup', homes.length >= 2 ? 'PASS' : 'FAIL', `${homes.length} hem`);

    homes[0].label = 'Mammahem';
    homes[1].label = 'Pappahem';
    await api('/api/family/custody/homes', {
      method: 'PUT', jar, csrf,
      body: { homes: homes.map((h, i) => ({ id: h.id, label: h.label, color: h.color, sort_order: i })) },
    });

    const anchor = '2026-06-02';
    ({ res, json } = await api(`/api/family/custody/pattern/${childId}`, {
      method: 'PUT', jar, csrf,
      body: {
        anchor_date: anchor,
        week_a_home_id: homes[0].id,
        week_b_home_id: homes[1].id,
        pattern_type: 'alternate_weekends',
        default_home_id: homes[0].id,
        clone_week_b: false,
      },
    }));
    record('API', 'alternate_weekends', res.status === 200 ? 'PASS' : 'FAIL', `status ${res.status}`);

    ({ res, json } = await api(`/api/family/custody/context?childId=${childId}&date=2026-06-06`, { jar }));
    record('API', 'context activeHome', json?.activeHome?.label ? 'PASS' : 'FAIL', json?.activeHome?.label || JSON.stringify(json));
  }

  // ── Browser UI ──
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const domain = new URL(BASE).hostname;
  const cookies = Object.entries(jar).map(([name, value]) => ({
    name, value, domain, path: '/', secure: BASE.startsWith('https'),
  }));
  await page.setCookie(...cookies);

  // Gate check — can we reach /family without onboarding redirect?
  await page.goto(`${BASE}/family`, { waitUntil: 'networkidle2', timeout: 60000 });
  const familyUrl = page.url();
  const onOnboarding = /onboarding/.test(familyUrl);
  record('Gate', '/family reachable', onOnboarding ? 'FAIL' : 'PASS', familyUrl);

  if (!onOnboarding) {
    await page.waitForFunction(() => window.familyChildren?.length > 0, { timeout: 15000 }).catch(() => {});
    const familyUi = await page.evaluate(() => {
      const body = document.getElementById('custodyScheduleBody');
      const html = body?.innerHTML || '';
      return {
        sectionVisible: !document.getElementById('custodyScheduleSection')?.classList.contains('hidden'),
        hasPatternSelect: !!document.querySelector('.custody-pattern-type'),
        noVeckaAB: !/Vecka A/.test(html) && !/Vecka B/.test(html),
      };
    });
    record('/family', 'custody section', familyUi.sectionVisible ? 'PASS' : 'FAIL', '');
    record('/family', 'pattern selector', familyUi.hasPatternSelect ? 'PASS' : 'FAIL', '');
    record('/family', 'no Vecka A/B', familyUi.noVeckaAB ? 'PASS' : 'FAIL', '');

    await page.goto(`${BASE}/schedule?childId=${childId}`, { waitUntil: 'networkidle2', timeout: 60000 });
    const schedUi = await page.evaluate(() => {
      const chrome = document.getElementById('custodyScheduleChrome');
      const text = chrome?.innerText || '';
      return {
        chromeVisible: chrome && !chrome.classList.contains('hidden'),
        hasHomeLabels: /Mammahem|Pappahem|Period|Hos/.test(text),
        noVeckaAB: !/Vecka A/.test(text) && !/Vecka B/.test(text),
      };
    });
    record('/schedule', 'custody chrome', schedUi.chromeVisible ? 'PASS' : 'FAIL', '');
    record('/schedule', 'home labels', schedUi.hasHomeLabels ? 'PASS' : 'FAIL', '');
    record('/schedule', 'no Vecka A/B', schedUi.noVeckaAB ? 'PASS' : 'FAIL', '');

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => {
      const b = document.getElementById('custodyWeekBanner');
      return b && !b.classList.contains('hidden');
    }, { timeout: 20000 }).catch(() => {});
    const dashUi = await page.evaluate(() => {
      const banner = document.getElementById('custodyWeekBanner');
      const text = banner?.innerText || document.body.innerText;
      const magicChild = !!document.querySelector('.parent-ready-child[data-child-id]');
      return {
        bannerVisible: banner && !banner.classList.contains('hidden'),
        hasBannerText: /Denna vecka: hos/i.test(text),
        magicHem: magicChild,
        noVeckaAB: !/Vecka A/.test(text),
      };
    });
    record('/dashboard', 'magic Hem layout', dashUi.magicHem ? 'PASS' : 'BLOCKED', 'parent-ready-child');
    record('/dashboard', 'custody banner visible', dashUi.bannerVisible ? 'PASS' : 'FAIL',
      dashUi.magicHem ? 'expected fix #484 on magic Hem' : 'legacy cards');
    record('/dashboard', 'banner text', dashUi.hasBannerText ? 'PASS' : 'FAIL', '');
    record('/dashboard', 'no Vecka A/B', dashUi.noVeckaAB ? 'PASS' : 'FAIL', '');
  }

  await browser.close();

  const fails = results.filter((r) => r.status === 'FAIL');
  console.log('\n── Summary ──');
  console.log(`PASS: ${results.filter((r) => r.status === 'PASS').length}`);
  console.log(`FAIL: ${fails.length}`);
  console.log(`BLOCKED: ${results.filter((r) => r.status === 'BLOCKED').length}`);
  if (fails.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
