'use strict';

/**
 * Shared daily-log item reorder (parent + child). Single transaction, set-based updates.
 *
 * Lock order (deadlock-safe): resolve anchor without row lock → daily_log FOR UPDATE
 * → section items FOR UPDATE (stable sort_order, id).
 */

class DailyLogReorderError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function validateOrderedItemIds(orderedItemIds) {
  if (!Array.isArray(orderedItemIds) || orderedItemIds.length === 0) {
    throw new DailyLogReorderError(400, 'ordered_item_ids must be a non-empty array');
  }
  const seen = new Set();
  for (const id of orderedItemIds) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new DailyLogReorderError(400, 'Ogiltigt aktivitets-ID i listan');
    }
    if (seen.has(id)) {
      throw new DailyLogReorderError(400, 'Duplicerade aktivitets-ID i listan');
    }
    seen.add(id);
  }
  return orderedItemIds;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ orderedItemIds: string[], mode: 'parent'|'child', logId: string, section: string }} ctx
 */
async function applyReorderUpdate(client, { orderedItemIds, mode, logId, section }) {
  const updateResult = await client.query(
    `UPDATE daily_log_item AS dli
     SET
       sort_order = (o.ord - 1)::int,
       child_sort_order = CASE
         WHEN $4::text = 'parent' THEN NULL
         ELSE (o.ord - 1)::int
       END
     FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, ord)
     WHERE dli.id = o.id
       AND dli.daily_log_id = $2
       AND dli.section = $3`,
    [orderedItemIds, logId, section, mode]
  );

  if (updateResult.rowCount !== orderedItemIds.length) {
    throw new DailyLogReorderError(400, 'Ogiltigt aktivitets-ID i listan');
  }

  if (mode === 'parent') {
    await client.query(
      `UPDATE daily_log_item
       SET child_sort_order = NULL
       WHERE daily_log_id = $1 AND section = $2`,
      [logId, section]
    );
  }
}

async function lockSectionAndValidateIds(client, logId, section, ids) {
  await client.query('SELECT id FROM daily_log WHERE id = $1 FOR UPDATE', [logId]);

  const locked = await client.query(
    `SELECT dli.id
     FROM daily_log_item dli
     WHERE dli.daily_log_id = $1 AND dli.section = $2
     ORDER BY dli.sort_order, dli.id
     FOR UPDATE`,
    [logId, section]
  );
  const expectedIds = new Set(locked.rows.map((r) => r.id));
  if (expectedIds.size !== ids.length) {
    throw new DailyLogReorderError(400, 'Listan måste innehålla alla aktiviteter i sektionen');
  }
  for (const id of ids) {
    if (!expectedIds.has(id)) {
      throw new DailyLogReorderError(400, 'Ogiltigt aktivitets-ID i listan');
    }
  }
}

/**
 * @param {import('pg').Pool} db
 * @param {{ parentId: string, orderedItemIds: string[] }} params
 */
async function reorderDailyLogItemsAsParent(db, { parentId, orderedItemIds }) {
  const ids = validateOrderedItemIds(orderedItemIds);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const anchor = await client.query(
      `SELECT dli.daily_log_id, dli.section
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       JOIN parent_child pc ON pc.child_id = c.id AND pc.revoked_at IS NULL
       WHERE dli.id = $1 AND pc.parent_id = $2`,
      [ids[0], parentId]
    );
    if (anchor.rows.length === 0) {
      throw new DailyLogReorderError(403, 'Du har inte åtkomst till dessa aktiviteter');
    }
    const { daily_log_id: logId, section } = anchor.rows[0];

    await lockSectionAndValidateIds(client, logId, section, ids);

    await applyReorderUpdate(client, {
      orderedItemIds: ids,
      mode: 'parent',
      logId,
      section,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {import('pg').Pool} db
 * @param {{ childId: string, orderedItemIds: string[] }} params
 */
async function reorderDailyLogItemsAsChild(db, { childId, orderedItemIds }) {
  const ids = validateOrderedItemIds(orderedItemIds);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const anchor = await client.query(
      `SELECT dli.daily_log_id, dli.section
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [ids[0], childId]
    );
    if (anchor.rows.length === 0) {
      throw new DailyLogReorderError(404, 'Aktiviteten hittades inte');
    }
    const { daily_log_id: logId, section } = anchor.rows[0];

    await lockSectionAndValidateIds(client, logId, section, ids);

    const childSettings = await client.query(
      'SELECT allow_child_reorder FROM child WHERE id = $1',
      [childId]
    );
    if (!childSettings.rows[0]?.allow_child_reorder) {
      throw new DailyLogReorderError(403, 'Omordning är inte tillåten för detta barn');
    }

    await applyReorderUpdate(client, {
      orderedItemIds: ids,
      mode: 'child',
      logId,
      section,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  DailyLogReorderError,
  validateOrderedItemIds,
  reorderDailyLogItemsAsParent,
  reorderDailyLogItemsAsChild,
};
