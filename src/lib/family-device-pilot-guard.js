'use strict';

const { isFounderQaParentEmail, normalizeEmail } = require('./founder-qa-family-guard');

/** Disposable prod pilot families — never founder or RC-1 fixture. */
const PILOT_EMAIL_RE = /^fd-pilot-\d{10,}@example\.com$/i;

/** Family Device prod pilot — widgets PAUSED; never enable widget flags here. */
const FAMILY_DEVICE_PILOT_FLAG_KEYS = Object.freeze([
  'trusted_device_v1',
  'family_device_entry_v1',
  'adult_privilege_v1',
  'family_device_daily_ux_v1',
]);

/** Widget flags — excluded from Family Device pilot/readiness while widgets are paused. */
const WIDGET_PILOT_FLAG_KEYS = Object.freeze(['native_widget_enabled', 'widget_completion_enabled']);

/** @deprecated use FAMILY_DEVICE_PILOT_FLAG_KEYS */
const PILOT_FLAG_KEYS = FAMILY_DEVICE_PILOT_FLAG_KEYS;

const FIXTURE_FAMILY_NAME = 'FD Pilot QA (disposable)';
const FIXTURE_PARENT_NAME = 'FD Pilot Parent';

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

function assertFamilyDevicePilotFlagKey(key) {
  if (!FAMILY_DEVICE_PILOT_FLAG_KEYS.includes(key)) {
    const err = new Error(`Family Device pilot refused flag key: ${key}`);
    err.code = 'FD_PILOT_FLAG_NOT_ALLOWED';
    throw err;
  }
  if (WIDGET_PILOT_FLAG_KEYS.includes(key)) {
    const err = new Error(`Family Device pilot refused widget flag: ${key}`);
    err.code = 'FD_PILOT_WIDGET_FLAG_FORBIDDEN';
    throw err;
  }
}

/**
 * Fail-closed ownership proof for destructive stale cleanup.
 * @returns {Promise<{ status: 'ELIGIBLE'|'REFUSED'|'AMBIGUOUS_PILOT_OWNERSHIP', reason?: string, family_id: string, email?: string, family_name?: string, parent_name?: string, parent_count?: number }>}
 */
async function classifyDisposablePilotFixtureOwnership(db, familyId) {
  const famRes = await db.query('SELECT id, name FROM family WHERE id = $1', [familyId]);
  if (!famRes.rows.length) {
    return { status: 'REFUSED', reason: 'family_not_found', family_id: familyId };
  }
  const family = famRes.rows[0];
  const { rows: parents } = await db.query(
    'SELECT id, email, name FROM parent WHERE family_id = $1 ORDER BY created_at ASC NULLS LAST, id ASC',
    [familyId]
  );

  if (family.name !== FIXTURE_FAMILY_NAME) {
    return {
      status: 'REFUSED',
      reason: 'wrong_family_marker',
      family_id: familyId,
      family_name: family.name,
      parent_count: parents.length,
    };
  }

  if (parents.length !== 1) {
    return {
      status: 'AMBIGUOUS_PILOT_OWNERSHIP',
      reason: parents.length === 0 ? 'no_parents' : 'multiple_parents',
      family_id: familyId,
      family_name: family.name,
      parent_count: parents.length,
    };
  }

  const parent = parents[0];
  if (parent.name !== FIXTURE_PARENT_NAME) {
    return {
      status: 'REFUSED',
      reason: 'wrong_parent_marker',
      family_id: familyId,
      email: normalizeEmail(parent.email),
      family_name: family.name,
      parent_name: parent.name,
      parent_count: 1,
    };
  }

  if (!isFamilyDevicePilotDisposableEmail(parent.email)) {
    return {
      status: 'REFUSED',
      reason: 'email_not_disposable',
      family_id: familyId,
      email: normalizeEmail(parent.email),
      family_name: family.name,
      parent_name: parent.name,
      parent_count: 1,
    };
  }

  if (isFounderQaParentEmail(parent.email)) {
    return {
      status: 'REFUSED',
      reason: 'founder_parent',
      family_id: familyId,
      email: normalizeEmail(parent.email),
      family_name: family.name,
      parent_name: parent.name,
      parent_count: 1,
    };
  }

  return {
    status: 'ELIGIBLE',
    reason: 'canonical_fixture',
    family_id: familyId,
    email: normalizeEmail(parent.email),
    family_name: family.name,
    parent_name: parent.name,
    parent_count: 1,
  };
}

/**
 * @param {import('../lib/db')} db
 * @param {string} familyId
 * @param {string} expectedEmail disposable parent email for audit
 */
async function assertFamilyDevicePilotFamily(db, familyId, expectedEmail) {
  assertFamilyDevicePilotDisposableEmail(expectedEmail);
  const verdict = await classifyDisposablePilotFixtureOwnership(db, familyId);
  if (verdict.status !== 'ELIGIBLE') {
    const err = new Error(`Family Device pilot refused family ownership: ${verdict.reason || verdict.status}`);
    err.code = verdict.status === 'AMBIGUOUS_PILOT_OWNERSHIP' ? 'AMBIGUOUS_PILOT_OWNERSHIP' : 'FD_PILOT_FAMILY_REFUSED';
    throw err;
  }
  if (normalizeEmail(verdict.email) !== normalizeEmail(expectedEmail)) {
    const err = new Error('Family Device pilot: family/email mismatch');
    err.code = 'FD_PILOT_FAMILY_MISMATCH';
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
  FAMILY_DEVICE_PILOT_FLAG_KEYS,
  WIDGET_PILOT_FLAG_KEYS,
  FIXTURE_FAMILY_NAME,
  FIXTURE_PARENT_NAME,
  isFamilyDevicePilotDisposableEmail,
  assertFamilyDevicePilotDisposableEmail,
  assertFamilyDevicePilotFlagKey,
  classifyDisposablePilotFixtureOwnership,
  assertFamilyDevicePilotFamily,
  resolvePilotBaseUrl,
  assertProdPilotEnvironment,
  redactSecrets,
};
