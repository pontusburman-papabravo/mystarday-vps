'use strict';

/**
 * Apple Sign In routes + ID-token verification helpers (E2).
 * POST /api/auth/apple, POST /api/auth/apple/link.
 * Mounted at /api/auth in index.js.
 */

const express = require('express');
const crypto = require('crypto');
const { appleLoginLimiter } = require('../../middleware/rateLimiter');
const { createNewsletterSubscription } = require('../../lib/newsletter-subscribe');
const parentDb = require('../../../db/parent');
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

    // SCENARIO 3 — Account exists with password: email found but no Apple link → conflict
    if (appleEmail) {
      const existingByEmail = await parentDb.getParentByEmail(appleEmail);
      if (existingByEmail && existingByEmail.email && existingByEmail.has_password) {
        console.log('[APPLE] email conflict', { parentId: existingByEmail.id });
        return res.status(409).json({
          error: 'email_conflict',
          email: appleEmail,
        });
      }
    }

    // SCENARIO 2 — New user: apple_user_id not linked and email not in DB
    const displayName = (firstName && lastName)
      ? `${firstName.trim()} ${lastName.trim()}`
      : (firstName?.trim() || (typeof name === 'string' && name.trim()) || appleEmail?.split('@')[0] || 'Förälder');

    console.log('[APPLE] creating new user');
    const newParent = await createParentWithApple({
      appleUserId,
      appleEmail,
      displayName,
    });

    return completeLogin(req, res, newParent, 'parent');

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

// ─── Helper: verify Apple identity token against Apple's JWKS ───────
// Fetches Apple's public keys, caches them in-memory for 24h, then
// validates the RS256 JWT signature + issuer + audience claims.
const APPLE_JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let _appleJwksCache = { keys: null, fetchedAt: 0 };

async function _fetchAppleJwks() {
  const now = Date.now();
  if (_appleJwksCache.keys && (now - _appleJwksCache.fetchedAt) < APPLE_JWKS_CACHE_TTL_MS) {
    return _appleJwksCache.keys;
  }
  try {
    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) throw new Error(`Apple JWKS HTTP ${res.status}`);
    const data = await res.json();
    _appleJwksCache = { keys: data.keys || [], fetchedAt: now };
    return _appleJwksCache.keys;
  } catch (err) {
    console.error('[AUTH] Apple JWKS fetch failed, using cached keys:', err.message);
    return _appleJwksCache.keys || [];
  }
}

function _jwkToPem(jwk) {
  if (!jwk || jwk.kty !== 'RSA') return null;
  return crypto.createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' });
}

async function verifyAppleIdToken(idToken) {
  const jwt = require('jsonwebtoken');
  const APPLE_ISSUER = 'https://appleid.apple.com';
  const audiences = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_BUNDLE_ID || 'se.mystarday.app', // pragma: allowlist secret
  ].filter(Boolean);
  if (audiences.length === 0) {
    console.error('[APPLE] token verification: no APPLE_CLIENT_ID or APPLE_BUNDLE_ID configured');
    return null;
  }

  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded) {
      console.error('[APPLE] token decode failed');
      return null;
    }

    const { kid, alg } = decoded.header;
    if (!kid || alg !== 'RS256') {
      console.error('[APPLE] invalid token header', { kid: !!kid, alg });
      return null;
    }

    const keys = await _fetchAppleJwks();
    const jwk = keys.find(k => k.kid === kid);
    if (!jwk) {
      console.error('[APPLE] JWK kid not found:', kid);
      return null;
    }

    const pem = _jwkToPem(jwk);
    if (!pem) return null;

    const payload = jwt.verify(idToken, pem, {
      issuer: APPLE_ISSUER,
      audience: audiences.length === 1 ? audiences[0] : audiences,
      algorithms: ['RS256'],
    });

    return payload;
  } catch (err) {
    const decodedAud = (() => {
      try {
        const d = jwt.decode(idToken);
        return d && d.aud;
      } catch { return undefined; }
    })();
    if (err.name === 'JsonWebTokenError' && /audience/i.test(err.message)) {
      console.error('[APPLE] audience mismatch', {
        expected: audiences,
        got: decodedAud,
      });
    } else {
      console.error('[APPLE] token verification failed:', err.message);
    }
    return null;
  }
}

// ─── Helper: create a new parent account from Apple Sign In ────────
async function createParentWithApple({ appleUserId, appleEmail, displayName }) {
  const db = require('../../lib/db');
  const { sendWelcomeEmail } = require('../../lib/welcome-mailer');
  const { registerContact } = require('../../lib/email');

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const familyName = `${displayName}s familj`;

    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM family');
    const familyCount = countResult.rows[0].count;
    const { getFounderFamilyLimitWithClient, qualifiesForLifetimeFree } = require('../../lib/payment-policy');
    const founderLimit = await getFounderFamilyLimitWithClient(client);
    const isLifetimeFree = qualifiesForLifetimeFree(familyCount, founderLimit);

    const familyResult = await client.query(
      `INSERT INTO family (name, subscription_status, trial_ends_at, is_lifetime_free)
       VALUES ($1, 'none', CASE WHEN $2 THEN NULL ELSE NOW() + INTERVAL '14 days' END, $2)
       RETURNING id`,
      [familyName, isLifetimeFree]
    );
    const familyId = familyResult.rows[0].id;

    // Create parent with Apple — no password hash, verified=true (Apple is identity provider)
    // onboarding_completed = false so parent goes through the onboarding wizard
    const parentResult = await client.query(
      `INSERT INTO parent (family_id, email, password_hash, name, verified,
                          newsletter_subscribed, family_role, apple_user_id, apple_email, onboarding_completed)
       VALUES ($1, $2, NULL, $3, true, true, 'förälder', $4, $5, false)
       RETURNING id, family_id, email, name, verified, is_admin, created_at,
                 COALESCE(onboarding_completed, true) as onboarding_completed`,
      [familyId, appleEmail || `apple_${appleUserId}@privaterelay.appleid.com`, displayName, appleUserId, appleEmail]
    );
    const parent = parentResult.rows[0];

    // Seed default activities (same as regular registration)
    const defaultActivities = [
      { name: 'Vakna',           icon: '🛏️', category: 'Morgon',      star_value: 1, sort_order: 0, schema_type: 'forskola' },
      { name: 'Klä på sig',       icon: '🌟', category: 'Morgon',      star_value: 1, sort_order: 1, schema_type: 'forskola' },
      { name: 'Borsta tänderna',   icon: '🪥', category: 'Morgon',      star_value: 1, sort_order: 2, schema_type: 'forskola' },
      { name: 'Äta frukost',      icon: '🍳', category: 'Morgon',      star_value: 1, sort_order: 3, schema_type: 'forskola' },
      { name: 'Förskola/Skola',   icon: '🏫', category: 'Förmiddag',  star_value: 1, sort_order: 0, schema_type: 'forskola' },
      { name: 'Leka ute',         icon: '🛝', category: 'Förmiddag',  star_value: 1, sort_order: 1, schema_type: 'forskola' },
      { name: 'Pyssel',           icon: '🎨', category: 'Förmiddag',  star_value: 1, sort_order: 2, schema_type: 'forskola' },
      { name: 'Mellanmål',        icon: '🍎', category: 'Eftermiddag',star_value: 1, sort_order: 0, schema_type: 'forskola' },
      { name: 'Leka',             icon: '🧩', category: 'Eftermiddag',star_value: 1, sort_order: 1, schema_type: 'forskola' },
      { name: 'Träning/Aktivitet',icon: '🏃', category: 'Eftermiddag',star_value: 1, sort_order: 2, schema_type: 'forskola' },
      { name: 'Middag',           icon: '🍽️', category: 'Kväll',      star_value: 1, sort_order: 0, schema_type: 'forskola' },
      { name: 'Borsta tänderna (kväll)', icon: '🪥', category: 'Kväll',star_value: 1, sort_order: 1, schema_type: 'forskola' },
      { name: 'Pyjamas',          icon: '🧸', category: 'Kväll',      star_value: 1, sort_order: 2, schema_type: 'forskola' },
      { name: 'Godnattsaga',      icon: '📕', category: 'Kväll',      star_value: 1, sort_order: 3, schema_type: 'forskola' },
      { name: 'Sova',             icon: '😴', category: 'Kväll',      star_value: 1, sort_order: 4, schema_type: 'forskola' },
    ];
    const TEMPLATE_CATEGORIES = [
      { key: 'forskola', name: 'Förskola', sort_order: 0 },
      { key: 'morgon',   name: 'Morgon',   sort_order: 2 },
      { key: 'dag',      name: 'Dag',      sort_order: 3 },
      { key: 'kvall',    name: 'Kväll',    sort_order: 4 },
    ];
    const TIME_CATEGORY_OFFSET = { 'Morgon': 0, 'Förmiddag': 100, 'Eftermiddag': 200, 'Kväll': 300 };
    const CATEGORY_TO_TIME_GROUP = { 'Morgon': 'morgon', 'Förmiddag': 'formiddag', 'Eftermiddag': 'eftermiddag', 'Kväll': 'kvall' };

    const categoryMap = {};
    for (const cat of TEMPLATE_CATEGORIES) {
      const catResult = await client.query(
        'INSERT INTO category (family_id, name, sort_order, is_default) VALUES ($1, $2, $3, true) RETURNING id',
        [familyId, cat.name, cat.sort_order]
      );
      categoryMap[cat.key] = catResult.rows[0].id;
    }

    for (const act of defaultActivities) {
      const catId = categoryMap[act.schema_type];
      if (!catId) continue;
      const timeGroup = CATEGORY_TO_TIME_GROUP[act.category] || 'morgon';
      const timeOffset = TIME_CATEGORY_OFFSET[act.category] ?? 400;
      const combinedSort = timeOffset + (act.sort_order ?? 0);
      await client.query(
        `INSERT INTO activity_template (family_id, name, icon, category_id, star_value, is_favorite, time_group, schema_type, sort_order)
         VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)`,
        [familyId, act.name, act.icon, catId, act.star_value, timeGroup, act.schema_type, combinedSort]
      );
    }

    // Notification preferences
    await client.query('INSERT INTO notification_preference (parent_id) VALUES ($1)', [parent.id]);

    await createNewsletterSubscription(client, parent.id, parent.email);

    // Founder families: lifetime_free tier. Later families: trial then paid (when stores live).
    // trial_expires_at computed in JS — PostgreSQL 42P08 if the same param is reused in CASE + column.
    const subTier = isLifetimeFree ? 'lifetime_free' : 'trial';
    const trialExpiresAt = subTier === 'trial'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;
    await client.query(
      `INSERT INTO family_subscriptions (family_id, tier, trial_expires_at, components)
       VALUES ($1, $2, $3, $4)`,
      [
        familyId,
        subTier,
        trialExpiresAt,
        JSON.stringify([{ component: 'basic_app', granted_at: new Date().toISOString(), expires_at: null }]),
      ]
    );

    await client.query('COMMIT');

    // Analytics: signup started
    require('../../lib/analytics-tracker').trackSignupStarted(familyId);

    // Register contact FIRST so emails are accepted by the proxy (no cold outreach block)
    if (appleEmail) {
      await registerContact(appleEmail, displayName, 'signup').catch(err => {
        console.error('[AUTH] registerContact failed for', appleEmail, ':', err.message);
      });
      // Welcome email (fire-and-forget)
      const { hasAccess } = require('../../../db/features');
      const welcomeEmailAllowed = await hasAccess(familyId, 'valkomstmail');
      if (welcomeEmailAllowed) {
        sendWelcomeEmail(appleEmail, parent.id, { foralderns_namn: displayName, barnets_namn: '' }).catch(err => {
          console.error('[AUTH] Welcome email send failed for', appleEmail, ':', err.message);
        });
      }
    }

    return parent;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
module.exports = router;
