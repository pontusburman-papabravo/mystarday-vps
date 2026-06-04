#!/usr/bin/env node
/**
 * Inspect harvest.json for weekly schedule payload before import.
 *
 * Usage:
 *   npm run verify:harvest-schedules -- --in ./Backup/... --family-id <uuid>
 */

const fs = require('fs');
const path = require('path');
const { countSchedulesInHarvest } = require('../src/lib/harvest-import');

function parseArgs(argv) {
  const opts = { inDir: null, familyId: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
  }
  if (!opts.inDir || !opts.familyId) {
    console.error('Usage: npm run verify:harvest-schedules -- --in <dir> --family-id <uuid>');
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
const stats = countSchedulesInHarvest(harvest.api);

console.log(`Fil: ${harvestPath}`);
console.log(`harvested_at: ${harvest.harvested_at || '(saknas)'}`);
console.log(`Totalt: ${stats.scheduleDays} veckodagar, ${stats.items} schemarader`);
if (stats.itemErrors) console.log(`API-fel: ${stats.itemErrors}`);

for (const c of stats.perChild) {
  if (c.error) {
    console.log(`  ${c.name}: FEL — ${c.error}`);
  } else {
    console.log(`  ${c.name}: ${c.days} dag(ar), ${c.items} aktiviteter i schema`);
  }
}

if (!stats.hasSchedules || stats.items === 0) {
  console.log('\n→ Saknar schemarader. Kör om harvest för familjen:');
  console.log(
    `  ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run migration:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`
  );
  process.exit(1);
}

console.log('\n→ Importera (ersätt befintliga barnscheman om de är tomma/fel):');
console.log(
  `  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId} --replace-schedules`
);
