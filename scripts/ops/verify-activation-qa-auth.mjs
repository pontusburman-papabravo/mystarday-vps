#!/usr/bin/env node
/**
 * Safe auth smoke for Activation QA sv-SE — status codes only, no tokens logged.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../../src/lib/load-env.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
loadEnvFile(path.join(ROOT, '.env'), { override: true });

const secretsFile =
  process.env.ACTIVATION_QA_SECRETS_FILE ||
  path.join(process.env.HOME || '', '.config/mystarday/founder-activation-qa.env');
if (fs.existsSync(secretsFile)) loadEnvFile(secretsFile, { override: true });

const BASE = process.env.PROD_BASE || 'https://mystarday.se';
const QA_PARENT = process.env.QA_EMAIL || 'founder-activation-qa-sv@test.stjarnday.local';
const CHILD_USER = 'qaactsv';
const PASSWORD = process.env.QA_PASSWORD;
const PIN = process.env.QA_CHILD_PIN;

function mergeJar(jar, setCookie) {
  for (const h of setCookie || []) {
    const [pair] = h.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

async function api(pathname, opts = {}) {
  const { method = 'GET', jar = {}, body } = opts;
  const headers = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = JSON.parse(await res.text());
  } catch {
    /* ignore */
  }
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return { status: res.status, json, setCookie };
}

async function main() {
  if (!PASSWORD || PASSWORD.length < 12) {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'QA_PASSWORD_missing' }));
    process.exit(2);
  }
  if (!PIN) {
    console.log(JSON.stringify({ status: 'BLOCKED', reason: 'QA_CHILD_PIN_missing' }));
    process.exit(2);
  }

  const login = await api('/api/auth/login', { method: 'POST', body: { email: QA_PARENT, password: PASSWORD } });
  if (login.status !== 200) {
    console.log(JSON.stringify({ status: 'FAIL', step: 'parent_login', http: login.status }));
    process.exit(1);
  }
  const jar = mergeJar({}, login.setCookie);
  const me = await api('/api/auth/me', { jar });
  const familyId = me.json?.familyId || me.json?.family_id || null;
  const expectedFamily = process.env.QA_FAMILY_ID || 'bc825034-7f94-4200-82d6-757505598615';
  const scopeOk = familyId === expectedFamily;

  const picker = await api('/api/auth/login-picker-children', { jar });
  const usernames = (picker.json?.children || []).map((c) => c.username);
  const pickerOk = usernames.length >= 1 && usernames.includes(CHILD_USER);

  const cl = await api('/api/auth/child-login', { method: 'POST', body: { username: CHILD_USER, pin: PIN } });
  const pinOk = cl.status === 200;

  console.log(
    JSON.stringify({
      status: scopeOk && pickerOk && pinOk ? 'PASS' : 'FAIL',
      parent_login: login.status,
      family_scope_ok: scopeOk,
      picker_child_count: usernames.length,
      picker_qa_only: pickerOk,
      child_login: cl.status,
    })
  );
  process.exit(scopeOk && pickerOk && pinOk ? 0 : 1);
}

main().catch((e) => {
  console.log(JSON.stringify({ status: 'ERROR', message: e.message }));
  process.exit(2);
});
