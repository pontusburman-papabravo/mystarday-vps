#!/usr/bin/env node
/**
 * Activation First Success v1 — browser golden path (sv-SE + en-GB).
 *
 * Fixture (API): register, flag ON, child, helg schedule, child login, daily log.
 * Browser: child/today (completion UI or API fallback) + parent dashboard smoke.
 * Server: milestones, next-action contract, first_success derivation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLAG = 'activation_first_success_v1';

function log(step, detail) {
  console.log(JSON.stringify({ step, detail, t: Date.now() }));
}

async function ensurePuppeteer() {
  return (await import('puppeteer')).default;
}

async function startApp() {
  const { createApp } = require(path.join(ROOT, 'app.js'));
  const { listenApp } = require(path.join(ROOT, 'test/helpers/http.js'));
  return listenApp(createApp);
}

async function enableFlags(db) {
  for (const key of [
    FLAG,
    'family_journey_ingest_enabled',
    'family_journey_evaluator_enabled',
    'family_journey_context_api',
  ]) {
    await db.query(
      `INSERT INTO feature_flag (key, enabled, description) VALUES ($1, true, 'harness')
       ON CONFLICT (key) DO UPDATE SET enabled = true`,
      [key]
    );
  }
}

async function disableFlags(db) {
  await db.query(`UPDATE feature_flag SET enabled = false WHERE key = $1`, [FLAG]);
}

async function fetchJson(baseUrl, apiPath, { cookies, csrf, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) {
    headers.Cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}

async function runLocale(baseUrl, db, puppeteer, locale) {
  const {
    registerAndLogin,
    onboardingChildRaw,
    onboardingScheduleRaw,
    childLoginRaw,
    getDailyLog,
    completeItemRaw,
    seedSchoolWeekdaySchedules,
    activationRow,
  } = require(path.join(ROOT, 'test/helpers/golden-path-fas6.js'));
  const familyMilestones = require(path.join(ROOT, 'db/family-milestones'));
  const { ingestMilestone } = require(path.join(ROOT, 'src/lib/journey/ingest'));

  const result = {
    locale,
    fixture: 'api_register_child_schedule',
    browser: {},
    errors: [],
  };

  await seedSchoolWeekdaySchedules(db);
  const session = await registerAndLogin(baseUrl, {
    name: locale === 'en-GB' ? 'Parent GB' : 'Förälder SE',
  });

  if (locale === 'en-GB') {
    await fetchJson(baseUrl, '/api/family', {
      cookies: session.cookies,
      csrf: session.csrfToken,
      method: 'PUT',
      body: { preferred_locale: 'en-GB' },
    });
  }

  const childRes = await onboardingChildRaw(baseUrl, session, {
    name: locale === 'en-GB' ? 'Alex' : 'Alma',
    emoji: '⭐',
    pin: '4821',
    birthday: '2016-05-05',
  });
  if (childRes.status !== 201) {
    result.errors.push(`child ${childRes.status}`);
    return result;
  }
  const childId = childRes.body.id;
  const username = childRes.body.username;
  const pin = childRes.body.pin;

  const sched = await onboardingScheduleRaw(baseUrl, session, {
    child_id: childId,
    template_group: 'helg',
  });
  if (sched.status !== 200 && sched.status !== 201) {
    result.errors.push(`schedule ${sched.status}`);
    return result;
  }

  const naAfterSchedule = await fetchJson(baseUrl, '/api/family/next-action', { cookies: session.cookies });
  result.next_action_after_schedule = naAfterSchedule.json?.next_action;
  if (!naAfterSchedule.json?.show_primary_coach) {
    result.errors.push('next_action_coach_not_primary_after_schedule');
  }

  const cl = await childLoginRaw(baseUrl, { username, pin });
  if (cl.status !== 200) {
    result.errors.push(`child_login ${cl.status}`);
    return result;
  }

  const log = await getDailyLog(baseUrl, cl.cookies, cl.csrfToken);
  const items = log.body?.items || [];
  if (!items.length) {
    result.errors.push('no_daily_log_items');
    return result;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const parentPage = await browser.newPage();
  const childPage = await browser.newPage();
  await parentPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await childPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const consoleErrors = [];
  for (const p of [parentPage, childPage]) {
    p.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  }

  try {
    await parentPage.setCookie(
      ...Object.entries(session.cookies).map(([name, value]) => ({
        name, value: String(value), url: baseUrl,
      }))
    );
    await parentPage.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await parentPage.evaluate(() => {
      if (window.ActivationFirstSuccessHub) return ActivationFirstSuccessHub.load({ force: true });
    });
    const coachDom = await parentPage.evaluate(() => {
      const fs = document.getElementById('activationFirstSuccessCoachMount');
      const visible = (el) => el && !el.classList.contains('hidden') && el.innerHTML.trim().length > 40;
      const eng = document.getElementById('engineCoachMount');
      const jrn = document.getElementById('journeyCoachMount');
      return {
        fsCoach: visible(fs),
        primaryCount: [fs, eng, jrn].filter(visible).length,
        path: location.pathname,
      };
    });
    result.browser.parent_path = coachDom.path;
    result.browser.coach_dom = coachDom;
    if (coachDom.primaryCount > 1) result.errors.push('multiple_primary_coaches');

    await childPage.setCookie(
      ...Object.entries(cl.cookies).map(([name, value]) => ({
        name, value: String(value), url: baseUrl,
      }))
    );
    await childPage.evaluateOnNewDocument(() => {
      try { localStorage.setItem('stjarndag_device_mode', 'child'); } catch (_) { /* ignore */ }
    });
    await childPage.goto(`${baseUrl}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    result.browser.child_path = childPage.url();

    const completeBtn = await childPage.$(
      '.activity-card button, .photo-activity-card button, [data-action="complete"], .complete-btn, button[data-item-id]'
    );
    if (completeBtn) {
      await completeBtn.tap().catch(() => completeBtn.click());
      await new Promise((r) => setTimeout(r, 2000));
      result.browser.completion = 'browser_ui';
    } else {
      result.browser.completion = 'api_only';
    }

    const doneApi = await completeItemRaw(baseUrl, cl.cookies, cl.csrfToken, items[0].id);
    result.browser.complete_status = doneApi.status;
    if (doneApi.status === 200 && doneApi.body?.meta_milestones?.first_star_earned) {
      result.browser.first_star = true;
    } else if (doneApi.status === 409) {
      result.browser.first_star = true;
    } else if (doneApi.status !== 200) {
      result.errors.push(`complete ${doneApi.status}`);
    }

    const familyRow = await db.query('SELECT family_id FROM parent WHERE email = $1', [session.email]);
    const familyId = familyRow.rows[0].family_id;
    const act = await activationRow(db, familyId);
    result.server = {
      first_completion_at: Boolean(act?.first_completion_at),
      child_access_completed_at: Boolean(act?.child_access_completed_at),
    };
    if (!act?.first_completion_at) result.errors.push('missing_first_completion_at');

    await ingestMilestone({ familyId, milestone: 'child_first_completion', childId, source: 'system' });
    await ingestMilestone({ familyId, milestone: 'parent_saw_completion', source: 'system' });
    const map = await familyMilestones.getMilestoneMap(familyId);
    result.server.first_success_milestone = Boolean(map.first_success);

    const naAfter = await fetchJson(baseUrl, '/api/family/next-action', { cookies: session.cookies });
    result.next_action_after_first_success = naAfter.json?.next_action;
    result.show_coach_after = naAfter.json?.show_primary_coach;
    if (naAfter.json?.show_primary_coach !== false) {
      result.errors.push('coach_still_visible_after_first_success');
    }
    if (!map.first_success) result.errors.push('missing_first_success_milestone');

    result.browser.console_errors = consoleErrors.filter((m) => !/favicon/i.test(m));
    if (result.browser.console_errors.length) {
      result.errors.push('console_errors');
    }
  } finally {
    await browser.close();
  }

  return result;
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  process.env.EMAIL_ENABLED = 'false';
  process.env.RATE_LIMIT_ENABLED = 'false';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }

  const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/cache-version.json'), 'utf8'));
  const puppeteer = await ensurePuppeteer();
  const http = await startApp();
  const db = require(path.join(ROOT, 'src/lib/db'));

  const report = { cache: cache.cacheName, locales: {}, errors: [] };

  try {
    await enableFlags(db);
    for (const locale of ['sv-SE', 'en-GB']) {
      log('locale_start', { locale });
      report.locales[locale] = await runLocale(http.baseUrl, db, puppeteer, locale);
      if (report.locales[locale].errors?.length) {
        report.errors.push(...report.locales[locale].errors.map((e) => `${locale}:${e}`));
      }
    }
  } finally {
    await disableFlags(db);
    await http.close();
  }

  const outPath = path.join(ROOT, 'docs/ACTIVATION-FIRST-SUCCESS-HARNESS-LAST.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  log('done', { ok: report.errors.length === 0, outPath });
  process.exit(report.errors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
