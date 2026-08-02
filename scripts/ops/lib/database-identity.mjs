/**
 * Sanitized database identity fingerprint (no credentials in output).
 */
import crypto from 'node:crypto';

export function parseDatabaseUrlSafe(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL_MISSING');
  }
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL_INVALID');
  }
  const database = decodeURIComponent((parsed.pathname || '').replace(/^\//, '') || '');
  const user = decodeURIComponent(parsed.username || '');
  const host = (parsed.hostname || '').toLowerCase();
  const port = parsed.port || '5432';
  const ssl =
    host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.localhost');
  return {
    driver: 'postgresql',
    host,
    port,
    database,
    user,
    ssl,
  };
}

export function databaseIdentityHash(databaseUrl) {
  const id = parseDatabaseUrlSafe(databaseUrl);
  const canonical = [
    id.driver,
    id.host,
    id.port,
    id.database,
    id.user,
    `ssl=${id.ssl}`,
  ].join('|');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function sanitizeIdentityForLog(databaseUrl) {
  const id = parseDatabaseUrlSafe(databaseUrl);
  return {
    identity_hash: databaseIdentityHash(databaseUrl),
    host: id.host,
    port: id.port,
    database: id.database,
    user: id.user,
    ssl: id.ssl,
  };
}
