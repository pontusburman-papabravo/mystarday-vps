#!/usr/bin/env node
'use strict';
/**
 * Provision a disposable prod QA household for founder English smoke.
 * Writes credentials to QA_ENV_OUT (default /tmp/cursor-qa-smoke.env) — never stdout secrets.
 */
const fs = require('fs');
const crypto = require('crypto');

const BASE = (process.env.SMOKE_BASE_URL || process.env.PROD_BASE || '').replace(/\/$/, '');
if (!BASE) {
  console.error(JSON.stringify({ ok: false, error: 'Set SMOKE_BASE_URL or PROD_BASE' }));
  process.exit(2);
}
const OUT = process.env.QA_ENV_OUT || '/tmp/cursor-qa-smoke.env';

function randDigits4() {
  let p;
  do {
    p = String(crypto.randomInt(1000, 10000));
  } while (/^(\d)\1{3}$/.test(p));
  return p;
}

function jar() {
  const m = new Map();
  return {
    store(r) {
      for (const c of r.headers.getSetCookie?.() || []) {
        const part = c.split(';')[0];
        const i = part.indexOf('=');
        if (i > 0) m.set(part.slice(0, i), part.slice(i + 1));
      }
    },
    h: () => [...m].map(([k, v]) => `${k}=${v}`).join('; '),
  };
}

async function exitFirstStarMode(childUser, childPin) {
  const cj = jar();
  const childLogin = await fetch(`${BASE}/api/auth/child-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: childUser, pin: childPin }),
  });
  cj.store(childLogin);
  const childLoginBody = await childLogin.json();
  if (childLogin.status !== 200 || !childLoginBody.csrfToken) return;
  const logRes = await fetch(`${BASE}/api/me/daily-log`, { headers: { Cookie: cj.h() } });
  const log = await logRes.json();
  const firstOpen = (log.items || []).find((i) => !i.completed);
  if (!firstOpen) return;
  await fetch(`${BASE}/api/me/daily-log-items/${firstOpen.id}/complete`, {
    method: 'PUT',
    headers: {
      Cookie: cj.h(),
      'X-CSRF-Token': childLoginBody.csrfToken,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
}

async function main() {
  const ts = Date.now();
  const email = `cursor-qa-en-${ts}@example.com`;
  const password = `CursorQa-${ts}-Aa1`;
  const parentPin = randDigits4();
  const childName = 'Astrid QA';

  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'Cursor QA English',
      preferred_locale: 'sv-SE',
    }),
  });
  if (reg.status !== 201) {
    const t = await reg.text();
    console.error(JSON.stringify({ ok: false, step: 'register', status: reg.status, hint: t.slice(0, 200) }));
    process.exit(1);
  }

  const cookies = jar();
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  cookies.store(loginRes);
  const loginBody = await loginRes.json();
  if (!loginBody.user) {
    console.error(JSON.stringify({ ok: false, step: 'login', status: loginRes.status }));
    process.exit(1);
  }
  const hdr = {
    'Content-Type': 'application/json',
    Cookie: cookies.h(),
    'X-CSRF-Token': loginBody.csrfToken,
  };

  const childRes = await fetch(`${BASE}/api/onboarding/child`, {
    method: 'POST',
    headers: hdr,
    body: JSON.stringify({ name: childName, emoji: '🌟' }),
  });
  const childBody = await childRes.json();
  if (childRes.status !== 201 && childRes.status !== 200) {
    console.error(JSON.stringify({ ok: false, step: 'child', status: childRes.status, code: childBody.code }));
    process.exit(1);
  }
  const childId = childBody.id;
  const childUser = childBody.username;
  const childPin = childBody.pin;
  if (!childUser || !childPin) {
    console.error(JSON.stringify({ ok: false, step: 'child', reason: 'missing_username_or_pin' }));
    process.exit(1);
  }

  const schedRes = await fetch(`${BASE}/api/onboarding/schedule`, {
    method: 'POST',
    headers: hdr,
    body: JSON.stringify({ child_id: childId, template_group: 'morgon' }),
  });
  if (schedRes.status !== 200 && schedRes.status !== 201) {
    const st = await schedRes.text();
    console.error(JSON.stringify({ ok: false, step: 'schedule', status: schedRes.status, hint: st.slice(0, 200) }));
    process.exit(1);
  }

  await fetch(`${BASE}/api/onboarding/complete`, { method: 'POST', headers: hdr, body: '{}' });

  const pinRes = await fetch(`${BASE}/api/family/set-pin`, {
    method: 'POST',
    headers: hdr,
    body: JSON.stringify({ pin: parentPin, confirmPin: parentPin }),
  });
  if (pinRes.status !== 200) {
    const pt = await pinRes.text();
    console.error(JSON.stringify({ ok: false, step: 'set-pin', status: pinRes.status, hint: pt.slice(0, 120) }));
    process.exit(1);
  }

  await exitFirstStarMode(childUser, childPin);

  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookies.h() } });
  const me = await meRes.json();

  const lines = [
    `export SMOKE_BASE_URL=${JSON.stringify(BASE)}`,
    `export PROD_BASE=${JSON.stringify(BASE)}`,
    `export FOUNDER_QA_EMAIL=${JSON.stringify(email)}`,
    `export FOUNDER_QA_PASSWORD=${JSON.stringify(password)}`,
    `export FOUNDER_CHILD_USERNAME=${JSON.stringify(childUser)}`,
    `export FOUNDER_CHILD_PIN=${JSON.stringify(childPin)}`,
    `export FOUNDER_PARENT_PIN=${JSON.stringify(parentPin)}`,
    'export FOUNDER_SMOKE_VPS=1',
  ];
  if (process.env.VPS_APP_PATH) {
    lines.push(`export VPS_APP_PATH=${JSON.stringify(process.env.VPS_APP_PATH)}`);
  }
  fs.writeFileSync(OUT, `${lines.join('\n')}\n`, { mode: 0o600 });

  console.log(
    JSON.stringify({
      ok: true,
      env_file: OUT,
      family_id: me.family_id,
      secrets: {
        FOUNDER_QA_EMAIL: 'SET',
        FOUNDER_QA_PASSWORD: 'SET',
        FOUNDER_CHILD_USERNAME: 'SET',
        FOUNDER_CHILD_PIN: 'SET',
        FOUNDER_PARENT_PIN: 'SET',
      },
    })
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
