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

const router = express.Router();

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

/** DELETE /api/family/images/:id */
router.delete('/:id', validateParams(UUIDParam), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM family_image WHERE id = $1 AND family_id = $2 RETURNING id',
      [req.params.id, req.user.familyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bilden hittades inte' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[FAMILY-IMAGES] Delete error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
