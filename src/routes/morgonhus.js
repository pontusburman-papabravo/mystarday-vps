'use strict';

const { sendApiError } = require('../lib/api-user-error');

const express = require('express');
const { requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const morgonhus = require('../lib/morgonhus-playable');

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/morgonhus'));
childRouter.use(requireChild);

childRouter.get('/morgonhus', async (req, res) => {
  try {
    const enabled = await morgonhus.isPlayableEnabled(req.user.familyId);
    if (!enabled) {
      return res.status(503).json({ error: 'Morgonhuset ej aktiverat' });
    }

    const state = await morgonhus.buildSceneState(req.user.id, req.user.familyId);
    res.json(state);
  } catch (err) {
    console.error('[morgonhus] child GET error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = { childRouter };
