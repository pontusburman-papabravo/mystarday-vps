#!/usr/bin/env node
/**
 * Refresh full per-family harvest (Pontus pipeline) for all families:
 *   1. Base API harvest (migration:harvest) — optional --refresh-base
 *   2. Star/completion history (daily_log_details)
 *   3. Streak (child_progress)
 *   4. Global standard library (default_*) — optional --with-library
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run harvest:complete -- \
 *     --in ./Backup/stjarndag-harvest-2026-06-02
 *
 *   npm run harvest:complete -- --in ./Backup/... --family-id <uuid> --force
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  adminLogin,
  ensureAdminSession,
  sleep,
} = require('./lib/migration-http');
const {
  impersonateFamily,
  resolveFamilyHarvestPath,
  loadHarvestJson,
  saveHarvestJson,
  listFamilyIds,
  assessFamilyEnrichment,
  harvestFamilyHistoryInto,
  harvestFamilyStreaksInto,
} = require('./lib/harvest-family-ops');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || process.env.BASE_URL || 'https://mystarday.se',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    inDir: null,
    familyId: null,
    resume: true,
    force: false,
    refreshBase: false,
    withLibrary: false,
    skipBase: false,
    skipHistory: false,
    skipStreaks: false,
    delayMs: 250,
    familyDelayMs: 3000,
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if ((argv[i] === '--in' || argv[i] === '--out') && argv[i + 1]) opts.inDir = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--resume') opts.resume = true;
    else if (argv[i] === '--no-resume') opts.resume = false;
    else if (argv[i] === '--force') opts.force = true;
    else if (argv[i] === '--refresh-base') opts.refreshBase = true;
    else if (argv[i] === '--with-library') opts.withLibrary = true;
    else if (argv[i] === '--skip-base') opts.skipBase = true;
    else if (argv[i] === '--skip-history') opts.skipHistory = true;
    else if (argv[i] === '--skip-streaks') opts.skipStreaks = true;
    else if (argv[i] === '--delay-ms' && argv[i + 1]) opts.delayMs = parseInt(argv[++i], 10) || 250;
    else if (argv[i] === '--family-delay-ms' && argv[i + 1]) {
      opts.familyDelayMs = parseInt(argv[++i], 10) || 3000;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Full harvest enrichment for all families (base + history + streaks).

Options:
  --in / --out <dir>     Harvest backup dir (families/<uuid>/harvest.json)
  --family-id <uuid>     One family only
  --refresh-base         Re-fetch base harvest.json from prod API first
  --with-library         Also run harvest:library once (default_* tables)
  --force                Re-fetch history/streaks even if already present
  --resume               Skip families already complete (default)
  --no-resume            Process all families
  --skip-base            Do not refresh base harvest
  --skip-history         Skip daily_log_details
  --skip-streaks         Skip child_progress
  --delay-ms <n>         Pause between API calls (default 250)
  --family-delay-ms <n>  Pause between families (default 3000)

Env: ADMIN_EMAIL, ADMIN_PASSWORD

Then import locally:
  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in <dir>
  npm run import:library -- --in <dir>   # if --with-library
`);
      process.exit(0);
    }
  }

  if (!opts.inDir) {
    console.error('ERROR: --in <harvest-dir> is required');
    process.exit(1);
  }
  if (!opts.email || !opts.password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD required');
    process.exit(1);
  }
  return opts;
}

function loadEnrichIndex(inDir) {
  const p = path.join(inDir, 'enrich-index.json');
  if (!fs.existsSync(p)) return { families: {} };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { families: {} };
  }
}

function saveEnrichIndex(inDir, index) {
  index.updated_at = new Date().toISOString();
  fs.writeFileSync(path.join(inDir, 'enrich-index.json'), JSON.stringify(index, null, 2));
}

function runBaseHarvest(opts, familyId) {
  const args = [
    path.join(__dirname, 'migration-harvest-cli.js'),
    '--url',
    opts.baseUrl,
    '--out',
    opts.inDir,
    '--family-id',
    familyId,
    '--skip-gdpr',
    '--refresh',
    '--delay-ms',
    String(Math.max(opts.familyDelayMs, 1000)),
  ];
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ADMIN_EMAIL: opts.email,
      ADMIN_PASSWORD: opts.password,
    },
  });
  return result.status === 0;
}

function runHarvestLibrary(opts) {
  const libPath = path.join(opts.inDir, 'global-library.json');
  if (fs.existsSync(libPath) && !opts.force) {
    console.log('global-library.json finns — hoppar över (använd --force + --with-library för omhämtning)');
    return true;
  }
  const args = [
    path.join(__dirname, 'harvest-global-library.js'),
    '--url',
    opts.baseUrl,
    '--out',
    opts.inDir,
  ];
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ADMIN_EMAIL: opts.email,
      ADMIN_PASSWORD: opts.password,
    },
  });
  return result.status === 0;
}

async function enrichOneFamily(familyId, opts, session) {
  const harvestPath = resolveFamilyHarvestPath(opts.inDir, familyId);
  let harvest = loadHarvestJson(harvestPath);
  const label = harvest?.family_name || harvest?.api?.family?.name || familyId;
  const result = {
    id: familyId,
    name: label,
    steps: {},
    error: null,
  };

  const needsBase = opts.refreshBase || !harvest;
  if (!opts.skipBase && needsBase) {
    const ok = runBaseHarvest(opts, familyId);
    result.steps.base = ok ? 'ok' : 'failed';
    if (!ok) {
      result.error = 'base harvest failed';
      return result;
    }
    harvest = loadHarvestJson(harvestPath);
  } else {
    result.steps.base = harvest ? 'skipped' : 'missing';
  }

  if (!harvest?.api?.family) {
    result.error = 'harvest.json saknar api.family — kör migration:harvest först';
    return result;
  }

  await ensureAdminSession(session);
  const bearer = await impersonateFamily(opts.baseUrl, session.jar, session.csrfToken, familyId);

  if (!opts.skipHistory) {
    try {
      const { totalDays, totalItems } = await harvestFamilyHistoryInto(harvest, {
        baseUrl: opts.baseUrl,
        bearer,
        delayMs: opts.delayMs,
        force: opts.force,
      });
      result.steps.history = { days: totalDays, items: totalItems };
    } catch (err) {
      result.steps.history = { error: err.message };
      result.error = err.message;
    }
  }

  if (!opts.skipStreaks && !result.error) {
    try {
      const streaks = await harvestFamilyStreaksInto(harvest, {
        baseUrl: opts.baseUrl,
        bearer,
        delayMs: opts.delayMs,
      });
      result.steps.streaks = streaks;
    } catch (err) {
      result.steps.streaks = { error: err.message };
      result.error = err.message;
    }
  }

  if (!result.error) {
    harvest.enriched_at = new Date().toISOString();
    saveHarvestJson(harvestPath, harvest);
    const assessment = assessFamilyEnrichment(harvest);
    result.complete = assessment.complete;
    result.missing = assessment.missing;
    result.history_stats = assessment.history;
  }

  return result;
}

async function main() {
  const opts = parseArgs(process.argv);
  let familyIds = listFamilyIds(opts.inDir);

  if (opts.familyId) {
    familyIds = familyIds.filter((id) => id === opts.familyId);
    if (!familyIds.length && fs.existsSync(resolveFamilyHarvestPath(opts.inDir, opts.familyId))) {
      familyIds = [opts.familyId];
    }
    if (!familyIds.length) {
      console.error('Familjen hittades inte i backup-mappen');
      process.exit(1);
    }
  }

  if (!familyIds.length) {
    console.error(`Inga familjer med harvest.json under ${path.join(opts.inDir, 'families')}`);
    console.error('Kör först: npm run migration:harvest -- --out ...');
    process.exit(1);
  }

  console.log(`Harvest complete — ${familyIds.length} familj(er) → ${opts.inDir}`);
  console.log(
    `Steg: ${opts.skipBase && !opts.refreshBase ? '' : 'base '}${opts.skipHistory ? '' : 'history '}${opts.skipStreaks ? '' : 'streaks'}${opts.withLibrary ? ' library' : ''}\n`
  );

  if (opts.withLibrary) {
    console.log('[library] Hämtar standardbibliotek (default_*) ...');
    if (!runHarvestLibrary(opts)) {
      console.error('harvest:library misslyckades');
      process.exit(1);
    }
    console.log('');
  }

  console.log(`Loggar in som admin mot ${opts.baseUrl} ...`);
  const session = await adminLogin(opts.baseUrl, opts.email, opts.password);

  const enrichIndex = loadEnrichIndex(opts.inDir);
  if (!enrichIndex.families) enrichIndex.families = {};

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < familyIds.length; i++) {
    const familyId = familyIds[i];
    const harvestPath = resolveFamilyHarvestPath(opts.inDir, familyId);
    const harvest = loadHarvestJson(harvestPath);
    const label = harvest?.family_name || harvest?.api?.family?.name || familyId;

    if (opts.resume && !opts.force && harvest) {
      const assessment = assessFamilyEnrichment(harvest);
      if (assessment.complete && !opts.refreshBase) {
        console.log(`[${i + 1}/${familyIds.length}] ${label} ... hoppa över (komplett)`);
        skipped++;
        continue;
      }
    }

    process.stdout.write(`[${i + 1}/${familyIds.length}] ${label} ... `);

    try {
      const result = await enrichOneFamily(familyId, opts, session);
      enrichIndex.families[familyId] = {
        ...result,
        at: new Date().toISOString(),
      };
      saveEnrichIndex(opts.inDir, enrichIndex);

      if (result.error) {
        console.log('FEL:', result.error);
        failed++;
      } else {
        const hist = result.steps.history;
        const histNote =
          hist && typeof hist === 'object' && hist.items != null
            ? ` history ~${hist.items} rader`
            : '';
        console.log(`ok${histNote}${result.complete ? '' : ' (ofullständig: ' + result.missing.join(', ') + ')'}`);
        ok++;
      }
    } catch (err) {
      console.log('FEL:', err.message);
      enrichIndex.families[familyId] = {
        id: familyId,
        name: label,
        error: err.message,
        at: new Date().toISOString(),
      };
      saveEnrichIndex(opts.inDir, enrichIndex);
      failed++;
    }

    if (i < familyIds.length - 1 && opts.familyDelayMs > 0) {
      await sleep(opts.familyDelayMs);
    }
  }

  console.log(`\nKlar. OK: ${ok}  Hoppade över: ${skipped}  Fel: ${failed}`);
  console.log(`Status: ${path.join(opts.inDir, 'enrich-index.json')}`);
  console.log(`
Importera på lokal DB:
  npm run migrate
  npm run import:library -- --in ${opts.inDir}    # om --with-library
  HARVEST_IMPORT_PASSWORD='...' npm run import:harvest -- --in ${opts.inDir}
`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('harvest:complete failed:', err.message);
  process.exit(1);
});
