'use strict';

/**
 * Local dev helper: bootstrap a child (if needed) and issue a real child session.
 * Never enabled outside local development on localhost.
 */

const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config');
const { hashPassword, pinFingerprint } = require('./hash');
const { generateCsrfToken } = require('../middleware/csrf');
const {
  createRefreshToken,
  setRefreshCookie,
  setAccessCookie,
} = require('./refresh-tokens');
const pinLockout = require('../../db/pin-lockout');
const { parseDuration } = require('../routes/auth/session');
const { diagnoseDatabaseUrl } = require('./load-env');
const { seedChildDefaultSchedule } = require('./seed-child-default-schedule');
const { ensureDevFamilyReady } = require('./seed-dev-family');

const DEV_CHILD_NAME = 'Testbarn';
const DEV_CHILD_USERNAME = 'testbarn';
const DEV_CHILD_PIN = '1234';
const DEV_PARENT_EMAIL = 'dev-parent@localhost.local';

function isLocalhostRequest(req) {
  let host = (req.hostname || '').toLowerCase();
  if (!host && req.get) {
    const raw = req.get('host') || '';
    host = raw.split(':')[0].toLowerCase();
  }
  return host === 'localhost' || host === '127.0.0.1';
}

function isLocalDatabase() {
  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  if (!diag.ok) return false;
  const host = (diag.host || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

function isDevChildLoginAllowed(req) {
  if (!isLocalhostRequest(req)) return false;
  if (process.env.ALLOW_DEV_CHILD_SKIP === 'true' || process.env.ALLOW_DEV_CHILD_SKIP === '1') return true;
  if (process.env.DEV_CHILD_SKIP_LOGIN === 'false') return false;
  if (process.env.NODE_ENV === 'development') return true; // pragma: allowlist secret
  if (isLocalDatabase()) return true;
  return false;
}

function getDevChildLoginStatus(req) {
  const diag = diagnoseDatabaseUrl(process.env.DATABASE_URL);
  const localhost = isLocalhostRequest(req);
  const payload = {
    available: isDevChildLoginAllowed(req),
    localhost,
    local_db: isLocalDatabase(),
    db_host: diag.ok ? diag.host : null,
    allow_flag: process.env.ALLOW_DEV_CHILD_SKIP === 'true' || process.env.ALLOW_DEV_CHILD_SKIP === '1',
    skip_disabled: process.env.DEV_CHILD_SKIP_LOGIN === 'false',
  };
  if (!payload.available && localhost) {
    payload.hint = payload.skip_disabled
      ? 'Ta bort DEV_CHILD_SKIP_LOGIN=false från .env'
      : 'Lägg ALLOW_DEV_CHILD_SKIP=true i .env och starta om, eller sätt DATABASE_URL till @localhost';
  }
  return payload;
}

async function findFirstChild() {
  const result = await db.query(
    `SELECT id, family_id, name, emoji, username, avatar_url
     FROM child
     ORDER BY created_at ASC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function findFirstFamilyWithParent() {
  const result = await db.query(
    `SELECT p.id AS parent_id, p.family_id
     FROM parent p
     ORDER BY p.created_at ASC
     LIMIT 1`
  );
  return result.rows[0] || null;
}

async function insertDevChild(client, familyId, parentId) {
  const byUsername = await client.query(
    `SELECT id, family_id, name, emoji, username, avatar_url
     FROM child WHERE LOWER(username) = $1 LIMIT 1`,
    [DEV_CHILD_USERNAME.toLowerCase()]
  );
  if (byUsername.rows[0]) {
    const child = byUsername.rows[0];
    await client.query(
      `INSERT INTO parent_child (parent_id, child_id, role)
       VALUES ($1, $2, 'shared')
       ON CONFLICT (parent_id, child_id) DO NOTHING`,
      [parentId, child.id]
    );
    return child;
  }

  const pinHash = await hashPassword(DEV_CHILD_PIN);
  const pinFp = pinFingerprint(DEV_CHILD_PIN);

  const childResult = await client.query(
    `INSERT INTO child (family_id, name, emoji, birthday, timezone, view_mode, pin, username, pin_fingerprint)
     VALUES ($1, $2, '🌟', '2018-06-01', 'Europe/Stockholm', 'auto', $3, $4, $5)
     RETURNING id, family_id, name, emoji, username, avatar_url`,
    [familyId, DEV_CHILD_NAME, pinHash, DEV_CHILD_USERNAME, pinFp]
  );
  const child = childResult.rows[0];

  await client.query(
    `INSERT INTO parent_child (parent_id, child_id, role)
     VALUES ($1, $2, 'primary')
     ON CONFLICT (parent_id, child_id) DO NOTHING`,
    [parentId, child.id]
  );
  await client.query('INSERT INTO streak (child_id) VALUES ($1)', [child.id]);

  return child;
}

async function bootstrapDevFamily() {
  const passwordHash = await hashPassword('dev-local-only-password');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const familyResult = await client.query(
      `INSERT INTO family (name, subscription_status, trial_ends_at, is_lifetime_free)
       VALUES ('Dev-familj', 'none', NOW() + INTERVAL '14 days', true)
       RETURNING id`
    );
    const familyId = familyResult.rows[0].id;

    const parentResult = await client.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified, newsletter_subscribed, family_role, onboarding_completed)
       VALUES ($1, $2, $3, 'Dev-förälder', true, false, 'förälder', true)
       RETURNING id`,
      [familyId, DEV_PARENT_EMAIL, passwordHash]
    );
    const parentId = parentResult.rows[0].id;

    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, 'trial', NOW() + INTERVAL '14 days', $2)
       ON CONFLICT (family_id) DO NOTHING`,
      [
        familyId,
        JSON.stringify([{ component: 'basic_app', granted_at: new Date().toISOString(), expires_at: null }]),
      ]
    );

    const child = await insertDevChild(client, familyId, parentId);
    await client.query('COMMIT');
    return { child, familyId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createDevChildInExistingFamily(familyId, parentId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const child = await insertDevChild(client, familyId, parentId);
    await client.query('COMMIT');
    return child;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ensureDevChild() {
  const existing = await findFirstChild();
  if (existing) {
    await ensureDevFamilyReady(existing.family_id, existing.id);
    return { child: existing, pin: null, created: false };
  }

  const family = await findFirstFamilyWithParent();
  if (family) {
    const child = await createDevChildInExistingFamily(family.family_id, family.parent_id);
    await ensureDevFamilyReady(family.family_id, child.id);
    try {
      await seedChildDefaultSchedule({
        childId: child.id,
        familyId: family.family_id,
        birthday: '2018-06-01',
      });
    } catch (seedErr) {
      console.warn('[DEV-CHILD] Global schedule seed skipped:', seedErr.message);
    }
    return { child, pin: DEV_CHILD_PIN, created: true };
  }

  const boot = await bootstrapDevFamily();
  await ensureDevFamilyReady(boot.familyId, boot.child.id);
  try {
    await seedChildDefaultSchedule({
      childId: boot.child.id,
      familyId: boot.familyId,
      birthday: '2018-06-01',
    });
  } catch (seedErr) {
    console.warn('[DEV-CHILD] Global schedule seed skipped:', seedErr.message);
  }
  return { child: boot.child, pin: DEV_CHILD_PIN, created: true };
}

async function completeDevChildLogin(req, res, child, meta) {
  await pinLockout.recordSuccessfulLogin(child.id).catch(() => {});

  const accessToken = jwt.sign(
    {
      id: child.id,
      type: 'child',
      familyId: child.family_id,
      username: child.username,
      name: child.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.childExpiresIn }
  );

  const rawRefresh = await createRefreshToken({
    userId: child.id,
    userType: 'child',
    familyId: child.family_id,
  });

  setRefreshCookie(res, rawRefresh);

  const expiresInSecs = parseDuration(config.jwt.childExpiresIn);
  setAccessCookie(res, accessToken, expiresInSecs);

  const csrfToken = generateCsrfToken(res);
  const user = {
    id: child.id,
    name: child.name,
    emoji: child.emoji,
    avatar_url: child.avatar_url || null,
    familyId: child.family_id,
    username: child.username,
    type: 'child',
  };
  const expiresAt = Date.now() + expiresInSecs * 1000;

  return res.json({
    csrfToken,
    user,
    expiresAt,
    dev: true,
    created: meta.created,
    hint: meta.pin
      ? `Testbarn skapat — namn "${DEV_CHILD_NAME}", PIN ${meta.pin}`
      : `Inloggad som ${child.name} (dev)`,
  });
}

module.exports = {
  DEV_CHILD_NAME,
  DEV_CHILD_PIN,
  isLocalhostRequest,
  isLocalDatabase,
  isDevChildLoginAllowed,
  getDevChildLoginStatus,
  ensureDevChild,
  completeDevChildLogin,
};
