'use strict';

/**
 * Dev-only child login bypass for localhost.
 * POST /api/auth/dev-child-login — bootstrap test child + issue session.
 * GET  /api/auth/dev-child-login/status — whether the skip button may be shown.
 */

const express = require('express');
const {
  isDevChildLoginAllowed,
  ensureDevChild,
  completeDevChildLogin,
} = require('../../lib/dev-child-login');

const router = express.Router();

router.get('/dev-child-login/status', (req, res) => {
  res.json({ available: isDevChildLoginAllowed(req) });
});

router.post('/dev-child-login', async (req, res) => {
  if (!isDevChildLoginAllowed(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { child, pin, created } = await ensureDevChild();
    return completeDevChildLogin(req, res, child, { created, pin });
  } catch (err) {
    console.error('[DEV-CHILD] Login failed:', err);
    return res.status(500).json({ error: 'Dev-inloggning misslyckades. Kolla DATABASE_URL och kör npm run migrate.' });
  }
});

module.exports = router;
