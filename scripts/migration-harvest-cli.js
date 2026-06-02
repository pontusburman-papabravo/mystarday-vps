#!/usr/bin/env node
/**
 * Harvest family data via EXISTING production APIs — no new deploy required.
 *
 * Uses: admin login → impersonate each family → parent GET endpoints (+ optional GDPR ZIP).
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/migration-harvest-cli.js
 *   node scripts/migration-harvest-cli.js --url https://mystarday.se --email ... --password ...
 *
 * Slower and less complete than DATABASE_URL export, but works when you only have admin access.
 */

const fs = require('fs');
const path = require('path');
const { apiRequest, readJson, adminLogin, ensureAdminSession, sleep } = require('./lib/migration-http');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://mystarday.se',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    out: path.join(process.cwd(), 'export', `harvest-${new Date().toISOString().slice(0, 10)}`),
    familyId: null,
    skipGdpr: false,
    includeArchived: true,
    resume: false,
    onlyFailed: false,
    delayMs: 4000,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--skip-gdpr') opts.skipGdpr = true;
    else if (argv[i] === '--no-archived') opts.includeArchived = false;
    else if (argv[i] === '--resume') opts.resume = true;
    else if (argv[i] === '--only-failed') opts.onlyFailed = true;
    else if (argv[i] === '--delay-ms' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 4000;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Harvest family data via admin + impersonation (no server deploy).

Options:
  --url <base>       App URL (default: https://mystarday.se)
  --email / --password   Admin credentials (or ADMIN_EMAIL / ADMIN_PASSWORD)
  --out <dir>        Output directory
  --family-id <uuid> One family only
  --skip-gdpr        Skip GET /api/account/export-data per family
  --no-archived      Skip archived families
  --resume           Skip families that already have harvest.json
  --only-failed      With --resume on same --out dir: retry index.json errors only
  --delay-ms <n>     Pause between families (default: 4000)
`);
      process.exit(0);
    }
  }
  return opts;
}

function isHarvestComplete(familyDir) {
  const file = path.join(familyDir, 'harvest.json');
  if (!fs.existsSync(file)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.format === 'api-harvest-v1' && data.api && data.api.family;
  } catch {
    return false;
  }
}

function loadFailedIds(outDir) {
  const indexPath = path.join(outDir, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return new Set(
      (index.families || []).filter((f) => f.error).map((f) => f.id)
    );
  } catch {
    return null;
  }
}

async function impersonateWithRetry(base, session, familyId) {
  const tryOnce = async () => {
    await ensureAdminSession(session);
    return impersonate(base, session.jar, session.csrfToken, familyId);
  };

  try {
    return await tryOnce();
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('token') || msg.includes('Token') || msg.includes('401')) {
      await ensureAdminSession(session);
      return tryOnce();
    }
    throw err;
  }
}

async function harvestFamilyWithRetry(base, listing, session, opts, familyDir) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const bearer = await impersonateWithRetry(base, session, listing.id);
      return await harvestFamily(base, listing, bearer, opts, familyDir);
    } catch (err) {
      const isRateLimit =
        err.message.includes('För många') || err.message.includes('429');
      if (isRateLimit && attempt < maxAttempts) {
        const waitSec = 65 * attempt;
        console.log(`\n    väntar ${waitSec}s (rate limit) ... `);
        await sleep(waitSec * 1000);
        continue;
      }
      throw err;
    }
  }
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateRanges(from, to, maxDays = 90) {
  const ranges = [];
  let start = from;
  while (start <= to) {
    let end = addDays(start, maxDays - 1);
    if (end > to) end = to;
    ranges.push({ from: start, to: end });
    start = addDays(end, 1);
  }
  return ranges;
}

async function fetchJson(base, path, bearer) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await apiRequest(base, path, { bearer });
    if (res.status === 429 && attempt < 4) {
      await sleep(65000 * attempt);
      continue;
    }
    const body = await readJson(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: body.error || res.statusText, body };
    }
    return { ok: true, body };
  }
  return { ok: false, status: 429, error: 'Rate limit' };
}

async function listFamilies(base, jar, csrf, includeArchived) {
  const activeRes = await apiRequest(base, '/api/admin/families-grouped', { jar, csrf });
  const active = await readJson(activeRes);
  if (!activeRes.ok) {
    throw new Error(active.error || 'Kunde inte hämta familjer');
  }
  let all = active;
  if (includeArchived) {
    const archRes = await apiRequest(base, '/api/admin/families-grouped?archived=true', { jar, csrf });
    const archived = await readJson(archRes);
    if (archRes.ok && Array.isArray(archived)) {
      const ids = new Set(all.map((f) => f.id));
      for (const f of archived) {
        if (!ids.has(f.id)) all.push(f);
      }
    }
  }
  return all;
}

async function impersonate(base, jar, csrf, familyId) {
  const res = await apiRequest(base, `/api/admin/impersonate/${familyId}`, {
    method: 'POST',
    jar,
    csrf,
    body: {},
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(body.error || `Impersonate failed (${res.status})`);
  }
  if (!body.token) {
    throw new Error('Inget token i impersonate-svar');
  }
  return body.token;
}

async function downloadGdprZip(base, bearer, destPath) {
  const res = await apiRequest(base, '/api/account/export-data', { bearer });
  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited' };
  }
  if (!res.ok) {
    const body = await readJson(res);
    return { ok: false, reason: body.error || `HTTP ${res.status}` };
  }
  const buf = await res.buffer();
  fs.writeFileSync(destPath, buf);
  return { ok: true, bytes: buf.length };
}

async function harvestFamily(base, listing, bearer, opts, familyDir) {
  const api = {};
  const endpoints = [
    ['/api/family', 'family'],
    ['/api/activities', 'activities'],
    ['/api/categories', 'categories'],
    ['/api/rewards', 'rewards'],
    ['/api/rewards/goals', 'goals'],
    ['/api/general-observations', 'general_observations'],
    ['/api/general-observations/archived', 'general_observations_archived'],
    ['/api/reports', 'reports'],
    ['/api/subscription/status', 'subscription'],
    ['/api/rewards/redemptions', 'reward_redemptions'],
    ['/api/family/star-history', 'star_history'],
    ['/api/pedagog-notes/overview', 'pedagog_notes_overview'],
    ['/api/schedule-templates', 'schedule_templates'],
    ['/api/messages/unread', 'system_messages'],
  ];

  for (const [path, key] of endpoints) {
    const result = await fetchJson(base, path, bearer);
    api[key] = result.ok ? result.body : { _error: result.error, _status: result.status };
  }

  const children = api.family?.children || listing.children || [];
  api.children_detail = {};
  api.schedules = {};
  api.special_days = {};
  api.daily_logs = {};

  const today = new Date().toISOString().slice(0, 10);
  const historyStart = '2020-01-01';

  for (const child of children) {
    const childId = child.id;
    if (!childId) continue;

    const detail = await fetchJson(base, `/api/children/${childId}`, bearer);
    api.children_detail[childId] = detail.ok ? detail.body : { _error: detail.error };

    const schedList = await fetchJson(base, `/api/children/${childId}/schedules`, bearer);
    api.schedules[childId] = schedList.ok ? schedList.body : { _error: schedList.error };

    if (schedList.ok && Array.isArray(schedList.body)) {
      api.schedules[childId + '_items'] = {};
      for (const sched of schedList.body) {
        const items = await fetchJson(base, `/api/schedules/${sched.id}/items`, bearer);
        api.schedules[`${childId}_items`][sched.id] = items.ok ? items.body : { _error: items.error };
      }
    }

    const special = await fetchJson(
      base,
      `/api/children/${childId}/special-days?from=${historyStart}&to=${today}`,
      bearer
    );
    api.special_days[childId] = special.ok ? special.body : { _error: special.error };

    if (special.ok && Array.isArray(special.body)) {
      api.special_days[childId + '_items'] = {};
      for (const day of special.body) {
        if (!day.id) continue;
        const items = await fetchJson(base, `/api/special-day-schedules/${day.id}/items`, bearer);
        api.special_days[`${childId}_items`][day.id] = items.ok ? items.body : { _error: items.error };
      }
    }

    const obs = await fetchJson(
      base,
      `/api/children/${childId}/observations?from=${historyStart}&to=${today}`,
      bearer
    );
    api[`observations_${childId}`] = obs.ok ? obs.body : { _error: obs.error };

    api.daily_logs[childId] = [];
    for (const range of dateRanges(historyStart, today, 90)) {
      const logs = await fetchJson(
        base,
        `/api/children/${childId}/daily-logs?from=${range.from}&to=${range.to}`,
        bearer
      );
      api.daily_logs[childId].push({
        from: range.from,
        to: range.to,
        data: logs.ok ? logs.body : { _error: logs.error },
      });
    }
  }

  const harvest = {
    format: 'api-harvest-v1',
    exported_at: new Date().toISOString(),
    family_id: listing.id,
    family_name: listing.family_name || listing.name,
    admin_listing: listing,
    api,
  };

  fs.mkdirSync(familyDir, { recursive: true });
  fs.writeFileSync(path.join(familyDir, 'harvest.json'), JSON.stringify(harvest, null, 2));

  if (!opts.skipGdpr) {
    const gdprPath = path.join(familyDir, 'gdpr-export.zip');
    const gdpr = await downloadGdprZip(base, bearer, gdprPath);
    harvest.gdpr_export = gdpr;
    fs.writeFileSync(path.join(familyDir, 'harvest.json'), JSON.stringify(harvest, null, 2));
  }

  return harvest;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.email || !opts.password) {
    console.error('ERROR: Ange ADMIN_EMAIL och ADMIN_PASSWORD (eller --email / --password)');
    process.exit(1);
  }

  fs.mkdirSync(opts.out, { recursive: true });
  const familiesDir = path.join(opts.out, 'families');
  fs.mkdirSync(familiesDir, { recursive: true });

  console.log(`Loggar in som admin mot ${opts.baseUrl} ...`);
  const session = await adminLogin(opts.baseUrl, opts.email, opts.password);

  let families = await listFamilies(
    opts.baseUrl,
    session.jar,
    session.csrfToken,
    opts.includeArchived
  );
  if (opts.familyId) {
    families = families.filter((f) => f.id === opts.familyId);
    if (families.length === 0) {
      console.error('Familjen hittades inte i admin-listan');
      process.exit(1);
    }
  }

  if (opts.onlyFailed) {
    const failedIds = loadFailedIds(opts.out);
    if (!failedIds || failedIds.size === 0) {
      console.log('Inga misslyckade familjer i index.json — inget att göra.');
      process.exit(0);
    }
    families = families.filter((f) => failedIds.has(f.id));
    console.log(`Kör om ${families.length} misslyckade familj(er)`);
  }

  console.log(`Harvestar ${families.length} familj(er) → ${opts.out}`);
  console.log(`Paus ${opts.delayMs}ms mellan familjer (minskar rate limit)\n`);

  const index = {
    exported_at: new Date().toISOString(),
    format: 'api-harvest-v1',
    base_url: opts.baseUrl,
    family_count: families.length,
    families: [],
  };

  for (let i = 0; i < families.length; i++) {
    const f = families[i];
    const label = f.family_name || f.name || f.id;
    const familyDir = path.join(familiesDir, f.id);

    if (opts.resume && isHarvestComplete(familyDir)) {
      console.log(`[${i + 1}/${families.length}] ${label} ... hoppa över (finns redan)`);
      index.families.push({ id: f.id, name: label, skipped: true });
      continue;
    }

    process.stdout.write(`[${i + 1}/${families.length}] ${label} ... `);

    try {
      const harvest = await harvestFamilyWithRetry(opts.baseUrl, f, session, opts, familyDir);
      index.families.push({
        id: f.id,
        name: label,
        gdpr_export: harvest.gdpr_export || null,
      });
      console.log('ok');
    } catch (err) {
      console.log('FEL:', err.message);
      index.families.push({ id: f.id, name: label, error: err.message });
    }

    if (i < families.length - 1 && opts.delayMs > 0) {
      await sleep(opts.delayMs);
    }
  }

  // Merge with previous index so --only-failed keeps successful rows
  const indexPath = path.join(opts.out, 'index.json');
  if (opts.onlyFailed && fs.existsSync(indexPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const merged = new Map((prev.families || []).map((row) => [row.id, row]));
      for (const row of index.families) {
        merged.set(row.id, row);
      }
      index.families = Array.from(merged.values());
      index.family_count = index.families.length;
    } catch {
      /* use new index only */
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nKlar. Index: ${path.join(opts.out, 'index.json')}`);
  console.log('Obs: import-family-data.js förväntar DB-export-format — harvest är för arkiv/manuell migrering.');
}

main().catch((err) => {
  console.error('Fel:', err.message);
  process.exit(1);
});
