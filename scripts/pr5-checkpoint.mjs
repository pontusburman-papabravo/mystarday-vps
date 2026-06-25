#!/usr/bin/env node
/**
 * ACT-1 PR5 checkpoint — nudges + admin experiment assets.
 * Usage:
 *   node scripts/pr5-checkpoint.mjs
 */
const base = process.env.APP_URL || 'https://mystarday.se';

const results = [];
const pass = (name, detail) => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, err: String(err) });

async function main() {
  for (const [path, needles] of [
    ['/admin/admin-analytics.js', ['loadActivationFunnel', 'loadActivationExperiment', 'activation-funnel']],
    ['/js/onboarding-starter-plan.js', ['used_ai']],
  ]) {
    try {
      const text = await fetch(`${base}${path}`, { cache: 'no-store' }).then((r) => r.text());
      if (!text) fail(`asset ${path}`, 'empty');
      else {
        const missing = needles.filter((n) => !text.includes(n));
        if (missing.length) fail(`asset ${path}`, `missing ${missing.join(', ')}`);
        else pass(`asset ${path}`, needles.length);
      }
    } catch (e) {
      fail(`asset ${path}`, e.message);
    }
  }

  try {
    const sw = await fetch(`${base}/sw.js`, { cache: 'no-store' }).then((r) => r.text());
    const m = sw.match(/CACHE_NAME = '(stjarndag-v\d+)'/);
    pass('sw_version', m ? m[1] : 'unknown');
  } catch (e) {
    fail('sw_version', e.message);
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
