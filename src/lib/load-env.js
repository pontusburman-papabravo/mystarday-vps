/**
 * Load .env from cwd (or ENV_FILE) into process.env without overwriting existing vars.
 * Matches pattern used by scripts/test-r2-upload.js and typical systemd EnvironmentFile.
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(envPath) {
  const file = envPath || process.env.ENV_FILE || path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return false;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

module.exports = { loadEnvFile };
