'use strict';

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const garden = require('../lib/garden-playable');

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/garden'));
childRouter.use(requireChild);

childRouter.get('/garden', async (req, res) => {
  try {
    const enabled = await garden.isPlayableEnabled(req.user.familyId);
    if (!enabled) {
      return res.status(503).json({ error: 'Trädgården ej aktiverad' });
    }

    const state = await garden.buildSceneState(req.user.id, req.user.familyId);
    res.json(state);
  } catch (err) {
    console.error('[garden] child GET error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

childRouter.post('/garden/verb', async (req, res) => {
  try {
    const enabled = await garden.isPlayableEnabled(req.user.familyId);
    if (!enabled) {
      return res.status(503).json({ error: 'Trädgården ej aktiverad' });
    }

    const slotId = req.body?.slot_id;
    const verb = req.body?.verb;
    if (!slotId || !verb || typeof slotId !== 'string' || typeof verb !== 'string') {
      return res.status(400).json({ error: 'Ogiltig förfrågan' });
    }

    const result = await garden.applyLivingVerb(
      req.user.id,
      req.user.familyId,
      slotId,
      verb
    );

    if (!result.ok) {
      if (result.error === 'verb_not_allowed') {
        return res.status(409).json({ error: 'Kan inte göra det nu' });
      }
      if (result.error === 'version_conflict') {
        return res.status(409).json({ error: 'Försök igen' });
      }
      return res.status(400).json({ error: 'Ogiltig förfrågan' });
    }

    res.json(result);
  } catch (err) {
    console.error('[garden] child POST verb error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

module.exports = { childRouter };
