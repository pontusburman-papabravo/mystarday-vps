const { sendApiError } = require('../lib/api-user-error');
/**
 * Pedagog notes API routes.
 * Owns: pedagog_notes CRUD for pedagog-role parents.
 * Does NOT own: child, parent, parent_child — verified via read-only joins.
 *
 * Auth: requireParent verifies JWT. Each endpoint additionally verifies
 * role='pedagog' via parent_child for the relevant child.
 */

const express = require('express');
const { requireParent } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-gate');
const {
  getPedagogChildren,
  upsertNote,
  getNote,
  getNotesForPeriod,
  verifyPedagogAccess,
  getOverview,
} = require('../../db/pedagog-notes');
const db = require('../lib/db');
const router = express.Router();
router.use(requireParent);
router.use(requireFeature('pedagoganteckningar'));

// ─── GET /api/pedagog-notes/children ────────────────────────
// List children the logged-in pedagog has access to
router.get('/children', async (req, res) => {
  try {
    const children = await getPedagogChildren(req.user.id);
    res.json({ children });
  } catch (err) {
    console.error('[PEDAGOG-NOTES] list children error:', err);
    sendApiError(res, 500, 'FETCH_CHILDREN_FAILED');
  }
});

// ─── POST /api/pedagog-notes ─────────────────────────────────
// Create or update a note (upsert by child+pedagog+date)
router.post('/', async (req, res) => {
  try {
    const { childId, date, mood, sleepQuality, sleepHours, meals, behavior, notes, mealsStructured, isDraft } = req.body;

    if (!childId || !date) {
      return sendApiError(res, 400, 'CHILD_ID_DATE_REQUIRED');
    }

    // Verify pedagogen has access to this child
    const hasAccess = await verifyPedagogAccess(req.user.id, childId);
    if (!hasAccess) {
      return sendApiError(res, 403, 'ACCESS_DENIED');
    }

    // Validate mood/sleepQuality range
    if (mood !== undefined && (mood < 1 || mood > 5)) {
      return sendApiError(res, 400, 'MOOD_RANGE');
    }
    if (sleepQuality !== undefined && (sleepQuality < 1 || sleepQuality > 5)) {
      return sendApiError(res, 400, 'SLEEP_QUALITY_RANGE');
    }

    const note = await upsertNote({
      childId,
      pedagogId: req.user.id,
      date,
      mood: mood ?? null,
      sleepQuality: sleepQuality ?? null,
      sleepHours: sleepHours ?? null,
      meals: meals ?? null,
      behavior: behavior ?? null,
      notes: notes ?? null,
      mealsStructured: mealsStructured ?? null,
      isDraft: isDraft !== undefined ? isDraft : true,
    });

    res.json({ ok: true, note });
  } catch (err) {
    console.error('[PEDAGOG-NOTES] upsert error:', err);
    sendApiError(res, 500, 'NOTE_SAVE_FAILED');
  }
});

// ─── GET /api/pedagog-notes ───────────────────────────────────
// Query by childId+date (single day) or childId+from+to (period)
router.get('/', async (req, res) => {
  try {
    const { childId, date, from, to } = req.query;

    if (!childId) {
      return sendApiError(res, 400, 'CHILD_ID_REQUIRED');
    }

    // Verify pedagogen has access to this child
    const hasAccess = await verifyPedagogAccess(req.user.id, childId);
    if (!hasAccess) {
      return sendApiError(res, 403, 'ACCESS_DENIED');
    }

    if (date) {
      // Single day fetch
      const note = await getNote(childId, req.user.id, date);
      res.json({ note: note || null });
    } else if (from && to) {
      // Period fetch for pedagog historik — own notes incl. drafts
      const { rows } = await db.query(
        `SELECT id, date, notes, mood, is_draft, note_status, published_at, created_at, updated_at
         FROM pedagog_notes
         WHERE child_id = $1 AND pedagog_id = $2 AND date BETWEEN $3::date AND $4::date
         ORDER BY date DESC`,
        [childId, req.user.id, from, to]
      );
      res.json({ notes: rows });
    } else {
      return sendApiError(res, 400, 'NOTE_DATE_RANGE_REQUIRED');
    }
  } catch (err) {
    console.error('[PEDAGOG-NOTES] get error:', err);
    sendApiError(res, 500, 'NOTE_FETCH_FAILED');
  }
});

// ─── GET /api/pedagog-notes/overview ───────────────────────
// Overview of all pedagog-linked children for a given date, with family_label.
// Requires feature gate (router-level). Filters by active pedagog links + feature flag.
router.get('/overview', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendApiError(res, 400, 'DATE_REQUIRED');
    }
    const children = await getOverview(req.user.id, date);
    res.json({ success: true, date, children });
  } catch (err) {
    console.error('[PEDAGOG-NOTES] overview error:', err);
    sendApiError(res, 500, 'OVERVIEW_FETCH_FAILED');
  }
});

// ─── POST /api/pedagog-notes/publish ───────────────────────
router.post('/publish', async (req, res) => {
  try {
    const { childId, date } = req.body;
    if (!childId || !date) return sendApiError(res, 400, 'CHILD_ID_DATE_REQUIRED');

    const hasAccess = await verifyPedagogAccess(req.user.id, childId);
    if (!hasAccess) return sendApiError(res, 403, 'ACCESS_DENIED');

    const { rows } = await db.query(
      `UPDATE pedagog_notes
       SET is_draft = false,
           note_status = 'published',
           published_at = COALESCE(published_at, NOW()),
           updated_at = NOW()
       WHERE child_id = $1 AND pedagog_id = $2 AND date = $3::date
       RETURNING *`,
      [childId, req.user.id, date]
    );
    if (!rows[0]) return sendApiError(res, 404, 'NOTE_NOT_FOUND');

    const { logPedagogEvent } = require('../lib/pedagog-audit');
    const childRow = await db.query('SELECT family_id FROM child WHERE id = $1', [childId]);
    await logPedagogEvent({
      familyId: childRow.rows[0]?.family_id,
      childId,
      pedagogId: req.user.id,
      action: 'pedagog_note_published',
    });

    res.json({ ok: true, note: rows[0] });
  } catch (err) {
    console.error('[PEDAGOG-NOTES] publish error:', err);
    sendApiError(res, 500, 'NOTE_PUBLISH_FAILED');
  }
});

module.exports = router;