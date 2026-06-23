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
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from och to krävs (YYYY-MM-DD)' });
    }
    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ error: 'Ogiltigt datumformat. Använd YYYY-MM-DD.' });
    }

    const observations = await getObservationsForRange(req.params.childId, from, to);
    res.json({ observations });
  } catch (err) {
    console.error('[OBSERVATIONS] Get error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

/**
 * POST /api/children/:childId/observations
 * Body: { date, section, content, is_important }
 */
router.post('/:childId/observations', async (req, res) => {
  try {
    const child = await verifyChildAccess(req.user.id, req.params.childId);
    if (!child) return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });

    const { date, section, content, is_important } = req.body;
    if (!date || !section || content === undefined) {
      return res.status(400).json({ error: 'date, section och content krävs' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Ogiltigt datumformat. Använd YYYY-MM-DD.' });
    }
    const allowedSections = ['fm', 'em', 'kvall'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ error: 'section måste vara: fm, em eller kvall' });
    }
    const trimmed = String(content).trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'content får inte vara tomt' });
    }
    if (trimmed.length > 2000) {
      return res.status(400).json({ error: 'Anteckningen får vara max 2000 tecken' });
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
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
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
        return res.status(400).json({ error: 'section måste vara: fm, em eller kvall' });
      }
      updates.section = section;
    }
    if (content !== undefined) {
      const trimmed = String(content).trim();
      if (!trimmed) return res.status(400).json({ error: 'content får inte vara tomt' });
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
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
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
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;