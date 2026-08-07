'use strict';

/**
 * CSRF + refresh token routes (E2). GET /api/auth/csrf-token, POST /api/auth/refresh.
 * Mounted at /api/auth in index.js. Refresh flow must stay byte-identical (endpoint-map R-D).
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { generateCsrfToken } = require('../../middleware/csrf');
const {
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  setAccessCookie,
  lookupRefreshTokenRow,
} = require('../../lib/refresh-tokens');
const deviceDb = require('../../../db/family-trusted-device');
const { parseDuration } = require('./session');

const router = express.Router();

// ─── GET /api/auth/csrf-token ─────────────────────────────
// Returns a fresh CSRF token and sets it in a readable (non-httpOnly) cookie.
// Call this once on app init, then include X-CSRF-Token header on mutations.
router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken(res);
  res.json({ csrfToken: token });
});

// ─── POST /api/auth/refresh ───────────────────────────────
// Exchange a valid refresh token cookie for a new short-lived access token.
// The refresh token cookie is rotated (old one deleted, new one issued).
router.post('/refresh', async (req, res) => {
  try {
    const raw = req.cookies?.refresh_token;
    const row = await verifyRefreshToken(raw);

    if (!row) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh-token ogiltig eller utgången' });
    }

    // Rotate refresh token — revoke old, issue new
    const oldRefreshRowId = row.id;
    await revokeRefreshToken(raw);
    const newRaw = await createRefreshToken({
      userId: row.user_type === 'parent' ? row.parent_id : row.child_id,
      userType: row.user_type,
      familyId: row.family_id,
    });
    const newRefreshRow = await lookupRefreshTokenRow(newRaw);
    if (newRefreshRow?.id) {
      await deviceDb.advanceLastRefreshTokenId(oldRefreshRowId, newRefreshRow.id);
    }
    setRefreshCookie(res, newRaw);

    // Issue a new short-lived access token
    let accessToken;
    let accessExpiresSecs;
    if (row.user_type === 'parent') {
      const pr = await db.query(
        'SELECT id, family_id, email, is_admin FROM parent WHERE id = $1',
        [row.parent_id]
      );
      if (!pr.rows[0]) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Användare hittades inte' });
      }
      const p = pr.rows[0];
      accessToken = jwt.sign(
        { id: p.id, type: 'parent', familyId: p.family_id, email: p.email, isAdmin: p.is_admin },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      accessExpiresSecs = parseDuration(config.jwt.expiresIn);
    } else {
      const cr = await db.query(
        'SELECT id, family_id, username, name FROM child WHERE id = $1',
        [row.child_id]
      );
      if (!cr.rows[0]) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Användare hittades inte' });
      }
      const c = cr.rows[0];
      let trustedDeviceId;
      if (newRefreshRow?.id) {
        const deviceRow = await deviceDb.findActiveByLastRefreshTokenId(newRefreshRow.id);
        if (deviceRow) trustedDeviceId = deviceRow.id;
      }
      const childClaims = {
        id: c.id,
        type: 'child',
        familyId: c.family_id,
        username: c.username,
        name: c.name,
      };
      if (trustedDeviceId) childClaims.trustedDeviceId = trustedDeviceId;
      accessToken = jwt.sign(
        childClaims,
        config.jwt.secret,
        { expiresIn: config.jwt.childExpiresIn }
      );
      accessExpiresSecs = parseDuration(config.jwt.childExpiresIn);
    }

    // Set access token as httpOnly cookie — XSS cannot read it.
    setAccessCookie(res, accessToken, accessExpiresSecs);

    // Refresh the CSRF cookie so it doesn't expire between silent refreshes.
    // The cookie has a 24h maxAge; without this, long-lived sessions lose CSRF protection.
    const csrfToken = generateCsrfToken(res);

    // expiresAt lets the frontend re-schedule the next silent refresh
    const expiresAt = Date.now() + accessExpiresSecs * 1000;
    res.json({ csrfToken, expiresAt });
  } catch (err) {
    console.error('[AUTH] Refresh error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});
module.exports = router;
