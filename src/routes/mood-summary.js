'use strict';

/**
 * Parent mood summary — daily aggregation of child ratings (emotion_key + scores).
 * GET /api/children/:childId/mood-summary?date=YYYY-MM-DD
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { getChildAccess } = require('../middleware/authz');
const { requireFeature } = require('../middleware/feature-gate');
const { getPictogram } = require('../../config/pictogram-library');

const router = express.Router();
router.use(requireParent);

function pictogramForKey(key) {
  const pic = getPictogram(key);
  if (!pic) return { key, label: key, emoji: '💛' };
  return { key: pic.key, label: pic.label, emoji: pic.emoji };
}

/**
 * GET /api/children/:childId/mood-summary?date=
 */
router.get('/:childId/mood-summary', requireFeature('emotion_tracking'), async (req, res) => {
  try {
    const child = await getChildAccess(req.user.id, req.params.childId);
    if (!child) {
      return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });
    }

    const dateMatch = String(req.query.date || '').match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

    const emotionRows = await db.query(
      `SELECT r.emotion_key AS key, COUNT(*)::int AS count
       FROM daily_log dl
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
       WHERE dl.child_id = $1 AND dl.date = $2::date
         AND r.emotion_key IS NOT NULL
       GROUP BY r.emotion_key
       ORDER BY count DESC, r.emotion_key ASC`,
      [req.params.childId, date]
    );

    const scoreRow = await db.query(
      `SELECT COUNT(r.id)::int AS count,
              ROUND(AVG(r.score)::numeric, 1) AS avg_score
       FROM daily_log dl
       JOIN daily_log_item dli ON dli.daily_log_id = dl.id
       JOIN rating r ON r.daily_log_item_id = dli.id AND r.user_type = 'child'
       WHERE dl.child_id = $1 AND dl.date = $2::date
         AND r.score IS NOT NULL`,
      [req.params.childId, date]
    );

    const emotions = emotionRows.rows.map((row) => {
      const meta = pictogramForKey(row.key);
      return {
        key: row.key,
        label: meta.label,
        emoji: meta.emoji,
        count: row.count,
      };
    });

    const scoreStats = scoreRow.rows[0] || { count: 0, avg_score: null };

    res.json({
      date,
      emotions,
      scores: {
        count: scoreStats.count,
        avg: scoreStats.avg_score != null ? Number(scoreStats.avg_score) : null,
      },
    });
  } catch (err) {
    console.error('[MOOD-SUMMARY] GET error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
