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

module.exports = { childRouter };
