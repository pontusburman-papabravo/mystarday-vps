'use strict';

/**
 * Run english-app-global-flag.cjs on the app VPS (DB URL from app .env).
 *
 *   ENGLISH_GLOBAL_FLAG_CONFIRM=1 node scripts/ops/english-app-global-flag-vps.cjs --on
 */
const path = require('path');
const { execFileSync } = require('child_process');

function main() {
  const VPS_APP = process.env.VPS_APP_PATH;
  if (!VPS_APP) {
    console.error('VPS_APP_PATH required');
    process.exit(2);
  }
  if (process.env.ENGLISH_GLOBAL_FLAG_CONFIRM !== '1') {
    console.error('Set ENGLISH_GLOBAL_FLAG_CONFIRM=1');
    process.exit(2);
  }
  const mode = process.argv.includes('--on') ? '--on' : process.argv.includes('--off') ? '--off' : null;
  if (!mode) {
    console.error('Usage: english-app-global-flag-vps.cjs --on | --off');
    process.exit(2);
  }

  const remote = [
    'set -a',
    `[ -f ${VPS_APP}/.env ] && . ${VPS_APP}/.env`,
    'set +a',
    `cd ${VPS_APP}`,
    `ENGLISH_GLOBAL_FLAG_CONFIRM=1 node scripts/ops/english-app-global-flag.cjs ${mode}`,
  ].join(' && ');

  const out = execFileSync(path.join(__dirname, '../vps-ssh.sh'), [remote], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  const line = out.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) {
    console.error('No JSON from VPS');
    process.exit(1);
  }
  process.stdout.write(`${line}\n`);
  const parsed = JSON.parse(line);
  if (parsed.ok !== true) process.exit(1);
}

main();
