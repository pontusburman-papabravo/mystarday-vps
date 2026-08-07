'use strict';

/**
 * CSRF + refresh token routes (E2). GET /api/auth/csrf-token, POST /api/auth/refresh.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { generateCsrfToken } = require('../../middleware/csrf');
const {
  rotateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  setAccessCookie,
} = require('../../lib/refresh-tokens');
const { parseDuration } = require('./session');

const router = express.Router();

router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken(res);
  res.json({ csrfToken: token });
});

router.post('/refresh', async (req, res) => {
  try {
    const raw = req.cookies?.refresh_token;
    const rotation = await rotateRefreshToken(raw);

    if (!rotation.ok) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh-token ogiltig eller utgången' });
    }

    const { row, newRaw, newRow } = rotation;
    setRefreshCookie(res, newRaw);

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
      if (row.trusted_device_id && !newRow?.trusted_device_id) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: 'Refresh-token ogiltig eller utgången' });
      }
      const childClaims = {
        id: c.id,
        type: 'child',
        familyId: c.family_id,
        username: c.username,
        name: c.name,
      };
      if (newRow?.trusted_device_id) {
        childClaims.trustedDeviceId = newRow.trusted_device_id;
      }
      accessToken = jwt.sign(
        childClaims,
        config.jwt.secret,
        { expiresIn: config.jwt.childExpiresIn }
      );
      accessExpiresSecs = parseDuration(config.jwt.childExpiresIn);
    }

    setAccessCookie(res, accessToken, accessExpiresSecs);
    const csrfToken = generateCsrfToken(res);
    const expiresAt = Date.now() + accessExpiresSecs * 1000;
    res.json({ csrfToken, expiresAt });
  } catch (err) {
    console.error('[AUTH] Refresh error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});
module.exports = router;
