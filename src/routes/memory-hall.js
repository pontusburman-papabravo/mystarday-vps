'use strict';

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const memoryHall = require('../lib/memory-hall-playable');

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/memory-hall'));
childRouter.use(requireChild);

childRouter.get('/memory-hall', async (req, res) => {
  try {
    const enabled = await memoryHall.isPlayableEnabled(req.user.familyId);
    if (!enabled) {
      return res.status(503).json({ error: 'Minnesrummet ej aktiverat' });
    }

    const state = await memoryHall.buildSceneState(req.user.id, req.user.familyId);
    res.json(state);
  } catch (err) {
    console.error('[memory-hall] child GET error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

module.exports = { childRouter };
