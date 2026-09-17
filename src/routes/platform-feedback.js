'use strict';

const { sendApiError } = require('../lib/api-user-error');

const express = require('express');
const { requireParent, requireChild } = require('../middleware/auth');
const { scopeRouterToPath } = require('../middleware/router-path-scope');
const platformRuntime = require('../lib/platform-runtime');
const { loadPack } = require('../lib/experience-pack');

const parentRouter = express.Router();
parentRouter.use(scopeRouterToPath('/platform-feedback'));
parentRouter.use(requireParent);

parentRouter.get('/platform-feedback/:childId/:dailyLogItemId', async (req, res) => {
  try {
    const enabled = await platformRuntime.isRuntimeEnabled();
    if (!enabled) return res.status(503).json({ error: 'Platform Runtime ej aktiverat' });

    const { childId, dailyLogItemId } = req.params;
    const feedback = await platformRuntime.getParentFeedback(childId, dailyLogItemId);
    if (!feedback) return res.status(404).json({ error: 'Ingen feedback hittades' });
    res.json(feedback);
  } catch (err) {
    console.error('[platform-feedback] parent GET error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

parentRouter.get('/platform-pack', async (_req, res) => {
  try {
    const enabled = await platformRuntime.isRuntimeEnabled();
    if (!enabled) return res.status(503).json({ error: 'Platform Runtime ej aktiverat' });
    const pack = loadPack();
    res.json({
      pack_id: pack.manifest.pack_id,
      version: pack.manifest.version,
      locale: pack.manifest.locale,
    });
  } catch (err) {
    console.error('[platform-feedback] pack error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

const childRouter = express.Router();
childRouter.use(scopeRouterToPath('/platform-feedback'));
childRouter.use(requireChild);

childRouter.get('/platform-feedback', async (req, res) => {
  try {
    const enabled = await platformRuntime.isRuntimeEnabled();
    if (!enabled) return res.status(503).json({ error: 'Platform Runtime ej aktiverat' });

    const feedback = await platformRuntime.getChildFeedback(req.user.id);
    res.json(feedback);
  } catch (err) {
    console.error('[platform-feedback] child GET error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

childRouter.post('/platform-feedback/replay', async (req, res) => {
  try {
    const enabled = await platformRuntime.isRuntimeEnabled();
    if (!enabled) return res.status(503).json({ error: 'Platform Runtime ej aktiverat' });

    const result = await platformRuntime.replayPendingEvents(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[platform-feedback] replay error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = { parentRouter, childRouter };
