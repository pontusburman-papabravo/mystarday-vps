'use strict';

/**
 * Apple Sign In routes + ID-token verification helpers (E2).
 * POST /api/auth/apple, POST /api/auth/apple/link.
 * Mounted at /api/auth in index.js.
 */

const express = require('express');
const { appleLoginLimiter } = require('../../middleware/rateLimiter');
const parentDb = require('../../../db/parent');
const { verifyAppleIdToken } = require('../../lib/apple-auth');
const { createParentFromOAuth } = require('../../lib/create-oauth-parent');
const { completeLogin } = require('./session');

const router = express.Router();

// ─── POST /api/auth/apple ────────────────────────────────
// Apple Sign In — verify JWT identity token against Apple's public keys,
// then create or link the parent account.
// Scenarios:
//   1. Existing Apple user (by apple_user_id) → 200 + session
//   2. New user (email not found) → 201 + session, lifetime_free tier
//   3. Existing password account (email found, no Apple link) → 409 + email_conflict
router.post('/apple', appleLoginLimiter, async (req, res) => {
  try {
    const { idToken, firstName, lastName, name } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      console.warn('[APPLE] auth rejected: missing idToken');
      return res.status(400).json({ error: 'idToken krävs' });
    }

    console.log('[APPLE] auth request received', { ip: req.ip });

    // Verify the JWT using Apple's public JWKS — never trust name/email from request body
    const appleUser = await verifyAppleIdToken(idToken);
    if (!appleUser) {
      console.warn('[APPLE] token verification failed — returning 401');
      return res.status(401).json({ error: 'Ogiltig Apple-identitetstoken' });
    }

    const { sub: appleUserId, email: appleEmail } = appleUser;
    console.log('[APPLE] token verified', {
      subPrefix: String(appleUserId).slice(0, 8),
      hasEmail: !!appleEmail,
    });

    // SCENARIO 1 — Existing Apple user: apple_user_id already linked → login directly
    const existingByApple = await parentDb.getParentByAppleUserId(appleUserId);
    if (existingByApple) {
      console.log('[APPLE] existing user found', { parentId: existingByApple.id });
      return completeLogin(req, res, existingByApple, 'parent');
    }

    // SCENARIO 3 — Account exists: email found → login or password conflict
    if (appleEmail) {
      const existingByEmail = await parentDb.getParentByEmail(appleEmail);
      if (existingByEmail) {
        if (existingByEmail.has_password) {
          console.log('[APPLE] email conflict', { parentId: existingByEmail.id });
          return res.status(409).json({
            error: 'email_conflict',
            email: appleEmail,
          });
        }
        if (!existingByEmail.apple_user_id) {
          await parentDb.linkAppleUserId(existingByEmail.id, appleUserId, appleEmail);
        }
        console.log('[APPLE] existing user by email', { parentId: existingByEmail.id });
        return completeLogin(req, res, existingByEmail, 'parent');
      }
    }

    // SCENARIO 2 — New user: apple_user_id not linked and email not in DB
    const displayName = (firstName && lastName)
      ? `${firstName.trim()} ${lastName.trim()}`
      : (firstName?.trim() || (typeof name === 'string' && name.trim()) || appleEmail?.split('@')[0] || 'Förälder');

    console.log('[APPLE] creating new user');
    const newParent = await createParentFromOAuth({
      displayName,
      email: appleEmail || `apple_${appleUserId}@privaterelay.appleid.com`,
      appleUserId,
      appleEmail,
    });

    return completeLogin(req, res, newParent, 'parent', { isNewAccount: true });

  } catch (err) {
    console.error('[AUTH] Apple Sign In error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/apple/link ──────────────────────────
// Link an existing password-account to the current Apple ID.
// Requires the user to be logged in with a password account first.
router.post('/apple/link', appleLoginLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken krävs' });
    }

    // User must be authenticated via password (not Apple) to link
    if (!req.user || req.user.type !== 'parent') {
      return res.status(401).json({ error: 'Du måste vara inloggad för att länka Apple-konto' });
    }

    const appleUser = await verifyAppleIdToken(idToken);
    if (!appleUser) {
      return res.status(401).json({ error: 'Ogiltig Apple-identitetstoken' });
    }

    const { sub: appleUserId, email: appleEmail } = appleUser;

    // Check if Apple user ID already belongs to another account
    const existing = await parentDb.getParentByAppleUserId(appleUserId);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Detta Apple-konto är redan linkat till ett annat konto' });
    }

    // Link the Apple ID to the current parent account
    await parentDb.linkAppleUserId(req.user.id, appleUserId, appleEmail || null);

    res.json({ message: 'Apple-konto länkat!' });
  } catch (err) {
    console.error('[AUTH] Apple link error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
