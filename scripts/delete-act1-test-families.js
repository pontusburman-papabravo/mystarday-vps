#!/usr/bin/env node
/**
 * Delete ACT-1 browser/curl test families (@example.com only).
 * Safe: refuses non-matching emails; read-only preview with --dry-run.
 *
 * Usage on VPS:
 *   node scripts/delete-act1-test-families.js --dry-run
 *   node scripts/delete-act1-test-families.js
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');

const TEST_EMAIL_RE = /^act1-(e2e|curl|debug)-.+@example\.com$/i;

async function findTestFamilies() {
  const { rows } = await db.query(`
    SELECT f.id, f.name, p.email, p.id AS parent_id
    FROM family f
    JOIN parent p ON p.family_id = f.id
    WHERE p.email ~* '^act1-(e2e|curl|debug)-.+@example\\.com$'
    ORDER BY f.created_at
  `);
  return rows.filter((r) => TEST_EMAIL_RE.test(r.email));
}

/** Same pattern as admin DELETE /api/admin/families/:id (simplified). */
async function deleteFamily(client, familyId) {
  const children = await client.query('SELECT id FROM child WHERE family_id = $1', [familyId]);
  for (const child of children.rows) {
    await client.query(
      `DELETE FROM rating WHERE daily_log_item_id IN (
         SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id WHERE dl.child_id = $1
       )`, [child.id]);
    await client.query(
      `DELETE FROM daily_log_item WHERE daily_log_id IN (
         SELECT id FROM daily_log WHERE child_id = $1
       )`, [child.id]);
    await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
         SELECT id FROM weekly_schedule WHERE child_id = $1
       )`, [child.id]);
    await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM parent_note WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
  }

  await client.query(
    'DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1) OR parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
    [familyId]
  );
  await client.query('DELETE FROM child WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_invite WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)', [familyId]);
  await client.query('DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)', [familyId]);
  await client.query('DELETE FROM parent WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family WHERE id = $1', [familyId]);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const families = await findTestFamilies();

  if (!families.length) {
    console.log('[cleanup] Inga ACT-1-testfamiljer hittades.');
    return;
  }

  const byFamily = new Map();
  for (const row of families) {
    if (!byFamily.has(row.id)) byFamily.set(row.id, { id: row.id, name: row.name, emails: [] });
    byFamily.get(row.id).emails.push(row.email);
  }

  console.log(`[cleanup] Hittade ${byFamily.size} testfamilj(er):`);
  for (const f of byFamily.values()) {
    console.log(`  - ${f.name} (${f.id}) → ${f.emails.join(', ')}`);
  }

  if (dryRun) {
    console.log('[cleanup] --dry-run: inget raderat.');
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const f of byFamily.values()) {
      await deleteFamily(client, f.id);
      console.log(`[cleanup] Raderade ${f.name}`);
    }
    await client.query('COMMIT');
    console.log('[cleanup] Klar.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .then(() => db.pool.end())
  .catch((err) => {
    console.error('[cleanup]', err);
    db.pool.end().finally(() => process.exit(1));
  });
