#!/usr/bin/env node
/**
 * ACT-1 PR3 checkpoint — template-first API smoke.
 * Usage:
 *   PR3_EMAIL=x PR3_PASSWORD=y node scripts/pr3-checkpoint.mjs
 */
const base = process.env.APP_URL || 'https://mystarday.se';
const email = process.env.PR3_EMAIL || process.env.PR2_EMAIL;
const password = process.env.PR3_PASSWORD || process.env.PR2_PASSWORD;

const results = [];
const pass = (name, detail) => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, err: String(err) });

async function main() {
  try {
    const js = await fetch(`${base}/js/onboarding-starter-plan.js`, { cache: 'no-store' }).then((r) => r.text());
    if (!js.includes('goToStep(5)')) fail('starter_plan_js', 'missing goToStep(5) handoff');
    else pass('starter_plan_js', 'handoff step 5');
  } catch (e) {
    fail('starter_plan_js', e.message);
  }

  if (!email || !password) {
    fail('auth', 'Set PR3_EMAIL + PR3_PASSWORD');
    printSummary();
    process.exit(1);
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
    if (!cfg.flags?.activation_onboarding_v1) fail('flag', 'activation_onboarding_v1 off');
    else pass('activation_onboarding_v1', true);

    r = await fetch(`${base}/api/auth/csrf-token`, { headers: { Cookie: cookie() } });
    apply(r);
    const csrf = jar.csrf_token;

    const body = {
      age_band: '6-8',
      routine_type_ui: 'morgon',
      support_ui: 'lite',
      length_ui: 'normal',
      main_challenge: 'focus',
      free_text: '',
    };

    r = await fetch(`${base}/api/onboarding/starter-plan/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie(), 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    });
    const suggest = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(suggest));
    pass('suggest', { scheduleName: suggest.scheduleName, slug: suggest.slug });

    r = await fetch(
      `${base}/api/onboarding/starter-plan/preview?scheduleName=${encodeURIComponent(suggest.scheduleName)}&desiredLength=normal`,
      { headers: { Cookie: cookie() } },
    );
    const preview = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(preview));
    if (!preview.items?.length) fail('preview', 'no items');
    else pass('preview', { count: preview.items.length });
  } catch (e) {
    fail('api_flow', e.message);
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  console.log(JSON.stringify({ summary: { ok: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length }, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
