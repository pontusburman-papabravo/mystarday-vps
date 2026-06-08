#!/usr/bin/env node
/**
 * Sync features + family_features from production admin API to local DATABASE_URL.
 *
 * Usage:
 *   set -a && source .env && set +a
 *   MIGRATION_EXPORT_BASE_URL=https://stjarndag.polsia.app npm run sync:features
 *
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL
 * Optional: --url (default MIGRATION_EXPORT_BASE_URL or https://stjarndag.polsia.app)
 *           --seed-first  Run seed-features.js if features table has < 5 rows
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');
const { apiRequest, readJson, adminLogin } = require('./lib/migration-http');

function parseArgs(argv) {
  const opts = {
    baseUrl:
      process.env.MIGRATION_EXPORT_BASE_URL ||
      process.env.BASE_URL ||
      'https://stjarndag.polsia.app',
    seedFirst: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--seed-first') opts.seedFirst = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Sync features table + family_features from prod admin API.

Options:
  --url <base>     Prod URL (default: stjarndag.polsia.app)
  --seed-first     Run seed-features.js if features table nearly empty

Env: ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL
`);
      process.exit(0);
    }
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL required');
    process.exit(1);
  }
  return opts;
}

async function fetchAdminJson(baseUrl, session, apiPath) {
  const res = await apiRequest(baseUrl, apiPath, {
    jar: session.jar,
    csrf: session.csrfToken,
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status} ${apiPath}`);
  }
  return body;
}

async function upsertFeature(client, row) {
  await client.query(
    `INSERT INTO features (
      slug, name, description, status, tags, priority, complexity,
      estimated_hours, documentation, dev_notes, changelog, category
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      tags = EXCLUDED.tags,
      priority = EXCLUDED.priority,
      complexity = EXCLUDED.complexity,
      estimated_hours = EXCLUDED.estimated_hours,
      documentation = EXCLUDED.documentation,
      dev_notes = EXCLUDED.dev_notes,
      changelog = EXCLUDED.changelog,
      category = EXCLUDED.category,
      updated_at = NOW()`,
    [
      row.slug,
      row.name,
      row.description || null,
      row.status || 'off',
      row.tags || [],
      row.priority || 'medium',
      row.complexity ?? 5,
      row.estimated_hours ?? null,
      JSON.stringify(row.documentation || {}),
      JSON.stringify(row.dev_notes || []),
      JSON.stringify(row.changelog || []),
      row.category || null,
    ]
  );
}

async function syncFamilyAssignments(client, slug, familyIds) {
  await client.query('DELETE FROM family_features WHERE feature_slug = $1', [slug]);
  let inserted = 0;
  for (const familyId of familyIds) {
    const exists = await client.query('SELECT 1 FROM family WHERE id = $1', [familyId]);
    if (!exists.rows.length) continue;
    await client.query(
      `INSERT INTO family_features (family_id, feature_slug)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [familyId, slug]
    );
    inserted++;
  }
  return inserted;
}

async function main() {
  const opts = parseArgs(process.argv);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS n FROM features');
    if (countRows[0].n < 5 || opts.seedFirst) {
      console.log('[sync:features] Kör seed-features.js först ...');
      const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed-features.js')], {
        stdio: 'inherit',
        env: process.env,
      });
      if (seed.status !== 0) process.exit(1);
    }

    console.log(`[sync:features] Hämtar från ${opts.baseUrl} ...`);
    const session = await adminLogin(opts.baseUrl, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const features = await fetchAdminJson(opts.baseUrl, session, '/api/admin/features');
    console.log(`[sync:features] ${features.length} funktioner från prod\n`);

    let live = 0;
    let dev = 0;
    let off = 0;
    let devAssignments = 0;

    await client.query('BEGIN');
    for (const row of features) {
      await upsertFeature(client, row);
      if (row.status === 'live') live++;
      else if (row.status === 'dev') dev++;
      else off++;

      if (row.status === 'dev') {
        const detail = await fetchAdminJson(opts.baseUrl, session, `/api/admin/features/${row.slug}`);
        const ids = (detail.assigned_families || []).map((f) => f.family_id);
        const n = await syncFamilyAssignments(client, row.slug, ids);
        devAssignments += n;
        if (n > 0) {
          console.log(`  ${row.slug}: dev → ${n} familj(er)`);
        }
      } else {
        await client.query('DELETE FROM family_features WHERE feature_slug = $1', [row.slug]);
      }
    }
    await client.query('COMMIT');

    const { rows: summary } = await client.query(`
      SELECT status, COUNT(*)::int AS n FROM features GROUP BY status ORDER BY status
    `);

    console.log('\n[sync:features] Klart');
    console.log(`  LIVE: ${live}  DEV: ${dev}  OFF: ${off}`);
    console.log(`  family_features rader (dev): ${devAssignments}`);
    console.log('  DB:', summary.map((r) => `${r.status}=${r.n}`).join(', '));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[sync:features] Fel:', err.message);
  process.exit(1);
});
