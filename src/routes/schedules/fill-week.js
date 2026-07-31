/**
 * Child-scoped fill-week: insert a template schedule into multiple days at once.
 * Does NOT handle: CRUD, bulk copy/swap, item management, templates.
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { syncDailyLogWithSchedule } = require('../../lib/daily-log-generator');
const { getChildAccess } = require('../../middleware/authz');

const router = express.Router({ mergeParams: true });
router.use(requireParent);

// POST /api/children/:childId/schedules/fill-week
// Body: { template_category_id, days: [1,2,3,4,5], overwrite: boolean }
router.post('/fill-week', async (req, res) => {
  try {
    const childRow = req.authzChild || await getChildAccess(req.user.id, req.params.childId);
    if (!childRow) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const { template_category_id, days, overwrite } = req.body;
    if (!template_category_id) return res.status(400).json({ error: 'template_category_id krävs' });
    if (!Array.isArray(days) || days.length === 0) return res.status(400).json({ error: 'days[] krävs (t.ex. [1,2,3,4,5])' });

    const validDays = days.map(d => parseInt(d, 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    if (validDays.length === 0) return res.status(400).json({ error: 'Inga giltiga dagar angavs (0=sön, 1=mån…6=lör)' });

    const familyId = childRow.family_id;

    const catResult = await db.query(
      'SELECT id, name FROM category WHERE id = $1 AND family_id = $2',
      [template_category_id, familyId]
    );
    if (catResult.rows.length === 0) return res.status(404).json({ error: 'Kategorin hittades inte' });
    const catName = (catResult.rows[0].name || '').toLowerCase();

    const isSchoolSchema = ['skola', 'förskola', 'forskola', 'school'].some(k => catName.includes(k));
    const weekendDays = new Set([0, 6]);
    const blockedDays = isSchoolSchema ? validDays.filter(d => weekendDays.has(d)) : [];
    const allowedDays = isSchoolSchema ? validDays.filter(d => !weekendDays.has(d)) : validDays;

    if (allowedDays.length === 0) {
      return res.status(400).json({
        error: 'Skolscheman kan inte läggas in på helger (lör/sön). Välj ett helgschema istället.',
        blocked_days: blockedDays,
      });
    }

    const templates = await db.query(
      `SELECT at.id, at.time_group, at.sort_order AS template_sort
       FROM activity_template at
       WHERE at.family_id = $1 AND at.category_id = $2
       ORDER BY at.sort_order ASC, at.name ASC`,
      [familyId, template_category_id]
    );

    const timeGroupToSection = {
      'morgon': 'morgon', 'formiddag': 'dag', 'eftermiddag': 'dag', 'kvall': 'kvall',
    };
    const uniqueTimeGroups = new Set(templates.rows.map(t => t.time_group).filter(Boolean));
    const useSortOrderFallback = uniqueTimeGroups.size <= 1;

    function sectionForTpl(tpl) {
      if (!useSortOrderFallback && tpl.time_group && timeGroupToSection[tpl.time_group]) {
        return timeGroupToSection[tpl.time_group];
      }
      const so = tpl.template_sort;
      if (so === null || so === undefined) return 'dag';
      if (so < 100) return 'morgon';
      if (so < 300) return 'dag';
      return 'kvall';
    }

    const existingSchedules = await db.query(
      `SELECT id, day_of_week FROM weekly_schedule WHERE child_id = $1 AND day_of_week = ANY($2::int[])`,
      [req.params.childId, allowedDays]
    );
    const existingByDay = {};
    for (const s of existingSchedules.rows) existingByDay[s.day_of_week] = s.id;

    const daysWithExisting = allowedDays.filter(d => existingByDay[d]);
    if (daysWithExisting.length > 0 && !overwrite) {
      return res.status(409).json({
        error: 'Några dagar har redan scheman',
        days_with_existing: daysWithExisting,
        blocked_days: blockedDays,
      });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const filledDays = [];
      for (const dow of allowedDays) {
        let scheduleId;
        if (existingByDay[dow]) {
          if (overwrite) {
            await client.query('DELETE FROM weekly_schedule_item WHERE weekly_schedule_id = $1', [existingByDay[dow]]);
            scheduleId = existingByDay[dow];
          } else {
            continue;
          }
        } else {
          const newSched = await client.query(
            'INSERT INTO weekly_schedule (child_id, day_of_week, sort_order) VALUES ($1, $2, $3) RETURNING id',
            [req.params.childId, dow, dow]
          );
          scheduleId = newSched.rows[0].id;
        }

        const sectionCounters = {};
        for (const tpl of templates.rows) {
          const sec = sectionForTpl(tpl);
          if (!(sec in sectionCounters)) sectionCounters[sec] = 0;
          const sortOrder = sectionCounters[sec]++;
          await client.query(
            `INSERT INTO weekly_schedule_item (weekly_schedule_id, activity_template_id, start_time, end_time, sort_order, section)
             VALUES ($1, $2, NULL, NULL, $3, $4)`,
            [scheduleId, tpl.id, sortOrder, sec]
          );
        }
        filledDays.push(dow);
      }

      await client.query('COMMIT');

      for (const dow of filledDays) {
        try {
          await syncDailyLogWithSchedule(req.params.childId, dow);
        } catch (err) {
          console.error('[SCHEDULE-FILL-WEEK] syncDailyLogWithSchedule failed for child', req.params.childId, 'day', dow, ':', err.message);
        }
      }

      res.json({
        message: `Schema infogat på ${filledDays.length} dag(ar)`,
        filled_days: filledDays,
        blocked_days: blockedDays,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[SCHEDULES] fill-week error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;