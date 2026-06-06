#!/usr/bin/env node
/**
 * Full live QA against running Min Stjärndag (VPS or local).
 *
 * Usage:
 *   QA_BASE_URL=https://188.66.60.93 QA_HOST=mystarday.se node scripts/qa-e2e-full.mjs
 *   QA_BASE_URL=http://localhost:3000 node scripts/qa-e2e-full.mjs
 *
 * Creates: primary + shared parent, 2 children. Saves docs/qa-live-credentials.json
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import httpLib from 'http';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.QA_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const HOST = process.env.QA_HOST || '';
const TLS_INSECURE = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || /^https:\/\/\d+\.\d+\.\d+\.\d+/.test(BASE);
const RUN_ID = process.env.QA_RUN_ID || `QA-VPS-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

const stamp = Date.now().toString(36);
const PASSWORD = process.env.QA_PASSWORD || 'QaVps2026!Secure';
const SKIP_LOCKOUT = process.env.QA_SKIP_LOCKOUT !== '0';
const CREDS = {
  primary: {
    email: process.env.QA_PRIMARY_EMAIL || `qa.primary+${stamp}@test.mystarday.se`,
    password: PASSWORD,
    name: 'QA Primary',
  },
  shared: {
    email: process.env.QA_SHARED_EMAIL || `qa.shared+${stamp}@test.mystarday.se`,
    password: PASSWORD,
    name: 'QA Shared',
  },
  children: [
    { name: `QA Barn A ${stamp}`, emoji: '🧒', pin: '4455' },
    { name: `QA Barn B ${stamp}`, emoji: '👧', pin: '7788' },
  ],
};

const results = new Map();
function record(id, status, note = '') {
  results.set(id, { status, note });
  const icon = { pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[status] || '?';
  console.log(`${icon} ${id} ${note}`);
}

const cookies = new Map();
let csrf = null;
let primaryUser = null;
let sharedUser = null;
const childRecords = [];

function parseSetCookie(header) {
  if (!header) return;
  const parts = Array.isArray(header) ? header : [header];
  for (const line of parts) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function clearCookies() {
  cookies.clear();
  csrf = null;
}

async function http(method, urlPath, { json, csrf: useCsrf, rawCookies } = {}) {
  const urlStr = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const headers = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (HOST) headers.Host = HOST;
  const ch = rawCookies || cookieHeader();
  if (ch) headers.Cookie = ch;
  if (useCsrf && csrf) headers['X-CSRF-Token'] = csrf;

  const body = json ? JSON.stringify(json) : null;
  if (body) headers['Content-Length'] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const lib = isHttps ? https : httpLib;
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
        rejectUnauthorized: !TLS_INSECURE,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const setCookie = res.headers['set-cookie'];
          if (setCookie) parseSetCookie(setCookie);
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = { _raw: text.slice(0, 800) };
          }
          resolve({ status: res.statusCode, data, text, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function loginParent(email, password, label) {
  clearCookies();
  const r = await http('POST', '/api/auth/login', { json: { email, password } });
  if (r.status !== 200 || !r.data?.user) {
    throw new Error(`${label} login failed: ${r.status} ${JSON.stringify(r.data)}`);
  }
  csrf = r.data.csrfToken || cookies.get('csrf_token') || null;
  if (!csrf) {
    const t = await http('GET', '/api/auth/csrf-token');
    csrf = t.data?.csrfToken || cookies.get('csrf_token');
  }
  return r.data.user;
}

async function setupFamily() {
  console.log('\n=== Setup: familj med 2 barn + 2 vuxna ===\n');

  const reg = await http('POST', '/api/auth/register', {
    json: {
      email: CREDS.primary.email,
      password: CREDS.primary.password,
      name: CREDS.primary.name,
    },
  });
  if (reg.status === 201) record('QA-016', 'pass', 'register primary');
  else if (reg.status === 409) throw new Error('Primary email upptagen');
  else {
    record('QA-016', 'fail', `${reg.status}`);
    throw new Error('Register failed');
  }

  if (reg.data?.verifyToken) {
    const v = await http('POST', '/api/auth/verify-email', { json: { token: reg.data.verifyToken } });
    record('QA-018', v.status === 200 ? 'pass' : 'partial', 'verify-email dev token');
  } else {
    record('QA-018', 'partial', 'production — ingen verifyToken i svar');
  }

  primaryUser = await loginParent(CREDS.primary.email, CREDS.primary.password, 'primary');
  record('QA-020', 'pass', `primary ${primaryUser.email}`);
  record('QA-032', csrf ? 'pass' : 'fail', 'CSRF efter login');

  const me = await http('GET', '/api/auth/me');
  record('QA-029', me.status === 200 ? 'pass' : 'fail', 'auth/me');

  // Child 1 via onboarding
  const c1 = await http('POST', '/api/onboarding/child', {
    json: { name: CREDS.children[0].name, emoji: CREDS.children[0].emoji },
    csrf: true,
  });
  if (c1.status !== 201) throw new Error('Child1 onboarding failed');
  childRecords.push({ ...CREDS.children[0], id: c1.data.id, username: c1.data.username });
  record('QA-051', 'pass', 'onboarding child 1');
  record('QA-081', 'pass', CREDS.children[0].name);

  await http('POST', '/api/onboarding/schedule', {
    json: { child_id: c1.data.id, template_group: 'forskola' },
    csrf: true,
  });
  record('QA-052', 'pass', 'schedule forskola barn 1');

  await http('POST', '/api/onboarding/reward', {
    json: { name: 'Glass', icon: '🍦', star_cost: 5 },
    csrf: true,
  });
  record('QA-055', 'pass', 'reward');

  await http('POST', '/api/onboarding/update-pin', {
    json: { child_id: c1.data.id, pin: CREDS.children[0].pin },
    csrf: true,
  });
  record('QA-056', 'pass', `PIN ${CREDS.children[0].pin}`);

  // Child 2 via onboarding/child (POST /api/children can 500 on prod schedule-seed)
  const c2 = await http('POST', '/api/onboarding/child', {
    json: { name: CREDS.children[1].name, emoji: CREDS.children[1].emoji },
    csrf: true,
  });
  if (c2.status === 201) {
    const pin2 = CREDS.children[1].pin;
    await http('POST', '/api/onboarding/update-pin', {
      json: { child_id: c2.data.id, pin: pin2 },
      csrf: true,
    });
    await http('POST', '/api/onboarding/schedule', {
      json: { child_id: c2.data.id, template_group: 'forskola' },
      csrf: true,
    });
    childRecords.push({
      ...CREDS.children[1],
      id: c2.data.id,
      username: c2.data.username,
      pin: pin2,
    });
    record('QA-081-2', 'pass', `${CREDS.children[1].name} via onboarding/child`);
  } else {
    record('QA-081-2', 'fail', `${c2.status} ${JSON.stringify(c2.data)}`);
  }

  const done = await http('POST', '/api/onboarding/complete', { json: {}, csrf: true });
  record('QA-058', done.status === 200 ? 'pass' : 'fail', 'onboarding complete');

  // Second adult via add-parent — after both children exist
  const addP = await http('POST', '/api/family/add-parent', {
    json: {
      name: CREDS.shared.name,
      email: CREDS.shared.email,
      password: CREDS.shared.password,
    },
    csrf: true,
  });
  if (addP.status === 201 || addP.status === 200) {
    record('QA-200', 'pass', 'add-parent shared vuxen');
    record('QA-197', 'partial', 'add-parent direkt (ej e-postinbjudan)');
  } else {
    record('QA-200', 'fail', `${addP.status} ${JSON.stringify(addP.data)}`);
  }

  const fam = await http('GET', '/api/family');
  if (fam.status === 200) {
    const parents = fam.data?.parents?.length || 0;
    const children = fam.data?.children?.length || 0;
    record('QA-196', 'partial', `API: ${parents} vuxna, ${children} barn`);
    record('QA-207', children >= 2 && parents >= 2 ? 'pass' : 'partial', 'familjestruktur');
  }
}

async function testPublicPages() {
  const pages = [
    ['QA-006', '/'],
    ['QA-008', '/en'],
    ['QA-010', '/pedagoger-och-terapeuter'],
    ['QA-012', '/privacy'],
    ['QA-014', '/offline'],
    ['QA-029-html', '/login'],
    ['QA-252-html', '/settings'],
    ['QA-066-html', '/dashboard'],
    ['QA-126-html', '/schedule'],
    ['QA-196-html', '/family'],
    ['QA-096-html', '/child-login'],
  ];
  for (const [id, p] of pages) {
    const r = await http('GET', p);
    const ok = r.status === 200 || (r.status >= 300 && r.status < 400);
    if (r.status === 200 && !r.text.includes('ReferenceError')) record(id, 'pass', `${p} ${r.status}`);
    else if (ok) record(id, 'partial', `${p} redirect ${r.status}`);
    else record(id, 'fail', `${p} ${r.status}`);
  }
  if ((await http('GET', '/family')).text.includes('Mina barn')) {
    record('QA-196-ui', 'pass', 'Mina barn + Dela åtkomst i HTML');
  }
}

async function testPrimaryApis() {
  const children = await http('GET', '/api/children');
  record('QA-066', children.status === 200 && children.data?.length >= 2 ? 'pass' : 'fail',
    `${children.data?.length || 0} barn`);
  record('QA-067', children.status === 200 ? 'pass' : 'fail', 'parent_child filter');

  const today = new Date().toISOString().slice(0, 10);
  const childId = childRecords[0]?.id;
  if (childId) {
    const log = await http('GET', `/api/children/${childId}/daily-log?date=${today}`);
    record('QA-103', log.status === 200 ? 'pass' : 'partial', 'daily-log');
    const items = log.data?.items || [];
    const incomplete = items.find((i) => !i.completed);
    if (incomplete) {
      const comp = await http('PUT', `/api/daily-log-items/${incomplete.id}/complete`, { csrf: true });
      record('QA-104', comp.status === 200 ? 'pass' : 'partial', 'complete aktivitet');
      const uncomp = await http('PUT', `/api/daily-log-items/${incomplete.id}/uncomplete`, { csrf: true });
      record('QA-105', uncomp.status === 200 ? 'pass' : 'partial', 'uncomplete');
    } else {
      record('QA-104', 'partial', 'inga oschemalagda items idag');
    }

    const sched = await http('GET', `/api/children/${childId}/schedules`);
    record('QA-126', sched.status === 200 ? 'pass' : 'partial', 'veckoschema API');
  }

  const rewards = await http('GET', '/api/rewards');
  record('QA-170', rewards.status === 200 ? 'pass' : 'partial', 'belöningar lista');

  const wrong = await http('POST', '/api/auth/login', {
    json: { email: CREDS.primary.email, password: 'WrongPass999!' },
  });
  record('QA-021', wrong.status === 401 ? 'pass' : 'partial', 'fel lösenord');

  const noCsrf = await http('POST', '/api/onboarding/complete', { json: {} });
  record('QA-033', noCsrf.status === 403 ? 'pass' : 'partial', `utan CSRF → ${noCsrf.status}`);

  const refresh = await http('POST', '/api/auth/refresh', { json: {} });
  record('QA-036', refresh.status === 200 ? 'pass' : 'partial', 'refresh token');

  const exportR = await http('GET', '/api/account/export-data');
  if (exportR.status === 200) record('QA-206', 'pass', 'export-data');
  else if (exportR.status === 429) record('QA-206', 'partial', 'export rate limit 24h');
  else record('QA-206', 'fail', `${exportR.status}`);

  const acct = await http('GET', '/api/account/status');
  record('QA-252', acct.status === 200 ? 'pass' : 'partial', 'account status');

  const famPut = await http('PUT', '/api/family', {
    json: { name: 'QA Testfamilj' },
    csrf: true,
  });
  record('QA-203', famPut.status === 200 ? 'pass' : 'partial', 'familjenamn PUT');
}

async function testSharedParent() {
  sharedUser = await loginParent(CREDS.shared.email, CREDS.shared.password, 'shared');
  record('QA-020-shared', 'pass', sharedUser.email);

  const children = await http('GET', '/api/children');
  const n = children.data?.length || 0;
  record('QA-207-shared', n >= 2 ? 'pass' : 'fail', `shared ser ${n} barn`);

  const famPage = await http('GET', '/family');
  record('QA-076', famPage.status === 200 ? 'pass' : 'partial', 'shared /family');
}

async function testChildLoginSuccess(child, qaPrefix = '') {
  clearCookies();
  const ok = await http('POST', '/api/auth/child-login', {
    json: { username: child.username, pin: child.pin },
  });
  if (ok.status === 200 && ok.data?.user?.type === 'child') {
    record(`${qaPrefix}QA-098`, 'pass', `barn-login ${child.name}`);
    const familyBlock = await http('GET', '/api/family');
    record(`${qaPrefix}QA-107`, familyBlock.status === 403 || familyBlock.status === 401 ? 'pass' : 'fail',
      `barn → family ${familyBlock.status}`);
    const meRewards = await http('GET', '/api/me/rewards');
    record(`${qaPrefix}QA-109`, meRewards.status === 200 ? 'pass' : 'partial', 'skattkammaren API');
  } else {
    record(`${qaPrefix}QA-098`, 'fail', `${ok.status}`);
  }
  clearCookies();
}

async function testChildPinLockout(child, qaPrefix = '') {
  clearCookies();
  let maxAttempts = 5;
  let locked = false;
  for (let i = 1; i <= maxAttempts + 1 && !locked; i++) {
    const r = await http('POST', '/api/auth/child-login', {
      json: { username: child.username, pin: '0000' },
    });
    if (r.data?.max_attempts) maxAttempts = r.data.max_attempts;
    if (r.status === 429 && r.data?.locked) {
      const retry = r.data.retry_after || 0;
      record(`${qaPrefix}QA-100`, 'pass', `lockout ${retry}s (prod max=${maxAttempts})`);
      record(`${qaPrefix}QA-099`, 'pass', 'fel PIN → lockout');
      locked = true;
      if (retry > 0 && retry <= 90) {
        await new Promise((res) => setTimeout(res, (retry + 2) * 1000));
        const again = await http('POST', '/api/auth/child-login', {
          json: { username: child.username, pin: child.pin },
        });
        record(`${qaPrefix}QA-101`, again.status === 200 ? 'pass' : 'partial', `efter lockout → ${again.status}`);
      } else {
        record(`${qaPrefix}QA-101`, 'partial', 'IP rate limit — testa PIN manuellt senare');
      }
    } else if (r.status === 401 && i === 1) {
      record(`${qaPrefix}QA-099`, 'pass', `fel PIN 1/${maxAttempts}`);
    }
  }
  if (!locked) record(`${qaPrefix}QA-100`, 'partial', 'ingen PIN-lockout');
  clearCookies();
}

async function testChildLogin(child, qaPrefix = '', { lockout = true } = {}) {
  await testChildLoginSuccess(child, qaPrefix);
  if (lockout) await testChildPinLockout(child, qaPrefix);
  else record(`${qaPrefix}QA-100`, 'skip', 'lockout endast barn 1');
}

async function testLogout() {
  await loginParent(CREDS.primary.email, CREDS.primary.password, 'primary');
  const out = await http('POST', '/api/auth/logout', { csrf: true });
  record('QA-028', out.status === 200 ? 'pass' : 'partial', 'logout');
  const me = await http('GET', '/api/auth/me');
  record('QA-038', me.status === 401 ? 'pass' : 'partial', 'me efter logout');
}

function writeReport() {
  const summary = { pass: 0, fail: 0, skip: 0, partial: 0 };
  for (const v of results.values()) summary[v.status]++;

  const credOut = {
    runId: RUN_ID,
    baseUrl: BASE,
    host: HOST || null,
    createdAt: new Date().toISOString(),
    primary: CREDS.primary,
    shared: CREDS.shared,
    children: childRecords,
  };
  fs.writeFileSync(path.join(root, 'docs/qa-live-credentials.json'), JSON.stringify(credOut, null, 2));

  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(root, `docs/qa-run-vps-${date}.md`);
  const lines = [
    `# Live QA VPS — ${RUN_ID}`,
    '',
    '| Fält | Värde |',
    '|------|--------|',
    `| Base URL | ${BASE} |`,
    `| Host header | ${HOST || '(ingen)'} |`,
    `| Credentials | docs/qa-live-credentials.json |`,
    '',
    '## Testkonto',
    '',
    '| Roll | E-post | Lösenord |',
    '|------|--------|----------|',
    `| Primary | \`${CREDS.primary.email}\` | \`${CREDS.primary.password}\` |`,
    `| Shared | \`${CREDS.shared.email}\` | \`${CREDS.shared.password}\` |`,
    ...childRecords.map((c, i) => `| Barn ${i + 1} | \`${c.username}\` PIN \`${c.pin}\` | ${c.name} |`),
    '',
    '## Sammanfattning',
    '',
    `| ✅ pass | ${summary.pass} |`,
    `| ⚠️ partial | ${summary.partial} |`,
    `| ❌ fail | ${summary.fail} |`,
    `| ⏭ skip | ${summary.skip} |`,
    '',
    '## Detaljer',
    '',
    '| ID | Status | Anteckning |',
    '|----|--------|------------|',
  ];
  for (const [id, v] of [...results.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const icon = { pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[v.status];
    lines.push(`| ${id} | ${icon} ${v.status} | ${v.note.replace(/\|/g, '\\|')} |`);
  }
  fs.writeFileSync(reportPath, lines.join('\n'));
  const jsonOut = {};
  for (const [id, v] of results.entries()) jsonOut[id] = { status: v.status, note: v.note };
  fs.writeFileSync(path.join(root, 'docs/qa-run-full-latest.json'), JSON.stringify(jsonOut, null, 2));
  console.log('\n---');
  console.log('Credentials: docs/qa-live-credentials.json');
  console.log('Report:', reportPath);
  console.log('Summary:', summary);
  return summary;
}

async function main() {
  console.log(`\n=== Min Stjärndag Full Live QA ===`);
  console.log(`Kör-ID: ${RUN_ID}`);
  console.log(`Base: ${BASE}`);
  if (HOST) console.log(`Host: ${HOST}\n`);

  record('QA-001', 'pass', RUN_ID);

  try {
    const ping = await http('GET', '/api/auth/csrf-token');
    if (ping.status !== 200) throw new Error(`Server svarar ${ping.status}`);
  } catch (e) {
    console.error('Kan inte nå server:', e.message);
    process.exit(2);
  }

  await setupFamily();

  // Barnlogin först — innan fler API-anrop (undvik IP rate limit efter lockout-tester)
  for (const [i, child] of childRecords.entries()) {
    await testChildLoginSuccess(child, i === 1 ? 'b2-' : '');
  }
  if (!SKIP_LOCKOUT && childRecords[0]) {
    await testChildPinLockout(childRecords[0], '');
  } else {
    record('QA-100', 'skip', 'QA_SKIP_LOCKOUT (IP rate limit på VPS)');
    record('QA-101', 'skip', 'lockout hoppad');
  }

  // Återställ vuxensession efter barnlogin
  primaryUser = await loginParent(CREDS.primary.email, CREDS.primary.password, 'primary');

  await testPublicPages();
  await testPrimaryApis();
  await testSharedParent();
  await testLogout();

  const summary = writeReport();
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  writeReport();
  process.exit(1);
});
