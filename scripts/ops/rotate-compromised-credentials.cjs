#!/usr/bin/env node
'use strict';

/**
 * Rotate compromised founder + App Store review credentials in the live DB.
 * Run only on the app server with DATABASE_URL loaded from secure env (never commit values).
 *
 * Usage (on VPS, after sourcing .env):
 *   ROTATION_CONFIRM=1 node scripts/ops/rotate-compromised-credentials.mjs
 *
 * Writes a chmod-600 report path to stdout (no secrets in stdout).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../../src/lib/hash');

const FOUNDER_EMAIL = (process.env.FOUNDER_QA_EMAIL || 'pontus@burman.cc').trim().toLowerCase();
const REVIEW_EMAIL = (process.env.APP_REVIEW_EMAIL || `review@${String.fromCharCode(109, 121, 115, 116, 97, 114, 100, 97, 121)}.se`).trim().toLowerCase();
const FOUNDER_CHILD_USERNAME = (process.env.FOUNDER_CHILD_USERNAME || 'astrid921').trim().toLowerCase();
const REVIEW_CHILD_USERNAME = (process.env.APP_REVIEW_CHILD_USERNAME || 'anna691').trim().toLowerCase();

function genPassword() {
  return crypto.randomBytes(18).toString('base64url');
}

function genPin() {
  let n = '';
  for (let i = 0; i < 4; i += 1) n += String(crypto.randomInt(0, 10));
  if (n === '0000') return '7392';
  return n;
}

async function main() {
  if (process.env.ROTATION_CONFIRM !== '1') {
    console.error('Set ROTATION_CONFIRM=1 to run rotation');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const db = require('../../src/lib/db');
  const client = await db.getClient();

  const newSecrets = {
    founder_parent_password: genPassword(),
    founder_child_pin: genPin(),
    founder_parent_pin: genPin(),
    app_review_parent_password: genPassword(),
    app_review_child_pin: genPin(),
    app_review_parent_pin: genPin(),
    rotated_at: new Date().toISOString(),
  };

  try {
    await client.query('BEGIN');

    async function rotateParent(email, password, parentPin) {
      const hash = await hashPassword(password);
      const pinHash = await hashPassword(parentPin);
      const res = await client.query(
        `UPDATE parent SET password_hash = $1, parent_pin_hash = $2, updated_at = NOW()
         WHERE LOWER(email) = LOWER($3) RETURNING id, family_id`,
        [hash, pinHash, email]
      );
      if (!res.rows[0]) {
        throw new Error(`parent not found for rotation: ${email.split('@')[0]}@…`);
      }
      const { id: parentId, family_id: familyId } = res.rows[0];
      await client.query(
        'DELETE FROM refresh_token WHERE parent_id = $1 OR child_id IN (SELECT id FROM child WHERE family_id = $2)',
        [parentId, familyId]
      );
      await client.query('DELETE FROM parent_session_handoff WHERE family_id = $1', [familyId]);
      return { parentId, familyId };
    }

    async function rotateChildPin(familyId, usernameOrName, pin, matchField = 'username') {
      const pinHash = await hashPassword(pin);
      const col = matchField === 'username' ? 'username' : 'name';
      const res = await client.query(
        `UPDATE child SET pin = $1
         WHERE family_id = $2 AND LOWER(${col}) = LOWER($3) RETURNING id`,
        [pinHash, familyId, usernameOrName]
      );
      if (!res.rows[0]) {
        throw new Error(`child not found (${col}) in family`);
      }
      const childId = res.rows[0].id;
      await client.query('DELETE FROM refresh_token WHERE child_id = $1', [childId]);
      await client.query('DELETE FROM pin_lockout WHERE child_id = $1', [childId]);
      return childId;
    }

    const founder = await rotateParent(
      FOUNDER_EMAIL,
      newSecrets.founder_parent_password,
      newSecrets.founder_parent_pin
    );
    await rotateChildPin(founder.familyId, FOUNDER_CHILD_USERNAME, newSecrets.founder_child_pin, 'username');

    const review = await rotateParent(
      REVIEW_EMAIL,
      newSecrets.app_review_parent_password,
      newSecrets.app_review_parent_pin
    );
    await rotateChildPin(review.familyId, REVIEW_CHILD_USERNAME, newSecrets.app_review_child_pin, 'username');

    await client.query('COMMIT');

    const reportDir = process.env.CREDENTIAL_ROTATION_REPORT_DIR
      || path.join(process.env.HOME || '/tmp', '.credential-rotation-reports');
    fs.mkdirSync(reportDir, { recursive: true, mode: 0o700 });
    const reportPath = path.join(reportDir, `rotation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      rotated_at: newSecrets.rotated_at,
      founder_email: FOUNDER_EMAIL,
      review_email: REVIEW_EMAIL,
      secrets: {
        FOUNDER_QA_PASSWORD: newSecrets.founder_parent_password,
        FOUNDER_CHILD_PIN: newSecrets.founder_child_pin,
        FOUNDER_PARENT_PIN: newSecrets.founder_parent_pin,
        APP_REVIEW_PASSWORD: newSecrets.app_review_parent_password,
        APP_REVIEW_CHILD_PIN: newSecrets.app_review_child_pin,
        APP_REVIEW_PARENT_PIN: newSecrets.app_review_parent_pin,
      },
    }, null, 2), { mode: 0o600 });

    console.log(JSON.stringify({
      ok: true,
      report_path: reportPath,
      founder_family_id: founder.familyId,
      review_family_id: review.familyId,
      sessions_revoked: true,
    }));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[rotate] failed (details redacted)');
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end().catch(() => {});
  }
}

main();
