'use strict';

const express = require('express');
const db = require('../../lib/db');
const { hashPassword, comparePassword } = require('../../lib/hash');
const { requireParent } = require('../../middleware/auth');
const { revokeAllRefreshTokens } = require('../../lib/refresh-tokens');
const { validate } = require('../../middleware/validate');
const { ChangePasswordSchema, SetPasswordSchema } = require('./schemas');

const router = express.Router();

// ─── PUT /api/account/change-password ───────────────────
router.put('/change-password', requireParent, validate(ChangePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Nuvarande och nytt lösenord krävs' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    // Verify current password
    const result = await db.query(
      'SELECT password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Nuvarande lösenord är felaktigt' });
    }

    // Update password
    const newHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE parent SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    );

    // Revoke ALL refresh tokens so stolen tokens can't outlive the password change.
    // Without this, a compromised refresh token remains valid for up to 30 days.
    await revokeAllRefreshTokens({ userId: req.user.id, userType: 'parent' });

    res.json({ message: 'Lösenordet har ändrats!' });
  } catch (err) {
    console.error('[ACCOUNT] Change password error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
