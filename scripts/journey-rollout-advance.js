#!/usr/bin/env node
/**
 * Advance Family Journey rollout by one wave (ops).
 * Usage:
 *   NODE_ENV=development node scripts/journey-rollout-advance.js
 *   NODE_ENV=development node scripts/journey-rollout-advance.js --wave 3
 *   NODE_ENV=development node scripts/journey-rollout-advance.js --all
 */
'use strict';

require('../src/lib/load-env').loadEnvFile();

const {
  getRolloutStatus,
  advanceOneWave,
  enableWaveUpTo,
  runHealthChecks,
} = require('../src/lib/journey/rollout');

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const waveIdx = args.indexOf('--wave');
  const targetWave = waveIdx >= 0 ? parseInt(args[waveIdx + 1], 10) : null;
  const minHours = args.includes('--prod') ? 24 : 0;

  const before = await getRolloutStatus();
  console.log('[journey-rollout] Current wave:', before.active_wave, '/', 5);

  const health = await runHealthChecks();
  console.log('[journey-rollout] Health:', health.ok ? 'OK' : 'FAIL', JSON.stringify(health.checks));

  if (!health.ok && !args.includes('--force')) {
    console.error('[journey-rollout] Abort — fix health checks or pass --force');
    process.exit(1);
  }

  if (all) {
    for (let w = before.active_wave + 1; w <= 5; w++) {
      const r = await enableWaveUpTo(w);
      console.log('[journey-rollout] Enabled wave', w, '— active:', r.active_wave);
    }
  } else if (targetWave) {
    const r = await enableWaveUpTo(targetWave);
    console.log('[journey-rollout] Enabled up to wave', targetWave, '— active:', r.active_wave);
  } else {
    const r = await advanceOneWave({ minObservationHours: minHours });
    if (!r.ok) {
      console.error('[journey-rollout] Advance failed:', r.error, r.hours_remaining || '');
      process.exit(1);
    }
    console.log('[journey-rollout] Advanced to wave', r.enabled_wave);
  }

  const after = await getRolloutStatus();
  console.log('[journey-rollout] Phase distribution:', after.phase_distribution);
  console.log('[journey-rollout] Done. Active wave:', after.active_wave);
}

main().catch((err) => {
  console.error('[journey-rollout] Fatal:', err);
  process.exit(1);
});
