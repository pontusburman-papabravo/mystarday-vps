const { sendApiError } = require('../lib/api-user-error');
const express = require('express');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');

const router = express.Router();
router.use(requireParent);

// ─── GET /api/categories ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, sort_order, is_default
       FROM category
       WHERE family_id = $1
       ORDER BY sort_order ASC, name ASC`,
      [req.user.familyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[CATEGORIES] List error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// ─── POST /api/categories ────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, sort_order } = req.body;
    if (!name || name.trim().length < 1) {
      return sendApiError(res, 400, 'CATEGORY_NAME_REQUIRED');
    }

    // Get max sort_order for family
    const maxResult = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM category WHERE family_id = $1',
      [req.user.familyId]
    );
    const nextOrder = sort_order !== undefined ? sort_order : maxResult.rows[0].next_order;

    const result = await db.query(
      `INSERT INTO category (family_id, name, sort_order, is_default)
       VALUES ($1, $2, $3, false)
       RETURNING id, name, sort_order, is_default`,
      [req.user.familyId, name.trim(), nextOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[CATEGORIES] Create error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// ─── PUT /api/categories/:id ─────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT id, is_default FROM category WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Kategorin hittades inte' });
    }

    const { name, sort_order } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (name.trim().length < 1) return sendApiError(res, 400, 'CATEGORY_NAME_REQUIRED');
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(sort_order);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'NO_CHANGES' });

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE category SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, sort_order, is_default`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[CATEGORIES] Update error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// ─── GET /api/categories/:id/delete-check ────────────────
// Returns metadata needed to build a deletion warning in the UI
router.get('/:id/delete-check', async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id, name, is_default FROM category WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Kategorin hittades inte' });
    }

    const activityCount = await db.query(
      'SELECT COUNT(*) FROM activity_template WHERE category_id = $1',
      [req.params.id]
    );

    const scheduleUsage = await db.query(
      `SELECT COUNT(*) FROM weekly_schedule_item wsi
       INNER JOIN activity_template at ON at.id = wsi.activity_template_id
       WHERE at.category_id = $1`,
      [req.params.id]
    );

    res.json({
      activity_count: parseInt(activityCount.rows[0].count, 10),
      used_in_schedule: parseInt(scheduleUsage.rows[0].count, 10) > 0,
    });
  } catch (err) {
    console.error('[CATEGORIES] Delete check error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

// ─── DELETE /api/categories/:id ──────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id, name, is_default FROM category WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Kategorin hittades inte' });
    }

    const cat = existing.rows[0];

    // Count templates in category
    const templates = await db.query(
      'SELECT COUNT(*) FROM activity_template WHERE category_id = $1',
      [req.params.id]
    );
    const activityCount = parseInt(templates.rows[0].count, 10);

    // Delete templates (sub-steps cascade via ON DELETE CASCADE FK)
    if (activityCount > 0) {
      await db.query('DELETE FROM activity_template WHERE category_id = $1', [req.params.id]);
    }

    await db.query('DELETE FROM category WHERE id = $1', [req.params.id]);
    res.json({ message: 'Kategorin har tagits bort' });
  } catch (err) {
    console.error('[CATEGORIES] Delete error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;
