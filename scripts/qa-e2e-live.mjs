#!/usr/bin/env node
/**
 * Live QA against running Min Stjärndag instance (HTTP API + HTML smoke).
 *
 * Usage:
 *   QA_BASE_URL=http://localhost:3000 node scripts/qa-e2e-live.mjs
 *
 * Creates a fresh family, saves credentials to docs/qa-live-credentials.json,
 * runs core QA flows, writes docs/qa-run-live-<timestamp>.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.QA_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const RUN_ID = process.env.QA_RUN_ID || `QA-LIVE-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

const stamp = Date.now().toString(36);
const CREDS = {
  email: process.env.QA_EMAIL || `qa.local+${stamp}@test.mystarday.se`,
  password: process.env.QA_PASSWORD || 'QaLocal2026!Secure',
  parentName: 'QA Förälder',
  childName: 'QA Barn',
  childPin: '4455',
  wrongPin: '0000',
};

const results = [];
function record(id, status, note = '') {
  results.push({ id, status, note });
  const icon = { pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[status] || '?';
  console.log(`${icon} ${id} ${note}`);
}

/** @type {Map<string, string>} */
const cookies = new Map();

function parseSetCookie(header, url) {
  if (!header) return;
  const parts = Array.isArray(header) ? header : [header];
  for (const line of parts) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    cookies.set(name, value);
  }
}

function cookieHeader() {
  if (cookies.size === 0) return '';
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function http(method, urlPath, { json, csrf } = {}) {
  const url = urlPath.startsWith('http') ? urlPath : `${BASE}${urlPath}`;
  const headers = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  const ch = cookieHeader();
  if (ch) headers.Cookie = ch;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(url, {
    method,
    headers,
    body: json ? JSON.stringify(json) : undefined,
    redirect: 'manual',
  });

  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) {
    for (const c of setCookie) parseSetCookie(c, url);
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) parseSetCookie(raw, url);
  }

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, data, text, headers: res.headers };
}

async function main() {
  console.log(`\n=== Min Stjärndag Live QA ===`);
  console.log(`Kör-ID: ${RUN_ID}`);
  console.log(`Base URL: ${BASE}\n`);

  record('QA-001', 'pass', RUN_ID);

  // Health
  try {
    const ping = await http('GET', '/login');
    if (ping.status === 200) record('QA-006', 'pass', 'login HTML 200');
    else record('QA-006', 'fail', `login status ${ping.status}`);
  } catch (e) {
    console.error('\n❌ Kan inte nå servern:', e.message);
    console.error(`Starta appen och kör:\n  QA_BASE_URL=${BASE} node scripts/qa-e2e-live.mjs\n`);
    process.exit(2);
  }

  // Register
  let verifyToken = null;
  {
    const r = await http('POST', '/api/auth/register', {
      json: {
        email: CREDS.email,
        password: CREDS.password,
        name: CREDS.parentName,
      },
    });
    if (r.status === 201) {
      record('QA-016', 'pass', 'register 201');
      verifyToken = r.data?.verifyToken || null;
    } else if (r.status === 409) {
      record('QA-016', 'partial', 'email finns — prova QA_EMAIL unik');
      throw new Error('E-post upptagen: ' + CREDS.email);
    } else {
      record('QA-016', 'fail', `${r.status} ${JSON.stringify(r.data)}`);
      throw new Error('Registrering misslyckades');
    }
  }

  if (verifyToken) {
    const v = await http('POST', '/api/auth/verify-email', { json: { token: verifyToken } });
    if (v.status === 200) record('QA-018', 'pass', 'verify-email');
    else record('QA-018', 'partial', `${v.status}`);
  } else {
    record('QA-018', 'skip', 'ingen verifyToken (production?)');
  }

  // Login
  let csrf = null;
  let user = null;
  {
    const r = await http('POST', '/api/auth/login', {
      json: { email: CREDS.email, password: CREDS.password },
    });
    if (r.status === 200 && r.data?.user) {
      record('QA-020', 'pass', 'login');
      csrf = r.data.csrfToken || cookies.get('csrf_token') || null;
      user = r.data.user;
      if (!csrf) {
        const t = await http('GET', '/api/auth/csrf-token');
        csrf = t.data?.csrfToken || cookies.get('csrf_token');
      }
      record('QA-032', csrf ? 'pass' : 'fail', 'CSRF token');
    } else {
      record('QA-020', 'fail', `${r.status} ${JSON.stringify(r.data)}`);
      throw new Error('Login misslyckades');
    }
  }

  // Me
  {
    const r = await http('GET', '/api/auth/me');
    if (r.status === 200) record('QA-029', 'pass', `me familyId=${r.data?.familyId || r.data?.family_id}`);
    else record('QA-029', 'fail', String(r.status));
  }

  // Onboarding: child
  let childId = null;
  let childUsername = null;
  {
    const r = await http('POST', '/api/onboarding/child', {
      json: { name: CREDS.childName, emoji: '🧒' },
      csrf,
    });
    if (r.status === 201) {
      record('QA-051', 'pass', 'onboarding child');
      record('QA-081', 'pass', 'skapa barn');
      childId = r.data.id;
      childUsername = r.data.username;
      CREDS.childUsername = childUsername;
      if (r.data.pin) CREDS.generatedPin = r.data.pin;
    } else {
      record('QA-051', 'fail', `${r.status} ${JSON.stringify(r.data)}`);
      throw new Error('Onboarding child failed');
    }
  }

  // Schedule
  {
    const r = await http('POST', '/api/onboarding/schedule', {
      json: { child_id: childId, template_group: 'forskola' },
      csrf,
    });
    if (r.status === 200 || r.status === 201) record('QA-052', 'pass', 'schedule forskola');
    else record('QA-052', 'partial', `${r.status} ${JSON.stringify(r.data)}`);
  }

  // Reward
  {
    const r = await http('POST', '/api/onboarding/reward', {
      json: { name: 'Glass', icon: '🍦', star_cost: 5 },
      csrf,
    });
    if (r.status === 200 || r.status === 201) record('QA-055', 'pass', 'reward');
    else record('QA-055', 'partial', `${r.status}`);
  }

  // PIN
  {
    const r = await http('POST', '/api/onboarding/update-pin', {
      json: { child_id: childId, pin: CREDS.childPin },
      csrf,
    });
    if (r.status === 200) record('QA-056', 'pass', `PIN ${CREDS.childPin}`);
    else record('QA-056', 'fail', `${r.status}`);
  }

  // Complete onboarding
  {
    const r = await http('POST', '/api/onboarding/complete', { json: {}, csrf });
    if (r.status === 200) record('QA-058', 'pass', 'onboarding complete');
    else record('QA-058', 'fail', String(r.status));
  }

  // Children list
  {
    const r = await http('GET', '/api/children');
    if (r.status === 200 && Array.isArray(r.data) && r.data.length >= 1) {
      record('QA-066', 'pass', `${r.data.length} barn`);
      record('QA-067', 'pass', 'children API');
    } else record('QA-066', 'fail', String(r.status));
  }

  // Family page HTML
  {
    const r = await http('GET', '/family');
    if (r.status === 200 && r.text.includes('Mina barn') && r.text.includes('Dela åtkomst')) {
      record('QA-196', 'pass', 'family UI rubriker');
    } else if (r.status === 200) {
      record('QA-196', 'partial', 'family 200 men rubriker saknas');
    } else record('QA-196', 'fail', String(r.status));
  }

  // PIN lockout: 3 wrong attempts
  const loginUser = childUsername || CREDS.childName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let i = 1; i <= 3; i++) {
    const r = await http('POST', '/api/auth/child-login', {
      json: { username: loginUser, pin: CREDS.wrongPin },
    });
    if (i < 3) {
      if (r.status === 401) record(`QA-099-${i}`, 'pass', `fel PIN försök ${i}`);
      else record(`QA-099-${i}`, 'partial', `${r.status}`);
    } else {
      if (r.status === 429 && r.data?.locked) {
        const retry = r.data.retry_after || 0;
        record('QA-100', retry >= 25 && retry <= 35 ? 'pass' : 'partial', `lockout retry_after=${retry}s`);
      } else {
        record('QA-100', 'fail', `förväntat 429, fick ${r.status}`);
      }
    }
  }

  // Wait for lockout expiry then correct PIN
  const waitSec = 31;
  console.log(`\n⏳ Väntar ${waitSec}s på lockout (QA-101)...`);
  await new Promise((r) => setTimeout(r, waitSec * 1000));
  {
    const r = await http('POST', '/api/auth/child-login', {
      json: { username: loginUser, pin: CREDS.childPin },
    });
    if (r.status === 200 && r.data?.user?.type === 'child') {
      record('QA-098', 'pass', 'barn-login efter lockout');
      record('QA-101', 'pass', 'inloggning efter 30s');
    } else {
      record('QA-098', 'fail', `${r.status} ${JSON.stringify(r.data)}`);
      record('QA-101', 'partial', 'PIN efter väntan');
    }
  }

  // CSRF on mutating without token
  {
    const saved = csrf;
    const r = await http('POST', '/api/onboarding/complete', { json: {} });
    if (r.status === 403) record('QA-033', 'pass', 'mutering utan CSRF → 403');
    else record('QA-033', 'partial', `status ${r.status}`);
    csrf = saved;
  }

  // Save credentials
  const credPath = path.join(root, 'docs/qa-live-credentials.json');
  const credOut = {
    runId: RUN_ID,
    baseUrl: BASE,
    createdAt: new Date().toISOString(),
    parent: {
      email: CREDS.email,
      password: CREDS.password,
      name: CREDS.parentName,
    },
    child: {
      id: childId,
      name: CREDS.childName,
      username: childUsername,
      pin: CREDS.childPin,
    },
  };
  fs.writeFileSync(credPath, JSON.stringify(credOut, null, 2));

  const summary = { pass: 0, fail: 0, skip: 0, partial: 0 };
  for (const r of results) summary[r.status]++;

  const reportPath = path.join(root, `docs/qa-run-live-${new Date().toISOString().slice(0, 10)}.md`);
  const lines = [
    `# Live QA — ${RUN_ID}`,
    '',
    '| Fält | Värde |',
    '|------|--------|',
    `| Base URL | ${BASE} |`,
    `| Credentials | \`docs/qa-live-credentials.json\` |`,
    '',
    '## Testkonto (skapat i denna körning)',
    '',
    '| | |',
    '|---|---|',
    `| Förälder e-post | \`${CREDS.email}\` |`,
    `| Lösenord | \`${CREDS.password}\` |`,
    `| Barn | ${CREDS.childName} |`,
    `| Barn username | \`${childUsername}\` |`,
    `| Barn PIN | \`${CREDS.childPin}\` |`,
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
  for (const r of results) {
    const icon = { pass: '✅', fail: '❌', skip: '⏭', partial: '⚠️' }[r.status];
    lines.push(`| ${r.id} | ${icon} ${r.status} | ${r.note.replace(/\|/g, '\\|')} |`);
  }
  fs.writeFileSync(reportPath, lines.join('\n'));

  console.log('\n---');
  console.log('Credentials:', credPath);
  console.log('Report:', reportPath);
  console.log('Summary:', summary);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
