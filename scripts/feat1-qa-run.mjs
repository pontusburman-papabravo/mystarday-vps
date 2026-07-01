#!/usr/bin/env node
/**
 * FEAT-1 boendeschema — manual QA runner (local dev).
 * API + browser checks for /family, /schedule, /dashboard, calendar-week.
 *
 * Usage:
 *   NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false EMAIL_ENABLED=false \
 *     node scripts/feat1-qa-run.mjs
 */
import puppeteer from 'puppeteer';

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { createApp } = await import('../app.js');

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

async function listenApp() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.keepAliveTimeout = 1;
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function api(baseUrl, path, { method = 'GET', jar = {}, body, csrf } = {}) {
  const headers = { Cookie: cookieHeader(jar) };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { res, json, text };
}

const results = [];

function record(area, check, status, detail) {
  results.push({ area, check, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⊘';
  console.log(`${icon} [${area}] ${check}: ${detail}`);
}

async function main() {
  const http = await listenApp();
  const email = `feat1-qa-${Date.now()}@example.com`;
  const password = 'feat1-qa-pass-32chars-minimum!';
  let jar = {};
  let csrf = '';
  let childId = '';

  try {
    // ── Auth + child ──
    let { res, json } = await api(http.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email, password, name: 'FEAT-1 QA' },
    });
    if (res.status !== 201) throw new Error(`register ${res.status}: ${JSON.stringify(json)}`);

    ({ res, json } = await api(http.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }));
    if (res.status !== 200) throw new Error(`login ${res.status}`);
    for (const h of getSetCookieHeaders(res)) jar = mergeCookies(jar, [h]);
    csrf = json.csrfToken;

    ({ res, json } = await api(http.baseUrl, '/api/children', {
      method: 'POST', jar, csrf,
      body: { name: 'QA-Barn', emoji: '🧒', birthday: '2018-06-01' },
    }));
    if (res.status !== 201) throw new Error(`child ${res.status}: ${JSON.stringify(json)}`);
    childId = json.id;

    await api(http.baseUrl, '/api/onboarding/complete', { method: 'POST', jar, csrf });

    // Ensure custody flag (fresh local DBs may lack feature_flag rows)
    const db = (await import('../src/lib/db.js')).default;
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('custody_schedule_beta', true, 'FEAT-1 boendeschema')
       ON CONFLICT (key) DO UPDATE SET enabled = true`
    );

    // ── Custody setup ──
    ({ res, json } = await api(http.baseUrl, '/api/family/custody/setup', { method: 'POST', jar, csrf }));
    if (res.status !== 200) throw new Error(`custody setup ${res.status}`);
    const homes = json.homes || [];
    record('API', 'custody setup', homes.length >= 2 ? 'PASS' : 'FAIL', `${homes.length} hem`);

  homes[0].label = 'Mammahem';
  homes[1].label = 'Pappahem';
    await api(http.baseUrl, '/api/family/custody/homes', {
      method: 'PUT', jar, csrf,
      body: { homes: homes.map((h, i) => ({ id: h.id, label: h.label, color: h.color, sort_order: i })) },
    });

    const anchor = '2026-06-02';
    ({ res, json } = await api(http.baseUrl, `/api/family/custody/pattern/${childId}`, {
      method: 'PUT', jar, csrf,
      body: {
        anchor_date: anchor,
        week_a_home_id: homes[0].id,
        week_b_home_id: homes[1].id,
        pattern_type: 'alternate_weeks',
        clone_week_b: false,
      },
    }));
    record('API', 'pattern alternate_weeks', res.status === 200 ? 'PASS' : 'FAIL', `status ${res.status}`);

    ({ res, json } = await api(http.baseUrl, `/api/family/custody/pattern/${childId}`, {
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
    record('API', 'pattern alternate_weekends + default_home_id', res.status === 200 ? 'PASS' : 'FAIL', `status ${res.status}`);

    ({ res, json } = await api(http.baseUrl, `/api/family/custody/context?childId=${childId}&date=2026-06-06`, { jar }));
    const ctxOk = json?.active && json?.activeHome?.label;
    record('API', 'custody context activeHome', ctxOk ? 'PASS' : 'FAIL', JSON.stringify(json?.activeHome || json));

    ({ res, json } = await api(http.baseUrl, `/api/children/${childId}/calendar-week?weekOffset=0`, { jar }));
    const weekOk = json?.custody?.active && json.days?.some((d) => d.custody?.label);
    record('API', 'calendar-week custody labels', weekOk ? 'PASS' : 'FAIL',
      json?.days?.find((d) => d.custody)?.custody?.label || 'no label');

    // ── Browser UI ──
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    const cookies = Object.entries(jar).map(([name, value]) => ({
      name, value, domain: '127.0.0.1', path: '/',
    }));
    await page.setCookie(...cookies);

    // /family
    await page.goto(`${http.baseUrl}/family`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => window.familyChildren?.length > 0, { timeout: 15000 }).catch(() => {});
    const familyUi = await page.evaluate(() => {
      const body = document.getElementById('custodyScheduleBody');
      const html = body?.innerHTML || '';
      return {
        sectionVisible: !document.getElementById('custodyScheduleSection')?.classList.contains('hidden'),
        hasPatternSelect: !!document.querySelector('.custody-pattern-type'),
        hasVarannanVecka: /Varannan vecka/.test(html),
        hasVarannanHelg: /Varannan helg/.test(html),
        noVeckaAB: !/Vecka A/.test(html) && !/Vecka B/.test(html),
        hasHemPeriod: /Hem period/.test(html) || /Bashem vardagar/.test(html),
      };
    });
    record('/family', 'section visible', familyUi.sectionVisible ? 'PASS' : 'FAIL', String(familyUi.sectionVisible));
    record('/family', 'pattern selector', familyUi.hasPatternSelect ? 'PASS' : 'FAIL', 'custody-pattern-type');
    record('/family', 'varannan vecka/helg', (familyUi.hasVarannanVecka && familyUi.hasVarannanHelg) ? 'PASS' : 'FAIL', '');
    record('/family', 'no Vecka A/B', familyUi.noVeckaAB ? 'PASS' : 'FAIL', '');
    record('/family', 'hem labels', familyUi.hasHemPeriod ? 'PASS' : 'FAIL', '');

    // /schedule
    await page.goto(`${http.baseUrl}/schedule?childId=${childId}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => window.ScheduleCustody, { timeout: 10000 });
    await page.waitForFunction(() => window.ScheduleCustody?.isActive?.(), { timeout: 20000 }).catch(() => {});
    const schedUi = await page.evaluate(() => {
      const chrome = document.getElementById('custodyScheduleChrome');
      const text = chrome?.innerText || '';
      return {
        chromeVisible: chrome && !chrome.classList.contains('hidden'),
        hasHomeLabels: /Mammahem|Pappahem|Period/.test(text),
        noVeckaAB: !/Vecka A/.test(text) && !/Vecka B/.test(text),
        hasMinaDagar: /Mina dagar/.test(text),
        dayTabTitle: !!document.querySelector('.day-tab[title^="Hos "]'),
      };
    });
    record('/schedule', 'custody chrome', schedUi.chromeVisible ? 'PASS' : 'FAIL', '');
    record('/schedule', 'home names on buttons', schedUi.hasHomeLabels ? 'PASS' : 'FAIL', '');
    record('/schedule', 'no Vecka A/B', schedUi.noVeckaAB ? 'PASS' : 'FAIL', '');
    record('/schedule', 'Mina dagar', schedUi.hasMinaDagar ? 'PASS' : 'FAIL', '');
    record('/schedule', 'day tab Hos title', schedUi.dayTabTitle ? 'PASS' : 'FAIL', '');

    // /dashboard
    await page.goto(`${http.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.dash-child-card[data-child-id]', { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => {
      const b = document.getElementById('custodyWeekBanner');
      return b && !b.classList.contains('hidden');
    }, { timeout: 15000 }).catch(() => {});
    const dashUi = await page.evaluate(() => {
      const banner = document.getElementById('custodyWeekBanner');
      const text = banner?.innerText || document.body.innerText;
      return {
        bannerVisible: banner && !banner.classList.contains('hidden'),
        hasBannerText: /Denna vecka: hos/i.test(text),
        hasNastaByte: /Nästa byte/i.test(text),
        noVeckaAB: !/Vecka A/.test(text),
      };
    });
    record('/dashboard', 'custody banner visible', dashUi.bannerVisible ? 'PASS' : 'FAIL', '');
    record('/dashboard', 'custody banner text', dashUi.hasBannerText ? 'PASS' : 'FAIL', '');
    record('/dashboard', 'nästa byte', dashUi.hasNastaByte ? 'PASS' : 'BLOCKED', 'may be absent if no transition in week');
    record('/dashboard', 'no Vecka A/B', dashUi.noVeckaAB ? 'PASS' : 'FAIL', '');

    await browser.close();

    const fails = results.filter((r) => r.status === 'FAIL');
    console.log('\n── Summary ──');
    console.log(`PASS: ${results.filter((r) => r.status === 'PASS').length}`);
    console.log(`FAIL: ${fails.length}`);
    console.log(`BLOCKED: ${results.filter((r) => r.status === 'BLOCKED').length}`);
    if (fails.length) {
      process.exitCode = 1;
    }
  } finally {
    await http.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
