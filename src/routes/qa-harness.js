/**
 * QA harness routes — ONLY active when QA_MODE=true + QA_SECRET set.
 * Lets automated tests fetch email/invite tokens from DB without an inbox.
 */
const express = require('express');
const db = require('../lib/db');
const { isQaMode, verifyQaSecret } = require('../lib/qa-mode');

const router = express.Router();

router.use((req, res, next) => {
  if (!isQaMode()) {
    return res.status(404).json({ error: 'Endpoint hittades inte' });
  }
  if (!verifyQaSecret(req)) {
    return res.status(403).json({ error: 'Ogiltig QA-hemlighet' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ qaMode: true, message: 'QA harness aktiv' });
});

/**
 * POST /api/qa/setup-admin { email }
 * Promotes an existing parent to admin (verified) for automated admin-panel QA.
 */
router.post('/setup-admin', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'email krävs' });
    }
    const r = await db.query(
      `UPDATE parent SET is_admin = true, verified = true
       WHERE LOWER(email) = $1
       RETURNING id, email, is_admin, verified`,
      [email]
    );
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Förälder hittades inte — registrera kontot först' });
    }
    res.json({ message: 'Admin aktiverat för QA', parent: r.rows[0] });
  } catch (err) {
    console.error('[QA] setup-admin error:', err);
    res.status(500).json({ error: 'setup-admin misslyckades' });
  }
});

/**
 * GET /api/qa/token?email=&kind=verify|reset|invite
 * Returns latest unused token for the email (test automation only).
 */
router.get('/token', async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    const kind = req.query.kind || 'verify';
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'email query krävs' });
    }

    if (kind === 'verify') {
      const r = await db.query(
        `SELECT ev.token, ev.expires_at
         FROM email_verification ev
         JOIN parent p ON p.id = ev.parent_id
         WHERE LOWER(p.email) = $1 AND ev.used = false AND ev.expires_at > NOW()
         ORDER BY ev.created_at DESC LIMIT 1`,
        [email]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Ingen verify-token' });
      return res.json({ kind, token: r.rows[0].token, expires_at: r.rows[0].expires_at });
    }

    if (kind === 'reset') {
      const r = await db.query(
        `SELECT pr.token, pr.expires_at
         FROM password_reset pr
         JOIN parent p ON p.id = pr.parent_id
         WHERE LOWER(p.email) = $1 AND pr.used = false AND pr.expires_at > NOW()
         ORDER BY pr.created_at DESC LIMIT 1`,
        [email]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Ingen reset-token' });
      return res.json({ kind, token: r.rows[0].token, expires_at: r.rows[0].expires_at });
    }

    if (kind === 'invite') {
      const r = await db.query(
        `SELECT fi.token, fi.expires_at, fi.email
         FROM family_invite fi
         WHERE LOWER(fi.email) = $1 AND fi.accepted = false AND fi.expires_at > NOW()
         ORDER BY fi.created_at DESC LIMIT 1`,
        [email]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Ingen invite-token' });
      return res.json({ kind, token: r.rows[0].token, expires_at: r.rows[0].expires_at });
    }

    return res.status(400).json({ error: 'kind måste vara verify, reset eller invite' });
  } catch (err) {
    console.error('[QA] token lookup error:', err);
    res.status(500).json({ error: 'QA token lookup misslyckades' });
  }
});

module.exports = router;
