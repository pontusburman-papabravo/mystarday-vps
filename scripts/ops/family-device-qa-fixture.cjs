'use strict';

const crypto = require('crypto');
const { hashPassword, pinFingerprint } = require('../../src/lib/hash');
const {
  assertFamilyDevicePilotDisposableEmail,
  makeDisposableEmailFromGuard,
} = require('./family-device-pilot-guard-helpers.cjs');
const { isFounderQaParentEmail, normalizeEmail } = require('../../src/lib/founder-qa-family-guard');

const FIXTURE_FAMILY_NAME = 'FD Pilot QA (disposable)';

function assertPilotOpsMode() {
  if (process.env.FAMILY_DEVICE_PILOT_CONFIRM !== '1') {
    const err = new Error('FAMILY_DEVICE_PILOT_CONFIRM=1 required for DB fixture creation');
    err.code = 'FD_PILOT_CONFIRM_REQUIRED';
    throw err;
  }
}

function generateUsername(name) {
  const base = String(name)
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const suffix = crypto.randomInt(100, 1000);
  return `${base}${suffix}`;
}

function generateChildPin() {
  return String(crypto.randomInt(1000, 10000));
}

function randPassword() {
  return `FdP-${crypto.randomBytes(18).toString('base64url')}1aA`;
}

function randParentPin() {
  let p;
  do {
    p = String(crypto.randomInt(1000, 10000));
  } while (/^(\d)\1{3}$/.test(p));
  return p;
}

async function uniqueUsername(client, name) {
  for (let i = 0; i < 8; i++) {
    const username = generateUsername(name);
    const { rows } = await client.query('SELECT id FROM child WHERE LOWER(username) = LOWER($1)', [
      username,
    ]);
    if (!rows.length) return username;
  }
  throw new Error('fd_pilot_username_collision');
}

/**
 * OPS-only disposable family for Family Device prod pilot (no public /register).
 *
 * @param {import('../../src/lib/db')} db
 * @param {{ childCount: number, email?: string }} opts
 * @returns {Promise<{ email, password, parentPin, familyId, parentId, children: Array<{id,username,pin,name}> }>}
 */
async function createDisposableFamilyDeviceQaFamily(db, opts) {
  assertPilotOpsMode();
  const childCount = opts.childCount;
  if (!Number.isInteger(childCount) || childCount < 1 || childCount > 4) {
    throw new Error('childCount must be 1–4');
  }

  const email = opts.email || makeDisposableEmailFromGuard();
  assertFamilyDevicePilotDisposableEmail(email);
  if (isFounderQaParentEmail(email)) {
    throw new Error('fd_pilot_refused_founder_email');
  }

  const password = randPassword();
  const parentPin = randParentPin();
  const passwordHash = await hashPassword(password);
  const parentPinHash = await hashPassword(parentPin);

  const childSpecs =
    childCount === 1
      ? [{ name: 'Solo', emoji: '🌟' }]
      : [
          { name: 'Alma', emoji: '🦊' },
          { name: 'Bo', emoji: '🐻' },
        ].slice(0, childCount);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const fam = await client.query(
      `INSERT INTO family (name, timezone, preferred_locale, is_lifetime_free)
       VALUES ($1, 'Europe/Stockholm', 'sv-SE', true) RETURNING id`,
      [FIXTURE_FAMILY_NAME]
    );
    const familyId = fam.rows[0].id;

    const par = await client.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified, onboarding_completed, parent_pin_hash)
       VALUES ($1, $2, $3, 'FD Pilot Parent', true, true, $4) RETURNING id`,
      [familyId, normalizeEmail(email), passwordHash, parentPinHash]
    );
    const parentId = par.rows[0].id;

    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, 'lifetime_free', NULL, $2::jsonb)
       ON CONFLICT (family_id) DO UPDATE SET tier = EXCLUDED.tier, components = EXCLUDED.components`,
      [familyId, JSON.stringify([{ slug: 'basic_app', has: true }])]
    );

    const children = [];
    for (const spec of childSpecs) {
      const rawPin = generateChildPin();
      const pinHash = await hashPassword(rawPin);
      const pinFp = pinFingerprint(rawPin);
      const username = await uniqueUsername(client, spec.name);
      const ins = await client.query(
        `INSERT INTO child (family_id, name, emoji, birthday, timezone, view_mode, view_type, pin, username, pin_fingerprint)
         VALUES ($1, $2, $3, '2018-01-01', 'Europe/Stockholm', 'standard', 'standard', $4, $5, $6)
         RETURNING id, name, username`,
        [familyId, spec.name, spec.emoji, pinHash, username, pinFp]
      );
      const childId = ins.rows[0].id;
      await client.query(
        `INSERT INTO parent_child (parent_id, child_id, role) VALUES ($1, $2, 'primary')`,
        [parentId, childId]
      );
      children.push({
        id: childId,
        name: ins.rows[0].name,
        username: ins.rows[0].username,
        pin: rawPin,
      });
    }

    await client.query('COMMIT');
    return { email: normalizeEmail(email), password, parentPin, familyId, parentId, children };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  createDisposableFamilyDeviceQaFamily,
  FIXTURE_FAMILY_NAME,
  randPassword,
  randParentPin,
};
