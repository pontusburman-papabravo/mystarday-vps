#!/usr/bin/env node
/**
 * Wave 5 add-child smoke — API only.
 * Registers a throwaway family, adds two children, asserts EXPANDING + handoff.
 *
 * Note: EXPANDING requires the family to already be BUILDING_ROUTINE+ when the
 * second child is added (real add-child path). Fresh registrations only prove
 * `second_child_created` milestone ingest. For full EXPANDING+handoff, set:
 *   SMOKE_PARENT_EMAIL / SMOKE_PARENT_PASSWORD (established family)
 *
 * Usage:
 *   APP_URL=<host> node scripts/smoke-journey-wave5-add-child.js
 *   SMOKE_PARENT_EMAIL=... SMOKE_PARENT_PASSWORD=... APP_URL=... node scripts/...
 */
'use strict';

const base = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const suffix = Date.now().toString(36);
const email = process.env.SMOKE_EMAIL || `journey-w5-${suffix}@example.com`;
const password = process.env.SMOKE_PASSWORD || `SmokeW5!${suffix}Aa`;

const parentEmail = process.env.SMOKE_PARENT_EMAIL;
const parentPassword = process.env.SMOKE_PARENT_PASSWORD;

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, msg) {
  checks.push({ name, ok: false, msg });
  console.log(`  ❌ ${name} — ${msg}`);
}

async function jsonFetch(path, opts = {}, cookie = '', csrf = '') {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

function extractCookies(setCookie) {
  if (!setCookie) return '';
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts.map((c) => c.split(';')[0]).join('; ');
}

async function main() {
  console.log(`[wave5-smoke] APP_URL=${base}`);

  if (parentEmail && parentPassword) {
    await runEstablishedFamilySmoke();
    return;
  }

  console.log(`[wave5-smoke] email=${email}`);

  const reg = await jsonFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name: 'Wave5 Smoke',
      family_name: 'Wave5 Testfamilj',
    }),
  });
  if (!reg.ok) {
    fail('register', `${reg.status} ${reg.body?.error || 'failed'}`);
    process.exit(1);
  }
  pass('register', email);

  let cookie = extractCookies(reg.headers.getSetCookie?.() || reg.headers.raw?.()['set-cookie']);
  let csrf = reg.body?.csrfToken || '';

  const login = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    fail('login', `${login.status}`);
    process.exit(1);
  }
  cookie = extractCookies(login.headers.getSetCookie?.() || login.headers.raw?.()['set-cookie']) || cookie;
  csrf = login.body?.csrfToken || csrf;
  pass('login');

  async function addChild(name) {
    const res = await jsonFetch('/api/onboarding/child', {
      method: 'POST',
      body: JSON.stringify({ name, emoji: '🧪', birthday: '2019-01-15' }),
    }, cookie, csrf);
    if (!res.ok) throw new Error(`add child ${name}: ${res.status} ${res.body?.error || ''}`);
    return res.body;
  }

  let child1;
  let child2;
  try {
    child1 = await addChild('SmokeBarn1');
    pass('add_child_1', child1.id);
    child2 = await addChild('SmokeBarn2');
    pass('add_child_2', child2.id);
  } catch (err) {
    fail('add_child', err.message);
    process.exit(1);
  }

  const ctx = await jsonFetch('/api/me/journey-context', {}, cookie, csrf);
  if (!ctx.ok) {
    fail('journey_context', `${ctx.status}`);
    process.exit(1);
  }

  const phase = ctx.body?.phase;
  const milestones = ctx.body?.milestones || {};
  const blocking = ctx.body?.blocking_experience;
  const caps = ctx.body?.capabilities || {};

  if (milestones.second_child_created) {
    pass('milestone_second_child_created', milestones.second_child_created);
  } else {
    fail('milestone_second_child_created', 'missing');
  }

  if (phase === 'EXPANDING') {
    pass('phase_EXPANDING', phase);
  } else {
    fail('phase_EXPANDING', `got ${phase}`);
  }

  if (blocking === 'handoff_to_child') {
    pass('blocking_handoff_to_child', blocking);
  } else if (ctx.body?.recommended_experiences?.includes('handoff_to_child')) {
    pass('blocking_handoff_to_child', 'recommended handoff (non-blocking)');
  } else {
    fail('blocking_handoff_to_child', `blocking=${blocking}, rec=${JSON.stringify(ctx.body?.recommended_experiences)}`);
  }

  if (caps.activation_ui_removed) {
    pass('capability_activation_ui_removed');
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n[wave5-smoke] ${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

/** Established family: add one child → EXPANDING + handoff (Wave 5 golden path). */
async function runEstablishedFamilySmoke() {
  console.log(`[wave5-smoke] established family=${parentEmail}`);

  const login = await jsonFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: parentEmail, password: parentPassword }),
  });
  if (!login.ok) {
    fail('login', `${login.status}`);
    process.exit(1);
  }
  const cookie = extractCookies(login.headers.getSetCookie?.() || login.headers.raw?.()['set-cookie']);
  const csrf = login.body?.csrfToken || '';
  pass('login');

  const before = await jsonFetch('/api/me/journey-context', {}, cookie, csrf);
  const beforePhase = before.body?.phase;
  pass('context_before', beforePhase);

  const childName = `Wave5Smoke${Date.now().toString(36).slice(-4)}`;
  let childId;
  try {
    const added = await jsonFetch('/api/onboarding/child', {
      method: 'POST',
      body: JSON.stringify({ name: childName, emoji: '🧪', birthday: '2020-03-15' }),
    }, cookie, csrf);
    if (!added.ok) throw new Error(`${added.status} ${added.body?.error || ''}`);
    childId = added.body.id;
    pass('add_child', childId);
  } catch (err) {
    fail('add_child', err.message);
    process.exit(1);
  }

  const ctx = await jsonFetch('/api/me/journey-context', {}, cookie, csrf);
  const phase = ctx.body?.phase;
  const blocking = ctx.body?.blocking_experience;

  if (phase === 'EXPANDING') pass('phase_EXPANDING', phase);
  else fail('phase_EXPANDING', `got ${phase} (was ${beforePhase})`);

  if (blocking === 'handoff_to_child') pass('blocking_handoff_to_child', blocking);
  else fail('blocking_handoff_to_child', `blocking=${blocking}`);

  if (childId) {
    const del = await jsonFetch(`/api/family/children/${childId}`, { method: 'DELETE' }, cookie, csrf);
    if (del.ok) pass('cleanup_delete_child', childId);
    else fail('cleanup_delete_child', `${del.status}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n[wave5-smoke] ${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('[wave5-smoke] Fatal:', err);
  process.exit(1);
});
