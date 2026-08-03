/**
 * contact_message queries — Fas 3A inbox model + support ops (resolution, archive).
 */
const db = require('../src/lib/db');
const events = require('./contact-message-events');
const {
  isValidRootCause,
  isValidResolutionType,
  AUTO_ARCHIVE_DAYS,
} = require('../config/support-taxonomy');
const { isValidQueue, typesForQueue } = require('../config/support-queues');

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

async function listMessages({
  type,
  queue,
  status,
  inbox,
  followup,
  q,
  rootCause,
  limit = 100,
} = {}) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (queue && isValidQueue(queue)) {
    const queueTypes = typesForQueue(queue);
    if (type && queueTypes.includes(type)) {
      conditions.push(`cm.message_type = $${idx++}`);
      params.push(type);
    } else {
      conditions.push(`cm.message_type = ANY($${idx++}::text[])`);
      params.push(queueTypes);
    }
  } else if (type) {
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
  if (rootCause) {
    conditions.push(`COALESCE(cm.root_cause, 'unknown') = $${idx++}`);
    params.push(rootCause);
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    const like = `%${term}%`;
    if (/^\d+$/.test(term)) {
      conditions.push(`(
        cm.id = $${idx}::int
        OR cm.name ILIKE $${idx + 1}
        OR cm.email ILIKE $${idx + 1}
        OR cm.message ILIKE $${idx + 1}
        OR COALESCE(cm.internal_note, '') ILIKE $${idx + 1}
        OR COALESCE(cm.resolution_summary, '') ILIKE $${idx + 1}
      )`);
      params.push(Number(term), like);
      idx += 2;
    } else {
      conditions.push(`(
        cm.name ILIKE $${idx}
        OR cm.email ILIKE $${idx}
        OR cm.message ILIKE $${idx}
        OR COALESCE(cm.internal_note, '') ILIKE $${idx}
        OR COALESCE(cm.resolution_summary, '') ILIKE $${idx}
      )`);
      params.push(like);
      idx += 1;
    }
  }

  params.push(Math.min(Math.max(limit, 1), 500));

  const { rows } = await db.query(
    `SELECT
       cm.id, cm.name, cm.email, cm.message, cm.message_type,
       cm.is_read, cm.internal_note, cm.noted_at, cm.noted_by, cm.created_at,
       cm.status, cm.answered_at, cm.assigned_to, cm.family_id,
       cm.root_cause, cm.resolution_type, cm.resolution_summary, cm.fix_reference,
       cm.resolved_at, cm.resolved_by, cm.archived_at, cm.archived_by,
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
      COUNT(*) FILTER (WHERE cm.status = 'new' AND cm.message_type != 'bug')::int AS meddelanden_unread_count,
      COUNT(*) FILTER (
        WHERE cm.message_type = 'bug'
          AND cm.status IN ('new', 'read', 'in_progress')
      )::int AS incidenter_open_count,
      COUNT(*) FILTER (
        WHERE cm.message_type != 'bug' AND ${needsFollowUpSql('cm')}
      )::int AS meddelanden_needs_follow_up_count,
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

  const { rows } = await db.query(
    `UPDATE contact_message SET
       status = $1,
       is_read = $2,
       answered_at = CASE WHEN $1 = 'answered' THEN COALESCE(answered_at, NOW()) ELSE answered_at END,
       assigned_to = COALESCE(assigned_to, $3),
       archived_at = CASE WHEN $1 = 'archived' THEN COALESCE(archived_at, NOW()) ELSE archived_at END,
       archived_by = CASE WHEN $1 = 'archived' THEN COALESCE(archived_by, $3) ELSE archived_by END
     WHERE id = $4
     RETURNING *`,
    [status, isRead, adminId, id]
  );
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, 'status_changed', {
      adminId,
      payload: { status },
    });
  }
  return row;
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
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, 'note_saved', {
      adminId,
      payload: { has_note: Boolean(note && String(note).trim()) },
    });
  }
  return row;
}

async function linkMessageFamily(id, familyId, adminId = null) {
  const { rows } = await db.query(
    `UPDATE contact_message SET family_id = $1 WHERE id = $2 RETURNING *`,
    [familyId || null, id]
  );
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, 'family_linked', {
      adminId,
      payload: { family_id: familyId || null },
    });
  }
  return row;
}

const MESSAGE_DETAIL_SELECT = `
  cm.id, cm.name, cm.email, cm.message, cm.message_type,
  cm.is_read, cm.internal_note, cm.noted_at, cm.noted_by, cm.created_at,
  cm.status, cm.answered_at, cm.assigned_to, cm.family_id,
  cm.root_cause, cm.resolution_type, cm.resolution_summary, cm.fix_reference,
  cm.resolved_at, cm.resolved_by, cm.archived_at, cm.archived_by,
  f.name AS family_name,
  inf.id AS inferred_family_id,
  inf.name AS inferred_family_name
`;

async function getMessageDetail(id) {
  const { rows } = await db.query(
    `SELECT ${MESSAGE_DETAIL_SELECT}
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
     WHERE cm.id = $1`,
    [id]
  );
  return mapRow(rows[0] || null);
}

async function getMessageById(id) {
  const { rows } = await db.query(
    `SELECT id, name, email, message, message_type, status, internal_note
     FROM contact_message
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function recordMessageReply(id, { replyBody, adminId, emailId }) {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const noteBlock = [
    `--- Svar ${stamp} ---`,
    String(replyBody || '').trim(),
    emailId ? `(Resend: ${emailId})` : null,
  ].filter(Boolean).join('\n');

  const { rows } = await db.query(
    `UPDATE contact_message SET
       status = 'answered',
       is_read = true,
       answered_at = COALESCE(answered_at, NOW()),
       assigned_to = COALESCE(assigned_to, $1),
       internal_note = CASE
         WHEN internal_note IS NULL OR internal_note = '' THEN $2
         ELSE internal_note || E'\n\n' || $2
       END,
       noted_at = NOW(),
       noted_by = $1
     WHERE id = $3
     RETURNING *`,
    [adminId, noteBlock, id]
  );
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, 'reply_sent', {
      adminId,
      payload: { email_id: emailId || null },
    });
  }
  return row;
}

async function deleteMessage(id) {
  const { rows } = await db.query(
    'DELETE FROM contact_message WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
}

function normalizeResolutionInput(input = {}) {
  const rootCause = input.root_cause || input.rootCause || null;
  const resolutionType = input.resolution_type || input.resolutionType || null;
  const resolutionSummary = typeof input.resolution_summary === 'string'
    ? input.resolution_summary.trim()
    : typeof input.resolutionSummary === 'string'
      ? input.resolutionSummary.trim()
      : null;
  const fixReference = typeof input.fix_reference === 'string'
    ? input.fix_reference.trim().slice(0, 255)
    : typeof input.fixReference === 'string'
      ? input.fixReference.trim().slice(0, 255)
      : null;

  if (rootCause && !isValidRootCause(rootCause)) {
    throw Object.assign(new Error('Ogiltig rotorsak'), { statusCode: 400 });
  }
  if (resolutionType && !isValidResolutionType(resolutionType)) {
    throw Object.assign(new Error('Ogiltig lösningstyp'), { statusCode: 400 });
  }
  if (resolutionSummary && resolutionSummary.length > 2000) {
    throw Object.assign(new Error('Lösningsbeskrivning får vara högst 2000 tecken'), { statusCode: 400 });
  }

  return {
    rootCause: rootCause || null,
    resolutionType: resolutionType || null,
    resolutionSummary: resolutionSummary || null,
    fixReference: fixReference || null,
  };
}

async function saveResolution(id, input, adminId) {
  const {
    rootCause,
    resolutionType,
    resolutionSummary,
    fixReference,
  } = normalizeResolutionInput(input);

  if (!resolutionType) {
    throw Object.assign(new Error('Lösningstyp krävs'), { statusCode: 400 });
  }

  const { rows } = await db.query(
    `UPDATE contact_message SET
       root_cause = COALESCE($1, root_cause),
       resolution_type = $2,
       resolution_summary = COALESCE($3, resolution_summary),
       fix_reference = COALESCE($4, fix_reference),
       resolved_at = NOW(),
       resolved_by = $5
     WHERE id = $6
     RETURNING *`,
    [rootCause, resolutionType, resolutionSummary, fixReference, adminId, id]
  );
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, 'resolution_set', {
      adminId,
      payload: {
        root_cause: row.root_cause,
        resolution_type: row.resolution_type,
        fix_reference: row.fix_reference || null,
      },
    });
  }
  return row;
}

async function archiveMessage(id, { adminId = null, auto = false, resolution = null } = {}) {
  let resolutionFields = null;
  if (resolution) {
    resolutionFields = normalizeResolutionInput(resolution);
  }

  const params = [id, adminId];
  let resolutionSql = '';
  if (resolutionFields) {
    params.push(
      resolutionFields.rootCause,
      resolutionFields.resolutionType,
      resolutionFields.resolutionSummary,
      resolutionFields.fixReference
    );
    resolutionSql = `,
      root_cause = COALESCE($3, root_cause),
      resolution_type = COALESCE($4, resolution_type),
      resolution_summary = COALESCE($5, resolution_summary),
      fix_reference = COALESCE($6, fix_reference),
      resolved_at = COALESCE(resolved_at, NOW()),
      resolved_by = COALESCE(resolved_by, $2)`;
  }

  const { rows } = await db.query(
    `UPDATE contact_message SET
       status = 'archived',
       is_read = true,
       archived_at = COALESCE(archived_at, NOW()),
       archived_by = COALESCE(archived_by, $2)
       ${resolutionSql}
     WHERE id = $1
       AND status != 'archived'
     RETURNING *`,
    params
  );
  const row = rows[0] || null;
  if (row) {
    await events.logEvent(id, auto ? 'auto_archived' : 'archived', {
      adminId,
      payload: {
        auto,
        root_cause: row.root_cause,
        resolution_type: row.resolution_type,
      },
    });
  }
  return row;
}

async function getSupportAnalytics() {
  const { rows: totalsRows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('new', 'read', 'in_progress'))::int AS open_count,
      COUNT(*) FILTER (WHERE status = 'answered')::int AS answered_unarchived_count,
      COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_count,
      COUNT(*) FILTER (
        WHERE message_type = 'bug' AND status IN ('new', 'read', 'in_progress', 'answered')
      )::int AS open_bugs_count,
      COUNT(*) FILTER (
        WHERE status IN ('answered', 'archived') AND resolution_type IS NULL
      )::int AS missing_resolution_count,
      COUNT(*) FILTER (
        WHERE message_type = 'bug'
          AND status IN ('answered', 'archived')
          AND root_cause IS NULL
      )::int AS bugs_missing_root_cause_count
    FROM contact_message
  `);

  const { rows: byRootCause } = await db.query(`
    SELECT
      COALESCE(root_cause, 'unknown') AS root_cause,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('new', 'read', 'in_progress', 'answered'))::int AS open_count,
      COUNT(*) FILTER (WHERE status = 'archived' OR resolved_at IS NOT NULL)::int AS handled_count
    FROM contact_message
    WHERE message_type = 'bug'
    GROUP BY COALESCE(root_cause, 'unknown')
    ORDER BY total DESC, root_cause ASC
    LIMIT 20
  `);

  const { rows: bugsOverTime } = await db.query(`
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', (NOW() AT TIME ZONE 'Europe/Stockholm') - INTERVAL '11 weeks')::date,
        date_trunc('week', (NOW() AT TIME ZONE 'Europe/Stockholm'))::date,
        INTERVAL '1 week'
      )::date AS week_start
    )
    SELECT
      w.week_start,
      COUNT(cm.id)::int AS total,
      COUNT(cm.id) FILTER (
        WHERE cm.status IN ('new', 'read', 'in_progress', 'answered')
      )::int AS open_count,
      COUNT(cm.id) FILTER (WHERE cm.root_cause IS NOT NULL)::int AS classified_count
    FROM weeks w
    LEFT JOIN contact_message cm
      ON cm.message_type = 'bug'
     AND date_trunc('week', cm.created_at AT TIME ZONE 'Europe/Stockholm')::date = w.week_start
    GROUP BY w.week_start
    ORDER BY w.week_start ASC
  `);

  const { rows: bugsByType } = await db.query(`
    SELECT
      message_type,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('new', 'read', 'in_progress', 'answered'))::int AS open_count
    FROM contact_message
    WHERE message_type IN ('bug', 'feedback', 'contact', 'language')
    GROUP BY message_type
    ORDER BY total DESC
  `);

  const { rows: byResolution } = await db.query(`
    SELECT
      resolution_type,
      COUNT(*)::int AS total
    FROM contact_message
    WHERE resolution_type IS NOT NULL
    GROUP BY resolution_type
    ORDER BY total DESC
    LIMIT 20
  `);

  const { rows: recentResolved } = await db.query(`
    SELECT
      id, message_type, root_cause, resolution_type, resolution_summary,
      fix_reference, resolved_at, archived_at, status
    FROM contact_message
    WHERE resolved_at IS NOT NULL
    ORDER BY resolved_at DESC
    LIMIT 8
  `);

  return {
    totals: totalsRows[0] || {},
    byRootCause,
    bugsOverTime,
    bugsByType,
    byResolution,
    recentResolved,
  };
}

async function autoArchiveStaleAnsweredMessages() {
  const { rows } = await db.query(
    `SELECT id
     FROM contact_message
     WHERE status = 'answered'
       AND archived_at IS NULL
       AND answered_at IS NOT NULL
       AND answered_at < NOW() - ($1::int * INTERVAL '1 day')
     ORDER BY answered_at ASC
     LIMIT 200`,
    [AUTO_ARCHIVE_DAYS]
  );

  let archived = 0;
  for (const row of rows) {
    const updated = await archiveMessage(row.id, { adminId: null, auto: true });
    if (updated) archived += 1;
  }

  return { archived, candidates: rows.length };
}

async function getLatestFollowUpMessages(limit = 5) {
  const { rows } = await db.query(
    `SELECT
       cm.id, cm.name, cm.email, cm.message, cm.created_at, cm.is_read, cm.status,
       cm.internal_note, cm.family_id, f.name AS family_name
     FROM contact_message cm
     LEFT JOIN family f ON f.id = cm.family_id
     WHERE ${needsFollowUpSql('cm')}
       AND cm.message_type != 'bug'
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
  getMessageDetail,
  getMessageById,
  recordMessageReply,
  saveResolution,
  archiveMessage,
  getSupportAnalytics,
  autoArchiveStaleAnsweredMessages,
  deleteMessage,
  getLatestFollowUpMessages,
};
