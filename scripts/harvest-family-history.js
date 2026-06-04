#!/usr/bin/env node
/**
 * Fetch completion/star history via daily-log API and merge into harvest.json.
 * Use when GDPR export fails (500) or gdpr-export.zip is missing.
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:history -- \
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
const { collectLogDates, mergeHistoryIntoApi } = require('../src/lib/harvest-history');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://mystarday.se',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    inDir: null,
    familyId: null,
    delayMs: 250,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--in' && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--delay-ms' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 250;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Harvest daily_log_item history via API into harvest.json.

Options:
  --url, --email, --password   Admin credentials
  --in <dir>                   Harvest dir (families/<uuid>/harvest.json)
  --family-id <uuid>           One family
  --delay-ms <n>               Pause between daily-log requests (default 250)

Then import:
  npm run import:harvest -- --in <dir> --family-id <uuid>
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

  let totalDays = 0;
  let totalItems = 0;

  for (const child of children) {
    const childId = child.id;
    if (!childId) continue;

    let chunks = harvest.api?.daily_logs?.[childId];
    if (!chunks || chunks.some((c) => c.data?._error)) {
      console.log(`  ${child.name}: hämtar daily_logs från API ...`);
      chunks = [];
      const today = new Date().toISOString().slice(0, 10);
      const from = '2020-01-01';
      let start = from;
      while (start <= today) {
        const endDate = new Date(start + 'T12:00:00Z');
        endDate.setUTCDate(endDate.getUTCDate() + 89);
        let end = endDate.toISOString().slice(0, 10);
        if (end > today) end = today;
        const logs = await fetchJson(
          opts.baseUrl,
          `/api/children/${childId}/daily-logs?from=${start}&to=${end}`,
          bearer
        );
        chunks.push({ from: start, to: end, data: logs.ok ? logs.body : { _error: logs.error } });
        start = new Date(end + 'T12:00:00Z');
        start.setUTCDate(start.getUTCDate() + 1);
        start = start.toISOString().slice(0, 10);
        await sleep(opts.delayMs);
      }
      if (!harvest.api.daily_logs) harvest.api.daily_logs = {};
      harvest.api.daily_logs[childId] = chunks;
    }

    const dates = collectLogDates(chunks);
    console.log(`  ${child.name}: ${dates.length} dag(ar) med loggdata att hämta ...`);

    const dailyLogDetails = {};
    for (const date of dates) {
      const detail = await fetchJson(
        opts.baseUrl,
        `/api/children/${childId}/daily-log?date=${date}`,
        bearer
      );
      dailyLogDetails[date] = detail.ok ? detail.body : { _error: detail.error, _status: detail.status };
      if (detail.ok && detail.body?.items) {
        totalItems += detail.body.items.length;
      }
      await sleep(opts.delayMs);
    }
    totalDays += dates.length;

    const manual = await fetchJson(opts.baseUrl, `/api/rewards/manual-stars/${childId}`, bearer);
    const manualGrants = manual.ok ? manual.body : { _error: manual.error, grants: [] };

    mergeHistoryIntoApi(harvest.api, childId, dailyLogDetails, manualGrants);
  }

  harvest.history_harvested_at = new Date().toISOString();
  fs.writeFileSync(harvestPath, JSON.stringify(harvest, null, 2));

  console.log(`\nKlart → ${harvestPath}`);
  console.log(`  dagar: ${totalDays}  aktivitetsrader: ~${totalItems}`);
  console.log(`\nImportera:\n  npm run import:harvest -- --in ${opts.inDir} --family-id ${opts.familyId}`);
}

main().catch((err) => {
  console.error('harvest:history failed:', err.message);
  process.exit(1);
});
