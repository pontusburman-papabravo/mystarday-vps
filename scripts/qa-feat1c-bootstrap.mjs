#!/usr/bin/env node
/**
 * Bootstrap parent + child + custody pattern for FEAT-1C browser QA.
 */
import { createRequire } from 'node:module';
import { cookieHeader, getSetCookieHeaders, mergeCookies } from '../test/helpers/http.js';

const require = createRequire(import.meta.url);
const db = require('../src/lib/db');

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const email = `feat1c-browser-${Date.now()}@example.com`;
const password = 'TestPass123456!';

function authHeaders(cookies, csrfToken, method = 'POST') {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(cookies),
      'X-CSRF-Token': csrfToken,
    },
  };
}

async function main() {
  await db.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ('custody_schedule_beta', true, 'QA')
     ON CONFLICT (key) DO UPDATE SET enabled = true`
  );

  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) break;
    } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 500));
  }

  const registerRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'QA Override' }),
  });
  if (registerRes.status !== 201) {
    throw new Error(`register ${registerRes.status}: ${await registerRes.text()}`);
  }

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = JSON.parse(await loginRes.text());
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const hdr = (method) => authHeaders(cookies, loginBody.csrfToken, method);

  const childRes = await fetch(`${BASE}/api/children`, {
    ...hdr('POST'),
    body: JSON.stringify({ name: 'TestBarn', emoji: '🐯', birthday: '2018-06-01' }),
  });
  const child = JSON.parse(await childRes.text());
  if (childRes.status !== 201) throw new Error(`child ${childRes.status}: ${JSON.stringify(child)}`);

  const setupRes = await fetch(`${BASE}/api/family/custody/setup`, { ...hdr('POST'), body: '{}' });
  const setup = JSON.parse(await setupRes.text());
  if (setupRes.status !== 200 || !setup.homes?.length) {
    throw new Error(`setup ${setupRes.status}: ${JSON.stringify(setup)}`);
  }
  const homeA = setup.homes[0].id;
  const homeB = setup.homes[1].id;

  const patternRes = await fetch(`${BASE}/api/family/custody/pattern/${child.id}`, {
    ...hdr('PUT'),
    body: JSON.stringify({
      anchor_date: '2026-06-02',
      week_a_home_id: homeA,
      week_b_home_id: homeB,
      pattern_type: 'alternate_weeks',
      clone_week_b: false,
    }),
  });
  if (patternRes.status !== 200) {
    throw new Error(`pattern ${patternRes.status}: ${await patternRes.text()}`);
  }

  await db.query('UPDATE parent SET onboarding_completed = true WHERE email = $1', [email]);

  console.log(JSON.stringify({
    baseUrl: BASE,
    email,
    password,
    childId: child.id,
    childName: child.name,
    homeA,
    homeB,
    familyUrl: `${BASE}/family#boendeschema`,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
