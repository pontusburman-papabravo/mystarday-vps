const { sendApiError } = require('../lib/api-user-error');
/**
 * Child observation routes.
 * Free-standing notes (observations) per child per date — not tied to an activity.
 *
 * GET  /api/children/:childId/observations?from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST /api/children/:childId/observations
 * PATCH /api/observations/:id
 * DELETE /api/observations/:id
 */
const express = require('express');
const { requireParent } = require('../middleware/auth');
const { getChildAccess } = require('../middleware/authz');
const { upsertObservation, getObservationsForRange, getObservationById, deleteObservation } = require('../../db/child-observations');
const db = require('../lib/db');

const router = express.Router();
router.use(requireParent);

const DATE_RE = /^\/\b-\/\b$/;
const DATE_RE_STR = 'YYYY-MM-DD';

function isValidDate(s) {
  return s && s.length === 10 && s[4] === '-' && s[7] === '-' && !isNaN(Date.parse(s + 'T12:00:00'));
}

/** Verify parent has access to a child. */
async function verifyChildAccess(parentId, childId) {
  return getChildAccess(parentId, childId);
}

/** Verify parent owns an observation. */
async function verifyObservationOwnership(parentId, observationId) {
  const result = await db.query(
    `SELECT id FROM child_observation WHERE id = $1 AND parent_id = $2`,
    [observationId, parentId]
  );
  return result.rows[0] || null;
}

/**
 * GET /api/children/:childId/observations?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/:childId/observations', async (req, res) => {
  try {
    const child = await verifyChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { from, to } = req.query;
    if (!from || !to) {
      return sendApiError(res, 400, 'DATE_RANGE_REQUIRED');
    }
    if (!isValidDate(from) || !isValidDate(to)) {
      return sendApiError(res, 400, 'INVALID_DATE');
    }

    const observations = await getObservationsForRange(req.params.childId, from, to);
    res.json({ observations });
  } catch (err) {
    console.error('[OBSERVATIONS] Get error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * POST /api/children/:childId/observations
 * Body: { date, section, content, is_important }
 */
router.post('/:childId/observations', async (req, res) => {
  try {
    const child = await verifyChildAccess(req.user.id, req.params.childId);
    if (!child) return sendApiError(res, 403, 'CHILD_ACCESS_DENIED');

    const { date, section, content, is_important } = req.body;
    if (!date || !section || content === undefined) {
      return sendApiError(res, 400, 'OBS_FIELDS_REQUIRED');
    }
    if (!isValidDate(date)) {
      return sendApiError(res, 400, 'INVALID_DATE');
    }
    const allowedSections = ['fm', 'em', 'kvall'];
    if (!allowedSections.includes(section)) {
      return sendApiError(res, 400, 'INVALID_SECTION_FM_EM');
    }
    const trimmed = String(content).trim();
    if (!trimmed) {
      return sendApiError(res, 400, 'CONTENT_REQUIRED');
    }
    if (trimmed.length > 2000) {
      return sendApiError(res, 400, 'NOTE_MAX_CHARS');
    }

    const observation = await upsertObservation({
      childId: req.params.childId,
      parentId: req.user.id,
      date,
      section,
      content: trimmed,
      isImportant: Boolean(is_important),
    });
    res.status(201).json({ observation });
  } catch (err) {
    console.error('[OBSERVATIONS] Create error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * PATCH /api/observations/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const obs = await verifyObservationOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    const { section, content, is_important } = req.body;
    const updates = {};
    if (section !== undefined) {
      if (!['fm', 'em', 'kvall'].includes(section)) {
        return sendApiError(res, 400, 'INVALID_SECTION_FM_EM');
      }
      updates.section = section;
    }
    if (content !== undefined) {
      const trimmed = String(content).trim();
      if (!trimmed) return sendApiError(res, 400, 'CONTENT_REQUIRED');
      if (trimmed.length > 2000) return res.status(400).json({ error: 'Max 2000 tecken' });
      updates.content = trimmed;
    }
    if (is_important !== undefined) {
      updates.is_important = Boolean(is_important);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Ingen uppdatering att spara' });
    }

    const updated = await db.query(
      `UPDATE child_observation
       SET section = COALESCE($2, section),
           content = COALESCE($3, content),
           is_important = COALESCE($4, is_important),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, child_id, parent_id, date, section, content, is_important, created_at, updated_at`,
      [req.params.id, updates.section || null, updates.content || null,
       updates.is_important !== undefined ? updates.is_important : null]
    );
    res.json({ observation: updated.rows[0] });
  } catch (err) {
    console.error('[OBSERVATIONS] Patch error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * DELETE /api/observations/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const obs = await verifyObservationOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    await deleteObservation(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[OBSERVATIONS] Delete error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;