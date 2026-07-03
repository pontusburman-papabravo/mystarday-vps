'use strict';

/**
 * Google Sign In routes (E2).
 * POST /api/auth/google, POST /api/auth/google/link.
 */

const express = require('express');
const { appleLoginLimiter } = require('../../middleware/rateLimiter');
const parentDb = require('../../../db/parent');
const { verifyGoogleIdToken } = require('../../lib/google-auth');
const { createParentFromOAuth } = require('../../lib/create-oauth-parent');
const { completeLogin } = require('./session');

const router = express.Router();

function googleDisplayName(payload, email) {
  if (payload.name && String(payload.name).trim()) return String(payload.name).trim();
  const given = payload.given_name && String(payload.given_name).trim();
  const family = payload.family_name && String(payload.family_name).trim();
  if (given || family) return `${given || ''} ${family || ''}`.trim();
  return email.split('@')[0] || 'Förälder';
}

// ─── POST /api/auth/google ───────────────────────────────
// Scenarios:
//   1. Existing Google user (by google_user_id) → session
//   2. New user → create account + session
//   3. Existing password account (email found, no Google link) → 409 email_conflict
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

    const googleUserId = payload.sub;
    if (!googleUserId) {
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const existingByGoogle = await parentDb.getParentByGoogleUserId(googleUserId);
    if (existingByGoogle) {
      return completeLogin(req, res, existingByGoogle, 'parent');
    }

    const existingByEmail = await parentDb.getParentByEmail(email);
    if (existingByEmail) {
      if (existingByEmail.has_password) {
        return res.status(409).json({
          error: 'email_conflict',
          email,
        });
      }
      if (!existingByEmail.google_user_id) {
        await parentDb.linkGoogleUserId(existingByEmail.id, googleUserId);
      }
      return completeLogin(req, res, existingByEmail, 'parent');
    }

    const displayName = googleDisplayName(payload, email);
    const newParent = await createParentFromOAuth({ displayName, email, googleUserId });
    return completeLogin(req, res, newParent, 'parent', { isNewAccount: true });
  } catch (err) {
    console.error('[AUTH] Google Sign In error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/google/link ─────────────────────────
// Link Google ID to current password account (after login).
router.post('/google/link', appleLoginLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken krävs' });
    }

    if (!req.user || req.user.type !== 'parent') {
      return res.status(401).json({ error: 'Du måste vara inloggad för att länka Google-konto' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      console.error('[AUTH] Google link token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const googleUserId = payload.sub;
    if (!googleUserId) {
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const existing = await parentDb.getParentByGoogleUserId(googleUserId);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Detta Google-konto är redan kopplat till ett annat konto' });
    }

    await parentDb.linkGoogleUserId(req.user.id, googleUserId);

    res.json({ message: 'Google-konto länkat!' });
  } catch (err) {
    console.error('[AUTH] Google link error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
