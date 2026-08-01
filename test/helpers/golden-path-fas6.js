'use strict';

const {
  cookieHeader,
  getSetCookieHeaders,
  mergeCookies,
} = require('./http.js');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.EMAIL_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail(prefix = 'fas6') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

const DEFAULT_PASSWORD = 'integration-test-pass-1';

async function cookiesFromResponse(prev, res) {
  let jar = { ...prev };
  for (const header of getSetCookieHeaders(res)) {
    jar = mergeCookies(jar, [header]);
  }
  return jar;
}

async function registerRaw(baseUrl, { email, password = DEFAULT_PASSWORD, name = 'Fas6 Parent' } = {}) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const text = await res.text();
  return { res, status: res.status, text, body: text ? JSON.parse(text) : null };
}

async function loginRaw(baseUrl, { email, password = DEFAULT_PASSWORD } = {}) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  let cookies = {};
  cookies = await cookiesFromResponse(cookies, res);
  return { res, status: res.status, text, body, cookies, csrfToken: body?.csrfToken };
}

async function registerAndLogin(baseUrl, opts = {}) {
  const email = opts.email || uniqueEmail();
  const reg = await registerRaw(baseUrl, { email, ...opts });
  if (reg.status !== 201) {
    throw new Error(`register failed ${reg.status}: ${reg.text}`);
  }
  const login = await loginRaw(baseUrl, { email, password: opts.password || DEFAULT_PASSWORD });
  if (login.status !== 200) {
    throw new Error(`login failed ${login.status}: ${login.text}`);
  }
  return {
    email,
    password: opts.password || DEFAULT_PASSWORD,
    cookies: login.cookies,
    csrfToken: login.csrfToken,
  };
}

function parentHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
  };
}

async function onboardingChildRaw(baseUrl, session, payload) {
  const res = await fetch(`${baseUrl}/api/onboarding/child`, {
    method: 'POST',
    headers: parentHeaders(session),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { res, status: res.status, text, body: text ? JSON.parse(text) : null };
}

async function onboardingScheduleRaw(baseUrl, session, { child_id, template_group }) {
  const res = await fetch(`${baseUrl}/api/onboarding/schedule`, {
    method: 'POST',
    headers: parentHeaders(session),
    body: JSON.stringify({ child_id, template_group }),
  });
  const text = await res.text();
  return { res, status: res.status, text, body: text ? JSON.parse(text) : null };
}

async function childLoginRaw(baseUrl, { username, pin }, extraHeaders = {}) {
  const res = await fetch(`${baseUrl}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ username, pin }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  let cookies = {};
  cookies = await cookiesFromResponse(cookies, res);
  return { res, status: res.status, text, body, cookies, csrfToken: body?.csrfToken };
}

async function getDailyLog(baseUrl, childCookies, csrfToken, dateStr) {
  const url = dateStr
    ? `${baseUrl}/api/me/daily-log?date=${encodeURIComponent(dateStr)}`
    : `${baseUrl}/api/me/daily-log`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookieHeader(childCookies),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

async function completeItemRaw(baseUrl, childCookies, csrfToken, itemId) {
  const res = await fetch(`${baseUrl}/api/me/daily-log-items/${itemId}/complete`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(childCookies),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

async function seedMinimalDefaultSchedule(db, scheduleName, itemName = 'Vakna') {
  let defaultSched = await db.query('SELECT id FROM default_schedule WHERE name = $1', [scheduleName]);
  if (defaultSched.rows.length === 0) {
    const ins = await db.query(
      `INSERT INTO default_schedule (name, sort_order) VALUES ($1, 0) RETURNING id`,
      [scheduleName]
    );
    await db.query(
      `INSERT INTO default_schedule_item
         (default_schedule_id, name, icon, section, star_value, sort_order)
       VALUES ($1, $2, '🛏️', 'morgon', 1, 0)`,
      [ins.rows[0].id, itemName]
    );
    return ins.rows[0].id;
  }
  const items = await db.query(
    'SELECT id FROM default_schedule_item WHERE default_schedule_id = $1 LIMIT 1',
    [defaultSched.rows[0].id]
  );
  if (items.rows.length === 0) {
    await db.query(
      `INSERT INTO default_schedule_item
         (default_schedule_id, name, icon, section, star_value, sort_order)
       VALUES ($1, $2, '🛏️', 'morgon', 1, 0)`,
      [defaultSched.rows[0].id, itemName]
    );
  }
  return defaultSched.rows[0].id;
}

async function seedSchoolWeekdaySchedules(db) {
  await seedMinimalDefaultSchedule(db, 'Förskola vardag', 'Vakna');
  await seedMinimalDefaultSchedule(db, 'Skola vardag', 'Vakna skola');
  await seedMinimalDefaultSchedule(db, 'Helg', 'Helg vakna');
}

async function familyIdByEmail(db, email) {
  const row = await db.query(
    'SELECT family_id FROM parent WHERE LOWER(email) = $1',
    [email.toLowerCase().trim()]
  );
  return row.rows[0]?.family_id;
}

async function activationRow(db, familyId) {
  const row = await db.query(
    `SELECT child_created_at, schema_saved_at, child_access_completed_at, first_completion_at
     FROM family_activation_state WHERE family_id = $1`,
    [familyId]
  );
  return row.rows[0] || null;
}

async function countFamiliesForEmail(db, email) {
  const row = await db.query(
    `SELECT COUNT(DISTINCT p.family_id)::int AS n
     FROM parent p WHERE LOWER(p.email) = $1`,
    [email.toLowerCase().trim()]
  );
  return row.rows[0]?.n ?? 0;
}

async function countParentsForEmail(db, email) {
  const row = await db.query(
    `SELECT COUNT(*)::int AS n FROM parent WHERE LOWER(email) = $1`,
    [email.toLowerCase().trim()]
  );
  return row.rows[0]?.n ?? 0;
}

async function countChildrenInFamily(db, familyId) {
  const row = await db.query(
    'SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1',
    [familyId]
  );
  return row.rows[0]?.n ?? 0;
}

async function countWeeklySchedules(db, childId) {
  const row = await db.query(
    'SELECT COUNT(*)::int AS n FROM weekly_schedule WHERE child_id = $1',
    [childId]
  );
  return row.rows[0]?.n ?? 0;
}

async function sumCompletedStarsForChild(db, childId) {
  const row = await db.query(
    `SELECT COALESCE(SUM(dli.star_value), 0)::int AS stars
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  return row.rows[0]?.stars ?? 0;
}

async function countAnalyticsEvent(db, familyId, eventType) {
  const row = await db.query(
    `SELECT COUNT(*)::int AS n FROM analytics_events
     WHERE family_id = $1 AND event_type = $2`,
    [familyId, eventType]
  );
  return row.rows[0]?.n ?? 0;
}

function stockholmDow() {
  const short = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Stockholm', weekday: 'short' });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short];
}

function buildTimingReport({
  steps,
  apiCalls,
  retryCount = 0,
  syntheticFamilyId,
  syntheticChildId,
  totalMs,
  note,
}) {
  return {
    label: 'Server/integration timing — not user-perceived UI timing',
    steps,
    total_http_calls: apiCalls.length,
    retry_count: retryCount,
    synthetic_family_id: syntheticFamilyId || null,
    synthetic_child_id: syntheticChildId || null,
    total_server_chain_ms: totalMs,
    api_sequence: apiCalls,
    note: note || 'FAS6 golden path integration measurement',
  };
}

async function countChildFirstCompletionMilestones(db, familyId, childId) {
  const row = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_milestones
     WHERE family_id = $1 AND milestone = 'child_first_completion'
       AND child_id = $2`,
    [familyId, childId]
  );
  return row.rows[0]?.n ?? 0;
}

async function countStarterItemsForChildDay(db, childId, dateStr) {
  const row = await db.query(
    `SELECT COUNT(*)::int AS n FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dl.date = $2::date AND dli.starter_kind = 'first_star'`,
    [childId, dateStr]
  );
  return row.rows[0]?.n ?? 0;
}

async function enableJourneyIngest(db) {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('family_journey_ingest_enabled', true, 'fas6 test')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );
}

async function waitForChildFirstCompletionMilestone(db, familyId, childId, maxMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const n = await countChildFirstCompletionMilestones(db, familyId, childId);
    if (n >= 1) return n;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return await countChildFirstCompletionMilestones(db, familyId, childId);
}

module.exports = {
  DEFAULT_PASSWORD,
  uniqueEmail,
  registerRaw,
  loginRaw,
  registerAndLogin,
  parentHeaders,
  onboardingChildRaw,
  onboardingScheduleRaw,
  childLoginRaw,
  getDailyLog,
  completeItemRaw,
  seedMinimalDefaultSchedule,
  seedSchoolWeekdaySchedules,
  familyIdByEmail,
  activationRow,
  countFamiliesForEmail,
  countParentsForEmail,
  countChildrenInFamily,
  countWeeklySchedules,
  sumCompletedStarsForChild,
  countAnalyticsEvent,
  countChildFirstCompletionMilestones,
  countStarterItemsForChildDay,
  enableJourneyIngest,
  waitForChildFirstCompletionMilestone,
  stockholmDow,
  buildTimingReport,
  cookiesFromResponse,
};
