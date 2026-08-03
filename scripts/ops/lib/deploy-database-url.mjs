/**
 * Resolve production DATABASE_URL for deploy-time ops scripts only. # pragma: allowlist secret
 * Never logs credentials — only sanitized identity fields.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { databaseIdentityHash, sanitizeIdentityForLog } from './database-identity.mjs';

const require = createRequire(import.meta.url);
const { loadEnvFile, diagnoseDatabaseUrl } = require('../../../src/lib/load-env.js');

const DEFAULT_APP_ENV_CANDIDATES = [
  (root) => process.env.ENV_FILE,
  (root) => process.env.APP_OPS_APP_ENV,
  (root) => process.env.APP_ENV_FILE,
  (root) => (root ? path.join(root, '.env') : null),
  () => path.join(process.cwd(), '.env'),
].filter(Boolean);

/**
 * @param {{ appRoot?: string, mutateEnv?: boolean }} [options]
 * @returns {{ databaseUrl: string, source: string, identity: ReturnType<typeof sanitizeIdentityForLog> }}
 */
export function resolveDeployDatabaseUrl(options = {}) {
  const appRoot = options.appRoot || process.env.VPS_APP_PATH || process.cwd();
  const mutateEnv = options.mutateEnv !== false;
  let source = 'process_env';

  if (!process.env.DATABASE_URL || String(process.env.DATABASE_URL).trim() === '') {
    const tried = [];
    for (const pick of DEFAULT_APP_ENV_CANDIDATES) {
      const candidate = typeof pick === 'function' ? pick(appRoot) : pick;
      if (!candidate || tried.includes(candidate)) continue;
      tried.push(candidate);
      if (!fs.existsSync(candidate)) continue;
      loadEnvFile(candidate, { override: false });
      if (process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim() !== '') {
        source = candidate;
        break;
      }
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  const diag = diagnoseDatabaseUrl(databaseUrl);
  if (!diag.ok) {
    const err = new Error(diag.message || 'DATABASE_URL_MISSING');
    err.code = diag.code === 'missing' ? 'DATABASE_URL_MISSING' : 'DATABASE_URL_INVALID';
    throw err;
  }

  const expectedHash = process.env.EXPECTED_DATABASE_IDENTITY_HASH;
  if (expectedHash && expectedHash.trim()) {
    const actual = databaseIdentityHash(databaseUrl);
    if (actual !== expectedHash.trim()) {
      const err = new Error('DATABASE_IDENTITY_MISMATCH');
      err.code = 'DATABASE_IDENTITY_MISMATCH';
      throw err;
    }
  }

  if (!mutateEnv) {
    return {
      databaseUrl,
      source,
      identity: sanitizeIdentityForLog(databaseUrl),
    };
  }

  return {
    databaseUrl,
    source,
    identity: sanitizeIdentityForLog(databaseUrl),
  };
}

/** Redact postgres URLs and common secret patterns from log lines. */
export function redactDeploySecrets(text) {
  if (text == null) return '';
  let out = String(text);
  out = out.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://[REDACTED]');
  out = out.replace(/DATABASE_URL\s*=\s*[^\s]+/gi, 'DATABASE_URL=[REDACTED]');
  return out;
}
