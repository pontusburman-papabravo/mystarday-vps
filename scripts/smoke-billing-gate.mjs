/**
 * HTTP smoke: BILLING_UI_DISABLED gates routes + API flag.
 * Credentials: scripts/lib/qa-test-accounts.mjs (defaults on localhost).
 */
import { resolveSmokeCredentials } from './lib/qa-test-accounts.mjs';

const smoke = resolveSmokeCredentials();
const BASE = smoke.base;
const EMAIL = smoke.parentEmail;
const PASSWORD = smoke.parentPassword;

if (!EMAIL || !PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD (required on prod base URL)');
  process.exit(1);
}

let cookieJar = '';

function absorb(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const single = res.headers.get('set-cookie');
  const list = raw.length ? raw : single ? [single] : [];
  const map = new Map();
  if (cookieJar) {
    cookieJar.split('; ').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1));
    });
  }
  list.forEach((line) => {
    const part = line.split(';')[0];
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  });
  cookieJar = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchJson(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookieJar) headers.cookie = cookieJar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: 'manual' });
  absorb(res);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

const results = [];
function pass(n, d) { results.push({ n, ok: true, d }); console.log(`✓ ${n}${d ? ` — ${d}` : ''}`); }
function fail(n, d) { results.push({ n, ok: false, d }); console.error(`✗ ${n} — ${d}`); }

async function main() {
  console.log('Billing gate smoke:', BASE);

  for (const path of ['/pricing-info', '/upgrade']) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    if (res.status === 302 && loc.includes('/dashboard')) pass(`redirect ${path}`, loc);
    else fail(`redirect ${path}`, `${res.status} ${loc}`);
  }

  const csrf = await fetchJson('/api/auth/csrf-token');
  if (!csrf.res.ok) throw new Error('CSRF failed');
  const login = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf.body.csrfToken },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.res.ok) throw new Error('Login failed: ' + (login.body.error || login.res.status));
  pass('parent login API', EMAIL);

  const status = await fetchJson('/api/subscription/status');
  if (!status.res.ok) fail('subscription status', String(status.res.status));
  else if (status.body.billing_ui_enabled === false) {
    pass('billing_ui_enabled false', `tier=${status.body.tier}`);
  } else {
    fail('billing_ui_enabled', JSON.stringify(status.body.billing_ui_enabled));
  }

  if (status.body.upgrade_url) fail('upgrade_url hidden', status.body.upgrade_url);
  else pass('upgrade_url null', 'ok');

  if (status.body.price_monthly_sek != null) fail('price hidden', String(status.body.price_monthly_sek));
  else pass('price_monthly_sek null', 'ok');

  const failed = results.filter((r) => !r.ok);
  console.log(`\nPassed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
