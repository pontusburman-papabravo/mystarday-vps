'use strict';

/**
 * Operator guard — family overrides for dark launch only on founder QA households.
 */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getFounderQaEmails() {
  const raw = process.env.FOUNDER_QA_EMAIL;
  if (!raw) return new Set();
  return new Set(
    raw.split(',').map((e) => normalizeEmail(e)).filter(Boolean)
  );
}

function isFounderQaParentEmail(email) {
  const allow = getFounderQaEmails();
  if (!allow.size) return false;
  return allow.has(normalizeEmail(email));
}

/**
 * @param {import('../src/lib/db')} db
 */
async function assertFamilyEligibleForFounderOverride(db, familyId) {
  if (process.env.FEATURE_FAMILY_OVERRIDE_SKIP_QA_GUARD === '1') return;

  const allow = getFounderQaEmails();
  if (!allow.size) {
    const err = new Error(
      'FOUNDER_QA_EMAIL is not set — refusing family feature override on a non-QA family'
    );
    err.code = 'FOUNDER_QA_EMAIL_MISSING';
    throw err;
  }

  const { rows } = await db.query(
    `SELECT email FROM parent WHERE family_id = $1`,
    [familyId]
  );
  const match = rows.some((row) => allow.has(normalizeEmail(row.email)));
  if (!match) {
    const err = new Error(
      'Family is not on the founder QA allowlist — override refused (use dedicated QA household only)'
    );
    err.code = 'FOUNDER_QA_FAMILY_NOT_ALLOWED';
    throw err;
  }
}

module.exports = {
  normalizeEmail,
  getFounderQaEmails,
  isFounderQaParentEmail,
  assertFamilyEligibleForFounderOverride,
};
