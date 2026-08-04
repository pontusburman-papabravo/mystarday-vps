#!/usr/bin/env bash
# VPS: rotate QA parent password + child PIN from /tmp/qa-bootstrap-secret.env (600). No stdout secrets.
set -euo pipefail
cd "${VPS_APP_PATH:-/var/www/mystarday}"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
set -a && . .env && set +a
set -a && . /tmp/qa-bootstrap-secret.env && set +a

node <<'NODE'
const { loadEnvFile } = require('./src/lib/load-env.js');
const { hashPassword } = require('./src/lib/hash');
const pg = require('./src/lib/db');

loadEnvFile('/tmp/qa-bootstrap-secret.env', { override: true });

const emails = [
  'founder-activation-qa-sv@test.stjarnday.local',
  'founder-activation-qa-en@test.stjarnday.local',
];
const childUsers = ['qaactsv', 'qaacten'];

(async () => {
  const hash = await hashPassword(process.env.QA_PASSWORD);
  const pinHash = await hashPassword(process.env.QA_CHILD_PIN);
  for (const email of emails) {
    const r = await pg.query(
      'UPDATE parent SET password_hash = $1, verified = true WHERE email = $2 RETURNING family_id',
      [hash, email]
    );
    if (!r.rows.length) throw new Error('parent_missing:' + email.split('@')[0]);
  }
  await pg.query('UPDATE child SET pin = $1 WHERE username = ANY($2)', [pinHash, childUsers]);
  console.log(JSON.stringify({ ok: true, parents: emails.length, children: childUsers.length }));
  await pg.pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
NODE

QA_CHILD_PIN="$QA_CHILD_PIN" node scripts/ops/reset-founder-activation-qa-scenario.mjs
echo '{"rotate":"ok"}'
