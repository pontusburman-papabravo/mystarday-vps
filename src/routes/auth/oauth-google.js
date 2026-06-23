'use strict';

/**
 * Google Sign In route (E2).
 * POST /api/auth/google. Mounted at /api/auth in index.js.
 */

const express = require('express');
const { appleLoginLimiter } = require('../../middleware/rateLimiter');
const parentDb = require('../../../db/parent');
const { verifyGoogleIdToken } = require('../../lib/google-auth');
const { completeLogin } = require('./session');

const router = express.Router();

// ─── POST /api/auth/google ───────────────────────────────
// Sprint 17: verify Google idToken; login existing parent by verified email.
router.post('/google', appleLoginLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken krävs' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      console.error('[AUTH] Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const email = (payload.email || '').toLowerCase().trim();
    const emailOk = payload.email_verified === true || payload.email_verified === 'true';
    if (!email || !emailOk) {
      return res.status(401).json({ error: 'Google-kontot saknar verifierad e-post' });
    }

    const existing = await parentDb.getParentByEmail(email);
    if (!existing) {
      return res.status(404).json({
        error: 'Inget konto med denna e-post. Registrera dig först med e-post eller Apple.',
        code: 'GOOGLE_ACCOUNT_NOT_FOUND',
      });
    }

    return completeLogin(req, res, existing, 'parent');
  } catch (err) {
    console.error('[AUTH] Google Sign In error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
