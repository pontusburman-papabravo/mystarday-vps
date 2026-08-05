#!/usr/bin/env node
/**
 * Activity Timer — live acceptance (founder/Journey QA family).
 * Run on VPS with .env loaded (JOURNEY_QA_PARENT_*); no secrets in stdout.
 *
 *   set -a && source .env && set +a && node scripts/activity-timer-prod-acceptance-gate.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const {
  resolveQaBrowserSessions,
  jarToCookieHeader,
  puppeteerCookies,
} = require(path.join(ROOT, 'scripts/ops/vps-allowlisted-qa-sessions.cjs'));
const { getLocalDateStr } = require(path.join(ROOT, 'src/lib/daily-log-generator'));

const baseFromEnv = process.env.JOURNEY_QA_BASE_URL || process.env.SMOKE_BASE_URL;
let BASE = baseFromEnv ? String(baseFromEnv).replace(/\/$/, '') : '';
const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'android-412x915', width: 412, height: 915 },
];
const QA_ACTIVITY_NAME_RE = /QA Timer.*30\s*s/i;
const SMOKE_DURATION = 25;

const report = {
  step: 'activity-timer-prod-acceptance-gate',
  base: BASE,
  scenarios: {},
  extra_stod: {},
  restore: { pass: false },
  pass: false,
};

function redact(obj) {
  return JSON.parse(JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return '[id]';
    return v;
  }));
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
  const setCookie = res.headers.getSetCookie?.() || [];
  return { status: res.status, json, setCookie };
}

function mergeJar(jar, setCookie) {
  for (const h of setCookie) {
    const pair = h.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
}

async function snapshotState(parentJar, parentCsrf, qaChildId, siblingChild) {
  const childrenRes = await apiFetch(parentJar, parentCsrf, '/api/children');
  const actsRes = await apiFetch(parentJar, parentCsrf, '/api/activities');
  const activities = Array.isArray(actsRes.json) ? actsRes.json : (actsRes.json?.activities || []);
  const qaAct = activities.find((a) => /QA Timer/i.test(a.name) && /30/.test(a.name))
    || activities.find((a) => /QA Timer/i.test(a.name));
  const children = Array.isArray(childrenRes.json) ? childrenRes.json : [];
  const qaChild = children.find((c) => c.id === qaChildId);
  const snap = {
    qaChildId,
    activity_timers_enabled: qaChild?.activity_timers_enabled,
    sibling_timers_enabled: siblingChild?.activity_timers_enabled,
    activity_id: qaAct?.id,
    duration_seconds: qaAct?.duration_seconds ?? null,
    activity_name: qaAct?.name,
    has_qa_activity: !!qaAct,
    qa_activity: qaAct || null,
  };
  return snap;
}

async function restoreState(parentJar, parentCsrf, snap) {
  if (snap.activity_id != null && snap.duration_seconds !== undefined) {
    await apiFetch(parentJar, parentCsrf, `/api/activities/${snap.activity_id}`, {
      method: 'PUT',
      body: { duration_seconds: snap.duration_seconds },
    });
  }
  if (snap.qaChildId != null && snap.activity_timers_enabled !== undefined) {
    await apiFetch(parentJar, parentCsrf, `/api/children/${snap.qaChildId}`, {
      method: 'PUT',
      body: { activity_timers_enabled: snap.activity_timers_enabled },
    });
  }
}

async function childDailyLog(childJar) {
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  const res = await fetch(`${BASE}/api/me/daily-log?date=${dateStr}`, {
    headers: { Cookie: jarToCookieHeader(childJar) },
  });
  return res.ok ? res.json() : null;
}

async function openActivityEditor(page, activity) {
  await page.evaluate((act) => {
    if (typeof openActivityModal === 'function') openActivityModal(act);
    else if (typeof openActivityModalById === 'function') openActivityModalById(act.id);
  }, activity);
  await page.waitForSelector('#activityModal:not(.hidden)', { timeout: 25000 });
  await new Promise((r) => setTimeout(r, 1200));
}

async function waitChildTimerV2(childJar, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const log = await childDailyLog(childJar);
    if (log?.activity_timer_v2 === true) return log;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function runTimerScenarios(puppeteer, sessions, snap) {
  const { parent, child, childRow } = sessions;
  const parentJar = { ...parent.jar };
  const childJar = { ...child.jar };
  const results = {};

  if (!snap.qa_activity || !snap.activity_id) {
    results.fatal = 'missing_qa_activity';
    return results;
  }

  await apiFetch(parentJar, parent.csrf, `/api/children/${childRow.id}`, {
    method: 'PUT',
    body: { activity_timers_enabled: false },
  });

  if (snap.activity_id) {
    await apiFetch(parentJar, parent.csrf, `/api/activities/${snap.activity_id}`, {
      method: 'PUT',
      body: { duration_seconds: SMOKE_DURATION },
    });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const vp = VIEWPORTS[0];
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const consoleErrors = [];
  const http5xx = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/')) http5xx.push(res.status());
  });

  for (const c of puppeteerCookies(parentJar, BASE)) await page.setCookie(c);
  if (parent.csrf) {
    await page.evaluateOnNewDocument((csrf) => {
      try {
        localStorage.setItem('stjarndag_csrf', csrf);
      } catch { /* ignore */ }
    }, parent.csrf);
  }

  let enableWrites = 0;
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().includes('/api/children/') && req.postData()?.includes('activity_timers_enabled')) {
      enableWrites += 1;
    }
  });

  if (snap.activity_id) {
    await page.goto(`${BASE}/library`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof openActivityModal === 'function', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await openActivityEditor(page, snap.qa_activity);
    } catch {
      results.scenarioA = false;
      results.scenarioB = false;
      results.consoleErrors = consoleErrors.length;
      results.http5xx = http5xx.length;
      await browser.close();
      return results;
    }
    const bridgeA = await page.evaluate(() => {
      const el = document.getElementById('activityTimerMasterBridge');
      return {
        visible: el && !el.classList.contains('hidden'),
        hasCta: !!(el && el.querySelector('.activity-timer-bridge-enable')),
      };
    });
    results.scenarioA = !!(bridgeA.visible && bridgeA.hasCta && enableWrites === 0);

    const enableResult = await page.evaluate(async (id) => {
      const btn = document.querySelector(`.activity-timer-bridge-enable[data-child-id="${id}"]`);
      if (!btn || !window.LibraryActivityTimerBridge) return { ok: false, reason: 'no_bridge_btn' };
      await LibraryActivityTimerBridge.enableForChild(id, btn);
      const res = await globalThis.apiFetch('/api/children/' + encodeURIComponent(id));
      if (!res.ok) return { ok: false, reason: 'readback_' + res.status };
      const row = await res.json();
      return { ok: row.activity_timers_enabled === true };
    }, childRow.id);
    await new Promise((r) => setTimeout(r, 1500));
    const bridgeB = await page.evaluate((id) => {
      const el = document.getElementById('activityTimerMasterBridge');
      const qaCta = el && el.querySelector(`.activity-timer-bridge-enable[data-child-id="${id}"]`);
      return { qaRowHasCta: !!qaCta };
    }, childRow.id);
    let childLogB = await childDailyLog(childJar);
    for (let i = 0; i < 5 && childLogB?.activity_timer_v2 !== true; i++) {
      await new Promise((r) => setTimeout(r, 400));
      childLogB = await childDailyLog(childJar);
    }
    const childrenAfter = await apiFetch(parentJar, parent.csrf, '/api/children');
    const qaAfter = (Array.isArray(childrenAfter.json) ? childrenAfter.json : [])
      .find((c) => c.id === childRow.id);
    results.scenarioB = enableResult?.ok === true
      && !bridgeB.qaRowHasCta
      && qaAfter?.activity_timers_enabled === true
      && childLogB?.activity_timer_v2 === true;
  }

  const timerReadyLog = await waitChildTimerV2(childJar);
  if (!timerReadyLog) {
    results.scenarioB = false;
    results.scenarioC_start = false;
    results.pauseRefresh = false;
    results.scenarioD = false;
    results.scenarioE = false;
    results.android_render = false;
    await browser.close();
    return results;
  }

  const childBrowser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const childPage = await childBrowser.newPage();
  await childPage.setViewport({
    width: vp.width,
    height: vp.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  for (const c of puppeteerCookies(childJar, BASE)) await childPage.setCookie(c);
  const knownChild = JSON.stringify({
    username: childRow.username,
    name: childRow.name,
    emoji: '⭐',
    has_avatar: false,
    avatar_src: null,
    familyId: childRow.family_id,
  });
  await childPage.evaluateOnNewDocument((known) => {
    try {
      localStorage.setItem('stjarndag_known_children', known);
      localStorage.setItem('substepIntroSeen', '1');
    } catch (_) { /* ignore */ }
  }, `[${knownChild}]`);
  await childPage.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let childUiReady = false;
  const childUiDeadline = Date.now() + 50000;
  while (Date.now() < childUiDeadline) {
    const probe = await childPage.evaluate(() => ({
      me: typeof me !== 'undefined' && !!me.id,
      starts: document.querySelectorAll('.activity-timer-wrap .activity-timer-start').length,
    }));
    if (probe.me && probe.starts > 0) {
      childUiReady = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!childUiReady) {
    results.scenarioC_start = false;
    results.pauseRefresh = false;
    results.scenarioD = false;
    results.scenarioE = false;
    results.android_render = false;
    results.consoleErrors = consoleErrors.length;
    results.http5xx = http5xx.length;
    await childBrowser.close();
    await browser.close();
    return results;
  }
  await new Promise((r) => setTimeout(r, 1500));

  const timerItem = await childPage.evaluate(() => {
    const wraps = [...document.querySelectorAll('.activity-timer-wrap')];
    const withStart = wraps.find((w) => w.querySelector('.activity-timer-start'));
    const plain = wraps.find((w) => !w.querySelector('.activity-timer-start') && !w.dataset.duration);
    return {
      itemId: withStart?.dataset?.itemId || null,
      hasStart: !!withStart,
      plainCount: plain ? 1 : 0,
    };
  });

  results.scenarioC_start = !!timerItem.hasStart;
  if (timerItem.itemId) {
    const startBtn = await childPage.$(`.activity-timer-wrap[data-item-id="${timerItem.itemId}"] .activity-timer-start`);
    const box = startBtn ? await startBtn.boundingBox() : null;
    results.touch44 = !!(box && box.height >= 44 && box.width >= 44);
    if (!startBtn) {
      results.scenarioC_start = false;
      results.pauseRefresh = false;
    } else {
      results.scenarioC_start = true;
      await startBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
      const pausedOk = await childPage.evaluate((id) => {
        if (typeof me === 'undefined' || !me?.id) return false;
        if (typeof ActivityTimerSession === 'undefined') return false;
        const wrap = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
        const duration = parseInt(wrap?.dataset?.duration || '25', 10);
        ActivityTimerSession.pauseSession(me.id, currentDate, id, duration);
        if (typeof ChildActivityTimer !== 'undefined' && ChildActivityTimer.tickAll) ChildActivityTimer.tickAll();
        return wrap?.dataset?.status === 'paused';
      }, timerItem.itemId);
      await new Promise((r) => setTimeout(r, 800));
      await childPage.reload({ waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 2000));
      const paused = await childPage.evaluate((id) => {
        const w = document.querySelector(`.activity-timer-wrap[data-item-id="${id}"]`);
        return w && w.dataset.status === 'paused';
      }, timerItem.itemId);
      results.pauseRefresh = !!(pausedOk && paused);
    }
  }

  await apiFetch(parentJar, parent.csrf, `/api/children/${childRow.id}`, {
    method: 'PUT',
    body: { activity_timers_enabled: false },
  });
  const childLogD = await childDailyLog(childJar);
  results.scenarioD = childLogD?.activity_timer_v2 !== true;

  await page.bringToFront();
  await openActivityEditor(page, snap.qa_activity);
  await page.evaluate(async (id) => {
    const btn = document.querySelector(`.activity-timer-bridge-enable[data-child-id="${id}"]`);
    if (window.LibraryActivityTimerBridge && btn) {
      await LibraryActivityTimerBridge.enableForChild(id, btn);
    }
  }, childRow.id);
  await new Promise((r) => setTimeout(r, 2000));
  const childLogE = await childDailyLog(childJar);
  await childPage.reload({ waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2500));
  const startAgain = await childPage.evaluate(() => {
    const w = document.querySelector('.activity-timer-wrap .activity-timer-start');
    return !!w;
  });
  results.scenarioE = childLogE?.activity_timer_v2 === true && startAgain;

  const vp2 = VIEWPORTS[1];
  const page2 = await childBrowser.newPage();
  await page2.setViewport({
    width: vp2.width,
    height: vp2.height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  for (const c of puppeteerCookies(childJar, BASE)) await page2.setCookie(c);
  await page2.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page2.waitForFunction(
    () => document.querySelector('.activity-timer-wrap'),
    { timeout: 45000 },
  );
  await new Promise((r) => setTimeout(r, 1500));
  results.android_render = !!(await page2.$('.activity-timer-wrap'));

  await childBrowser.close();
  await browser.close();
  results.consoleErrors = consoleErrors.length;
  results.http5xx = http5xx.length;
  return results;
}

async function verifyExtraStod(parentJar, parentCsrf, childRow) {
  const access = await apiFetch(parentJar, parentCsrf, '/api/subscription/access');
  const hasFeature = access.json?.features?.transition_support === true;
  if (!hasFeature) {
    return { status: 'DEFERRED', reason: 'no_eligible_QA_grant' };
  }
  const children = await apiFetch(parentJar, parentCsrf, '/api/children');
  const list = Array.isArray(children.json) ? children.json : [];
  const qa = list.find((c) => c.id === childRow.id);
  const origLead = qa?.transition_lead_minutes;
  await apiFetch(parentJar, parentCsrf, `/api/children/${childRow.id}`, {
    method: 'PUT',
    body: { transition_lead_minutes: [5, 1] },
  });
  const reread = await apiFetch(parentJar, parentCsrf, '/api/children');
  const qa2 = (Array.isArray(reread.json) ? reread.json : []).find((c) => c.id === childRow.id);
  const writeOk = Array.isArray(qa2?.transition_lead_minutes) && qa2.transition_lead_minutes.includes(5);
  if (origLead !== undefined) {
    await apiFetch(parentJar, parentCsrf, `/api/children/${childRow.id}`, {
      method: 'PUT',
      body: { transition_lead_minutes: origLead },
    });
  }
  return { status: writeOk ? 'PASS' : 'FAIL', parent_write: writeOk };
}

async function main() {
  const puppeteer = await import('puppeteer').then((m) => m.default).catch(() => null);
  if (!puppeteer) {
    console.log(JSON.stringify({ ...report, pass: false, error: 'puppeteer_missing' }));
    process.exit(2);
  }

  let sessions = null;
  let snap = null;
  let sessionFile = process.env.QA_SESSION_FILE;
  try {
    if (sessionFile) {
      const raw = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      if (raw.base) BASE = String(raw.base).replace(/\/$/, '');
      sessions = {
        parent: { jar: raw.parent.jar, csrf: raw.parent.csrf },
        child: { jar: raw.child.jar, csrf: raw.child.csrf },
        childRow: {
          id: raw.qaChildId,
          username: raw.childUsername,
          family_id: raw.familyId,
          name: 'QA',
        },
        cleanup: async () => {},
        meta: { ...(raw.meta || {}), session_file: true },
      };
      report.qa_auth = sessions.meta;
    } else {
      if (!BASE) {
        console.log(JSON.stringify({ step: 'activity-timer-prod-acceptance-gate', pass: false, error: 'base_url_missing' }));
        process.exit(2);
      }
      sessions = await resolveQaBrowserSessions(BASE);
      report.qa_auth = sessions.meta;
    }
    report.base = BASE;

    const childrenRes = await apiFetch(sessions.parent.jar, sessions.parent.csrf, '/api/children');
    const children = Array.isArray(childrenRes.json) ? childrenRes.json : [];
    const sibling = children.find((c) => c.id !== sessions.childRow.id);
    snap = await snapshotState(sessions.parent.jar, sessions.parent.csrf, sessions.childRow.id, sibling);

    let timerResults = {};
    try {
      timerResults = await runTimerScenarios(puppeteer, sessions, snap);
    } catch (e) {
      timerResults = { ...timerResults, runner_error: e.message, runner_stack: e.stack?.split('\n').slice(0, 4).join(' | ') };
    }
    report.scenarios = timerResults;
    report.extra_stod = await verifyExtraStod(sessions.parent.jar, sessions.parent.csrf, sessions.childRow);

    const corePass = !timerResults.fatal
      && timerResults.scenarioA && timerResults.scenarioB && timerResults.scenarioC_start
      && timerResults.scenarioD && timerResults.scenarioE && timerResults.pauseRefresh
      && timerResults.consoleErrors === 0 && timerResults.http5xx === 0;
    report.pass = corePass;
  } finally {
    if (snap && sessions) {
      try {
        await restoreState(sessions.parent.jar, sessions.parent.csrf, snap);
        const verify = await snapshotState(sessions.parent.jar, sessions.parent.csrf, sessions.childRow.id);
        report.restore.pass = verify.activity_timers_enabled === snap.activity_timers_enabled
          && verify.duration_seconds === snap.duration_seconds;
      } catch {
        report.restore.pass = false;
      }
    }
    if (sessions?.cleanup) await sessions.cleanup();
    if (sessionFile) {
      try { fs.unlinkSync(sessionFile); } catch { /* ignore */ }
    }
  }

  console.log(JSON.stringify(redact(report), null, 2));
  process.exit(report.pass && report.restore.pass ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ ...report, error: e.message, code: e.code || 'ERROR' }));
  process.exit(1);
});
