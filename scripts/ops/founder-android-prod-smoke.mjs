#!/usr/bin/env node
/**
 * Founder prod smoke for physical Android sessions — API only + adb launch.
 * No WebView navigation (avoids login↔child flicker from CDP).
 * Credentials: FOUNDER_QA_EMAIL, FOUNDER_QA_PASSWORD, FOUNDER_CHILD_PIN from env.
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
const EMAIL = process.env.FOUNDER_QA_EMAIL;
const PASSWORD = process.env.FOUNDER_QA_PASSWORD;
const CHILD_PIN = process.env.FOUNDER_CHILD_PIN;

if (!EMAIL || !PASSWORD || !CHILD_PIN) {
  console.error('Set FOUNDER_QA_EMAIL, FOUNDER_QA_PASSWORD, FOUNDER_CHILD_PIN');
  process.exit(2);
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

function adbLaunch() {
  try {
    const pt = `${process.env.HOME}/Library/Android/sdk/platform-tools`;
    const adb = fs.existsSync(`${pt}/adb`) ? `${pt}/adb` : 'adb';
    execSync(`${adb} get-state`, { stdio: 'pipe' });
    execSync(`${adb} shell monkey -p se.mystarday.app -c android.intent.category.LAUNCHER 1`, { stdio: 'pipe' });
    return { launched: true };
  } catch {
    return { launched: false, reason: 'no_adb_device' };
  }
}

function deviceInfo() {
  try {
    const pt = `${process.env.HOME}/Library/Android/sdk/platform-tools`;
    const adb = fs.existsSync(`${pt}/adb`) ? `${pt}/adb` : 'adb';
    return {
      model: execSync(`${adb} shell getprop ro.product.model`, { encoding: 'utf8' }).trim(),
      android: execSync(`${adb} shell getprop ro.build.version.release`, { encoding: 'utf8' }).trim(),
    };
  } catch {
    return null;
  }
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  const errors = [];

  const login = await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  if (login.status !== 200) errors.push(`parent_login_${login.status}`);

  const jar = mergeJar({}, login.setCookie);
  const act = login.status === 200 ? (await api('/api/family/activation-config', { jar })).json : null;
  const na =
    login.status === 200 ? (await api('/api/family/next-action', { jar })).json || {} : {};

  const picker =
    login.status === 200 ? (await api('/api/auth/login-picker-children', { jar })).json : null;
  const children = picker?.children || [];
  const childUsername = children[0]?.username || null;

  let childStatus = null;
  let childJar = null;
  let childCsrf = null;
  if (childUsername) {
    await new Promise((r) => setTimeout(r, 500));
    const cl = await api('/api/auth/child-login', {
      method: 'POST',
      body: { username: childUsername, pin: CHILD_PIN },
    });
    childStatus = cl.status;
    if (cl.status === 200) {
      childJar = mergeJar({}, cl.setCookie);
      childCsrf = cl.json?.csrfToken || '';
    } else if (cl.status === 429) {
      errors.push('child_login_rate_limited');
    } else {
      errors.push(`child_login_${cl.status}`);
    }
  } else {
    errors.push('no_picker_child');
  }

  let completionStatus = null;
  if (childJar) {
    const log = await api('/api/me/daily-log', { jar: childJar });
    const pending = (log.json?.items || []).find((i) => !i.completed);
    if (pending) {
      const done = await api(`/api/me/daily-log-items/${pending.id}/complete`, {
        method: 'PUT',
        jar: childJar,
        csrf: childCsrf,
      });
      completionStatus = done.status;
      if (done.status >= 400) errors.push(`complete_${done.status}`);
    } else {
      completionStatus = 'no_pending';
    }
  }

  const parentMe = login.status === 200 ? (await api('/api/auth/me', { jar })).status : null;

  const out = {
    prod: { git_sha: health.git_sha, cache: health.cache_version },
    device: deviceInfo(),
    adb: adbLaunch(),
    api_smoke: {
      parent_login: login.status,
      parent_me: parentMe,
      global_activation_first_success_off: act?.flags?.activation_first_success_v1 === false,
      family_override_on: act?.family_override?.activation_first_success_v1 === true,
      first_success_coach_visible: !!na.show_primary_coach,
      next_action: na.next_action ?? null,
      picker_child_count: children.length,
      child_login_status: childStatus,
      completion_status: completionStatus,
      status: errors.length ? 'FAIL' : 'PASS',
      errors,
    },
    activation_gate_note: 'founder_family_no_qa_override_coach_absent_expected',
    physical_manual: [
      'pin_contrast_on_device',
      'webview_stability_no_flicker',
      'background_foreground',
    ],
    ran_at: new Date().toISOString(),
  };

  const artifactsDir = path.join(ROOT, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, 'founder-android-prod-smoke.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(JSON.stringify({ status: 'ERROR', message: e.message }));
  process.exit(2);
});
