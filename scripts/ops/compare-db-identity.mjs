#!/usr/bin/env node
/**
 * Compare normalized DATABASE connection identity (no credentials in output).
 * Usage: node scripts/ops/compare-db-identity.mjs [envFile]
 * Or: DATABASE_URL=... node scripts/ops/compare-db-identity.mjs
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === 'DATABASE_URL') return val;
  }
  return null;
}

function categorizeHost(hostname) {
  if (!hostname) return 'unknown';
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return 'localhost';
  if (
    h.endsWith('.neon.tech') ||
    h.includes('neon') ||
    h.endsWith('.aws') ||
    h.includes('pooler') ||
    h.includes('render.com')
  ) {
    return 'managed_service';
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes('internal')) return 'private_network';
  return 'other';
}

function identityFromUrl(url) {
  if (!url) return { ok: false, code: 'missing' };
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, '') || '';
    const ssl =
      parsed.searchParams.get('sslmode') === 'require' ||
      parsed.hostname !== 'localhost' &&
        parsed.hostname !== '127.0.0.1' &&
        !parsed.hostname.startsWith('::');
    const normalized = [
      'postgresql',
      parsed.hostname || '',
      String(parsed.port || '5432'),
      dbName,
      ssl ? 'ssl' : 'nossl',
    ].join('|');
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    const dbMask =
      dbName.length <= 2
        ? '***'
        : dbName.slice(0, 2) + '***' + (dbName.length > 4 ? dbName.slice(-1) : '');
    return {
      ok: true,
      driver: 'postgresql',
      hostCategory: categorizeHost(parsed.hostname),
      port: parsed.port || '5432',
      databaseMasked: dbMask,
      ssl: ssl,
      identityHash: hash,
    };
  } catch {
    return { ok: false, code: 'invalid_url' };
  }
}

function loadFromCjs() {
  const { loadEnvFile } = require(path.join(repoRoot, 'src/lib/load-env.js'));
  process.env.DATABASE_URL = '';
  loadEnvFile(path.join(repoRoot, '.env'), { override: true });
  return process.env.DATABASE_URL;
}

const envFileArg = process.argv[2];
let url = process.env.DATABASE_URL;
let source = 'environment';

if (envFileArg) {
  const fromFile = parseEnvFile(envFileArg);
  if (fromFile) {
    url = fromFile;
    source = 'env_file';
  }
} else if (!url && fs.existsSync(path.join(repoRoot, '.env'))) {
  url = loadFromCjs();
  source = 'cwd_env_file';
}

const identity = identityFromUrl(url);
console.log(JSON.stringify({ source, ...identity }, null, 2));
