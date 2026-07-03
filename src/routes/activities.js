// Activities — family-scoped activity library (CRUD, sub-steps, reorder).
// Owns: activity_template table (legacy name, conceptually just "activities").
// Does NOT own: schedules, daily logs, rewards.
const express = require('express');
const { normalizeSevenQuestions, scrubWhatNextReferences } = require('../lib/seven-questions');
const db = require('../lib/db');
const { requireParent } = require('../middleware/auth');
const { syncDailyLogsForTemplateChange } = require('../lib/daily-log-generator');
const { validate, validateParams } = require('../middleware/validate');
const { attachGoalMetaToMany } = require('../lib/for-dig-goal-meta');
const { normalizeDurationSeconds } = require('../lib/activity-timer');
const {
  validatePictogramKey,
  enrichPictogramFieldsMany,
  listPictogramsForApi,
} = require('../../config/pictogram-library');
const {
  CreateActivitySchema,
  UpdateActivitySchema,
  ReorderSchema,
  CreateSubStepSchema,
  UpdateSubStepSchema,
  UUIDParam,
} = require('../lib/schemas');

const router = express.Router();
router.use(requireParent);

// Free emoji picker — any emoji is valid. DB column is VARCHAR(50).

// ─── GET /api/activities ────────────────────────────────
// Returns all activities for the family, grouped by category.
// Categories are age-based (Förskola / Skola) so activities are
// naturally separated — no name-based filtering needed.
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT at.id, at.name, at.icon, at.icon_key, at.image_url, at.category_id, at.star_value, at.is_favorite,
              at.feedback_for, at.sort_order, at.schema_type, at.for_dig_goal_slug, at.duration_seconds,
              COALESCE(at.seven_questions, '{}'::jsonb) AS seven_questions,
              COALESCE(at.time_group, 'morgon') AS time_group,
              c.name AS category_name, c.sort_order AS category_sort_order
       FROM activity_template at
       LEFT JOIN category c ON c.id = at.category_id
       WHERE at.family_id = $1
       ORDER BY c.sort_order ASC NULLS LAST, at.sort_order ASC NULLS LAST, at.name ASC`,
      [req.user.familyId]
    );
    res.json(attachGoalMetaToMany(enrichPictogramFieldsMany(result.rows)));
  } catch (err) {
    console.error('[ACTIVITIES] List error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/activities/icons ───────────────────────────
// Returns popular emoji suggestions for the picker. Any emoji is accepted.
router.get('/icons', async (req, res) => {
  const POPULAR_ICONS = [
    // Hygiene & morning
    '🪥', '🧼', '🚿', '🛁', '🚽', '🧴', '💊',
    // Food & drink
    '🍳', '🥣', '🥗', '🥪', '🍎', '🍌', '🥛', '🍞', '🍽️', '☕', '🥞', '🍕',
    // School & learning
    '📚', '✏️', '📝', '🎒', '📖', '🏫', '📐',
    // Play & creativity
    '🎨', '🎮', '🧩', '⚽', '🏀', '🎯', '🎭', '🎵', '🎸', '🛝', '🎲',
    // Rest & sleep
    '😴', '🛏️', '📕', '🌙', '🧸', '🌟',
    // Nature & outdoors
    '🚴', '🏊', '🌳', '🏃', '🚶', '🌸', '🐕', '🌞',
    // Emotions & wellbeing
    '🧘', '❤️', '🤗', '💪', '🌈',
    // Chores
    '🧹', '🧺', '🗑️', '🌿', '🪴',
    // Transport
    '🚌', '🚗', '🚲',
    // Animals
    '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🦄',
    // Misc
    '⭐', '🏆', '🎉', '📱', '🎬', '⛺', '🎢', '🧁',
  ];
  res.json({ icons: POPULAR_ICONS, free_picker: true });
});

router.get('/pictograms', (req, res) => {
  res.json({ pictograms: listPictogramsForApi() });
});

const VALID_FEEDBACK_FOR = new Set(['both', 'child', 'parent', 'none']);

// ─── POST /api/activities ───────────────────────────────
router.post('/', validate(CreateActivitySchema), async (req, res) => {
  try {
    const { name, icon, icon_key, image_url, category_id, star_value, is_favorite, feedback_for, time_group, schema_type, duration_seconds } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Aktivitetsnamn krävs' });
    }
    const iconKeyError = validatePictogramKey(icon_key);
    if (iconKeyError) {
      return res.status(400).json({ error: iconKeyError });
    }
    const stars = parseInt(star_value, 10) || 1;
    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Stjärnvärde måste vara mellan 1 och 5' });
    }
    const feedbackFor = feedback_for && VALID_FEEDBACK_FOR.has(feedback_for) ? feedback_for : 'both';
    const VALID_TIME_GROUPS = new Set(['morgon', 'formiddag', 'eftermiddag', 'kvall']);
    const validTimeGroup = time_group && VALID_TIME_GROUPS.has(time_group) ? time_group : 'morgon';

    // Compute sort_order from time_group to preserve ordering conventions
    const TIME_GROUP_OFFSET = { morgon: 0, formiddag: 100, eftermiddag: 200, kvall: 300 };
    // Find next sort_order within this time_group range for this category
    const baseOffset = TIME_GROUP_OFFSET[validTimeGroup] || 0;
    const maxSortResult = await db.query(
      `SELECT COALESCE(MAX(sort_order), $1 - 1) + 1 AS next_sort
       FROM activity_template
       WHERE family_id = $2 AND category_id IS NOT DISTINCT FROM $3
         AND sort_order >= $1 AND sort_order < $4`,
      [baseOffset, req.user.familyId, category_id || null, baseOffset + 100]
    );
    const computedSortOrder = parseInt(maxSortResult.rows[0].next_sort, 10);

    // Verify category belongs to family (if provided)
    if (category_id) {
      const cat = await db.query(
        'SELECT id FROM category WHERE id = $1 AND family_id = $2',
        [category_id, req.user.familyId]
      );
      if (cat.rows.length === 0) {
        return res.status(404).json({ error: 'Kategorin hittades inte' });
      }
    }

    let normalizedDuration = null;
    if (duration_seconds !== undefined) {
      const normalized = normalizeDurationSeconds(duration_seconds);
      if (normalized === undefined) {
        return res.status(400).json({ error: 'Timer måste vara mellan 5 och 3600 sekunder' });
      }
      normalizedDuration = normalized;
    }

    const result = await db.query(
      `INSERT INTO activity_template (family_id, name, icon, icon_key, image_url, category_id, star_value, is_favorite, feedback_for, time_group, schema_type, sort_order, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, name, icon, icon_key, image_url, category_id, star_value, is_favorite, feedback_for, time_group, schema_type, sort_order, duration_seconds`,
      [req.user.familyId, name.trim(), icon || null, icon_key || null, image_url || null, category_id || null, stars, is_favorite ? true : false, feedbackFor, validTimeGroup, schema_type || null, computedSortOrder, normalizedDuration]
    );
    res.status(201).json(enrichPictogramFieldsMany(result.rows)[0]);
  } catch (err) {
    console.error('[ACTIVITIES] Create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/activities/reorder ─────────────────────────
// IMPORTANT: This route MUST be defined before /:id to avoid Express matching "reorder" as a UUID
router.put('/reorder', validate(ReorderSchema), async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }
    for (const item of order) {
      if (!item.id || typeof item.sort_order !== 'number') continue;
      await db.query(
        'UPDATE activity_template SET sort_order = $1 WHERE id = $2 AND family_id = $3',
        [item.sort_order, item.id, req.user.familyId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[ACTIVITIES] Reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/activities/:id ─────────────────────────────
router.put('/:id', validateParams(UUIDParam), validate(UpdateActivitySchema), async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const { name, icon, icon_key, image_url, category_id, star_value, is_favorite, feedback_for, sort_order, time_group, seven_questions, duration_seconds } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (name.trim().length < 1) return res.status(400).json({ error: 'Aktivitetsnamn krävs' });
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (icon !== undefined) {
      updates.push(`icon = $${idx++}`);
      values.push(icon || null);
    }
    if (icon_key !== undefined) {
      const iconKeyError = validatePictogramKey(icon_key);
      if (iconKeyError) {
        return res.status(400).json({ error: iconKeyError });
      }
      updates.push(`icon_key = $${idx++}`);
      values.push(icon_key || null);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${idx++}`);
      values.push(image_url || null);
    }
    if (category_id !== undefined) {
      if (category_id !== null) {
        const cat = await db.query(
          'SELECT id FROM category WHERE id = $1 AND family_id = $2',
          [category_id, req.user.familyId]
        );
        if (cat.rows.length === 0) return res.status(404).json({ error: 'Kategorin hittades inte' });
      }
      updates.push(`category_id = $${idx++}`);
      values.push(category_id);
    }
    if (star_value !== undefined) {
      const stars = parseInt(star_value, 10);
      if (stars < 1 || stars > 5) return res.status(400).json({ error: 'Stjärnvärde måste vara mellan 1 och 5' });
      updates.push(`star_value = $${idx++}`);
      values.push(stars);
    }
    if (is_favorite !== undefined) {
      updates.push(`is_favorite = $${idx++}`);
      values.push(Boolean(is_favorite));
    }
    if (feedback_for !== undefined) {
      if (!VALID_FEEDBACK_FOR.has(feedback_for)) return res.status(400).json({ error: 'Ogiltigt feedback_for-värde' });
      updates.push(`feedback_for = $${idx++}`);
      values.push(feedback_for);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(parseInt(sort_order, 10) || 0);
    }
    if (time_group !== undefined) {
      const VALID_TIME_GROUPS = new Set(['morgon', 'formiddag', 'eftermiddag', 'kvall']);
      if (!VALID_TIME_GROUPS.has(time_group)) return res.status(400).json({ error: 'Ogiltig tidsgrupp' });
      updates.push(`time_group = $${idx++}`);
      values.push(time_group);
    }
    if (seven_questions !== undefined) {
      updates.push(`seven_questions = $${idx++}::jsonb`);
      values.push(JSON.stringify(normalizeSevenQuestions(seven_questions)));
    }
    if (duration_seconds !== undefined) {
      const normalized = normalizeDurationSeconds(duration_seconds);
      if (normalized === undefined) {
        return res.status(400).json({ error: 'Timer-tid måste vara 5–3600 sekunder eller tom' });
      }
      updates.push(`duration_seconds = $${idx++}`);
      values.push(normalized);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE activity_template SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, icon, icon_key, image_url, category_id, star_value, is_favorite, feedback_for, time_group, schema_type, duration_seconds`,
      values
    );

    // If name, icon, icon_key, image_url, or star_value changed, sync daily logs for all affected children
    if (name !== undefined || icon !== undefined || icon_key !== undefined || image_url !== undefined || star_value !== undefined) {
      try {
        await syncDailyLogsForTemplateChange(req.user.familyId, req.params.id);
      } catch (syncErr) {
        console.error('[ACTIVITIES] Sync error (non-fatal):', syncErr.message);
      }
    }

    res.json(enrichPictogramFieldsMany(result.rows)[0]);
  } catch (err) {
    console.error('[ACTIVITIES] Update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/activities/:id/sub-steps ───────────────────
router.get('/:id/sub-steps', async (req, res) => {
  try {
    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }
    const result = await db.query(
      `SELECT id, name, icon, sort_order
       FROM activity_sub_step
       WHERE activity_template_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[ACTIVITIES] Sub-steps list error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/activities/:id/sub-steps ──────────────────
router.post('/:id/sub-steps', validateParams(UUIDParam), validate(CreateSubStepSchema), async (req, res) => {
  try {
    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const { name, icon } = req.body;
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Namn krävs' });
    }
    // Place at end of current list
    const countRes = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM activity_sub_step WHERE activity_template_id = $1',
      [req.params.id]
    );
    const sort_order = parseInt(countRes.rows[0].next, 10);

    const result = await db.query(
      `INSERT INTO activity_sub_step (activity_template_id, name, icon, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, icon, sort_order`,
      [req.params.id, name.trim(), icon || null, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ACTIVITIES] Sub-step create error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/activities/:id/sub-steps/reorder ───────────
router.put('/:id/sub-steps/reorder', validateParams(UUIDParam), validate(ReorderSchema), async (req, res) => {
  try {
    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, sort_order }' });
    }
    for (const item of order) {
      if (!item.id || typeof item.sort_order !== 'number') continue;
      await db.query(
        `UPDATE activity_sub_step SET sort_order = $1
         WHERE id = $2 AND activity_template_id = $3`,
        [item.sort_order, item.id, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[ACTIVITIES] Sub-step reorder error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── PUT /api/activities/:id/sub-steps/:stepId ───────────
router.put('/:id/sub-steps/:stepId', validateParams(UUIDParam), validate(UpdateSubStepSchema), async (req, res) => {
  try {
    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const existing = await db.query(
      'SELECT id FROM activity_sub_step WHERE id = $1 AND activity_template_id = $2',
      [req.params.stepId, req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Delsteget hittades inte' });
    }

    const { name, icon, sort_order } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (name.trim().length < 1) return res.status(400).json({ error: 'Namn krävs' });
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (icon !== undefined) {
      updates.push(`icon = $${idx++}`);
      values.push(icon || null);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(parseInt(sort_order, 10) || 0);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Inget att uppdatera' });

    values.push(req.params.stepId);
    const result = await db.query(
      `UPDATE activity_sub_step SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, icon, sort_order`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ACTIVITIES] Sub-step update error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/activities/:id/sub-steps/:stepId ────────
router.delete('/:id/sub-steps/:stepId', async (req, res) => {
  try {
    const template = await db.query(
      'SELECT id FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const result = await db.query(
      'DELETE FROM activity_sub_step WHERE id = $1 AND activity_template_id = $2 RETURNING id',
      [req.params.stepId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delsteget hittades inte' });
    }
    res.json({ message: 'Delsteget har tagits bort' });
  } catch (err) {
    console.error('[ACTIVITIES] Sub-step delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/activities/:id ───────────────────────────
router.delete('/:id', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id, name, icon, icon_key, seven_questions FROM activity_template WHERE id = $1 AND family_id = $2',
      [req.params.id, req.user.familyId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Aktiviteten hittades inte' });
    }

    const used = await client.query(
      'SELECT COUNT(*) FROM weekly_schedule_item WHERE activity_template_id = $1',
      [req.params.id]
    );
    if (parseInt(used.rows[0].count, 10) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Aktiviteten används i ett eller flera veckoscheman. Ta bort den därifrån först.',
      });
    }

    const snap = existing.rows[0];
    await scrubWhatNextReferences(client, req.user.familyId, req.params.id, {
      name: snap.name,
      emoji: snap.icon,
      icon_key: snap.icon_key || null,
    });

    await client.query('DELETE FROM activity_template WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Aktiviteten har tagits bort' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ACTIVITIES] Delete error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  } finally {
    client.release();
  }
});

module.exports = router;
