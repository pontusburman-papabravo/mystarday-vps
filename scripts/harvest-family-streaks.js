#!/usr/bin/env node
/**
 * Fetch streak data via GET /api/children/:id/progress and merge into harvest.json.
 * Use when harvest.json lacks api.child_progress (older migration:harvest runs).
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:streaks -- \
 *     --url https://mystarday.se \
 *     --in ./Backup/stjarndag-harvest-2026-06-02 \
 *     --family-id 5fa79406-0e65-4bce-bcb0-6c65e27a0af9
 */

const fs = require('fs');
const path = require('path');
const {
  apiRequest,
  readJson,
  adminLogin,
  ensureAdminSession,
  sleep,
} = require('./lib/migration-http');

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
  --family-id <uuid>           One family
  --delay-ms <n>               Pause between requests (default 200)

Then import:
  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in <dir> --family-id <uuid>
`);
      process.exit(0);
    }
  }
  if (!opts.inDir || !opts.familyId) {
    console.error('ERROR: --in and --family-id are required');
    process.exit(1);
  }
  if (!opts.email || !opts.password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD required');
    process.exit(1);
  }
  return opts;
}

async function fetchJson(base, apiPath, bearer) {
  const res = await apiRequest(base, apiPath, { bearer });
  const body = await readJson(res);
  return { ok: res.ok, status: res.status, body, error: body.error || body._raw };
}

async function impersonate(base, jar, csrf, familyId) {
  const res = await apiRequest(base, `/api/admin/impersonate/${familyId}`, {
    method: 'POST',
    jar,
    csrf,
    body: {},
  });
  const body = await readJson(res);
  if (!res.ok || !body.token) throw new Error(body.error || 'Impersonate failed');
  return body.token;
}

async function main() {
  const opts = parseArgs(process.argv);
  const familyDir = path.join(opts.inDir, 'families', opts.familyId);
  const harvestPath = path.join(familyDir, 'harvest.json');

  if (!fs.existsSync(harvestPath)) {
    console.error(`ERROR: ${harvestPath} not found — run migration:harvest first`);
    process.exit(1);
  }

  const harvest = JSON.parse(fs.readFileSync(harvestPath, 'utf8'));
  const children = harvest.api?.family?.children || [];
  if (!children.length) {
    console.error('ERROR: harvest.json saknar barn');
    process.exit(1);
  }

  console.log(`Loggar in som admin mot ${opts.baseUrl} ...`);
  const session = await adminLogin(opts.baseUrl, opts.email, opts.password);
  await ensureAdminSession(session);
  const bearer = await impersonate(opts.baseUrl, session.jar, session.csrfToken, opts.familyId);

  if (!harvest.api.child_progress) harvest.api.child_progress = {};

  for (const child of children) {
    const childId = child.id;
    if (!childId) continue;

    const progress = await fetchJson(opts.baseUrl, `/api/children/${childId}/progress`, bearer);
    harvest.api.child_progress[childId] = progress.ok ? progress.body : { _error: progress.error };

    const streak = progress.ok ? progress.body?.streak : null;
    const label = child.name || childId;
    if (streak) {
      console.log(
        `  ${label}: streak=${streak.current_streak ?? 0} cycle_day=${streak.cycle_day ?? 0} last=${streak.last_active_date || '-'}`
      );
    } else if (!progress.ok) {
      console.log(`  ${label}: API-fel — ${progress.error}`);
    } else {
      console.log(`  ${label}: ingen streak-data`);
    }

    await sleep(opts.delayMs);
  }

  harvest.streaks_harvested_at = new Date().toISOString();
  fs.writeFileSync(harvestPath, JSON.stringify(harvest, null, 2));

  console.log(`\nKlart → ${harvestPath}`);
  console.log(
    `\nImportera:\n  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`
  );
}

main().catch((err) => {
  console.error('harvest:streaks failed:', err.message);
  process.exit(1);
});
