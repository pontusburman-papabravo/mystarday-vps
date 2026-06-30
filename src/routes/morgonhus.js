'use strict';

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const morgonhus = require('../lib/morgonhus-playable');

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/morgonhus'));
childRouter.use(requireChild);

childRouter.get('/morgonhus', async (req, res) => {
  try {
    const enabled = await morgonhus.isPlayableEnabled();
    if (!enabled) {
      return res.status(503).json({ error: 'Morgonhuset ej aktiverat' });
    }

    const state = await morgonhus.buildSceneState(req.user.id);
    res.json(state);
  } catch (err) {
    console.error('[morgonhus] child GET error:', err);
    res.status(500).json({ error: 'Något gick fel' });
  }
});

module.exports = { childRouter };
