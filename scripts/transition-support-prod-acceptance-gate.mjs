#!/usr/bin/env node
/**
 * Extra stöd (transition_support) — live acceptance on founder/Journey QA family.
 * VPS: set -a && source .env && set +a && node scripts/transition-support-prod-acceptance-gate.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = require(path.join(ROOT, 'src/lib/db'));
const {
  resolveQaBrowserSessions,
  jarToCookieHeader,
  puppeteerCookies,
} = require(path.join(ROOT, 'scripts/ops/vps-allowlisted-qa-sessions.cjs'));
const grantCore = require(path.join(ROOT, 'scripts/lib/qa-extra-stod-grant-core.cjs'));
const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

const baseFromEnv = process.env.JOURNEY_QA_BASE_URL || process.env.SMOKE_BASE_URL;
let BASE = baseFromEnv ? String(baseFromEnv).replace(/\/$/, '') : '';

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'android-412x915', width: 412, height: 915 },
];

const report = {
  step: 'transition-support-prod-acceptance-gate',
  base: BASE,
  dry_run: {},
  apply: {},
  parent: {},
  child: {},
  mobile: {},
  restore: { pass: false, read_back: {} },
  pass: false,
};

function redact(obj) {
  return JSON.parse(JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return '[id]';
    return v;
  }));
}

function stableLead(a) {
  if (a == null) return 'null';
  return JSON.stringify(Array.isArray(a) ? [...a].sort((x, y) => x - y) : a);
}

async function apiFetch(jar, csrf, pathname, opts = {}) {
  const headers = {
    Cookie: jarToCookieHeader(jar),
    ...(opts.headers || {}),
  };
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (csrf && opts.method && opts.method !== 'GET') headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${BASE}${pathname}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

async function childSessionViaApi(username, pin) {
  const loginRes = await fetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  if (!loginRes.ok) return null;
  const body = await loginRes.json();
  const jar = {};
  for (const h of loginRes.headers.getSetCookie?.() || []) {
    const pair = h.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return { jar, csrf: body.csrfToken, via: 'api_login' };
}

async function pickSiblingChild(parentJar, parentCsrf, qaChildId) {
  const childrenRes = await apiFetch(parentJar, parentCsrf, '/api/children');
  const list = Array.isArray(childrenRes.json) ? childrenRes.json : [];
  return list.find((c) => c.id !== qaChildId) || null;
}

function stockholmTimePlusMinutes(offsetMin) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute').value, 10);
  let total = hour * 60 + minute + offsetMin;
  if (total < 0) total += 24 * 60;
  total %= 24 * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function snapshotLogItemTiming(parentJar, parentCsrf, qaChildId) {
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const logRes = await apiFetch(parentJar, parentCsrf, `/api/children/${qaChildId}/daily-log?date=${dateStr}`);
  const items = logRes.json?.items || [];
  const incomplete = items.filter((i) => !i.completed);
  if (!incomplete.length) return { items: [], item: null };
  const start = stockholmTimePlusMinutes(3);
  const end = stockholmTimePlusMinutes(20);
  const snaps = incomplete.map((i) => ({
    id: i.id,
    start_time: i.start_time ?? null,
    end_time: i.end_time ?? null,
  }));
  for (const row of snaps) {
    await setLogItemStartTimeDb(row.id, start, end);
  }
  return {
    items: snaps,
    item: snaps[0],
  };
}

async function setLogItemStartTimeDb(itemId, startTime, endTime) {
  await db.query(
    'UPDATE daily_log_item SET start_time = $2, end_time = $3 WHERE id = $1',
    [itemId, startTime, endTime]
  );
}

async function runParentChecks(parentJar, parentCsrf, qaChildId, sibling) {
  const out = {};
  const beforeAccess = await apiFetch(parentJar, parentCsrf, '/api/subscription/access');
  out.access_transition_support = beforeAccess.json?.features?.transition_support === true;

  const siblingBefore = sibling
    ? stableLead((await apiFetch(parentJar, parentCsrf, '/api/children')).json
      ?.find((c) => c.id === sibling.id)?.transition_lead_minutes)
    : 'n/a';

  const origRes = await apiFetch(parentJar, parentCsrf, '/api/children');
  const qaBefore = (Array.isArray(origRes.json) ? origRes.json : []).find((c) => c.id === qaChildId);
  const origLead = qaBefore?.transition_lead_minutes;

  const putRes = await apiFetch(parentJar, parentCsrf, `/api/children/${qaChildId}`, {
    method: 'PUT',
    body: { transition_lead_minutes: [5, 3] },
  });
  out.write_status = putRes.status;
  const afterRes = await apiFetch(parentJar, parentCsrf, '/api/children');
  const qaAfter = (Array.isArray(afterRes.json) ? afterRes.json : []).find((c) => c.id === qaChildId);
  out.write_persisted = Array.isArray(qaAfter?.transition_lead_minutes)
    && qaAfter.transition_lead_minutes.includes(5);

  if (sibling) {
    const sibAfter = (Array.isArray(afterRes.json) ? afterRes.json : []).find((c) => c.id === sibling.id);
    out.sibling_unchanged = stableLead(sibAfter?.transition_lead_minutes) === siblingBefore;
  } else {
    out.sibling_unchanged = true;
  }

  if (origLead !== undefined) {
    await apiFetch(parentJar, parentCsrf, `/api/children/${qaChildId}`, {
      method: 'PUT',
      body: { transition_lead_minutes: origLead },
    });
  }
  out._origLead = origLead;
  return out;
}

async function runChildApiChecks(childJar) {
  const out = {};
  const access = await apiFetch(childJar, null, '/api/subscription/access');
  out.access_status = access.status;
  out.features_transition_support = access.json?.features?.transition_support === true;

  const ts = await apiFetch(childJar, null, '/api/me/transition-support');
  out.transition_support_route = ts.status === 200 && Array.isArray(ts.json?.lead_minutes);

  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const log = await apiFetch(childJar, null, `/api/me/daily-log?date=${dateStr}`);
  out.daily_log_lead_minutes = Array.isArray(log.json?.transition_lead_minutes);

  const me = await apiFetch(childJar, null, '/api/auth/me');
  out.child_session_ok = me.status === 200 && me.json?.type === 'child';
  return out;
}

async function runHttpMobileFallback() {
  throw new Error('browser_required_no_http_fallback');
}

async function runBrowserChecks(puppeteer, sessions, qaChildId, logSnap, childMeUser) {
  const { parent, child } = sessions;
  const results = { viewports: {} };
  const consoleErrors = [];
  const http5xx = [];

  let childMe = childMeUser;
  if (!childMe) {
    try {
      const meRes = await apiFetch(child.jar, null, '/api/auth/me');
      if (meRes.status === 200 && meRes.json?.type === 'child') childMe = meRes.json;
    } catch { /* browser may still fail later */ }
  }
  results.child_me_seeded = !!childMe;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (launchErr) {
    return { launch_error: launchErr.message, pass: false };
  }

  try {
  const parentPage = await browser.newPage();
  parentPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120));
  });
  parentPage.on('response', (res) => {
    const u = res.url();
    if (res.status() >= 500 && u.includes(BASE.replace(/^https?:\/\//, ''))) http5xx.push(res.status());
  });

  await parentPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (const c of puppeteerCookies(parent.jar, BASE)) await parentPage.setCookie(c);
  await parentPage.setViewport({
    width: VIEWPORTS[0].width,
    height: VIEWPORTS[0].height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const parentSettingsUrl = `${BASE}/family/child/${encodeURIComponent(qaChildId)}?tab=setup`;
  const accessPromise = parentPage.waitForResponse(
    (res) => res.url().includes('/api/subscription/access') && res.status() === 200,
    { timeout: 45000 },
  );
  await parentPage.goto(parentSettingsUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await accessPromise;
  await parentPage.waitForSelector('.transition-lead-cb', { timeout: 25000 });
  results.parent_transition_section = true;

  const cb = await parentPage.$('.transition-lead-cb');
  if (cb) {
    await cb.click();
    await new Promise((r) => setTimeout(r, 800));
    const statusText = await parentPage.evaluate(() => document.body.innerText);
    results.parent_has_text_status = /Om \d+ min/.test(statusText);
  }

  for (const vp of VIEWPORTS) {
    const childPage = await browser.newPage();
    childPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[${vp.name}] ${msg.text().slice(0, 100)}`);
    });
    if (childMe) {
      const csrf = child.csrf || '';
      await childPage.evaluateOnNewDocument((user, csrfToken) => {
        localStorage.setItem('stjarndag_user', JSON.stringify(user));
        if (csrfToken) localStorage.setItem('stjarndag_csrf', csrfToken);
      }, childMe, csrf);
    }
    await childPage.setViewport({
      width: vp.width,
      height: vp.height,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await childPage.evaluateOnNewDocument(() => {
      document.documentElement.style.fontSize = '125%';
    });
    await childPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (const c of puppeteerCookies(child.jar, BASE)) await childPage.setCookie(c);
    const dailyLogReady = childPage.waitForResponse(
      (res) => res.url().includes('/api/me/daily-log') && res.status() === 200,
      { timeout: 60000 },
    );
    await childPage.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dailyLogReady;
    if (logSnap.item?.id) {
      await childPage.waitForSelector('.now-card .transition-inline', { timeout: 45000 });
    } else {
      await new Promise((r) => setTimeout(r, 3500));
    }
    const metrics = await childPage.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth > doc.clientWidth + 2;
      const transition = document.querySelector('.transition-inline');
      const rect = transition?.getBoundingClientRect();
      const touchOk = !transition || (rect.width >= 44 && rect.height >= 44);
      return {
        overflowX,
        hasTransition: !!transition,
        transitionText: transition?.textContent?.trim() || '',
        touchOk,
      };
    });
    results.viewports[vp.name] = {
      ...metrics,
      pass: !metrics.overflowX && metrics.touchOk
        && (logSnap.item?.id ? (metrics.hasTransition && metrics.transitionText.length > 0) : true),
    };
  }

  await browser.close();
  results.console_error_count = consoleErrors.length;
  results.http5xx_count = http5xx.length;
  results.pass = consoleErrors.length === 0
    && http5xx.length === 0
    && results.parent_transition_section
    && results.parent_has_text_status
    && Object.values(results.viewports).every((v) => v.pass);
  return results;
  } catch (browserErr) {
    try { await browser?.close(); } catch { /* ignore */ }
    return { pass: false, launch_error: browserErr.message };
  }
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.log(JSON.stringify({ ...report, pass: false, error: 'puppeteer_missing' }));
    process.exit(2);
  }

  let sessions = null;
  let packageSnap = null;
  let logSnap = { item: null };
  let familyId = null;
  const childIds = [];

  try {
    if (!BASE) {
      console.log(JSON.stringify({ ...report, pass: false, error: 'base_url_missing' }));
      process.exit(2);
    }
    sessions = await resolveQaBrowserSessions(BASE);
    report.qa_auth = sessions.meta;
    familyId = sessions.childRow.family_id;
    childIds.push(sessions.childRow.id);
    const sibling = await pickSiblingChild(sessions.parent.jar, sessions.parent.csrf, sessions.childRow.id);
    if (sibling) childIds.push(sibling.id);

    await grantCore.assertQaFamilyAllowed(db, familyId);
    packageSnap = await grantCore.readPackageSnapshot(db, familyId, childIds);
    const plan = grantCore.planGrantFromSnapshot(packageSnap);
    report.dry_run = { ...plan, dry_run: true };

    const accessBefore = await grantCore.readAccessFeatures(db, familyId);
    report.apply.access_before = accessBefore;

    await grantCore.applyTemporaryGrant(db, familyId);
    const accessAfter = await grantCore.readAccessFeatures(db, familyId);
    report.apply.access_after = accessAfter;
    report.apply.pass = accessAfter.transition_support === true && accessAfter.teacch_has === true;

    if (!report.apply.pass) {
      throw new Error('grant_read_back_failed');
    }

    const childPin = process.env.FOUNDER_CHILD_PIN || process.env.QA_CHILD_PIN;
    const childUser = process.env.FOUNDER_CHILD_USERNAME || sessions.childRow.username;
    if (!childPin || !childUser) {
      throw new Error('child_pin_required_for_post_grant_session');
    }
    const freshChild = await childSessionViaApi(childUser, childPin);
    if (!freshChild) {
      throw new Error('child_api_login_failed_after_grant');
    }
    sessions.child = freshChild;
    sessions.meta.child_auth = freshChild.via || 'api_login_refresh';

    logSnap = await snapshotLogItemTiming(
      sessions.parent.jar,
      sessions.parent.csrf,
      sessions.childRow.id,
    );

    const qaChild = sessions.childRow.id;
    const nnlPut = await apiFetch(sessions.parent.jar, sessions.parent.csrf, `/api/children/${qaChild}`, {
      method: 'PUT',
      body: { show_now_next: true, require_sequential_completion: true },
    });
    report.mobile_nnl_enable_status = nnlPut.status;

    report.parent = await runParentChecks(
      sessions.parent.jar,
      sessions.parent.csrf,
      sessions.childRow.id,
      sibling,
    );
    report.child = await runChildApiChecks(sessions.child.jar);
    const childMeRes = await apiFetch(sessions.child.jar, null, '/api/auth/me');
    report.mobile = await runBrowserChecks(
      puppeteer,
      sessions,
      sessions.childRow.id,
      logSnap,
      childMeRes.status === 200 ? childMeRes.json : null,
    );

    const parentPass = report.parent.access_transition_support
      && report.parent.write_status === 200
      && report.parent.write_persisted
      && report.parent.sibling_unchanged;
    const childPass = report.child.features_transition_support === true
      && report.child.access_status === 200
      && report.child.transition_support_route
      && report.child.daily_log_lead_minutes;
    const mobilePass = report.mobile.pass === true;

    report.pass = report.apply.pass && parentPass && childPass && mobilePass;
  } finally {
    if (packageSnap && familyId) {
      try {
        if (logSnap.items?.length) {
          for (const row of logSnap.items) {
            await setLogItemStartTimeDb(row.id, row.start_time, row.end_time);
          }
        } else if (logSnap.item?.id) {
          await setLogItemStartTimeDb(
            logSnap.item.id,
            logSnap.item.start_time,
            logSnap.item.end_time,
          );
        }
        await grantCore.restorePackageSnapshot(db, familyId, packageSnap);
        const reread = await grantCore.readPackageSnapshot(db, familyId, childIds);
        const access = await grantCore.readAccessFeatures(db, familyId);
        report.restore.pass = grantCore.snapshotChecksum(reread) === grantCore.snapshotChecksum(packageSnap);
        report.restore.read_back = {
          checksum_match: report.restore.pass,
          access,
        };
      } catch (e) {
        report.restore.pass = false;
        report.restore.error = e.message;
      }
    }
    if (sessions?.cleanup) await sessions.cleanup();
    try { await db.pool.end(); } catch { /* ignore */ }
  }

  console.log(JSON.stringify(redact(report), null, 2));
  process.exit(report.pass && report.restore.pass ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ...report, error: e.message, code: e.code || 'ERROR' }));
  process.exit(1);
});
