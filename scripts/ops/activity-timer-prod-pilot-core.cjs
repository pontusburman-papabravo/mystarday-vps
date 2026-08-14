'use strict';

const { getLocalDateStr } = require('../../src/lib/daily-log-generator');
const { createCookieJar, readJson } = require('./family-device-pilot-http.cjs');
const { createDisposableActivityTimerQaFamily } = require('./activity-timer-qa-fixture.cjs');
const {
  snapshotChildTimerSettings,
  restoreChildTimerSettings,
  deletePilotFamily,
} = require('./activity-timer-pilot-db.cjs');
const {
  assertActivityTimerPilotDisposableEmail,
  redactSecrets,
} = require('../../src/lib/activity-timer-pilot-guard');
const { makeDisposableEmail } = require('./activity-timer-pilot-guard-helpers.cjs');

async function apiFetch(baseUrl, path, { method = 'GET', jar, csrf, body, track5xx, track429 } = {}) {
  const headers = {};
  if (jar?.header()) headers.Cookie = jar.header();
  const csrfHeader = jar?.get('csrf_token') || csrf;
  if (csrfHeader) headers['X-CSRF-Token'] = csrfHeader;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  jar?.store(res);
  return readJson(res, track5xx, track429);
}

async function loginParent(baseUrl, email, password, track5xx, track429) {
  const jar = createCookieJar();
  const login = await apiFetch(baseUrl, '/api/auth/login', {
    method: 'POST',
    jar,
    body: { email, password },
    track5xx,
    track429,
  });
  if (login.status !== 200 || !login.body?.csrfToken) {
    throw new Error(`login_failed:${login.status}`);
  }
  return {
    jar,
    csrf: jar.get('csrf_token') || login.body.csrfToken,
  };
}

async function childDailyLog(baseUrl, childUsername, pin, dateStr, track5xx, track429) {
  const jar = createCookieJar();
  const login = await apiFetch(baseUrl, '/api/auth/child-login', {
    method: 'POST',
    jar,
    body: { username: childUsername, pin },
    track5xx,
    track429,
  });
  if (login.status !== 200) {
    throw new Error(`child_login_failed:${login.status}`);
  }
  return apiFetch(baseUrl, `/api/me/daily-log?date=${encodeURIComponent(dateStr)}`, {
    jar,
    track5xx,
    track429,
  });
}

async function seedTimedActivity(db, familyId, childId, dateStr) {
  const tpl = await db.query(
    `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order, duration_seconds, source)
     VALUES ($1, 'AT Pilot 2min', '⏱️', 1, 0, 120, 'user') RETURNING id`,
    [familyId]
  );
  await db.query('DELETE FROM daily_log WHERE child_id = $1 AND date = $2', [childId, dateStr]);
  const logRes = await db.query(
    'INSERT INTO daily_log (child_id, date) VALUES ($1, $2) RETURNING id',
    [childId, dateStr]
  );
  await db.query(
    `INSERT INTO daily_log_item
       (daily_log_id, activity_template_id, name, icon, star_value, sort_order, section)
     VALUES ($1, $2, 'AT Pilot 2min', '⏱️', 1, 0, 'morgon')`,
    [logRes.rows[0].id, tpl.rows[0].id]
  );
  return tpl.rows[0].id;
}

/**
 * Self-cleaning Activity Timer prod pilot (API-only, disposable family).
 *
 * @param {{ db, baseUrl, dryRun?: boolean }} opts
 */
async function runActivityTimerProdPilot(opts) {
  const report = {
    ok: false,
    scenarios: {},
    cleanup: { ok: false },
    fixtureCreationMethod: 'db_ops',
    publicSignupUsedForFixture: false,
    founderCredentialsUsed: false,
    readback: {},
  };

  if (opts.dryRun) {
    report.ok = true;
    report.dryRun = true;
    report.scenarios.DRY_RUN = 'PASS';
    report.cleanup = { ok: true, skipped: true };
    return report;
  }

  if (!opts.db) throw new Error('db_required');
  if (!opts.baseUrl) throw new Error('baseUrl_required');

  const track5xx = [];
  const track429 = [];
  const dateStr = getLocalDateStr(new Date(), 'Europe/Stockholm');
  let fam = null;
  let timerSnapshot = null;

  try {
    fam = await createDisposableActivityTimerQaFamily(opts.db, { childCount: 2 });
    assertActivityTimerPilotDisposableEmail(fam.email);
    timerSnapshot = await snapshotChildTimerSettings(opts.db, fam.familyId);

    const childA = fam.children[0];
    const childB = fam.children[1];
    await seedTimedActivity(opts.db, fam.familyId, childA.id, dateStr);
    await seedTimedActivity(opts.db, fam.familyId, childB.id, dateStr);

    const session = await loginParent(opts.baseUrl, fam.email, fam.password, track5xx, track429);

    // Default OFF readback
    const childrenRes = await apiFetch(opts.baseUrl, '/api/children', {
      jar: session.jar,
      csrf: session.csrf,
      track5xx,
      track429,
    });
    const children = Array.isArray(childrenRes.body) ? childrenRes.body : childrenRes.body?.children || [];
    const readbackOff =
      childrenRes.status === 200 &&
      children.length >= 2 &&
      children.every((c) => c.activity_timers_enabled !== true);
    report.scenarios.DEFAULT_OFF = readbackOff ? 'PASS' : 'FAIL';
    report.readback.defaultOff = readbackOff;

    // Master OFF → no v2
    const offLog = await childDailyLog(opts.baseUrl, childA.username, childA.pin, dateStr, track5xx, track429);
    report.scenarios.MASTER_OFF_NO_V2 =
      offLog.status === 200 &&
      offLog.body?.activity_timers_enabled === false &&
      offLog.body?.activity_timer_v2 === false
        ? 'PASS'
        : 'FAIL';

    // Opt-in master ON for child A only (never mass-enable)
    const enable = await apiFetch(opts.baseUrl, `/api/children/${childA.id}`, {
      method: 'PUT',
      jar: session.jar,
      csrf: session.csrf,
      body: { activity_timers_enabled: true },
      track5xx,
      track429,
    });
    report.scenarios.MASTER_ON_OPT_IN =
      enable.status === 200 && enable.body?.activity_timers_enabled === true ? 'PASS' : 'FAIL';

    const onLog = await childDailyLog(opts.baseUrl, childA.username, childA.pin, dateStr, track5xx, track429);
    const timedItem = (onLog.body?.items || []).find((i) => i.name === 'AT Pilot 2min');
    report.scenarios.MASTER_ON_V2 =
      onLog.status === 200 &&
      onLog.body?.activity_timers_enabled === true &&
      onLog.body?.activity_timer_v2 === true &&
      timedItem?.duration_seconds === 120
        ? 'PASS'
        : 'FAIL';

    const siblingLog = await childDailyLog(opts.baseUrl, childB.username, childB.pin, dateStr, track5xx, track429);
    report.scenarios.SIBLING_ISOLATION =
      siblingLog.status === 200 &&
      siblingLog.body?.activity_timers_enabled === false &&
      siblingLog.body?.activity_timer_v2 === false
        ? 'PASS'
        : 'FAIL';

    report.scenarios.NO_UNEXPECTED_5XX = track5xx.length === 0 ? 'PASS' : 'FAIL';
    report.scenarios.NO_UNEXPECTED_429 = track429.length === 0 ? 'PASS' : 'FAIL';

    const keys = Object.keys(report.scenarios).filter((k) => k !== 'DRY_RUN');
    report.ok = keys.every((k) => report.scenarios[k] === 'PASS');
  } finally {
    if (fam && opts.db) {
      try {
        if (timerSnapshot) {
          await restoreChildTimerSettings(opts.db, fam.familyId, fam.email, timerSnapshot);
        }
        await deletePilotFamily(opts.db, fam.familyId, fam.email);
        const exists = await opts.db.query('SELECT 1 FROM family WHERE id = $1', [fam.familyId]);
        report.cleanup = { ok: exists.rows.length === 0 };
        if (!report.cleanup.ok) {
          throw new Error('at_pilot_cleanup_family_still_exists');
        }
      } catch (err) {
        report.cleanup = { ok: false, error: redactSecrets(err.message) };
        report.ok = false;
        throw err;
      }
    }
  }

  return report;
}

module.exports = {
  makeDisposableEmail,
  runActivityTimerProdPilot,
  redactSecrets,
};
