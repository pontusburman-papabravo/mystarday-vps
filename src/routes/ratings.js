/**
 * Activity ratings routes.
 *
 * Child:
 *   POST   /api/me/daily-log-items/:itemId/rate   — rate or update rating
 *   GET    /api/me/daily-log-items/:itemId/rating — get my rating for an item
 *
 * Parent:
 *   POST   /api/daily-log-items/:itemId/rate      — parent rates an item
 *   GET    /api/children/:childId/daily-log-items/:itemId/ratings — get both ratings
 */

const express = require('express');
const db = require('../lib/db');
const { requireParent, requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');

// ─── Child rating router ──────────────────────────────────

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/daily-log-items'));
childRouter.use(requireChild);

/**
 * POST /api/me/daily-log-items/:itemId/rate
 * Child rates one of their own daily_log_items. Creates or updates.
 * Body: { score: 1-5, comment?: string }
 */
childRouter.post('/daily-log-items/:itemId/rate', async (req, res) => {
  try {
    const childId = req.user.id;
    const { itemId } = req.params;
    const { score, comment } = req.body;

    // Validate score — child uses 1–10 drag-slider
    const s = parseInt(score, 10);
    if (isNaN(s) || s < 1 || s > 10) {
      return res.status(400).json({ error: 'Betyg måste vara mellan 1 och 10' });
    }

    // Verify item belongs to this child; get feedback_for config
    const itemResult = await db.query(
      `SELECT dli.id, COALESCE(at.feedback_for, 'both') AS feedback_for
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       LEFT JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [itemId, childId]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }
    const feedbackFor = itemResult.rows[0].feedback_for;
    if (feedbackFor === 'parent' || feedbackFor === 'none') {
      return res.status(403).json({ error: 'Betygsättning är inte tillåten för detta barn på den här aktiviteten' });
    }

    // Upsert rating
    const result = await db.query(
      `INSERT INTO rating (daily_log_item_id, user_type, score, comment)
       VALUES ($1, 'child', $2, $3)
       ON CONFLICT (daily_log_item_id, user_type)
       DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, score, comment, created_at`,
      [itemId, s, comment || null]
    );

    res.json({ rating: result.rows[0], message: 'Betyg sparat! ⭐' });
  } catch (err) {
    console.error('[RATINGS] Child rate error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * GET /api/me/daily-log-items/:itemId/rating
 * Get the child's own rating for an item.
 */
childRouter.get('/daily-log-items/:itemId/rating', async (req, res) => {
  try {
    const childId = req.user.id;
    const { itemId } = req.params;

    // Verify item belongs to this child
    const itemResult = await db.query(
      `SELECT dli.id FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [itemId, childId]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const result = await db.query(
      `SELECT r_child.score AS child_score, r_child.comment AS child_comment,
              r_parent.score AS parent_score, r_parent.comment AS parent_comment
       FROM (SELECT 1) AS dummy
       LEFT JOIN rating r_child ON r_child.daily_log_item_id = $1 AND r_child.user_type = 'child'
       LEFT JOIN rating r_parent ON r_parent.daily_log_item_id = $1 AND r_parent.user_type = 'parent'`,
      [itemId]
    );

    res.json(result.rows[0] || { child_score: null, child_comment: null, parent_score: null, parent_comment: null });
  } catch (err) {
    console.error('[RATINGS] Child get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── Parent rating router ─────────────────────────────────

const parentRouter = express.Router();
parentRouter.use(requireParent);

/**
 * POST /api/daily-log-items/:itemId/rate
 * Parent rates an activity item for one of their children. Creates or updates.
 * Body: { score: 1-5, comment?: string }
 */
parentRouter.post('/:itemId/rate', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { itemId } = req.params;
    const { score, comment } = req.body;

    // Validate score — parent uses 1–5 stars
    const s = parseInt(score, 10);
    if (isNaN(s) || s < 1 || s > 5) {
      return res.status(400).json({ error: 'Betyg måste vara mellan 1 och 5' });
    }

    // Verify item belongs to one of this parent's children; get feedback_for config
    const itemResult = await db.query(
      `SELECT dli.id, COALESCE(at.feedback_for, 'both') AS feedback_for
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN parent_child pc ON pc.child_id = dl.child_id
       LEFT JOIN activity_template at ON at.id = dli.activity_template_id
       WHERE dli.id = $1 AND pc.parent_id = $2`,
      [itemId, parentId]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }
    const feedbackFor = itemResult.rows[0].feedback_for;
    if (feedbackFor === 'child' || feedbackFor === 'none') {
      return res.status(403).json({ error: 'Förälderns betygsättning är inte aktiverad för den här aktiviteten' });
    }

    // Upsert rating
    const result = await db.query(
      `INSERT INTO rating (daily_log_item_id, user_type, score, comment)
       VALUES ($1, 'parent', $2, $3)
       ON CONFLICT (daily_log_item_id, user_type)
       DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, score, comment, created_at`,
      [itemId, s, comment || null]
    );

    res.json({ rating: result.rows[0], message: 'Betyg sparat!' });
  } catch (err) {
    console.error('[RATINGS] Parent rate error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * GET /api/daily-log-items/:itemId/ratings
 * Get both child and parent ratings for an item. Parent access only.
 */
parentRouter.get('/:itemId/ratings', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { itemId } = req.params;

    // Verify access
    const itemResult = await db.query(
      `SELECT dli.id FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN parent_child pc ON pc.child_id = dl.child_id
       WHERE dli.id = $1 AND pc.parent_id = $2`,
      [itemId, parentId]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const result = await db.query(
      `SELECT r_child.score AS child_score, r_child.comment AS child_comment,
              r_parent.score AS parent_score, r_parent.comment AS parent_comment
       FROM (SELECT 1) AS dummy
       LEFT JOIN rating r_child ON r_child.daily_log_item_id = $1 AND r_child.user_type = 'child'
       LEFT JOIN rating r_parent ON r_parent.daily_log_item_id = $1 AND r_parent.user_type = 'parent'`,
      [itemId]
    );

    res.json(result.rows[0] || { child_score: null, child_comment: null, parent_score: null, parent_comment: null });
  } catch (err) {
    console.error('[RATINGS] Parent get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = { childRouter, parentRouter };
