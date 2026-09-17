const { sendApiError } = require('../lib/api-user-error');
/**
 * General observation routes — family-level, time-agnostic notes.
 * Mounted at /api/general-observations (distinct from child_observation routes at /api/observations).
 *
 * GET    /api/general-observations            — active (non-archived) observations
 * GET    /api/general-observations/archived   — archived observations
 * POST   /api/general-observations            — create new observation
 * PATCH  /api/general-observations/:id         — update text / is_important
 * POST   /api/general-observations/:id/archive — archive an observation
 * POST   /api/general-observations/:id/restore — restore an archived observation
 * DELETE /api/general-observations/:id        — hard-delete an observation
 */
const express = require('express');
const { requireParent } = require('../middleware/auth');
const {
  createObservation,
  getActiveByFamily,
  getArchivedByFamily,
  getById,
  updateObservation,
  archiveObservation,
  restoreObservation,
  deleteObservation,
} = require('../../db/general-observations');
const db = require('../lib/db');

const router = express.Router();
router.use(requireParent);

async function getFamilyId(parentId) {
  const result = await db.query(
    `SELECT family_id FROM parent WHERE id = $1`,
    [parentId]
  );
  return result.rows[0]?.family_id || null;
}

async function verifyOwnership(parentId, observationId) {
  const familyId = await getFamilyId(parentId);
  if (!familyId) return null;
  const obs = await getById(observationId);
  if (!obs || obs.family_id !== familyId) return null;
  return obs;
}

/**
 * GET /api/observations — active observations
 */
router.get('/', async (req, res) => {
  try {
    const familyId = await getFamilyId(req.user.id);
    if (!familyId) return res.status(403).json({ error: 'Ingen familj kopplad till detta konto' });

    const observations = await getActiveByFamily(familyId);
    res.json({ observations });
  } catch (err) {
    console.error('[GENERAL_OBS] Get active error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * GET /api/observations/archived — archived observations
 */
router.get('/archived', async (req, res) => {
  try {
    const familyId = await getFamilyId(req.user.id);
    if (!familyId) return res.status(403).json({ error: 'Ingen familj kopplad till detta konto' });

    const observations = await getArchivedByFamily(familyId);
    res.json({ observations });
  } catch (err) {
    console.error('[GENERAL_OBS] Get archived error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * POST /api/observations — create new observation
 * Body: { text, is_important }
 */
router.post('/', async (req, res) => {
  try {
    const familyId = await getFamilyId(req.user.id);
    if (!familyId) return res.status(403).json({ error: 'Ingen familj kopplad till detta konto' });

    const { text, is_important } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text krävs' });
    }
    const trimmed = text.trim();
    if (!trimmed) return res.status(400).json({ error: 'Anteckningen får inte vara tom' });
    if (trimmed.length > 2000) return res.status(400).json({ error: 'Max 2000 tecken' });

    const observation = await createObservation({
      familyId,
      text: trimmed,
      isImportant: Boolean(is_important),
    });
    res.status(201).json({ observation });
  } catch (err) {
    console.error('[GENERAL_OBS] Create error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * PATCH /api/observations/:id — update text / is_important
 */
router.patch('/:id', async (req, res) => {
  try {
    const obs = await verifyOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    const { text, is_important } = req.body;
    const updates = {};
    if (text !== undefined) {
      const trimmed = String(text).trim();
      if (!trimmed) return res.status(400).json({ error: 'Text får inte vara tom' });
      if (trimmed.length > 2000) return res.status(400).json({ error: 'Max 2000 tecken' });
      updates.text = trimmed;
    }
    if (is_important !== undefined) {
      updates.isImportant = Boolean(is_important);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Ingen uppdatering att spara' });
    }

    const updated = await updateObservation(req.params.id, obs.family_id, updates);
    res.json({ observation: updated });
  } catch (err) {
    console.error('[GENERAL_OBS] Patch error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * POST /api/observations/:id/archive
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const obs = await verifyOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    const archived = await archiveObservation(req.params.id, obs.family_id);
    res.json({ observation: archived });
  } catch (err) {
    console.error('[GENERAL_OBS] Archive error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * POST /api/observations/:id/restore
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const obs = await verifyOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    const restored = await restoreObservation(req.params.id, obs.family_id);
    res.json({ observation: restored });
  } catch (err) {
    console.error('[GENERAL_OBS] Restore error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

/**
 * DELETE /api/observations/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const obs = await verifyOwnership(req.user.id, req.params.id);
    if (!obs) return res.status(404).json({ error: 'Anteckningen hittades inte' });

    await deleteObservation(req.params.id, obs.family_id);
    res.json({ success: true });
  } catch (err) {
    console.error('[GENERAL_OBS] Delete error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;