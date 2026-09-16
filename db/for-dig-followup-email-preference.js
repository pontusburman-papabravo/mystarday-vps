'use strict';

/**
 * Opt-out for För dig outcome follow-up emails only.
 * Does not touch email_subscriptions or notification_preference.
 */

const db = require('../src/lib/db');

async function ensurePreference(parentId) {
  const result = await db.query(
    `INSERT INTO for_dig_followup_email_preference (parent_id)
     VALUES ($1)
     ON CONFLICT (parent_id) DO UPDATE SET parent_id = EXCLUDED.parent_id
     RETURNING parent_id, opted_out_at, unsub_token, created_at`,
    [parentId]
  );
  return result.rows[0];
}

async function getPreference(parentId) {
  const result = await db.query(
    `SELECT parent_id, opted_out_at, unsub_token, created_at
       FROM for_dig_followup_email_preference
      WHERE parent_id = $1`,
    [parentId]
  );
  return result.rows[0] || null;
}

async function listOptedOutParentIds(parentIds) {
  if (!parentIds.length) return new Set();
  const result = await db.query(
    `SELECT parent_id
       FROM for_dig_followup_email_preference
      WHERE parent_id = ANY($1::uuid[])
        AND opted_out_at IS NOT NULL`,
    [parentIds]
  );
  return new Set(result.rows.map((row) => row.parent_id));
}

async function isOptedOut(parentId) {
  const result = await db.query(
    `SELECT 1
       FROM for_dig_followup_email_preference
      WHERE parent_id = $1
        AND opted_out_at IS NOT NULL`,
    [parentId]
  );
  return result.rowCount > 0;
}

async function optOutByUnsubToken(unsubToken) {
  const updated = await db.query(
    `UPDATE for_dig_followup_email_preference
        SET opted_out_at = NOW()
      WHERE unsub_token = $1
        AND opted_out_at IS NULL
      RETURNING parent_id, opted_out_at`,
    [unsubToken]
  );
  if (updated.rows[0]) {
    return { ok: true, parentId: updated.rows[0].parent_id, alreadyOptedOut: false };
  }
  const existing = await db.query(
    `SELECT parent_id, opted_out_at
       FROM for_dig_followup_email_preference
      WHERE unsub_token = $1`,
    [unsubToken]
  );
  if (!existing.rows[0]) return { ok: false, reason: 'unknown_token' };
  return { ok: true, parentId: existing.rows[0].parent_id, alreadyOptedOut: true };
}

async function undoOptOutByUnsubToken(unsubToken) {
  const result = await db.query(
    `UPDATE for_dig_followup_email_preference
        SET opted_out_at = NULL
      WHERE unsub_token = $1
      RETURNING parent_id, opted_out_at`,
    [unsubToken]
  );
  if (!result.rows[0]) return { ok: false, reason: 'unknown_token' };
  return { ok: true, parentId: result.rows[0].parent_id };
}

async function newsletterSubscribed(parentId) {
  const result = await db.query(
    `SELECT subscribed
       FROM email_subscriptions
      WHERE parent_id = $1`,
    [parentId]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].subscribed;
}

async function parentNewsletterFlag(parentId) {
  const result = await db.query(
    `SELECT newsletter_subscribed
       FROM parent
      WHERE id = $1`,
    [parentId]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].newsletter_subscribed;
}

module.exports = {
  ensurePreference,
  getPreference,
  listOptedOutParentIds,
  isOptedOut,
  optOutByUnsubToken,
  undoOptOutByUnsubToken,
  newsletterSubscribed,
  parentNewsletterFlag,
};
