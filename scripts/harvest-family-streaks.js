#!/usr/bin/env node
/**
 * Fetch streak data via GET /api/children/:id/progress and merge into harvest.json.
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:streaks -- \
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
  harvestFamilyStreaksInto,
} = require('./lib/harvest-family-ops');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://mystarday.se',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    inDir: null,
    familyId: null,
    delayMs: 200,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--delay-ms' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 200;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Harvest child streak via progress API into harvest.json.

Options:
  --url, --email, --password   Admin credentials
  --in <dir>                   Harvest dir (families/<uuid>/harvest.json)
  --family-id <uuid>           One family (required)
  --delay-ms <n>               Pause between requests (default 200)

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

  const results = await harvestFamilyStreaksInto(harvest, {
    baseUrl: opts.baseUrl,
    bearer,
    delayMs: opts.delayMs,
  });

  for (const row of results) {
    if (row.ok) {
      console.log(`  ${row.name}: streak=${row.current_streak}`);
    } else {
      console.log(`  ${row.name}: API-fel — ${row.error}`);
    }
  }

  saveHarvestJson(harvestPath, harvest);

  console.log(`\nKlart → ${harvestPath}`);
  console.log(
    `\nImportera:\n  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`
  );
}

main().catch((err) => {
  console.error('harvest:streaks failed:', err.message);
  process.exit(1);
});
