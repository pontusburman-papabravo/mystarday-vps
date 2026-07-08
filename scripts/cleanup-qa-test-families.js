#!/usr/bin/env node
/**
 * Delete ephemeral QA/smoke test families from the database.
 * Safe: only matches known test-email patterns; never touches prod review or local smoke accounts.
 *
 * Usage:
 *   node scripts/cleanup-qa-test-families.js --dry-run
 *   node scripts/cleanup-qa-test-families.js
 *
 * Patterns: scripts/lib/qa-test-accounts.mjs → EPHEMERAL_EMAIL_PATTERNS
 */
'use strict';

const { loadEnvFile } = require('../src/lib/load-env');
loadEnvFile();

const db = require('../src/lib/db');
const {
  EPHEMERAL_EMAIL_PATTERNS,
  PROTECTED_PARENT_EMAILS,
  isEphemeralTestEmail,
} = require('./lib/qa-test-accounts.cjs');

async function findEphemeralFamilies() {
  const { rows } = await db.query(`
    SELECT f.id, f.name, f.created_at, p.email, p.id AS parent_id
    FROM family f
    JOIN parent p ON p.family_id = f.id
    WHERE f.archived_at IS NULL
    ORDER BY f.created_at
  `);

  const byFamily = new Map();
  for (const row of rows) {
    if (!isEphemeralTestEmail(row.email)) continue;
    if (!byFamily.has(row.id)) {
      byFamily.set(row.id, {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        emails: [],
      });
    }
    byFamily.get(row.id).emails.push(row.email);
  }
  return Array.from(byFamily.values());
}

/** Same pattern as admin DELETE /api/admin/families/:id (simplified). */
async function deleteFamily(client, familyId) {
  const children = await client.query('SELECT id FROM child WHERE family_id = $1', [familyId]);
  for (const child of children.rows) {
    await client.query(
      `DELETE FROM rating WHERE daily_log_item_id IN (
         SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id WHERE dl.child_id = $1
       )`,
      [child.id]
    );
    await client.query(
      `DELETE FROM daily_log_item WHERE daily_log_id IN (
         SELECT id FROM daily_log WHERE child_id = $1
       )`,
      [child.id]
    );
    await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
    await client.query(
      `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
         SELECT id FROM weekly_schedule WHERE child_id = $1
       )`,
      [child.id]
    );
    await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM parent_note WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
    await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
  }

  await client.query(
    `DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)
       OR parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query('DELETE FROM child WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family_invite WHERE family_id = $1', [familyId]);
  await client.query(
    'DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
    [familyId]
  );
  await client.query(
    'DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
    [familyId]
  );
  await client.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM parent WHERE family_id = $1', [familyId]);
  await client.query('DELETE FROM family WHERE id = $1', [familyId]);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const families = await findEphemeralFamilies();

  console.log('[cleanup] Protected emails (never deleted):', PROTECTED_PARENT_EMAILS.join(', '));
  console.log(
    '[cleanup] Ephemeral patterns:',
    EPHEMERAL_EMAIL_PATTERNS.map((re) => re.source).join(' | ')
  );

  if (!families.length) {
    console.log('[cleanup] Inga ephemeral QA/smoke-familjer hittades.');
    return;
  }

  console.log(`[cleanup] Hittade ${families.length} testfamilj(er):`);
  for (const f of families) {
    console.log(`  - ${f.name} (${f.id}) → ${f.emails.join(', ')}`);
  }

  if (dryRun) {
    console.log('[cleanup] --dry-run: inget raderat.');
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const f of families) {
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
