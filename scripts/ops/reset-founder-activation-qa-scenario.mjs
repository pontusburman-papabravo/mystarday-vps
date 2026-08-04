#!/usr/bin/env node
/**
 * Reset founder activation QA families to await_first_completion (prod operator use).
 * No credentials printed. Idempotent.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hashPassword } = require('../../src/lib/hash');
const pg = require('../../src/lib/db');

const FAMILIES = [
  'bc825034-7f94-4200-82d6-757505598615',
  '9435e009-75dd-493a-bb86-0d9d509f1544',
];
const CHILD_USERNAMES = ['qaactsv', 'qaacten'];
const PIN = process.env.QA_CHILD_PIN || '4821';

async function main() {
  const pinHash = await hashPassword(PIN);
  await pg.query('UPDATE child SET pin = $1, birthday = COALESCE(birthday, $2) WHERE username = ANY($3)', [
    pinHash,
    '2016-05-05',
    CHILD_USERNAMES,
  ]);
  await pg.query(
    `UPDATE family_activation_state SET
       child_created_at = COALESCE(child_created_at, NOW()),
       schema_saved_at = COALESCE(schema_saved_at, NOW()),
       child_access_completed_at = NULL,
       first_completion_at = NULL,
       p0_activated_at = NULL,
       updated_at = NOW()
     WHERE family_id = ANY($1)`,
    [FAMILIES]
  );
  await pg.query(
    `UPDATE daily_log_item SET completed = false, completed_at = NULL, completed_date = NULL
     WHERE daily_log_id IN (
       SELECT dl.id FROM daily_log dl
       JOIN child c ON c.id = dl.child_id
       WHERE c.username = ANY($1)
     )`,
    [CHILD_USERNAMES]
  );
  await pg.query(
    `DELETE FROM family_milestones
     WHERE family_id = ANY($1)
       AND milestone IN ('first_success', 'child_first_completion', 'parent_saw_completion')`,
    [FAMILIES]
  );
  console.log(JSON.stringify({ ok: true, families: FAMILIES.length }));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
