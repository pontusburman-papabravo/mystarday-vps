#!/usr/bin/env node
/**
 * ACT-1 PR2 checkpoint — prod smoke (API + assets).
 * Usage:
 *   node scripts/pr2-checkpoint.mjs
 *   PR2_EMAIL=x@y.z PR2_PASSWORD=secret node scripts/pr2-checkpoint.mjs
 */
const base = process.env.APP_URL || 'https://mystarday.se';
const email = process.env.PR2_EMAIL;
const password = process.env.PR2_PASSWORD;

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
}
function fail(name, err) {
  results.push({ name, ok: false, err: String(err) });
}

async function main() {
  try {
    const sw = await fetch(`${base}/sw.js`, { cache: 'no-store' }).then((r) => r.text());
    const m = sw.match(/CACHE_NAME = '(stjarndag-v\d+)'/);
    pass('sw_version', m ? m[1] : 'unknown');
  } catch (e) {
    fail('sw_version', e.message);
  }

  for (const [path, needle] of [
    ['/js/onboarding-activation.js?v=1.3.0', 'confirmHandoffSkip'],
    ['/js/onboarding-first-star.js?v=1.0.0', 'patchStep6Btn'],
    ['/admin/admin-analytics.js', 'activation-funnel'],
    ['/js/planning-back-nav.js', 'planFromPlanning'],
  ]) {
    try {
      const r = await fetch(`${base}${path.split('?')[0]}`, { cache: 'no-store' });
      const text = await r.text();
      if (!r.ok) fail(`asset ${path}`, `HTTP ${r.status}`);
      else if (needle && !text.includes(needle)) fail(`asset ${path}`, `missing ${needle}`);
      else pass(`asset ${path}`, r.status);
    } catch (e) {
      fail(`asset ${path}`, e.message);
    }
  }

  if (!email || !password) {
    fail('auth', 'Set PR2_EMAIL + PR2_PASSWORD for API checkpoint');
    printSummary();
    process.exit(results.some((r) => !r.ok) ? 1 : 0);
    return;
  }

  const jar = {};
  const apply = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar[pair.slice(0, i)] = pair.slice(i + 1);
    }
  };
  const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

  try {
    let r = await fetch(`${base}/api/auth/csrf-token`);
    apply(r);
    let { token } = await r.json();
    r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: cookie() },
      body: JSON.stringify({ email, password }),
    });
    apply(r);
    if (!r.ok) throw new Error(`login ${r.status}`);
    pass('login', email);

    r = await fetch(`${base}/api/family/activation-config`, { headers: { Cookie: cookie() } });
    const cfg = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(cfg));
    pass('activation_config', cfg.flags);

    const flagsOk = cfg.flags?.activation_child_handoff_v1 && cfg.flags?.activation_first_star_guide_v1;
    if (!flagsOk) fail('pr2_flags', 'handoff or first_star flag off');

    r = await fetch(`${base}/api/auth/csrf-token`, { headers: { Cookie: cookie() } });
    apply(r);
    const csrf = jar.csrf_token;

    const children = await fetch(`${base}/api/children`, { headers: { Cookie: cookie() } }).then((x) => x.json());
    const childId = Array.isArray(children) && children[0]?.id;
    if (!childId) throw new Error('no child for child-access test');

    r = await fetch(`${base}/api/onboarding/child-access-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie(), 'X-CSRF-Token': csrf },
      body: JSON.stringify({ child_id: childId, source: 'pr2_checkpoint' }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(body));
    pass('child_access_complete', { childId, idempotent: body.success === true });

    r = await fetch(`${base}/api/family/activation-config`, { headers: { Cookie: cookie() } });
    const cfg2 = await r.json();
    pass('funnel_step_after_access', cfg2.funnel_step);
    if (cfg2.funnel_step !== 'child_access' && cfg2.funnel_step !== 'first_completion' && cfg2.funnel_step !== 'p0_activated') {
      fail('funnel_step', `expected child_access+, got ${cfg2.funnel_step}`);
    }
  } catch (e) {
    fail('api_flow', e.message);
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(JSON.stringify({ summary: { ok, fail: bad }, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
