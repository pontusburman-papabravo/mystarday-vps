#!/usr/bin/env node
/**
 * Inspect harvest.json for history payload before import.
 *
 * Usage:
 *   npm run verify:harvest-history -- --in ./Backup/... --family-id <uuid>
 */

const fs = require('fs');
const path = require('path');
const { countHistoryInHarvest } = require('../src/lib/harvest-history');

function parseArgs(argv) {
  const opts = { inDir: null, familyId: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
  }
  if (!opts.inDir || !opts.familyId) {
    console.error('Usage: npm run verify:harvest-history -- --in <dir> --family-id <uuid>');
    process.exit(1);
  }
  return opts;
}

const opts = parseArgs(process.argv);
const harvestPath = path.join(opts.inDir, 'families', opts.familyId, 'harvest.json');

if (!fs.existsSync(harvestPath)) {
  console.error(`Saknas: ${harvestPath}`);
  process.exit(1);
}

const harvest = JSON.parse(fs.readFileSync(harvestPath, 'utf8'));
const stats = countHistoryInHarvest(harvest.api);

console.log(`Fil: ${harvestPath}`);
console.log(`history_harvested_at: ${harvest.history_harvested_at || '(saknas)'}`);
console.log(`daily_log_details: ${stats.days} dag(ar), ${stats.items} aktivitetsrader, ${stats.errors} API-fel`);

if (!stats.hasDetails) {
  console.log('\n→ Kör: npm run harvest:history -- --in ... --family-id ...');
  process.exit(1);
}

if (stats.items === 0) {
  console.log('\n→ daily_log_details finns men inga items — kontrollera API-fel eller tom historik i prod');
  process.exit(1);
}

console.log('\n→ OK att köra import:harvest');
