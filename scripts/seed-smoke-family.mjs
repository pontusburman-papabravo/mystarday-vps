/**
 * Seed smoke-test family (parent + two children) for mobile QA.
 * Idempotent: skips register if login already works.
 *
 * Usage:
 *   export SMOKE_PARENT_EMAIL="qa.mobil@test.stjarndag.local"
 *   export SMOKE_PARENT_PASSWORD="QaMobilTest2026!Secure"
 *   export SMOKE_CHILD_NAME="Astrid"
 *   export SMOKE_CHILD_PIN="1112"
 *   export SMOKE_CHILD2_NAME="Erik"
 *   export SMOKE_CHILD2_PIN="2233"
 *   node scripts/seed-smoke-family.mjs
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PASSWORD = process.env.SMOKE_PARENT_PASSWORD;
const PARENT_NAME = process.env.SMOKE_PARENT_NAME || 'QA Mobil';
const CHILDREN = [
  {
    name: process.env.SMOKE_CHILD_NAME || 'Astrid',
    pin: process.env.SMOKE_CHILD_PIN || '4829',
    emoji: '⭐',
    birthday: '2016-05-15',
  },
  {
    name: process.env.SMOKE_CHILD2_NAME || 'Erik',
    pin: process.env.SMOKE_CHILD2_PIN || '7391',
    emoji: '🚀',
    birthday: '2018-03-20',
  },
];

if (!EMAIL || !PASSWORD) {
  console.error('Set SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

let cookieJar = '';

function absorbCookies(res) {
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

async function jsonFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookieJar) headers.cookie = cookieJar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  absorbCookies(res);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function ensureCsrf() {
  const { res, body } = await jsonFetch('/api/auth/csrf-token');
  if (!res.ok) throw new Error('CSRF token fetch failed');
  return body.csrfToken;
}

async function ensureParent() {
  await ensureCsrf();
  let { res, body } = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (res.ok) {
    console.log('Parent login OK (existing account)');
    return;
  }

  ({ res, body } = await jsonFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: PARENT_NAME }),
  }));
  if (!res.ok) {
    throw new Error(`Register failed: ${body.error || res.status}`);
  }
  console.log('Registered parent:', EMAIL);

  await ensureCsrf();
  ({ res, body } = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }));
  if (!res.ok) throw new Error(`Login after register failed: ${body.error}`);
}

async function ensureChild(spec) {
  const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: cookieJar } });
  const me = await meRes.json();
  const existing = (me.children || []).find(
    (c) => (c.name || '').toLowerCase() === spec.name.toLowerCase()
  );
  if (existing) {
    console.log('Child exists:', existing.name, existing.id);
    return existing;
  }

  const csrf = await ensureCsrf();
  const { res, body } = await jsonFetch('/api/children', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: JSON.stringify({
      name: spec.name,
      emoji: spec.emoji,
      birthday: spec.birthday,
      pin: spec.pin,
    }),
  });
  if (!res.ok) throw new Error(`Create child ${spec.name} failed: ${body.error || res.status}`);
  console.log('Created child:', body.name || spec.name, 'PIN', spec.pin);
  return body;
}

async function verifyChildLogin(spec) {
  const { res, body } = await jsonFetch('/api/auth/child-login', {
    method: 'POST',
    body: JSON.stringify({ username: spec.name.toLowerCase(), pin: spec.pin }),
  });
  if (!res.ok) throw new Error(`Child login ${spec.name} failed: ${body.error || res.status}`);
  console.log('Child login OK:', body.name || spec.name);
}

async function main() {
  console.log('Seeding smoke family (2 children) at', BASE);
  await ensureParent();
  const created = [];
  for (const spec of CHILDREN) {
    created.push(await ensureChild(spec));
    await verifyChildLogin(spec);
  }

  console.log('\n--- QA credentials ---');
  console.log('Parent email:', EMAIL);
  console.log('Parent password:', PASSWORD);
  for (const spec of CHILDREN) {
    console.log(`Child ${spec.name}: PIN ${spec.pin}`);
  }
  console.log('Children IDs:', created.map((c) => `${c.name}=${c.id}`).join(', '));
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
