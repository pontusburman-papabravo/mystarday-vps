#!/usr/bin/env node
import { CONFIG } from '../lib/config.mjs';
import {
  listManifestFiles,
  loadManifest,
  planGeneration,
} from '../lib/manifest.mjs';
import { loadState } from '../lib/state.mjs';
import {
  parseArgs,
  requireFilmSelection,
  printPlanSummary,
  printHelp,
} from '../lib/cli.mjs';

const { flags, options } = parseArgs();
if (flags.has('help')) {
  printHelp('dry-run');
  process.exit(0);
}

const manifestFiles = requireFilmSelection(listManifestFiles(), options.film);
const bundles = manifestFiles.map((filePath) => {
  const { manifest } = loadManifest(filePath);
  return { manifest, state: loadState(manifest.id) };
});

const plan = planGeneration(bundles);
printPlanSummary(plan, { estimatedCostPerScene: CONFIG.estimatedCostPerSceneUsd });

console.log('Dry-run only — no API calls or ffmpeg rendering.');
console.log('Next steps:');
console.log('  npm run test:placeholders   # verify ffmpeg pipeline without API cost');
console.log('  npm run generate -- --confirm   # billable Pika generation');
console.log('  npm run render                # final ffmpeg export');
