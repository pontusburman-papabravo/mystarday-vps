'use strict';

const { sendApiError } = require('../../lib/api-user-error');

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
      return sendApiError(res, 400, 'PASSWORD_CURRENT_AND_NEW');
    }
    if (newPassword.length < 8) {
      return sendApiError(res, 400, 'PASSWORD_TOO_SHORT');
    }

    // Verify current password
    const result = await db.query(
      'SELECT password_hash FROM parent WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return sendApiError(res, 404, 'USER_NOT_FOUND');
    }

    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return sendApiError(res, 401, 'INVALID_PASSWORD');
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

    res.json({ code: 'PASSWORD_CHANGED' });
  } catch (err) {
    console.error('[ACCOUNT] Change password error:', err);
    sendApiError(res, 500, 'GENERIC_SERVER_ERROR');
  }
});

module.exports = router;
