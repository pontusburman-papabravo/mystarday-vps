'use strict';

/**
 * Parent-scoped daily log routes (mounted at /api/children).
 * GET /:childId/daily-log, GET /:childId/daily-logs
 */

const express = require('express');
const db = require('../../lib/db');
const { requireParent } = require('../../middleware/auth');
const { getChildAccess } = require('../../middleware/authz');
const { getOrGenerateDailyLog } = require('../../lib/daily-log-generator');
const {
  getSectionTimes,
  parseLogDate,
  groupItemsBySection,
  attachSchoolVariantToItems,
} = require('./helpers');
const { getFamilyPreferredLocale } = require('../../lib/family-locale');
const { localizeActivityItems } = require('../../lib/family-content-display');

const childRouter = express.Router();
childRouter.use(requireParent);

/**
 * GET /api/children/:childId/daily-log?date=YYYY-MM-DD
 */
childRouter.get('/:childId/daily-log', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const dateStr = parseLogDate(req.query.date, child.timezone || 'Europe/Stockholm');

    const { log, items, generated } = await getOrGenerateDailyLog(req.params.childId, dateStr);

    const locale = await getFamilyPreferredLocale(child.family_id);
    const { schoolVariant, itemsWithVariant } = attachSchoolVariantToItems(items, child.birthday);
    const localizedItems = localizeActivityItems(itemsWithVariant, locale);

    const sections = groupItemsBySection(localizedItems);

    const sectionTimes = await getSectionTimes(req.params.childId);

    res.json({
      log,
      child_birthday: child.birthday,
      age_variant: schoolVariant,
      items: localizedItems,
      sections,
      section_times: sectionTimes,
      generated,
      total: localizedItems.length,
      completed: localizedItems.filter(i => i.completed).length,
    });
  } catch (err) {
    console.error('[DAILY-LOG] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * GET /api/children/:childId/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
childRouter.get('/:childId/daily-logs', async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from och to krävs (YYYY-MM-DD)' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Ogiltigt datumformat. Använd YYYY-MM-DD.' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      return res.status(400).json({ error: 'Datumintervallet får inte överstiga 90 dagar' });
    }

    const result = await db.query(
      `SELECT dl.id, TO_CHAR(dl.date, 'YYYY-MM-DD') AS date, dl.is_paused, dl.generated_from, dl.created_at,
              COUNT(dli.id) AS total_items,
              COUNT(CASE WHEN dli.completed THEN 1 END) AS completed_items
       FROM daily_log dl
       LEFT JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       WHERE dl.child_id = $1 AND dl.date >= $2 AND dl.date <= $3
       GROUP BY dl.id, dl.date, dl.is_paused, dl.generated_from, dl.created_at
       ORDER BY dl.date DESC`,
      [req.params.childId, from, to]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[DAILY-LOG] History error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = childRouter;
