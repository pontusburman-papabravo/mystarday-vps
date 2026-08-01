'use strict';

const db = require('./db');
const { t } = require('./i18n');
const { FLAG_KEYS, isActivationFlagEnabled } = require('./activation-flags');
const { countLifetimeCompletions } = require('./first-star-mode');
const { getOrGenerateDailyLog } = require('./daily-log-generator');

const STARTER_KIND = 'first_star';

/**
 * Ensure exactly one temporary first-star starter on an empty daily log for today.
 * Idempotent under retry, refresh, and concurrent child sessions.
 *
 * @param {{ childId: string, familyId: string, dateStr: string, locale?: string }} params
 * @returns {Promise<{ created: boolean, itemId?: string }>}
 */
async function ensureFirstStarStarterActivity({ childId, familyId, dateStr, locale = 'sv-SE' }) {
  if (!childId || !familyId || !dateStr) return { created: false };

  const flagOn = await isActivationFlagEnabled(FLAG_KEYS.firstStarMode, familyId);
  if (!flagOn) return { created: false };

  if (await countLifetimeCompletions(childId) !== 0) return { created: false };

  const { log, items } = await getOrGenerateDailyLog(childId, dateStr);
  if (!log?.id) return { created: false };
  if (items.length > 0) return { created: false };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    if (await countLifetimeCompletionsWithClient(client, childId) !== 0) {
      await client.query('ROLLBACK');
      return { created: false };
    }

    const logLock = await client.query(
      `SELECT id FROM daily_log WHERE id = $1 FOR UPDATE`,
      [log.id]
    );
    const logId = logLock.rows[0]?.id;
    if (!logId) {
      await client.query('ROLLBACK');
      return { created: false };
    }

    const itemCount = await client.query(
      `SELECT COUNT(*)::int AS n FROM daily_log_item WHERE daily_log_id = $1`,
      [logId]
    );
    if ((itemCount.rows[0]?.n || 0) > 0) {
      await client.query('COMMIT');
      return { created: false };
    }

    const existing = await client.query(
      `SELECT id FROM daily_log_item WHERE daily_log_id = $1 AND starter_kind = $2`,
      [logId, STARTER_KIND]
    );
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { created: false, itemId: existing.rows[0].id };
    }

    const name = t(locale, 'child.firstStarStarter.name');
    const ins = await client.query(
      `INSERT INTO daily_log_item
         (daily_log_id, name, icon, section, sort_order, star_value, is_once_task, starter_kind)
       VALUES ($1, $2, '⭐', 'morgon', 0, 1, true, $3)
       RETURNING id`,
      [logId, name, STARTER_KIND]
    );
    await client.query('COMMIT');
    return { created: true, itemId: ins.rows[0].id };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && String(err.constraint || '').includes('daily_log_item_first_star_starter_per_log')) {
      const again = await db.query(
        `SELECT dli.id FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         WHERE dl.child_id = $1 AND dl.date = $2::date AND dli.starter_kind = $3`,
        [childId, dateStr, STARTER_KIND]
      );
      if (again.rows[0]) return { created: false, itemId: again.rows[0].id };
    }
    console.error('[FIRST-STAR-STARTER] ensure failed:', err.message);
    return { created: false };
  } finally {
    client.release();
  }
}

async function countLifetimeCompletionsWithClient(client, childId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     WHERE dl.child_id = $1 AND dli.completed = true`,
    [childId]
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * Load or create today's log and ensure starter when FSM + empty day.
 */
async function ensureFirstStarStarterForChildDay(childId, familyId, dateStr, locale) {
  const { items } = await getOrGenerateDailyLog(childId, dateStr);
  if (items.length > 0) return { ensured: false, items };

  await ensureFirstStarStarterActivity({ childId, familyId, dateStr, locale });
  const refreshed = await getOrGenerateDailyLog(childId, dateStr);
  return { ensured: true, items: refreshed.items };
}

module.exports = {
  STARTER_KIND,
  ensureFirstStarStarterActivity,
  ensureFirstStarStarterForChildDay,
};
