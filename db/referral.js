'use strict';

const db = require('../src/lib/db');
const crypto = require('crypto');

const CODE_PREFIX = 'STJ';

function randomCodeSuffix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function getOrCreateReferralCode(parentId) {
  const existing = await db.query(
    'SELECT code FROM referral_code WHERE parent_id = $1',
    [parentId]
  );
  if (existing.rows[0]) return existing.rows[0].code;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${CODE_PREFIX}-${randomCodeSuffix()}`;
    try {
      await db.query(
        'INSERT INTO referral_code (parent_id, code) VALUES ($1, $2)',
        [parentId, code]
      );
      return code;
    } catch (err) {
      if (err.code !== '23505') throw err;
    }
  }
  throw new Error('Could not generate unique referral code');
}

async function findReferrerByCode(code) {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.trim().toUpperCase();
  const result = await db.query(
    `SELECT rc.parent_id, p.family_id, p.email
     FROM referral_code rc
     JOIN parent p ON p.id = rc.parent_id
     WHERE UPPER(rc.code) = $1
     LIMIT 1`,
    [normalized]
  );
  return result.rows[0] || null;
}

async function createPendingReferral({ referrerParentId, referredFamilyId, code }) {
  const result = await db.query(
    `INSERT INTO referral (referrer_parent_id, referred_family_id, code, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [referrerParentId, referredFamilyId, code]
  );
  return result.rows[0]?.id || null;
}

async function listReferralStats() {
  const result = await db.query(
    `SELECT rc.code,
            p.email AS referrer_email,
            p.name AS referrer_name,
            COUNT(r.id)::int AS signups,
            COUNT(r.id) FILTER (WHERE r.status = 'qualified')::int AS qualified,
            MAX(r.created_at) AS last_signup_at
     FROM referral_code rc
     JOIN parent p ON p.id = rc.parent_id
     LEFT JOIN referral r ON r.referrer_parent_id = rc.parent_id
     GROUP BY rc.code, p.email, p.name
     ORDER BY signups DESC, rc.code ASC`
  );
  return result.rows;
}

module.exports = {
  getOrCreateReferralCode,
  findReferrerByCode,
  createPendingReferral,
  listReferralStats,
};
