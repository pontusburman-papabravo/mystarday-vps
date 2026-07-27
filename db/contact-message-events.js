/**
 * contact_message_event — immutable support ops audit log.
 */
const db = require('../src/lib/db');

async function logEvent(contactMessageId, eventType, { adminId = null, payload = {} } = {}) {
  const { rows } = await db.query(
    `INSERT INTO contact_message_event (contact_message_id, event_type, payload, admin_id)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id, contact_message_id, event_type, payload, admin_id, created_at`,
    [contactMessageId, eventType, JSON.stringify(payload || {}), adminId]
  );
  return rows[0];
}

async function listEventsForMessage(contactMessageId, limit = 50) {
  const { rows } = await db.query(
    `SELECT
       e.id, e.event_type, e.payload, e.created_at,
       e.admin_id,
       p.name AS admin_name
     FROM contact_message_event e
     LEFT JOIN parent p ON p.id = e.admin_id
     WHERE e.contact_message_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2`,
    [contactMessageId, Math.min(Math.max(limit, 1), 100)]
  );
  return rows;
}

module.exports = {
  logEvent,
  listEventsForMessage,
};
