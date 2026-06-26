#!/usr/bin/env node
/**
 * Run activation advisor once (metrics → admin alerts).
 *
 * Usage on VPS:
 *   node scripts/activation-advisor-run.js
 *   node scripts/activation-advisor-run.js --dry-run
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const {
  collectMetrics,
  buildRecommendations,
  runActivationAdvisor,
} = require('../src/lib/activation-advisor');

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    const metrics = await collectMetrics();
    const recommendations = await buildRecommendations(metrics);
    console.log(JSON.stringify({ metrics, recommendations }, null, 2));
    return;
  }

  const result = await runActivationAdvisor();
  console.log(JSON.stringify({
    saved: result.saved.map((r) => ({ slug: r.slug, title: r.title, severity: r.severity })),
    pruned: result.pruned,
    weekP0RatePct: result.metrics.weekP0RatePct,
    weekSignups: result.metrics.weekSignups,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[activation-advisor-run]', err);
    process.exit(1);
  });
