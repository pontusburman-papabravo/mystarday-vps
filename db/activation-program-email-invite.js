/**
 * db/activation-program-email-invite.js — väg B e-postinbjudan (Fas 4).
 */

const db = require('../src/lib/db');

async function createInvite(parentId, familyId, client = db) {
  const result = await client.query(
    `INSERT INTO activation_program_email_invite (parent_id, family_id)
     VALUES ($1, $2)
     RETURNING *`,
    [parentId, familyId]
  );
  return result.rows[0];
}

async function getByToken(token, client = db) {
  const result = await client.query(
    `SELECT i.*, p.email AS parent_email, p.name AS parent_name
     FROM activation_program_email_invite i
     JOIN parent p ON p.id = i.parent_id
     WHERE i.token = $1
     LIMIT 1`,
    [token]
  );
  return result.rows[0] || null;
}

async function markSent(inviteId, client = db) {
  const result = await client.query(
    `UPDATE activation_program_email_invite
     SET sent_at = COALESCE(sent_at, NOW())
     WHERE id = $1
     RETURNING *`,
    [inviteId]
  );
  return result.rows[0] || null;
}

async function markClicked(token, client = db) {
  const result = await client.query(
    `UPDATE activation_program_email_invite
     SET clicked_at = COALESCE(clicked_at, NOW())
     WHERE token = $1
     RETURNING *`,
    [token]
  );
  return result.rows[0] || null;
}

async function wasSentRecently(parentId, withinDays = 30, client = db) {
  const result = await client.query(
    `SELECT 1 FROM activation_program_email_invite
     WHERE parent_id = $1
       AND sent_at IS NOT NULL
       AND sent_at > NOW() - ($2::int || ' days')::interval
     LIMIT 1`,
    [parentId, withinDays]
  );
  return result.rows.length > 0;
}

module.exports = {
  createInvite,
  getByToken,
  markSent,
  markClicked,
  wasSentRecently,
};
