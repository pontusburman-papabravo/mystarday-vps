/**
 * contact_message queries — Fas 3A inbox model.
 */
const db = require('../src/lib/db');

const MESSAGE_STATUSES = ['new', 'read', 'in_progress', 'answered', 'archived'];
const INBOX_TABS = {
  unread: ['new'],
  active: ['read', 'in_progress'],
  answered: ['answered'],
  archived: ['archived'],
};

function needsFollowUpSql(alias = 'cm') {
  return `${alias}.status IN ('new', 'read', 'in_progress')`;
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    linkedFamily: row.family_id
      ? { type: 'explicit', familyId: row.family_id, familyName: row.family_name }
      : row.inferred_family_id
        ? { type: 'email_match', familyId: row.inferred_family_id, familyName: row.inferred_family_name }
        : { type: 'none' },
  };
}

async function listMessages({ type, status, inbox, followup, limit = 100 } = {}) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (type) {
    conditions.push(`cm.message_type = $${idx++}`);
    params.push(type);
  }
  if (status && MESSAGE_STATUSES.includes(status)) {
    conditions.push(`cm.status = $${idx++}`);
    params.push(status);
  }
  if (inbox && INBOX_TABS[inbox]) {
    conditions.push(`cm.status = ANY($${idx++}::text[])`);
    params.push(INBOX_TABS[inbox]);
  }
  if (followup) {
    conditions.push(needsFollowUpSql('cm'));
  }

  params.push(Math.min(Math.max(limit, 1), 200));

  const { rows } = await db.query(
    `SELECT
       cm.id, cm.name, cm.email, cm.message, cm.message_type,
       cm.is_read, cm.internal_note, cm.noted_at, cm.noted_by, cm.created_at,
       cm.status, cm.answered_at, cm.assigned_to, cm.family_id,
       f.name AS family_name,
       inf.id AS inferred_family_id,
       inf.name AS inferred_family_name
     FROM contact_message cm
     LEFT JOIN family f ON f.id = cm.family_id
     LEFT JOIN LATERAL (
       SELECT p.family_id AS id, fam.name
       FROM parent p
       JOIN family fam ON fam.id = p.family_id AND fam.archived_at IS NULL
       WHERE cm.family_id IS NULL
         AND cm.email IS NOT NULL
         AND LOWER(TRIM(p.email)) = LOWER(TRIM(cm.email))
       LIMIT 1
     ) inf ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY cm.created_at DESC
     LIMIT $${idx}`,
    params
  );

  return rows.map(mapRow);
}

async function getMessageCounts() {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE cm.status = 'new')::int AS unread_count,
      COUNT(*) FILTER (WHERE ${needsFollowUpSql('cm')})::int AS needs_follow_up_count,
      COUNT(*) FILTER (WHERE cm.status IN ('read', 'in_progress'))::int AS active_count,
      COUNT(*) FILTER (WHERE cm.status = 'answered')::int AS answered_count,
      COUNT(*) FILTER (WHERE cm.status = 'archived')::int AS archived_count
    FROM contact_message cm
  `);
  return rows[0] || {};
}

async function updateMessageStatus(id, status, adminId) {
  if (!MESSAGE_STATUSES.includes(status)) {
    throw Object.assign(new Error('Ogiltig status'), { statusCode: 400 });
  }

  const isRead = status !== 'new';
  const answeredAt = status === 'answered' ? new Date() : null;

  const { rows } = await db.query(
    `UPDATE contact_message SET
       status = $1,
       is_read = $2,
       answered_at = CASE WHEN $1 = 'answered' THEN COALESCE(answered_at, NOW()) ELSE answered_at END,
       assigned_to = COALESCE(assigned_to, $3)
     WHERE id = $4
     RETURNING *`,
    [status, isRead, adminId, id]
  );
  return rows[0] || null;
}

async function setMessageRead(id, isRead, adminId) {
  const status = isRead ? 'read' : 'new';
  const { rows } = await db.query(
    `UPDATE contact_message SET
       is_read = $1,
       status = CASE WHEN $1 = true AND status = 'new' THEN 'read' ELSE CASE WHEN $1 = false THEN 'new' ELSE status END END,
       assigned_to = COALESCE(assigned_to, $2)
     WHERE id = $3
     RETURNING *`,
    [isRead, adminId, id]
  );
  return rows[0] || null;
}

async function saveMessageNote(id, note, adminId) {
  const { rows } = await db.query(
    `UPDATE contact_message SET
       internal_note = $1,
       noted_at = NOW(),
       noted_by = $2,
       status = CASE WHEN status IN ('new', 'read') THEN 'in_progress' ELSE status END,
       is_read = true
     WHERE id = $3
     RETURNING *`,
    [note || null, adminId, id]
  );
  return rows[0] || null;
}

async function linkMessageFamily(id, familyId) {
  const { rows } = await db.query(
    `UPDATE contact_message SET family_id = $1 WHERE id = $2 RETURNING *`,
    [familyId || null, id]
  );
  return rows[0] || null;
}

async function deleteMessage(id) {
  const { rows } = await db.query(
    'DELETE FROM contact_message WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
}

async function getLatestFollowUpMessages(limit = 5) {
  const { rows } = await db.query(
    `SELECT
       cm.id, cm.name, cm.email, cm.message, cm.created_at, cm.is_read, cm.status,
       cm.internal_note, cm.family_id, f.name AS family_name
     FROM contact_message cm
     LEFT JOIN family f ON f.id = cm.family_id
     WHERE ${needsFollowUpSql('cm')}
     ORDER BY cm.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  MESSAGE_STATUSES,
  INBOX_TABS,
  needsFollowUpSql,
  listMessages,
  getMessageCounts,
  updateMessageStatus,
  setMessageRead,
  saveMessageNote,
  linkMessageFamily,
  deleteMessage,
  getLatestFollowUpMessages,
};
