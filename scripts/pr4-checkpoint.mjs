#!/usr/bin/env node
/**
 * ACT-1 PR4 checkpoint — AI personalize API smoke.
 * Usage:
 *   PR4_EMAIL=x PR4_PASSWORD=y node scripts/pr4-checkpoint.mjs
 */
const base = process.env.APP_URL || 'https://mystarday.se';
const email = process.env.PR4_EMAIL || process.env.PR3_EMAIL || process.env.PR2_EMAIL;
const password = process.env.PR4_PASSWORD || process.env.PR3_PASSWORD || process.env.PR2_PASSWORD;

const results = [];
const pass = (name, detail) => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, err: String(err) });

async function main() {
  try {
    const js = await fetch(`${base}/js/onboarding-starter-plan.js`, { cache: 'no-store' }).then((r) => r.text());
    if (!js.includes('starter-plan/personalize')) fail('starter_plan_js', 'missing personalize call');
    else if (!js.includes('activation_ai_starter_plan')) fail('starter_plan_js', 'missing AI flag guard');
    else pass('starter_plan_js', 'personalize + AI guard');
  } catch (e) {
    fail('starter_plan_js', e.message);
  }

  if (!email || !password) {
    fail('auth', 'Set PR4_EMAIL + PR4_PASSWORD');
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
    if (!cfg.flags?.activation_ai_starter_plan) fail('ai_flag', 'activation_ai_starter_plan off');
    else pass('activation_ai_starter_plan', true);

    r = await fetch(`${base}/api/auth/csrf-token`, { headers: { Cookie: cookie() } });
    apply(r);
    const csrf = jar.csrf_token;

    const answers = {
      age_band: '6-8',
      routine_type_ui: 'morgon',
      support_ui: 'lite',
      length_ui: 'normal',
      main_challenge: 'focus',
      free_text: 'Test från pr4-checkpoint',
    };

    r = await fetch(`${base}/api/onboarding/starter-plan/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie(), 'X-CSRF-Token': csrf },
      body: JSON.stringify(answers),
    });
    const suggest = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(suggest));
    pass('suggest', { scheduleName: suggest.scheduleName });

    r = await fetch(
      `${base}/api/onboarding/starter-plan/preview?scheduleName=${encodeURIComponent(suggest.scheduleName)}&desiredLength=normal`,
      { headers: { Cookie: cookie() } },
    );
    const preview = await r.json();
    if (!r.ok || !preview.items?.length) throw new Error('preview failed');
    pass('preview', { count: preview.items.length });

    r = await fetch(`${base}/api/onboarding/starter-plan/personalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie(), 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        child_name: 'Testbarn',
        schedule_name: suggest.scheduleName,
        base_items: preview.items,
        ...answers,
      }),
    });
    const pers = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(pers));
    if (!Array.isArray(pers.items) || !pers.items.length) fail('personalize', 'no items');
    else if (typeof pers.used_ai !== 'boolean') fail('personalize', 'missing used_ai');
    else {
      pass('personalize', {
        used_ai: pers.used_ai,
        fallback_reason: pers.fallback_reason || null,
        item_count: pers.items.length,
        plan_title: pers.plan_title ? 'set' : 'missing',
      });
    }
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
