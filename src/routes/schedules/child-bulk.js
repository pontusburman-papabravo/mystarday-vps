const { sendApiError } = require('../../lib/api-user-error');
/**
 * Child-scoped bulk operations: copy day, copy to child, copy to weeks,
 * copy item to day, copy item to child, swap day.
 * Does NOT handle: CRUD, item management, templates.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const authz = require('../../middleware/authz');
const { syncDailyLogWithSchedule, syncDailyLogForSpecialDay } = require('../../lib/daily-log-generator');
const { broadcast } = require('../../lib/sse-broadcast');
const { validate } = require('../../middleware/validate');
const { CopyDaySchema, CopyToChildSchema, ApplyDateRangeSchema } = require('../../lib/schemas');
const {
  materializeStandardScheduleActivities,
  LEGACY_SCHEDULE_NAME_TO_CANONICAL,
  NON_INTERACTIVE_AFTER_SCHOOL_VARIANT,
} = require('../../lib/canonical-library-runtime');
const { getFamilyLocale } = require('../../lib/onboarding-locale');

const router = express.Router({ mergeParams: true });
router.use(requireParent);

// POST /api/children/:childId/schedules/copy-day — copy one day → other days
router.post('/copy-day', validate(CopyDaySchema), async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { from_day, to_days } = req.body;
    if (from_day === undefined || !Array.isArray(to_days) || to_days.length === 0) {
      return sendApiError(res, 400, 'FROM_DAY_TO_DAYS_REQUIRED');
    }

    const fromDow = parseInt(from_day, 10);
    if (isNaN(fromDow) || fromDow < 0 || fromDow > 6) {
      return sendApiError(res, 400, 'DAY_RANGE');
    }

    const sourceResult = await db.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [req.params.childId, fromDow]
    );
    if (sourceResult.rows.length === 0) {
      return sendApiError(res, 404, 'NO_SCHEDULE_FOR_DAY');
    }
    const sourceId = sourceResult.rows[0].id;

    const itemsResult = await db.query(
      'SELECT activity_template_id, start_time, end_time, sort_order, section FROM weekly_schedule_item WHERE weekly_schedule_id = $1 ORDER BY sort_order ASC',
      [sourceId]
    );
    const sourceItems = itemsResult.rows;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const toDow of to_days) {
        const dow = parseInt(toDow, 10);
        if (isNaN(dow) || dow < 0 || dow > 6) continue;
        if (dow === fromDow) continue;

        let targetScheduleId;
        const existingTarget = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [req.params.childId, dow]
        );
        if (existingTarget.rows.length > 0) {
          targetScheduleId = existingTarget.rows[0].id;
          await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [targetScheduleId]);
        } else {
          const newSchedule = await client.query(
            'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
            [req.params.childId, dow, dow]
          );
          targetScheduleId = newSchedule.rows[0].id;
        }

        for (const item of sourceItems) {
          await client.query(
            'INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section) VALUES ($1, $2, $3, $4, $5, $6)',
            [targetScheduleId, item.activity_template_id, item.start_time, item.end_time, item.sort_order, item.section]
          );
        }
        results.push(dow);
      }

      await client.query('COMMIT');

      for (const dow of results) {
        try {
          await syncDailyLogWithSchedule(req.params.childId, dow);
        } catch (syncErr) {
          console.error('[SCHEDULES] Copy-day sync error (non-fatal):', syncErr.message);
        }
      }

      res.json({ code: 'SCHEDULE_COPIED_DAYS', copied_to_days: results });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] Copy-day error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// POST /api/children/:childId/schedules/copy-to-child — copy all schedules to another child
router.post('/copy-to-child', validate(CopyToChildSchema), async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { target_child_id, days, overwrite } = req.body;
    if (!target_child_id) return sendApiError(res, 400, 'TARGET_CHILD_REQUIRED');
    if (target_child_id === req.params.childId) return sendApiError(res, 400, 'CANNOT_COPY_SAME_CHILD');

    const targetChild = await authz.getChildAccess(req.user.id, target_child_id);
    if (!targetChild) return sendApiError(res, 403, 'TARGET_CHILD_ACCESS');

    const dayFilter = Array.isArray(days) && days.length > 0
      ? days.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6)
      : null;

    const schedulesResult = dayFilter
      ? await db.query(
          'SELECT id, day_of_week, sort_order FROM weekly_schedule WHERE child_id = $1 AND day_of_week = ANY($2)',
          [req.params.childId, dayFilter]
        )
      : await db.query(
          'SELECT id, day_of_week, sort_order FROM weekly_schedule WHERE child_id = $1',
          [req.params.childId]
        );

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      for (const srcSchedule of schedulesResult.rows) {
        const itemsResult = await client.query(
          'SELECT activity_template_id, start_time, end_time, sort_order, section FROM weekly_schedule_item WHERE weekly_schedule_id = $1 ORDER BY sort_order ASC',
          [srcSchedule.id]
        );

        let targetScheduleId;
        const existingTarget = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [target_child_id, srcSchedule.day_of_week]
        );
        if (existingTarget.rows.length > 0) {
          targetScheduleId = existingTarget.rows[0].id;
          if (overwrite === false) {
            const existingItems = await client.query(
              'SELECT id FROM weekly_schedule_item WHERE weekly_schedule_id = $1 LIMIT 1',
              [targetScheduleId]
            );
            if (existingItems.rows.length > 0) continue;
          } else {
            await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [targetScheduleId]);
          }
        } else {
          const newSchedule = await client.query(
            'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
            [target_child_id, srcSchedule.day_of_week, srcSchedule.sort_order]
          );
          targetScheduleId = newSchedule.rows[0].id;
        }

        for (const item of itemsResult.rows) {
          await client.query(
            'INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section) VALUES ($1, $2, $3, $4, $5, $6)',
            [targetScheduleId, item.activity_template_id, item.start_time, item.end_time, item.sort_order, item.section]
          );
        }
      }

      await client.query('COMMIT');

      for (const srcSchedule of schedulesResult.rows) {
        try {
          await syncDailyLogWithSchedule(target_child_id, srcSchedule.day_of_week);
        } catch (syncErr) {
          console.error('[SCHEDULES] Copy-to-child sync error (non-fatal):', syncErr.message);
        }
      }

      const dayCount = schedulesResult.rows.length;
      const msg = dayFilter
        ? `Schema kopierat för ${dayCount} dag${dayCount !== 1 ? 'ar' : ''}!`
        : 'Hela veckoschemat har kopierats till det andra barnet';
      res.json({ message: msg });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] Copy-to-child error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// POST /api/children/:childId/schedules/copy-to-weeks — copy weekly schedule to future weeks
router.post('/copy-to-weeks', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { from_day, week_offsets } = req.body;
    if (from_day === undefined || !Array.isArray(week_offsets) || week_offsets.length === 0) {
      return sendApiError(res, 400, 'FROM_DAY_OFFSETS_REQUIRED');
    }

    const fromDow = parseInt(from_day, 10);
    if (isNaN(fromDow) || fromDow < 0 || fromDow > 6) {
      return sendApiError(res, 400, 'DAY_RANGE');
    }

    const sourceResult = await db.query(
      'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
      [req.params.childId, fromDow]
    );
    if (sourceResult.rows.length === 0) {
      return sendApiError(res, 404, 'NO_SCHEDULE_FOR_DAY');
    }
    const sourceId = sourceResult.rows[0].id;

    const itemsResult = await db.query(
      `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
              at.name, at.icon, at.star_value
       FROM weekly_schedule_item wsi
       JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE wsi.weekly_schedule_id = $1
       ORDER BY wsi.sort_order ASC`,
      [sourceId]
    );
    const sourceItems = itemsResult.rows;

    const now = new Date();
    const todayDow = now.getDay();
    const daysFromMonday = fromDow === 0 ? 6 : fromDow - 1;
    const todayFromMonday = todayDow === 0 ? 6 : todayDow - 1;
    const diffToThisWeek = daysFromMonday - todayFromMonday;
    const thisWeekDate = new Date(now);
    thisWeekDate.setDate(now.getDate() + diffToThisWeek);
    thisWeekDate.setHours(0, 0, 0, 0);

    const client = await db.getClient();
    let copiedCount = 0;
    try {
      await client.query('BEGIN');

      for (const offset of week_offsets) {
        const wOff = parseInt(offset, 10);
        if (isNaN(wOff) || wOff < 1 || wOff > 52) continue;

        const targetDate = new Date(thisWeekDate);
        targetDate.setDate(thisWeekDate.getDate() + wOff * 7);
        const dateStr = targetDate.toISOString().slice(0, 10);

        const existingSd = await client.query(
          'SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2',
          [req.params.childId, dateStr]
        );

        let sdId;
        if (existingSd.rows.length > 0) {
          sdId = existingSd.rows[0].id;
          await client.query(
            'DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1',
            [sdId]
          );
        } else {
          const newSd = await client.query(
            `INSERT INTO special_day_schedule (child_id, date, note, created_at)
             VALUES ($1, $2, NULL, NOW()) RETURNING id`,
            [req.params.childId, dateStr]
          );
          sdId = newSd.rows[0].id;
        }

        let itemSortOrder = 0;
        for (const item of sourceItems) {
          await client.query(
            `INSERT INTO special_day_schedule_item
               (special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [sdId, item.activity_template_id, item.name, item.icon, item.start_time, item.end_time, item.star_value, itemSortOrder++, item.section]
          );
        }

        copiedCount++;
      }

      await client.query('COMMIT');
      res.json({ code: 'SCHEDULE_COPIED_WEEKS', copied_count: copiedCount });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] Copy-to-weeks error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// POST /api/children/:childId/schedules/copy-item-to-day — copy single item to another day
router.post('/copy-item-to-day', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { item_id, from_schedule_id, to_day } = req.body;
    if (!item_id || !from_schedule_id || to_day === undefined) {
      return sendApiError(res, 400, 'COPY_ITEM_FIELDS_REQUIRED');
    }
    const toDow = parseInt(to_day, 10);
    if (isNaN(toDow) || toDow < 0 || toDow > 6) {
      return sendApiError(res, 400, 'DAY_RANGE');
    }

    const itemResult = await db.query(
      `SELECT wsi.* FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE wsi.id = $1 AND wsi.weekly_schedule_id = $2 AND ws.child_id = $3`,
      [item_id, from_schedule_id, req.params.childId]
    );
    if (itemResult.rows.length === 0) {
      return sendApiError(res, 404, 'ACTIVITY_NOT_FOUND');
    }
    const item = itemResult.rows[0];

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let targetScheduleId;
      const existingTarget = await client.query(
        'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
        [req.params.childId, toDow]
      );
      if (existingTarget.rows.length > 0) {
        targetScheduleId = existingTarget.rows[0].id;
      } else {
        const newSchedule = await client.query(
          'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [req.params.childId, toDow, toDow]
        );
        targetScheduleId = newSchedule.rows[0].id;
      }

      const existingItem = await client.query(
        'SELECT id FROM weekly_schedule_item WHERE weekly_schedule_id = $1 AND activity_template_id = $2',
        [targetScheduleId, item.activity_template_id]
      );
      if (existingItem.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.json({ code: 'ACTIVITY_ALREADY_ON_DAY', schedule_id: targetScheduleId, skipped: true });
      }

      const maxResult = await client.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
        [targetScheduleId]
      );
      const nextOrder = maxResult.rows[0].next_order;

      const result = await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [targetScheduleId, item.activity_template_id, item.start_time, item.end_time, nextOrder, item.section]
      );
      await client.query('COMMIT');

      try {
        await syncDailyLogWithSchedule(req.params.childId, toDow);
      } catch (syncErr) {
        console.error('[SCHEDULES] copy-item-to-day sync error (non-fatal):', syncErr.message);
      }

      res.json({ code: 'ACTIVITY_COPIED', item_id: result.rows[0].id, schedule_id: targetScheduleId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] copy-item-to-day error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// POST /api/children/:childId/schedules/copy-item-to-child — copy single item to another child
router.post('/copy-item-to-child', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { item_id, from_schedule_id, to_child_id, to_day } = req.body;
    if (!item_id || !from_schedule_id || !to_child_id || to_day === undefined) {
      return sendApiError(res, 400, 'COPY_ITEM_CHILD_FIELDS_REQUIRED');
    }
    const toDow = parseInt(to_day, 10);
    if (isNaN(toDow) || toDow < 0 || toDow > 6) {
      return sendApiError(res, 400, 'DAY_RANGE');
    }

    const targetChild = await authz.getChildAccess(req.user.id, to_child_id);
    if (!targetChild) return sendApiError(res, 403, 'TARGET_CHILD_ACCESS');

    const itemResult = await db.query(
      `SELECT wsi.* FROM weekly_schedule_item wsi
       JOIN weekly_schedule ws ON ws.id = wsi.weekly_schedule_id
       WHERE wsi.id = $1 AND wsi.weekly_schedule_id = $2 AND ws.child_id = $3`,
      [item_id, from_schedule_id, req.params.childId]
    );
    if (itemResult.rows.length === 0) {
      return sendApiError(res, 404, 'ACTIVITY_NOT_FOUND');
    }
    const item = itemResult.rows[0];

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let targetScheduleId;
      const existingTarget = await client.query(
        'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
        [to_child_id, toDow]
      );
      if (existingTarget.rows.length > 0) {
        targetScheduleId = existingTarget.rows[0].id;
      } else {
        const newSchedule = await client.query(
          'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [to_child_id, toDow, toDow]
        );
        targetScheduleId = newSchedule.rows[0].id;
      }

      const existingItem = await client.query(
        'SELECT id FROM weekly_schedule_item WHERE weekly_schedule_id = $1 AND activity_template_id = $2',
        [targetScheduleId, item.activity_template_id]
      );
      if (existingItem.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.json({ code: 'ACTIVITY_ALREADY_EXISTS', schedule_id: targetScheduleId, skipped: true });
      }

      const maxResult = await client.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM weekly_schedule_item WHERE weekly_schedule_id = $1',
        [targetScheduleId]
      );
      const result = await client.query(
        `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [targetScheduleId, item.activity_template_id, item.start_time, item.end_time, maxResult.rows[0].next_order, item.section]
      );
      await client.query('COMMIT');

      try {
        await syncDailyLogWithSchedule(to_child_id, toDow);
      } catch (syncErr) {
        console.error('[SCHEDULES] copy-item-to-child sync error (non-fatal):', syncErr.message);
      }

      res.json({ code: 'ACTIVITY_COPIED_TO_CHILD', item_id: result.rows[0].id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] copy-item-to-child error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// POST /api/children/:childId/schedules/swap-day — swap all activities between two days
router.post('/swap-day', async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { day_a, day_b } = req.body;
    const dowA = parseInt(day_a, 10);
    const dowB = parseInt(day_b, 10);
    if (isNaN(dowA) || isNaN(dowB) || dowA < 0 || dowA > 6 || dowB < 0 || dowB > 6 || dowA === dowB) {
      return sendApiError(res, 400, 'INVALID_DAYS');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const getScheduleItems = async (dow) => {
        const schedResult = await client.query(
          'SELECT id FROM weekly_schedule WHERE child_id = $1 AND day_of_week = $2',
          [req.params.childId, dow]
        );
        if (schedResult.rows.length === 0) return { scheduleId: null, items: [] };
        const scheduleId = schedResult.rows[0].id;
        const itemsResult = await client.query(
          'SELECT activity_template_id, start_time, end_time, sort_order, section FROM weekly_schedule_item WHERE weekly_schedule_id = $1 ORDER BY sort_order ASC',
          [scheduleId]
        );
        return { scheduleId, items: itemsResult.rows };
      };

      const { scheduleId: schedA, items: itemsA } = await getScheduleItems(dowA);
      const { scheduleId: schedB, items: itemsB } = await getScheduleItems(dowB);

      const ensureSchedule = async (dow, existingId) => {
        if (existingId) return existingId;
        const result = await client.query(
          'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [req.params.childId, dow, dow]
        );
        return result.rows[0].id;
      };

      const useA = itemsB.length > 0 ? await ensureSchedule(dowA, schedA) : schedA;
      const useB = itemsA.length > 0 ? await ensureSchedule(dowB, schedB) : schedB;

      if (useA) await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [useA]);
      if (useB) await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [useB]);

      for (const item of itemsB) {
        if (useA) await client.query(
          'INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section) VALUES ($1,$2,$3,$4,$5,$6)',
          [useA, item.activity_template_id, item.start_time, item.end_time, item.sort_order, item.section]
        );
      }
      for (const item of itemsA) {
        if (useB) await client.query(
          'INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section) VALUES ($1,$2,$3,$4,$5,$6)',
          [useB, item.activity_template_id, item.start_time, item.end_time, item.sort_order, item.section]
        );
      }

      if (useA) {
        const countA = await client.query('SELECT COUNT(*) FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [useA]);
        if (parseInt(countA.rows[0].count) === 0 && !schedA) {
          await client.query('DELETE FROM weekly_schedule WHERE id = $1', [useA]);
        }
      }
      if (useB) {
        const countB = await client.query('SELECT COUNT(*) FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [useB]);
        if (parseInt(countB.rows[0].count) === 0 && !schedB) {
          await client.query('DELETE FROM weekly_schedule WHERE id = $1', [useB]);
        }
      }

      await client.query('COMMIT');

      for (const dow of [dowA, dowB]) {
        try {
          await syncDailyLogWithSchedule(req.params.childId, dow);
        } catch (syncErr) {
          console.error('[SCHEDULES] Swap-day sync error (non-fatal):', syncErr.message);
        }
      }

      res.json({ code: 'DAYS_SWAPPED' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] swap-day error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

const MAX_DATE_RANGE_DAYS = 93;

function listDatesInclusive(startStr, endStr) {
  const dates = [];
  const cursor = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function sectionForTemplate(tpl, useSortOrderFallback, timeGroupToSection) {
  if (!useSortOrderFallback && tpl.time_group && timeGroupToSection[tpl.time_group]) {
    return timeGroupToSection[tpl.time_group];
  }
  const so = tpl.template_sort;
  if (so === null || so === undefined) return 'dag';
  if (so < 100) return 'morgon';
  if (so < 300) return 'dag';
  return 'kvall';
}

const TIME_GROUP_TO_SECTION = {
  morgon: 'morgon',
  formiddag: 'dag',
  eftermiddag: 'dag',
  kvall: 'kvall',
};

async function resolveCategoryDateRangeItems(client, familyId, categoryId) {
  const templates = await client.query(
    `SELECT at.id, at.name, at.icon, at.star_value,
            at.time_group,
            at.sort_order AS template_sort
     FROM activity_template at
     WHERE at.family_id = $1 AND at.category_id = $2
     ORDER BY at.sort_order ASC, at.name ASC`,
    [familyId, categoryId]
  );
  if (!templates.rows.length) return null;

  const uniqueTimeGroups = new Set(templates.rows.map((t) => t.time_group).filter(Boolean));
  const useSortOrderFallback = uniqueTimeGroups.size <= 1;
  const sectionCounters = {};
  return templates.rows.map((tpl) => {
    const sec = sectionForTemplate(tpl, useSortOrderFallback, TIME_GROUP_TO_SECTION);
    if (!(sec in sectionCounters)) sectionCounters[sec] = 0;
    const sortOrder = sectionCounters[sec]++;
    return {
      activity_template_id: tpl.id,
      name: tpl.name,
      icon: tpl.icon,
      star_value: tpl.star_value || 1,
      start_time: null,
      end_time: null,
      sort_order: sortOrder,
      section: sec,
    };
  });
}

async function resolveStandardScheduleDateRangeItems(client, familyId, standardScheduleId) {
  const scheduleResult = await client.query(
    'SELECT id, name, canonical_id FROM default_schedule WHERE id = $1',
    [standardScheduleId]
  );
  if (!scheduleResult.rows.length) return null;

  const scheduleRow = scheduleResult.rows[0];
  const canonicalScheduleId = scheduleRow.canonical_id
    || LEGACY_SCHEDULE_NAME_TO_CANONICAL[scheduleRow.name]
    || null;
  if (!canonicalScheduleId) return null;

  const locale = await getFamilyLocale(familyId);
  const prepared = await materializeStandardScheduleActivities(client, {
    familyId,
    defaultScheduleId: scheduleRow.id,
    canonicalScheduleId,
    locale,
    callerVariants: canonicalScheduleId === 'school_weekday'
      ? { after_school: NON_INTERACTIVE_AFTER_SCHOOL_VARIANT }
      : null,
    allowNonInteractiveAfterSchoolDefault: canonicalScheduleId === 'school_weekday',
  });

  if (!prepared.filteredItems.length) return null;

  return prepared.filteredItems.map((item) => {
    const templateId = prepared.templateIdForItem(item);
    if (!templateId) return null;
    return {
      activity_template_id: templateId,
      name: item.name,
      icon: item.icon,
      star_value: item.star_value || 1,
      start_time: item.start_time || null,
      end_time: item.end_time || null,
      sort_order: item.sort_order || 0,
      section: item.section || 'dag',
    };
  }).filter(Boolean);
}

async function resolveFamilyTemplateDateRangeItems(client, familyId, templateId) {
  const template = await client.query(
    `SELECT id, name FROM weekly_schedule WHERE id = $1 AND family_id = $2 AND child_id IS NULL`,
    [templateId, familyId]
  );
  if (!template.rows.length) return null;

  const items = await client.query(
    `SELECT wsi.activity_template_id, wsi.start_time, wsi.end_time, wsi.sort_order, wsi.section,
            at.name, at.icon, at.star_value
     FROM weekly_schedule_item wsi
     LEFT JOIN activity_template at ON at.id = wsi.activity_template_id
     WHERE wsi.weekly_schedule_id = $1
     ORDER BY wsi.sort_order ASC`,
    [templateId]
  );
  if (!items.rows.length) return null;

  return items.rows.map((item) => ({
    activity_template_id: item.activity_template_id,
    name: item.name,
    icon: item.icon,
    star_value: item.star_value || 1,
    start_time: item.start_time || null,
    end_time: item.end_time || null,
    sort_order: item.sort_order || 0,
    section: item.section || 'dag',
  }));
}

async function resolveDateRangeItems(client, familyId, body) {
  if (body.template_category_id) {
    return resolveCategoryDateRangeItems(client, familyId, body.template_category_id);
  }
  if (body.standard_schedule_id) {
    return resolveStandardScheduleDateRangeItems(client, familyId, body.standard_schedule_id);
  }
  if (body.schedule_template_id) {
    return resolveFamilyTemplateDateRangeItems(client, familyId, body.schedule_template_id);
  }
  return null;
}

// POST /api/children/:childId/schedules/apply-date-range — library schema for each day in range
router.post('/apply-date-range', validate(ApplyDateRangeSchema), async (req, res) => {
  try {
    const child = await authz.getChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const {
      start_date,
      end_date,
      template_category_id,
      standard_schedule_id,
      schedule_template_id,
      overwrite,
      note,
    } = req.body;
    const dates = listDatesInclusive(start_date, end_date);
    if (dates.length === 0) {
      return sendApiError(res, 400, 'INVALID_DATE_RANGE');
    }
    if (dates.length > MAX_DATE_RANGE_DAYS) {
      return sendApiError(res, 400, 'DATE_RANGE_MAX_DAYS', { details: { max: MAX_DATE_RANGE_DAYS } });
    }

    const client = await db.getClient();
    let scheduleItems;
    try {
      scheduleItems = await resolveDateRangeItems(client, child.family_id, {
        template_category_id,
        standard_schedule_id,
        schedule_template_id,
      });
    } finally {
      client.release();
    }

    if (!scheduleItems || !scheduleItems.length) {
      return sendApiError(res, 400, 'NO_ACTIVITIES_IN_SCHEDULE');
    }

    const shouldOverwrite = overwrite !== false;

    const txClient = await db.getClient();
    let appliedCount = 0;
    const syncedDates = [];
    try {
      await txClient.query('BEGIN');

      for (const dateStr of dates) {
        const existingSd = await txClient.query(
          'SELECT id FROM special_day_schedule WHERE child_id = $1 AND date = $2',
          [req.params.childId, dateStr]
        );

        let sdId;
        if (existingSd.rows.length > 0) {
          if (!shouldOverwrite) continue;
          sdId = existingSd.rows[0].id;
          await txClient.query(
            'DELETE FROM special_day_schedule_item WHERE special_day_schedule_id = $1',
            [sdId]
          );
          if (note) {
            await txClient.query(
              'UPDATE special_day_schedule SET note = $1, updated_at = NOW() WHERE id = $2',
              [note, sdId]
            );
          }
        } else {
          const newSd = await txClient.query(
            `INSERT INTO special_day_schedule (child_id, date, note, created_at)
             VALUES ($1, $2, $3, NOW()) RETURNING id`,
            [req.params.childId, dateStr, note || null]
          );
          sdId = newSd.rows[0].id;
        }

        for (const item of scheduleItems) {
          await txClient.query(
            `INSERT INTO special_day_schedule_item
               (special_day_schedule_id, activity_template_id, name, icon, start_time, end_time, star_value, sort_order, section)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              sdId,
              item.activity_template_id,
              item.name,
              item.icon,
              item.start_time,
              item.end_time,
              item.star_value || 1,
              item.sort_order || 0,
              item.section || 'dag',
            ]
          );
        }

        appliedCount++;
        syncedDates.push({ sdId, dateStr });
      }

      await txClient.query('COMMIT');
    } catch (err) {
      await txClient.query('ROLLBACK');
      throw err;
    } finally {
      txClient.release();
    }

    for (const row of syncedDates) {
      try {
        await syncDailyLogForSpecialDay(row.sdId, row.dateStr, req.params.childId);
      } catch (syncErr) {
        console.error('[SCHEDULES] apply-date-range sync error (non-fatal):', syncErr.message);
      }
    }

    broadcast(child.family_id, 'SCHEDULE_UPDATED', {
      childId: req.params.childId,
      date_range: { start_date, end_date },
    });

    res.status(201).json({
      code: 'SCHEDULE_APPLIED_DAYS',
      applied_count: appliedCount,
      start_date,
      end_date,
    });
  } catch (err) {
    console.error('[SCHEDULES] apply-date-range error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;