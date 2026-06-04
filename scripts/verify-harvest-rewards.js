#!/usr/bin/env node
/**
 * Inspect harvest.json for family rewards before import.
 *
 * Usage:
 *   npm run verify:harvest-rewards -- --in ./Backup/... --family-id <uuid>
 */

const fs = require('fs');
const path = require('path');
const { unwrapApiList } = require('../src/lib/harvest-import');

function parseArgs(argv) {
  const opts = { inDir: null, familyId: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
  }
  if (!opts.inDir || !opts.familyId) {
    console.error('Usage: npm run verify:harvest-rewards -- --in <dir> --family-id <uuid>');
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
const rewards = unwrapApiList(harvest.api?.rewards, 'rewards');
const rawType = harvest.api?.rewards == null ? 'saknas' : Array.isArray(harvest.api.rewards) ? 'array' : typeof harvest.api.rewards;

console.log(`Fil: ${harvestPath}`);
console.log(`api.rewards format: ${rawType}`);
console.log(`Belöningar i harvest: ${rewards.length}`);

if (rewards.length) {
  for (const r of rewards.slice(0, 8)) {
    console.log(`  - ${r.name} (${r.star_cost ?? r.star_value ?? '?'}⭐)`);
  }
  if (rewards.length > 8) console.log(`  ... +${rewards.length - 8} till`);
}

if (!rewards.length) {
  console.log('\n→ Saknar belöningar i harvest.json — kör om migration:harvest för familjen');
  process.exit(1);
}

console.log('\n→ Importera:');
console.log(
  `  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`
);
