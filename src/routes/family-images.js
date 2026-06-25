'use strict';

/**
 * Family image library — /api/family/images
 * Parents store reusable photos (toothbrush, bed, school…) for activity icons.
 */

const express = require('express');
const db = require('../lib/db');
const { validate, validateParams } = require('../middleware/validate');
const { UUIDParam } = require('../lib/schemas');
const { z } = require('zod');

const { syncDailyLogsForTemplateChange } = require('../lib/daily-log-generator');

const router = express.Router();

const DEFAULT_ACTIVITY_ICON = '⭐';

const CreateFamilyImageSchema = z.object({
  label: z.string().max(120).optional().nullable(),
  image_url: z.string().url({ message: 'Ogiltig bild-URL' }),
});

const UpdateFamilyImageSchema = z.object({
  label: z.string().max(120).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

/** GET /api/family/images */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, label, image_url, sort_order, created_at
       FROM family_image
       WHERE family_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [req.user.familyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[FAMILY-IMAGES] List error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/** POST /api/family/images */
router.post('/', validate(CreateFamilyImageSchema), async (req, res) => {
  try {
    const { label, image_url } = req.body;
    const maxSort = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM family_image WHERE family_id = $1',
      [req.user.familyId]
    );
    const sort_order = parseInt(maxSort.rows[0].next_sort, 10) || 0;
    const result = await db.query(
      `INSERT INTO family_image (family_id, label, image_url, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, label, image_url, sort_order, created_at`,
      [req.user.familyId, label ? String(label).trim() : null, image_url, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[FAMILY-IMAGES] Create error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/** PUT /api/family/images/:id */
router.put('/:id', validateParams(UUIDParam), validate(UpdateFamilyImageSchema), async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id FROM family_image WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bilden hittades inte' });
    }

    const { label, sort_order } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (label !== undefined) {
      updates.push(`label = $${idx++}`);
      values.push(label ? String(label).trim() : null);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(sort_order);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Inget att uppdatera' });
    }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE family_image SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, label, image_url, sort_order, created_at`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[FAMILY-IMAGES] Update error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/** DELETE /api/family/images/:id — removes archive row; activities fall back to emoji */
router.delete('/:id', validateParams(UUIDParam), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const deleted = await client.query(
      'DELETE FROM family_image WHERE id = $1 AND family_id = $2 RETURNING image_url',
      [req.params.id, req.user.familyId]
    );
    if (deleted.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bilden hittades inte' });
    }

    const imageUrl = deleted.rows[0].image_url;

    const clearedActivities = await client.query(
      `UPDATE activity_template
       SET image_url = NULL,
           icon = COALESCE(NULLIF(TRIM(icon), ''), $3)
       WHERE family_id = $1 AND image_url = $2
       RETURNING id`,
      [req.user.familyId, imageUrl, DEFAULT_ACTIVITY_ICON]
    );

    await client.query(
      `UPDATE daily_log_item dli
       SET image_url = NULL,
           icon = COALESCE(NULLIF(TRIM(dli.icon), ''), $3)
       FROM daily_log dl
       JOIN child c ON c.id = dl.child_id
       WHERE dli.daily_log_id = dl.id
         AND c.family_id = $1
         AND dli.image_url = $2`,
      [req.user.familyId, imageUrl, DEFAULT_ACTIVITY_ICON]
    );

    await client.query('COMMIT');

    for (const row of clearedActivities.rows) {
      try {
        await syncDailyLogsForTemplateChange(req.user.familyId, row.id);
      } catch (syncErr) {
        console.error('[FAMILY-IMAGES] Daily log sync error (non-fatal):', syncErr.message);
      }
    }

    res.json({
      success: true,
      activities_updated: clearedActivities.rows.length,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[FAMILY-IMAGES] Delete error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

module.exports = router;
