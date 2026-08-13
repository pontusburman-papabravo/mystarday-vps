'use strict';

const { isFounderQaParentEmail, normalizeEmail } = require('./founder-qa-family-guard');

/** Disposable prod pilot families — never founder or RC-1 fixture. */
const PILOT_EMAIL_RE = /^at-pilot-\d{10,}@example\.com$/i;

function isActivityTimerPilotDisposableEmail(email) {
  return PILOT_EMAIL_RE.test(normalizeEmail(email));
}

function assertActivityTimerPilotDisposableEmail(email) {
  const normalized = normalizeEmail(email);
  if (!isActivityTimerPilotDisposableEmail(normalized)) {
    const err = new Error('Activity Timer pilot refused: email is not at-pilot-*@example.com');
    err.code = 'AT_PILOT_EMAIL_NOT_DISPOSABLE';
    throw err;
  }
  if (isFounderQaParentEmail(normalized)) {
    const err = new Error('Activity Timer pilot refused: founder QA email');
    err.code = 'AT_PILOT_FOUNDER_EMAIL';
    throw err;
  }
}

/**
 * @param {import('./db')} db
 * @param {string} familyId
 * @param {string} expectedEmail disposable parent email for audit
 */
async function assertActivityTimerPilotFamily(db, familyId, expectedEmail) {
  assertActivityTimerPilotDisposableEmail(expectedEmail);
  const { rows } = await db.query(`SELECT email FROM parent WHERE family_id = $1`, [familyId]);
  if (!rows.length) {
    const err = new Error('Activity Timer pilot: family has no parents');
    err.code = 'AT_PILOT_FAMILY_EMPTY';
    throw err;
  }
  const match = rows.some((r) => normalizeEmail(r.email) === normalizeEmail(expectedEmail));
  if (!match) {
    const err = new Error('Activity Timer pilot: family/email mismatch');
    err.code = 'AT_PILOT_FAMILY_MISMATCH';
    throw err;
  }
  if (rows.some((r) => isFounderQaParentEmail(r.email))) {
    const err = new Error('Activity Timer pilot refused: founder family');
    err.code = 'AT_PILOT_FOUNDER_FAMILY';
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
    const err = new Error('Set SMOKE_BASE_URL or PROD_BASE for Activity Timer prod pilot');
    err.code = 'AT_PILOT_BASE_MISSING';
    throw err;
  }
  const allowed = (env.ACTIVITY_TIMER_PILOT_ALLOWED_BASES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.length) {
    const err = new Error('Set ACTIVITY_TIMER_PILOT_ALLOWED_BASES (comma-separated prod origins)');
    err.code = 'AT_PILOT_ALLOWED_BASES_MISSING';
    throw err;
  }
  if (!allowed.some((origin) => base === origin.replace(/\/$/, ''))) {
    const err = new Error(`Activity Timer pilot base URL ${base} is not allowlisted`);
    err.code = 'AT_PILOT_BASE_NOT_ALLOWLISTED';
    throw err;
  }
  if (env.ACTIVITY_TIMER_PILOT_CONFIRM !== '1') {
    const err = new Error('ACTIVITY_TIMER_PILOT_CONFIRM=1 required for Activity Timer prod pilot');
    err.code = 'AT_PILOT_CONFIRM_REQUIRED';
    throw err;
  }
  return base;
}

function redactSecrets(value) {
  if (value == null) return value;
  const s = String(value);
  return s
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/access_token=[^;\s]+/gi, 'access_token=[REDACTED]')
    .replace(/refresh_token=[^;\s]+/gi, 'refresh_token=[REDACTED]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"pin"\s*:\s*"[^"]*"/gi, '"pin":"[REDACTED]"');
}

module.exports = {
  PILOT_EMAIL_RE,
  isActivityTimerPilotDisposableEmail,
  assertActivityTimerPilotDisposableEmail,
  assertActivityTimerPilotFamily,
  resolvePilotBaseUrl,
  assertProdPilotEnvironment,
  redactSecrets,
};
