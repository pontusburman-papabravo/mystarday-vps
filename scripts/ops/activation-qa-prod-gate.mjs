#!/usr/bin/env node
/**
 * Activation QA prod gate (sv-SE) — API journey + optional Android adb launch.
 * Secrets: QA_PASSWORD (min 12), QA_CHILD_PIN (env). Never logged.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { loadEnvFile } = require('../../src/lib/load-env.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
loadEnvFile(path.join(ROOT, '.env'), { override: true });

const BASE = process.env.PROD_BASE || 'https://mystarday.se';
const QA_PARENT = 'founder-activation-qa-sv@test.stjarndag.local';
const CHILD_USER = 'qaactsv';
const CHILD_PIN = process.env.QA_CHILD_PIN || '4821';

function loadQaPasswordFromFiles() {
  if (process.env.QA_PASSWORD && process.env.QA_PASSWORD.length >= 12) return process.env.QA_PASSWORD;
  const extra = process.env.ACTIVATION_QA_SECRETS_FILE;
  if (extra && fs.existsSync(extra)) {
    loadEnvFile(extra, { override: true });
    if (process.env.QA_PASSWORD && process.env.QA_PASSWORD.length >= 12) return process.env.QA_PASSWORD;
  }
  return null;
}

async function resolveQaPasswordAsync() {
  return loadQaPasswordFromFiles();
}

function mergeJar(jar, setCookie) {
  for (const h of setCookie || []) {
    const [pair] = h.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

async function api(pathname, opts = {}) {
  const { method = 'GET', jar = {}, body, csrf } = opts;
  const headers = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
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

function adbInfo() {
  try {
    const pt = `${process.env.HOME}/Library/Android/sdk/platform-tools`;
    const adb = fs.existsSync(`${pt}/adb`) ? `${pt}/adb` : 'adb';
    execSync(`${adb} get-state`, { stdio: 'pipe' });
    execSync(`${adb} shell monkey -p se.mystarday.app -c android.intent.category.LAUNCHER 1`, { stdio: 'pipe' });
    return {
      model: execSync(`${adb} shell getprop ro.product.model`, { encoding: 'utf8' }).trim(),
      android: execSync(`${adb} shell getprop ro.build.version.release`, { encoding: 'utf8' }).trim(),
      launched: true,
    };
  } catch {
    return { launched: false };
  }
}

async function runActivationApi(qaPassword) {
  const errors = [];
  const login = await api('/api/auth/login', { method: 'POST', body: { email: QA_PARENT, password: qaPassword } });
  if (login.status !== 200) return { status: 'FAIL', errors: [`parent_login_${login.status}`] };

  const jar = mergeJar({}, login.setCookie);
  const act = (await api('/api/family/activation-config', { jar })).json || {};
  const na0 = (await api('/api/family/next-action', { jar })).json || {};
  if (!na0.show_primary_coach) errors.push('no_coach_before');

  await new Promise((r) => setTimeout(r, 400));
  const cl = await api('/api/auth/child-login', { method: 'POST', body: { username: CHILD_USER, pin: CHILD_PIN } });
  if (cl.status === 429) errors.push('child_rate_limited');
  else if (cl.status !== 200) errors.push(`child_login_${cl.status}`);

  const cj = cl.status === 200 ? mergeJar({}, cl.setCookie) : {};
  const csrf = cl.json?.csrfToken || '';
  if (cl.status === 200) {
    const log = await api('/api/me/daily-log', { jar: cj });
    const pending = (log.json?.items || []).find((i) => !i.completed);
    if (!pending) errors.push('no_pending_item');
    else {
      const done = await api(`/api/me/daily-log-items/${pending.id}/complete`, { method: 'PUT', jar: cj, csrf });
      if (done.status >= 400) errors.push(`complete_${done.status}`);
    }
  }

  await new Promise((r) => setTimeout(r, 1500));
  const na1 = (await api('/api/family/next-action', { jar })).json || {};
  const advanced =
    !na1.show_primary_coach ||
    (na1.reason || []).includes('already_first_success') ||
    na1.next_action === 'parent_ack' ||
    na1.next_action === 'none';
  if (!advanced) errors.push('coach_not_advanced');
  if ((await api('/api/auth/me', { jar })).status !== 200) errors.push('parent_session');

  return {
    status: errors.length ? 'FAIL' : 'PASS',
    errors,
    flags: {
      global_off: act.flags?.activation_first_success_v1 === false,
      override_on: act.family_override?.activation_first_success_v1 === true,
    },
    coach_before: !!na0.show_primary_coach,
    coach_after: !!na1.show_primary_coach,
    next_before: na0.next_action,
    next_after: na1.next_action,
  };
}

async function main() {
  const qaPassword = await resolveQaPasswordAsync();
  if (!qaPassword) {
    console.log(
      JSON.stringify({
        status: 'BLOCKED',
        reason: 'QA_PASSWORD missing — add to .env or ~/.config/mystarday/founder-activation-qa.env (min 12 chars)',
      })
    );
    process.exit(2);
  }

  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  const apiResult = await runActivationApi(qaPassword);
  const device = adbInfo();

  const out = {
    prod: { git_sha: health.git_sha, cache: health.cache_version },
    activation_api_sv_se: apiResult,
    android_device: device,
    physical_protocol: {
      required: 'parent_login_then_child_picker',
      avoid: 'child_first_login',
      manual_steps_remaining: device.launched
        ? [
            'QA parent login on device',
            'one First Success coach on Hem',
            'child PIN a11y',
            'completion UI',
            'parent restore',
            'background/force-close',
          ]
        : ['connect device via adb'],
    },
    ran_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts/activation-android-qa-gate.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(apiResult.status === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'ERROR', message: e.message }));
  process.exit(2);
});
