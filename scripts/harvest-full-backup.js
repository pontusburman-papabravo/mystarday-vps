#!/usr/bin/env node
/**
 * Full production backup via admin API — all families, history, streaks, standard library.
 *
 * Does NOT require an existing backup dir. Re-fetches everything from prod (--refresh).
 * GDPR ZIP is skipped (prod export often 500); history comes from harvest:history API.
 *
 * Usage:
 *   set -a && source .env && set +a
 *   npm run harvest:full
 *   npm run harvest:full -- --out ./Backup/stjarndag-full-2026-06-08
 *
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD
 * Optional: MIGRATION_EXPORT_BASE_URL or --url (default https://stjarndag.polsia.app)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { listFamilyIds, loadHarvestJson, assessFamilyEnrichment } = require('./lib/harvest-family-ops');
const { countHistoryInHarvest } = require('../src/lib/harvest-history');

function parseArgs(argv) {
  const date = new Date().toISOString().slice(0, 10);
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://stjarndag.polsia.app',
    out: path.join(process.cwd(), 'Backup', `stjarndag-full-${date}`),
    familyDelayMs: 4000,
    skipLibrary: false,
    dumpVpsDb: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if ((argv[i] === '--out' || argv[i] === '--in') && argv[i + 1]) {
      opts.out = path.resolve(argv[++i]);
    } else if (argv[i] === '--family-delay-ms' && argv[i + 1]) {
      opts.familyDelayMs = parseInt(argv[++i], 10) || 4000;
    } else if (argv[i] === '--skip-library') opts.skipLibrary = true;
    else if (argv[i] === '--dump-vps-db') opts.dumpVpsDb = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Full prod backup (base + history + streaks + standard library).

Options:
  --out <dir>              Output directory (default: ./Backup/stjarndag-full-YYYY-MM-DD)
  --url <base>             Prod URL (default: https://stjarndag.polsia.app)
  --family-delay-ms <n>    Pause between families in phase 1 (default: 4000)
  --skip-library           Skip global-library.json (default_* tables)
  --dump-vps-db            Also pg_dump local DATABASE_URL next to harvest (VPS snapshot)

Env: ADMIN_EMAIL, ADMIN_PASSWORD

Phases:
  1. migration:harvest --refresh --skip-gdpr  (all families, all API endpoints)
  2. harvest:complete --force --with-library  (daily_log_details + streaks per family)

Then import on VPS:
  npm run import:library -- --in <out>
  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in <out> --replace-schedules --replace-redemptions
`);
      process.exit(0);
    }
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD required (e.g. in .env)');
    process.exit(1);
  }
  return opts;
}

function runNode(scriptName, extraArgs = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

function writeManifest(opts, startedAt) {
  const familyIds = listFamilyIds(opts.out);
  let totalHistoryItems = 0;
  let complete = 0;
  let incomplete = [];

  for (const id of familyIds) {
    const harvestPath = path.join(opts.out, 'families', id, 'harvest.json');
    const harvest = loadHarvestJson(harvestPath);
    if (!harvest) continue;
    const stats = countHistoryInHarvest(harvest.api || {});
    totalHistoryItems += stats.items;
    const assessment = assessFamilyEnrichment(harvest);
    if (assessment.complete) complete++;
    else incomplete.push({ id, name: harvest.family_name, missing: assessment.missing });
  }

  const manifest = {
    type: 'stjarndag-full-harvest-backup',
    created_at: new Date().toISOString(),
    started_at: startedAt,
    base_url: opts.baseUrl,
    out_dir: opts.out,
    family_count: familyIds.length,
    families_complete: complete,
    families_incomplete: incomplete.length,
    total_daily_log_items_in_harvest: totalHistoryItems,
    has_global_library: fs.existsSync(path.join(opts.out, 'global-library.json')),
    has_index: fs.existsSync(path.join(opts.out, 'index.json')),
    has_enrich_index: fs.existsSync(path.join(opts.out, 'enrich-index.json')),
    not_included: [
      'gdpr-export.zip (skipped — prod /api/account/export-data often 500)',
      'parent passwords (import uses HARVEST_IMPORT_PASSWORD)',
      'child PIN hashes',
      'push_subscriptions',
      'refresh_token / sessions',
      'profile images (R2 files)',
      'pedagog_invite, family_invite tokens',
      'admin analytics, audit logs, email templates',
      'stripe_customer_id / revenuecat linkage',
    ],
    incomplete_families: incomplete.slice(0, 50),
    import_commands: [
      `npm run import:library -- --in ${opts.out}`,
      `HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.out} --replace-schedules --replace-redemptions`,
    ],
  };

  const manifestPath = path.join(opts.out, 'backup-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

function dumpVpsDatabase(outDir) {
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: --dump-vps-db utan DATABASE_URL — hoppar över pg_dump');
    return false;
  }
  const dest = path.join(outDir, `vps-database-${new Date().toISOString().slice(0, 10)}.sql`);
  console.log(`\n[pg_dump] Sparar VPS-databas → ${dest}`);
  const result = spawnSync('pg_dump', [process.env.DATABASE_URL, '-f', dest], {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

async function main() {
  const opts = parseArgs(process.argv);
  const startedAt = new Date().toISOString();

  fs.mkdirSync(path.join(opts.out, 'families'), { recursive: true });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Min Stjärndag — FULL BACKUP från prod');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  URL:  ${opts.baseUrl}`);
  console.log(`  Ut:   ${opts.out}`);
  console.log(`  Tid:  flera timmar för ~110 familjer (avbryt med Ctrl+C, kör om samma kommando)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('[fas 1/2] Base harvest — alla familjer, alla API-endpoints ...\n');
  const phase1 = runNode('migration-harvest-cli.js', [
    '--url',
    opts.baseUrl,
    '--out',
    opts.out,
    '--refresh',
    '--skip-gdpr',
    '--delay-ms',
    String(opts.familyDelayMs),
  ]);
  if (!phase1) {
    console.error('\nFas 1 misslyckades. Fixa fel och kör om npm run harvest:full');
    process.exit(1);
  }

  console.log('\n[fas 2/2] History + streaks + standardbibliotek ...\n');
  const completeArgs = [
    '--url',
    opts.baseUrl,
    '--in',
    opts.out,
    '--skip-base',
    '--force',
    '--no-resume',
  ];
  if (!opts.skipLibrary) completeArgs.push('--with-library');
  const phase2 = runNode('harvest-complete-all.js', completeArgs);
  if (!phase2) {
    console.error('\nFas 2 misslyckades delvis. Kör om:');
    console.error(`  npm run harvest:complete -- --in ${opts.out} --skip-base --force --with-library`);
    process.exit(1);
  }

  if (opts.dumpVpsDb) {
    dumpVpsDatabase(opts.out);
  }

  const manifest = writeManifest(opts, startedAt);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BACKUP KLAR');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Familjer:        ${manifest.family_count}`);
  console.log(`  Kompletta:       ${manifest.families_complete}`);
  console.log(`  Ofullständiga:   ${manifest.families_incomplete}`);
  console.log(`  History-rader:   ~${manifest.total_daily_log_items_in_harvest}`);
  console.log(`  Standardbibl.:   ${manifest.has_global_library ? 'ja' : 'nej'}`);
  console.log(`  Manifest:        ${path.join(opts.out, 'backup-manifest.json')}`);
  if (manifest.families_incomplete > 0) {
    console.log('\n  Ofullständiga familjer (se backup-manifest.json):');
    for (const row of manifest.incomplete_families.slice(0, 10)) {
      console.log(`    - ${row.name}: ${row.missing.join(', ')}`);
    }
  }
  console.log('\n  Importera på VPS:');
  for (const cmd of manifest.import_commands) {
    console.log(`    ${cmd}`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('harvest:full failed:', err.message);
  process.exit(1);
});
