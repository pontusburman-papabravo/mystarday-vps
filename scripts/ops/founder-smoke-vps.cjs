'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

function parseVpsJson(out) {
  const lines = out.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) return JSON.parse(line);
  }
  throw new Error(`No JSON line in VPS output (first 300 chars): ${out.slice(0, 300)}`);
}

/**
 * Run founder-smoke-db-helper on VPS via scripts/vps-ssh.sh
 */
function vpsDb(cmd, familyId, extra, env = process.env) {
  if (env.FOUNDER_SMOKE_VPS !== '1') {
    throw new Error('FOUNDER_SMOKE_VPS=1 required for DB scenarios');
  }
  const VPS_APP = env.VPS_APP_PATH;
  const EMAIL = env.FOUNDER_QA_EMAIL;
  if (!VPS_APP) throw new Error('VPS_APP_PATH required');

  let cliExtra = '';
  if (cmd === 'restore' && extra && !Array.isArray(extra)) {
    const b64 = Buffer.from(JSON.stringify(extra)).toString('base64');
    cliExtra = `--json-base64 ${JSON.stringify(b64)}`;
  } else if (Array.isArray(extra)) {
    cliExtra = extra.join(' ');
  }

  const remote = [
    'set -a',
    `[ -f ${VPS_APP}/.env ] && . ${VPS_APP}/.env`,
    'set +a',
    `cd ${VPS_APP}`,
    `export FOUNDER_QA_EMAIL=${JSON.stringify(EMAIL)}`,
    `node scripts/ops/founder-smoke-db-helper.cjs ${cmd} --family-id ${familyId} ${cliExtra}`,
  ].join(' && ');

  const out = execFileSync(path.join(__dirname, '../vps-ssh.sh'), [remote], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
  return parseVpsJson(out);
}

module.exports = { parseVpsJson, vpsDb };
