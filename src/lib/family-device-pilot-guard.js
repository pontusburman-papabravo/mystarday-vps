'use strict';

const { isFounderQaParentEmail, normalizeEmail } = require('./founder-qa-family-guard');

/** Disposable prod pilot families — never founder or RC-1 fixture. */
const PILOT_EMAIL_RE = /^fd-pilot-\d{10,}@example\.com$/i;

const PILOT_FLAG_KEYS = [
  'trusted_device_v1',
  'family_device_entry_v1',
  'adult_privilege_v1',
  'family_device_daily_ux_v1',
  'native_widget_enabled',
  'widget_completion_enabled',
];

function isFamilyDevicePilotDisposableEmail(email) {
  return PILOT_EMAIL_RE.test(normalizeEmail(email));
}

function assertFamilyDevicePilotDisposableEmail(email) {
  const normalized = normalizeEmail(email);
  if (!isFamilyDevicePilotDisposableEmail(normalized)) {
    const err = new Error('Family Device pilot refused: email is not fd-pilot-*@example.com');
    err.code = 'FD_PILOT_EMAIL_NOT_DISPOSABLE';
    throw err;
  }
  if (isFounderQaParentEmail(normalized)) {
    const err = new Error('Family Device pilot refused: founder QA email');
    err.code = 'FD_PILOT_FOUNDER_EMAIL';
    throw err;
  }
}

/**
 * @param {import('../lib/db')} db
 * @param {string} familyId
 * @param {string} expectedEmail disposable parent email for audit
 */
async function assertFamilyDevicePilotFamily(db, familyId, expectedEmail) {
  assertFamilyDevicePilotDisposableEmail(expectedEmail);
  const { rows } = await db.query(
    `SELECT email FROM parent WHERE family_id = $1`,
    [familyId]
  );
  if (!rows.length) {
    const err = new Error('Family Device pilot: family has no parents');
    err.code = 'FD_PILOT_FAMILY_EMPTY';
    throw err;
  }
  const match = rows.some((r) => normalizeEmail(r.email) === normalizeEmail(expectedEmail));
  if (!match) {
    const err = new Error('Family Device pilot: family/email mismatch');
    err.code = 'FD_PILOT_FAMILY_MISMATCH';
    throw err;
  }
  if (rows.some((r) => isFounderQaParentEmail(r.email))) {
    const err = new Error('Family Device pilot refused: founder family');
    err.code = 'FD_PILOT_FOUNDER_FAMILY';
    throw err;
  }
}

function resolvePilotBaseUrl(env = process.env) {
  const raw = (env.SMOKE_BASE_URL || env.PROD_BASE || '').replace(/\/$/, '');
  if (!raw) return null;
  return raw;
}

function assertProdPilotEnvironment(env = process.env) {
  const base = resolvePilotBaseUrl(env);
  if (!base) {
    const err = new Error('Set SMOKE_BASE_URL or PROD_BASE for prod pilot');
    err.code = 'FD_PILOT_BASE_MISSING';
    throw err;
  }
  const allowed = (env.FAMILY_DEVICE_PILOT_ALLOWED_BASES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.length) {
    const err = new Error('Set FAMILY_DEVICE_PILOT_ALLOWED_BASES to the prod origin allowlist');
    err.code = 'FD_PILOT_ALLOWLIST_MISSING';
    throw err;
  }
  if (!allowed.includes(base)) {
    const err = new Error(`Family Device pilot base URL not allowlisted: ${base}`);
    err.code = 'FD_PILOT_BASE_DENIED';
    throw err;
  }
  if (env.FAMILY_DEVICE_PILOT_CONFIRM !== '1') {
    const err = new Error('Set FAMILY_DEVICE_PILOT_CONFIRM=1 to run prod pilot');
    err.code = 'FD_PILOT_CONFIRM_REQUIRED';
    throw err;
  }
  return base;
}

function redactSecrets(text) {
  if (!text) return text;
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/trusted_device=[^;\s]+/gi, 'trusted_device=[REDACTED]')
    .replace(/access_token=[^;\s]+/gi, 'access_token=[REDACTED]')
    .replace(/refresh_token=[^;\s]+/gi, 'refresh_token=[REDACTED]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"pin"\s*:\s*"[^"]*"/gi, '"pin":"[REDACTED]"');
}

module.exports = {
  PILOT_EMAIL_RE,
  PILOT_FLAG_KEYS,
  isFamilyDevicePilotDisposableEmail,
  assertFamilyDevicePilotDisposableEmail,
  assertFamilyDevicePilotFamily,
  resolvePilotBaseUrl,
  assertProdPilotEnvironment,
  redactSecrets,
};
