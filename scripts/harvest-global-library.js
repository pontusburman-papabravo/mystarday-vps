#!/usr/bin/env node
/**
 * Fetch admin standard library (default_* tables) via production admin API.
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:library -- \
 *     --url https://mystarday.se --out ./Backup/stjarndag-harvest-2026-06-02
 *
 * Writes global-library.json next to families/ (same dir as migration:harvest).
 */

const fs = require('fs');
const path = require('path');
const { apiRequest, readJson, adminLogin, ensureAdminSession } = require('./lib/migration-http');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://mystarday.se',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    out: path.join(process.cwd(), 'export', `harvest-${new Date().toISOString().slice(0, 10)}`),
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Harvest global standard library (default_* tables) via admin API.

Options:
  --url <base>         App URL (default: https://mystarday.se)
  --email / --password Admin credentials (or ADMIN_EMAIL / ADMIN_PASSWORD)
  --out <dir>          Harvest output dir (writes global-library.json)

Then import locally:
  DATABASE_URL=... npm run import:library -- --in <same-dir>
`);
      process.exit(0);
    }
  }
  return opts;
}

async function fetchAdminJson(base, session, apiPath) {
  await ensureAdminSession(session);
  const res = await apiRequest(base, apiPath, {
    jar: session.jar,
    csrf: session.csrfToken,
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(body.error || `${apiPath} failed (${res.status})`);
  }
  return body;
}

async function harvestGlobalLibrary(base, session) {
  const activities = await fetchAdminJson(base, session, '/api/admin/default-templates');
  const rewards = await fetchAdminJson(base, session, '/api/admin/default-rewards');
  const scheduleList = await fetchAdminJson(base, session, '/api/admin/default-schedules');

  const schedules = [];
  for (const sched of scheduleList) {
    if (!sched.id) continue;
    const detail = await fetchAdminJson(base, session, `/api/admin/default-schedules/${sched.id}`);
    schedules.push(detail);
  }

  return {
    format: 'global-library-v1',
    exported_at: new Date().toISOString(),
    base_url: base,
    activities: Array.isArray(activities) ? activities : [],
    rewards: Array.isArray(rewards) ? rewards : [],
    schedules,
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.email || !opts.password) {
    console.error('ERROR: Ange ADMIN_EMAIL och ADMIN_PASSWORD (eller --email / --password)');
    process.exit(1);
  }

  fs.mkdirSync(opts.out, { recursive: true });
  const outPath = path.join(opts.out, 'global-library.json');

  console.log(`Loggar in som admin mot ${opts.baseUrl} ...`);
  const session = await adminLogin(opts.baseUrl, opts.email, opts.password);

  console.log('Hämtar standardbibliotek (aktiviteter, belöningar, scheman) ...');
  const library = await harvestGlobalLibrary(opts.baseUrl, session);
  fs.writeFileSync(outPath, JSON.stringify(library, null, 2));

  console.log(`\nKlart → ${outPath}`);
  console.log(
    `  aktiviteter: ${library.activities.length}  belöningar: ${library.rewards.length}  scheman: ${library.schedules.length}`
  );
  console.log(`\nImportera lokalt:\n  DATABASE_URL=... npm run import:library -- --in ${opts.out}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Harvest library failed:', err.message);
    process.exit(1);
  });
}

module.exports = { harvestGlobalLibrary };
