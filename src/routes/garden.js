'use strict';

const { sendApiError } = require('../lib/api-user-error');

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const garden = require('../lib/garden-playable');
const gardenLoe = require('../lib/garden-loe');

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/garden'));
childRouter.use(requireChild);

async function requireGardenEnabled(req, res) {
  const enabled = await garden.isPlayableEnabled(req.user.familyId);
  if (!enabled) {
    sendApiError(res, 503, 'GARDEN_DISABLED');
    return false;
  }
  return true;
}

childRouter.get('/garden', async (req, res) => {
  try {
    if (!(await requireGardenEnabled(req, res))) return;

    const state = await garden.buildSceneState(req.user.id, req.user.familyId);
    res.json(state);
  } catch (err) {
    console.error('[garden] child GET error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

childRouter.get('/garden/slots', async (req, res) => {
  try {
    if (!(await requireGardenEnabled(req, res))) return;

    const payload = await gardenLoe.getSlots(req.user.id, req.user.familyId);
    res.json(payload);
  } catch (err) {
    console.error('[garden] child GET slots error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

childRouter.post('/garden/slots/:slotId/verb', async (req, res) => {
  try {
    if (!(await requireGardenEnabled(req, res))) return;

    const verb = typeof req.body?.verb === 'string' ? req.body.verb.trim() : '';
    if (!gardenLoe.ALLOWED_VERBS.has(verb)) {
      return res.status(400).json({ error: 'Ogiltigt verb' });
    }

    const result = await gardenLoe.performVerb({
      childId: req.user.id,
      familyId: req.user.familyId,
      slotId: req.params.slotId,
      verb,
    });

    if (!result.ok) {
      if (result.error === 'plant_locked') {
        return res.status(403).json({
          error: 'plant_locked',
          child_message_sv: result.child_message_sv,
        });
      }
      if (result.error === 'verb_not_allowed') {
        return res.status(409).json({
          error: 'verb_not_allowed',
          state_key: result.state_key,
        });
      }
      if (result.error === 'slot_not_found') {
        return sendApiError(res, 404, 'SLOT_NOT_FOUND');
      }
      if (result.error === 'version_conflict') {
        return res.status(409).json({ error: 'version_conflict' });
      }
      return sendApiError(res, 400, result.error || 'GENERIC_SERVER_ERROR');
    }

    res.json(result);
  } catch (err) {
    console.error('[garden] child POST verb error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = { childRouter };
