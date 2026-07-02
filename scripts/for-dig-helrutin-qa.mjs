#!/usr/bin/env node
/**
 * För dig helrutin — manual QA (local dev).
 * Verifies scheduleName activation only touches targetSection.
 *
 * Usage:
 *   NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false EMAIL_ENABLED=false \
 *     node scripts/for-dig-helrutin-qa.mjs
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { activateGoal } = require('../src/lib/for-dig-activate.js');

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

async function listenApp() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function api(baseUrl, path, { method = 'GET', jar = {}, body, csrf } = {}) {
  const headers = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

const results = [];
function record(check, status, detail) {
  results.push({ check, status, detail });
  console.log(`${status === 'PASS' ? '✓' : '✗'} ${check}: ${detail}`);
}

async function main() {
  const http = await listenApp();
  const db = (await import('../src/lib/db.js')).default;
  const email = `helrutin-qa-${Date.now()}@example.com`;
  let jar = {};
  let csrf = '';
  let parentId = '';
  let familyId = '';
  let childId = '';

  try {
    let { res, json } = await api(http.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email, password: 'helrutin-qa-pass-32chars-min!', name: 'Helrutin QA' },
    });
    if (res.status !== 201) throw new Error(`register ${res.status}`);

    ({ res, json } = await api(http.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email, password: 'helrutin-qa-pass-32chars-min!' },
    }));
    for (const h of res.headers.getSetCookie?.() || []) {
      const [pair] = h.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
    csrf = json.csrfToken;
    parentId = json.user.id;
    familyId = json.user.familyId;

    ({ res, json } = await api(http.baseUrl, '/api/children', {
      method: 'POST', jar, csrf,
      body: { name: 'QA-Barn', emoji: '🧒', birthday: '2018-06-01' },
    }));
    childId = json.id;
    await api(http.baseUrl, '/api/onboarding/complete', { method: 'POST', jar, csrf });

    // Seed Monday (dow=1) with morgon + dag + kvall
    const templates = [
      { name: 'QA Morgon 1', section: 'morgon' },
      { name: 'QA Dag 1', section: 'dag' },
      { name: 'QA Kväll gammal', section: 'kvall' },
    ];
    const templateIds = {};
    for (const t of templates) {
      const row = await db.query(
        `INSERT INTO activity_template (family_id, name, icon, star_value, sort_order)
         VALUES ($1, $2, '⭐', 1, 0) RETURNING id`,
        [familyId, t.name]
      );
      templateIds[t.name] = row.rows[0].id;
    }

    const sched = await db.query(
      `INSERT INTO weekly_schedule (child_id, day_of_week, name, sort_order)
       VALUES ($1, 1, 'Befintligt', 1) RETURNING id`,
      [childId]
    );
    const wsId = sched.rows[0].id;
    for (const t of templates) {
      await db.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, sort_order, section)
         VALUES ($1, $2, 0, $3)`,
        [wsId, templateIds[t.name], t.section]
      );
    }

    // Ensure Kvällsrutin exists in default_schedule (skip if empty lib)
    const ds = await db.query(
      `SELECT ds.id FROM default_schedule ds WHERE LOWER(ds.name) = 'kvällsrutin' LIMIT 1`
    );
    if (ds.rows.length === 0) {
      record('library', 'BLOCKED', 'default_schedule Kvällsrutin saknas lokalt');
      process.exitCode = 0;
      return;
    }

    await activateGoal({
      parentId,
      familyId,
      childId,
      goalSlug: 'trygga-kvallar',
    });

    const after = await db.query(
      `SELECT at.name, wsi.section
       FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE ws.child_id = $1 AND ws.day_of_week = 1
       ORDER BY wsi.section, at.name`,
      [childId]
    );
    const bySection = Object.fromEntries(
      ['morgon', 'dag', 'kvall'].map((s) => [s, after.rows.filter((r) => r.section === s).map((r) => r.name)])
    );

    record('morgon preserved', bySection.morgon.includes('QA Morgon 1') ? 'PASS' : 'FAIL', bySection.morgon.join(', '));
    record('dag preserved', bySection.dag.includes('QA Dag 1') ? 'PASS' : 'FAIL', bySection.dag.join(', '));
    record('old kvall removed', !bySection.kvall.includes('QA Kväll gammal') ? 'PASS' : 'FAIL', bySection.kvall.join(', '));
    record('package kvall added', bySection.kvall.length > 0 ? 'PASS' : 'FAIL', bySection.kvall.join(', '));

    const fails = results.filter((r) => r.status === 'FAIL');
    console.log(`\n── Summary: ${results.filter((r) => r.status === 'PASS').length} PASS, ${fails.length} FAIL ──`);
    if (fails.length) process.exitCode = 1;
  } finally {
    await http.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
