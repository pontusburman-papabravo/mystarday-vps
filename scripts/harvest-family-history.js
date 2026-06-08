#!/usr/bin/env node
/**
 * Fetch completion/star history via daily-log API and merge into harvest.json.
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:history -- \
 *     --in ./Backup/stjarndag-harvest-2026-06-02 \
 *     --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
 *
 * All families: npm run harvest:complete -- --in ./Backup/...
 */

const path = require('path');
const {
  adminLogin,
  ensureAdminSession,
} = require('./lib/migration-http');
const {
  impersonateFamily,
  resolveFamilyHarvestPath,
  loadHarvestJson,
  saveHarvestJson,
  harvestFamilyHistoryInto,
} = require('./lib/harvest-family-ops');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://stjarndag.polsia.app',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    inDir: null,
    familyId: null,
    delayMs: 250,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--delay-ms' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 250;
    else if (argv[i] === '--force') opts.force = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Harvest daily_log_item history via API into harvest.json.

Options:
  --url, --email, --password   Admin credentials
  --in <dir>                   Harvest dir (families/<uuid>/harvest.json)
  --family-id <uuid>           One family (required)
  --force                      Re-fetch all days
  --delay-ms <n>               Pause between requests (default 250)

All families: npm run harvest:complete -- --in <dir>
`);
      process.exit(0);
    }
  }
  if (!opts.inDir || !opts.familyId) {
    console.error('ERROR: --in and --family-id are required (or use npm run harvest:complete)');
    process.exit(1);
  }
  if (!opts.email || !opts.password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD required');
    process.exit(1);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  const harvestPath = resolveFamilyHarvestPath(opts.inDir, opts.familyId);
  const harvest = loadHarvestJson(harvestPath);

  if (!harvest?.api?.family?.children?.length) {
    console.error(`ERROR: ${harvestPath} saknar barn — kör migration:harvest först`);
    process.exit(1);
  }

  console.log(`Loggar in som admin mot ${opts.baseUrl} ...`);
  const session = await adminLogin(opts.baseUrl, opts.email, opts.password);
  await ensureAdminSession(session);
  const bearer = await impersonateFamily(opts.baseUrl, session.jar, session.csrfToken, opts.familyId);

  const { totalDays, totalItems } = await harvestFamilyHistoryInto(harvest, {
    baseUrl: opts.baseUrl,
    bearer,
    delayMs: opts.delayMs,
    force: opts.force,
  });

  saveHarvestJson(harvestPath, harvest);

  console.log(`\nKlart → ${harvestPath}`);
  console.log(`  dagar: ${totalDays}  aktivitetsrader: ~${totalItems}`);
  console.log(`\nImportera:\n  npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`);
}

main().catch((err) => {
  console.error('harvest:history failed:', err.message);
  process.exit(1);
});
