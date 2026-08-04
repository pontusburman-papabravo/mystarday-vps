#!/usr/bin/env node
/**
 * Founder Activation QA — responsive prod browser gate (sv-SE + en-GB).
 * Credentials via QA_PASSWORD + QA_CHILD_PIN env (never logged).
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.PROD_BASE;
if (!BASE) {
  console.error('Set PROD_BASE (production origin) before running founder responsive QA.');
  process.exit(1);
}

function vps(cmd) {
  execSync(`./scripts/vps-ssh.sh ${JSON.stringify(cmd)}`, { cwd: ROOT, stdio: 'pipe' });
}

const VPS_APP_PATH = process.env.VPS_APP_PATH;
if (!VPS_APP_PATH) {
  console.error('Set VPS_APP_PATH before running founder responsive QA.');
  process.exit(1);
}

function provisionPair(qaPassword) {
  vps(
    `cd ${VPS_APP_PATH} && export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && set -a && . .env && set +a && QA_PASSWORD='${qaPassword}' QA_CHILD_PIN=4821 node scripts/provision-founder-activation-qa-families.mjs`
  );
  const resetPath = path.join(ROOT, 'scripts/ops/reset-founder-activation-qa-scenario.mjs');
  execSync(`./scripts/vps-ssh.sh "cat > ${VPS_APP_PATH}/scripts/ops/reset-founder-activation-qa-scenario.mjs" < ${JSON.stringify(resetPath)}`, {
    cwd: ROOT,
    stdio: 'pipe',
  });
  vps(
    `cd ${VPS_APP_PATH} && export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && set -a && . .env && set +a && QA_CHILD_PIN=4821 node scripts/ops/reset-founder-activation-qa-scenario.mjs`
  );
}

function mergeJar(jar, setCookie) {
  for (const h of setCookie || []) {
    const [pair] = h.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

async function api(path, opts = {}) {
  const { method = 'GET', jar = {}, body, csrf } = opts;
  const headers = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try {
    json = JSON.parse(await res.text());
  } catch {
    /* ignore */
  }
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return { status: res.status, json, setCookie };
}

async function runCase(fam, vp, qaPassword) {
  const key = `${fam.locale}:${vp.label}`;
  const errors = [];
  const login = await api('/api/auth/login', { method: 'POST', body: { email: fam.parent_email, password: qaPassword } });
  if (login.status !== 200) return { key, status: 'FAIL', errors: [`login_${login.status}`] };
  const jar = mergeJar({}, login.setCookie);
  const na0 = (await api('/api/family/next-action', { jar })).json || {};
  if (!na0.show_primary_coach) errors.push('no_coach_before');
  if (na0.next_action === 'create_child') errors.push('create_child');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const parentPage = await browser.newPage();
  const childPage = await browser.newPage();
  for (const p of [parentPage, childPage]) {
    await p.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
  }
  await parentPage.setCookie(...Object.entries(jar).map(([n, v]) => ({ name: n, value: String(v), url: BASE })));
  await parentPage.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await parentPage.evaluate(() => window.ActivationFirstSuccessHub?.load?.({ force: true }));
  const coachDom = await parentPage.evaluate(() => {
    const visible = (el) => el && !el.classList.contains('hidden') && el.innerHTML.trim().length > 40;
    const mounts = ['activationFirstSuccessCoachMount', 'engineCoachMount', 'journeyCoachMount'].map((id) =>
      document.getElementById(id)
    );
    return { primaryCount: mounts.filter(visible).length };
  });
  if (coachDom.primaryCount !== 1) errors.push(`coach_count_${coachDom.primaryCount}`);

  const cl = await api('/api/auth/child-login', { method: 'POST', body: { username: fam.child_username, pin: '4821' } });
  if (cl.status !== 200) errors.push(`child_login_${cl.status}`);
  const childJar = mergeJar({}, cl.setCookie);
  const childCsrf = cl.json?.csrfToken || '';
  await childPage.setCookie(...Object.entries(childJar).map(([n, v]) => ({ name: n, value: String(v), url: BASE })));
  await childPage.goto(`${BASE}/child/today`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const sub = await childPage.$('[data-substep-toggle], .substep-toggle');
  if (sub) await sub.click().catch(() => {});

  const log = await api('/api/me/daily-log', { jar: childJar });
  const pending = (log.json?.items || []).find((i) => !i.completed);
  if (!pending) errors.push('no_pending_item');
  else {
    const c = await api(`/api/me/daily-log-items/${pending.id}/complete`, { method: 'PUT', jar: childJar, csrf: childCsrf });
    if (c.status >= 400) errors.push(`complete_${c.status}`);
  }

  await new Promise((r) => setTimeout(r, 2000));
  const na1 = (await api('/api/family/next-action', { jar })).json || {};
  const advanced =
    !na1.show_primary_coach ||
    (na1.reason || []).includes('already_first_success') ||
    na1.next_action === 'parent_ack' ||
    na1.next_action === 'none';
  if (!advanced) errors.push('coach_not_advanced');
  if ((await api('/api/auth/me', { jar })).status !== 200) errors.push('parent_restore');
  if (await parentPage.evaluate(() => document.body.innerText.includes('Missing key'))) errors.push('missing_key');
  await browser.close();
  return { key, status: errors.length ? 'FAIL' : 'PASS', errors, next_action_before: na0.next_action, next_action_after: na1.next_action };
}

async function main() {
  const qaPassword =
    process.env.QA_PASSWORD ||
    execSync("openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20", { encoding: 'utf8' }).trim();
  const families = [
    { locale: 'sv-SE', parent_email: 'founder-activation-qa-sv@test.stjarndag.local', child_username: 'qaactsv' },
    { locale: 'en-GB', parent_email: 'founder-activation-qa-en@test.stjarndag.local', child_username: 'qaacten' },
  ];
  const cases = [
    { vp: { label: 'iphone-390x844', width: 390, height: 844 }, fam: families[0] },
    { vp: { label: 'android-412x915', width: 412, height: 915 }, fam: families[0] },
    { vp: { label: 'iphone-390x844', width: 390, height: 844 }, fam: families[1] },
    { vp: { label: 'android-412x915', width: 412, height: 915 }, fam: families[1] },
  ];
  const results = [];
  for (const c of cases) {
    provisionPair(qaPassword);
    results.push(await runCase(c.fam, c.vp, qaPassword));
  }
  const summary = {
    iphone: results.filter((r) => r.key.includes('iphone')).every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL',
    android: results.filter((r) => r.key.includes('android')).every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL',
  };
  const out = {
    summary,
    results,
    prod_sha: '5048d9e902266f758f59030e050fa48b46f1f3f4',
    cache: 'stjarndag-v768',
    ran_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts/activation-founder-responsive-qa.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(summary.iphone === 'PASS' && summary.android === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
