/**
 * Load .env from cwd (or ENV_FILE) into process.env.
 * Used by migrate.js and VPS troubleshooting scripts.
 */
const fs = require('fs');
const path = require('path');

/**
 * Strip trailing inline comments from unquoted .env values.
 * systemd EnvironmentFile does NOT strip " # comment" — breaks ISO timestamps.
 */
function sanitizeEnvValue(value) {
  if (value == null) return value;
  const s = String(value).trim();
  const commentStart = s.search(/\s+#/);
  return commentStart === -1 ? s : s.slice(0, commentStart).trim();
}

function parseEnvLine(line) {
  let trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  if (trimmed.startsWith('export ')) {
    trimmed = trimmed.slice(7).trim();
  }

  const eq = trimmed.indexOf('=');
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();

  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  } else {
    val = sanitizeEnvValue(val);
  }

  return { key, val };
}

function shouldApplyEnvValue(key, val) {
  if (!key) return false;
  const existing = process.env[key];
  if (existing === undefined) return true;
  // Prefer .env over empty shell/systemd placeholders
  if (existing === '' && val !== '') return true;
  return false;
}

function loadEnvFile(envPath, options = {}) {
  const { override = false } = options;
  const file = envPath || process.env.ENV_FILE || path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return false;

  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const shouldApply = override || shouldApplyEnvValue(parsed.key, parsed.val);
    if (shouldApply) {
      process.env[parsed.key] = parsed.val;
    }
  }
  return true;
}

/** Diagnose DATABASE_URL without logging secrets. */
function diagnoseDatabaseUrl(url) {
  if (url === undefined) {
    return { ok: false, code: 'missing', message: 'DATABASE_URL is not set' };
  }
  if (typeof url !== 'string' || url.trim() === '') {
    return { ok: false, code: 'empty', message: 'DATABASE_URL is empty' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return { ok: false, code: 'invalid_url', message: `DATABASE_URL is not a valid URL: ${err.message}` };
  }

  if (!parsed.hostname) {
    return { ok: false, code: 'no_host', message: 'DATABASE_URL has no hostname' };
  }

  // pg SASL error often means password parsed as undefined — common with bad URL encoding
  if (parsed.username && parsed.password === '' && !url.includes('@localhost') && !url.includes('127.0.0.1')) {
    return {
      ok: false,
      code: 'no_password',
      message: 'DATABASE_URL has a username but no password (check special characters — URL-encode @ # % etc.)',
    };
  }

  return { ok: true, host: parsed.hostname, database: parsed.pathname.replace(/^\//, '') };
}

module.exports = { loadEnvFile, parseEnvLine, sanitizeEnvValue, diagnoseDatabaseUrl };
