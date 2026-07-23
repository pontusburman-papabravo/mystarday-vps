'use strict';

/**
 * Email-flow auth routes (E2): verify-email, resend-verification,
 * forgot-password, reset-password. Mounted at /api/auth in index.js.
 */

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../../lib/hash');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { forgotPasswordLimiter, resendVerificationLimiter } = require('../../middleware/rateLimiter');
const { sendVerificationEmail, sendPasswordResetEmail, registerContact } = require('../../lib/email');
const { resolveFamilyLocale } = require('../../lib/locale');
const { revokeAllRefreshTokens } = require('../../lib/refresh-tokens');
const { validate } = require('../../middleware/validate');
const {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
} = require('../../lib/schemas');

const router = express.Router();

// ─── POST /api/auth/verify-email ──────────────────────────
router.post('/verify-email', validate(VerifyEmailSchema), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verifieringstoken krävs' });
    }

    const result = await db.query(
      'SELECT id, parent_id, expires_at FROM email_verification WHERE token = $1',
      [token]
    );

    const verification = result.rows[0];
    if (!verification || new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Ogiltig eller utgången verifieringslänk' });
    }

    await db.query('UPDATE parent SET verified = true WHERE id = $1', [verification.parent_id]);
    await db.query('DELETE FROM email_verification WHERE id = $1', [verification.id]);

    // Analytics: funnel step — email_verified
    db.query('SELECT family_id FROM parent WHERE id = $1', [verification.parent_id])
      .then(r => {
        if (r.rows[0]) require('../../lib/analytics-tracker').trackEmailVerified(r.rows[0].family_id);
      })
      .catch(() => {});

    res.json({ message: 'E-postadressen har verifierats! Du kan nu logga in.' });
  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/resend-verification ───────────────────
// Rate limited: max 3 per hour per email. Generates a fresh token each time.
router.post('/resend-verification', resendVerificationLimiter, validate(ResendVerificationSchema), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-postadress krävs' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to avoid leaking account existence
    const successMessage = 'Om kontot finns skickas en ny verifieringslänk';

    const parentResult = await db.query(
      'SELECT id, name, verified FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (parentResult.rows.length === 0) {
      return res.json({ message: successMessage });
    }

    const parent = parentResult.rows[0];

    // Already verified — no need to resend
    if (parent.verified) {
      return res.json({ message: successMessage });
    }

    // Rate limit: max 3 resend requests per hour per email (DB-based)
    const recentResult = await db.query(
      `SELECT resend_count, last_resent_at FROM email_verification
       WHERE parent_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [parent.id]
    );

    if (recentResult.rows.length > 0) {
      const { resend_count, last_resent_at } = recentResult.rows[0];
      if (last_resent_at) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (new Date(last_resent_at) > hourAgo && resend_count >= 3) {
          return res.status(429).json({
            error: 'Du har redan begärt flera verifieringslänkar. Försök igen om en timme.',
          });
        }
      }
    }

    // Delete old tokens and create a fresh one
    await db.query('DELETE FROM email_verification WHERE parent_id = $1', [parent.id]);

    const verifyToken = uuidv4();
    await db.query(
      `INSERT INTO email_verification (parent_id, token, expires_at, resend_count, last_resent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        parent.id,
        verifyToken,
        new Date(Date.now() + config.verification.tokenExpiryHours * 3600_000),
        (recentResult.rows[0]?.resend_count || 0) + 1,
      ]
    );

    await registerContact(normalizedEmail, parent.name || '', 'signup').catch(function (err) {
      console.error('[AUTH] resend registerContact failed for', normalizedEmail, ':', err.message);
    });
    const localeRow = await db.query(
      `SELECT COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
       FROM parent p JOIN family f ON f.id = p.family_id WHERE p.id = $1`,
      [parent.id]
    );
    const familyLocale = resolveFamilyLocale(localeRow.rows[0]?.preferred_locale);
    await sendVerificationEmail(normalizedEmail, verifyToken, familyLocale);

    res.json({ message: successMessage });
  } catch (err) {
    console.error('[AUTH] Resend verification error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────
router.post('/forgot-password', forgotPasswordLimiter, validate(ForgotPasswordSchema), async (req, res) => {
  console.log('[AUTH] POST /forgot-password — request received');
  try {
    const { email } = req.body;
    if (!email) {
      console.log('[AUTH] forgot-password: missing email in body');
      return res.status(400).json({ error: 'E-postadress krävs' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[AUTH] forgot-password: looking up account');
    // Security: always return the same message regardless of whether email exists
    const successMessage = 'Om e-postadressen finns skickar vi en länk';

    const result = await db.query(
      'SELECT id, name FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      console.log('[AUTH] forgot-password: email not found in DB (returning generic success)');
      return res.json({ message: successMessage });
    }

    const parent = result.rows[0];
    console.log('[AUTH] forgot-password: found parent', parent.id);

    // Invalidate existing tokens
    await db.query(
      'UPDATE password_reset SET used = true WHERE parent_id = $1 AND used = false',
      [parent.id]
    );

    // Create new token — 64 hex chars (crypto.randomBytes(32))
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.verification.resetTokenExpiryHours * 3600_000);
    await db.query(
      'INSERT INTO password_reset (parent_id, token, expires_at) VALUES ($1, $2, $3)',
      [parent.id, resetToken, expiresAt]
    );
    console.log('[AUTH] forgot-password: token created, expires at', expiresAt.toISOString());

    const localeRow = await db.query(
      `SELECT COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
       FROM parent p JOIN family f ON f.id = p.family_id WHERE p.id = $1`,
      [parent.id]
    );
    const familyLocale = resolveFamilyLocale(localeRow.rows[0]?.preferred_locale);

    const emailResult = await sendPasswordResetEmail(normalizedEmail, resetToken, parent.name, familyLocale);
    if (!emailResult || !emailResult.success) {
      console.error('[AUTH] Password reset email delivery FAILED:', JSON.stringify(emailResult));
    } else {
      console.log('[AUTH] Password reset email sent OK via', emailResult.provider);
    }

    res.json({
      message: successMessage,
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  } catch (err) {
    console.error('[AUTH] Forgot password error:', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/reset-password ────────────────────────
router.post('/reset-password', validate(ResetPasswordSchema), async (req, res) => {
  console.log('[AUTH] POST /reset-password — request received');
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token och lösenord krävs' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Lösenordet måste vara minst 8 tecken' });
    }

    const result = await db.query(
      'SELECT id, parent_id, expires_at, used FROM password_reset WHERE token = $1',
      [token]
    );

    const reset = result.rows[0];
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      console.log('[AUTH] reset-password: invalid/expired/used token');
      return res.status(400).json({ error: 'Ogiltig eller utgången återställningslänk. Begär en ny återställningslänk.' });
    }

    const passwordHash = await hashPassword(password);
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await client.query('UPDATE parent SET password_hash = $1 WHERE id = $2', [passwordHash, reset.parent_id]);
      await client.query('UPDATE password_reset SET used = true WHERE id = $1', [reset.id]);
      await client.query('COMMIT');
      console.log('[AUTH] reset-password: password updated for parent', reset.parent_id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Revoke ALL refresh tokens so stolen tokens can't outlive the password reset.
    // Without this, a compromised refresh token remains valid for up to 30 days.
    await revokeAllRefreshTokens({ userId: reset.parent_id, userType: 'parent' });

    res.json({ message: 'Lösenordet har ändrats! Du kan nu logga in.' });
  } catch (err) {
    console.error('[AUTH] Reset password error:', err.message, err.stack);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});
module.exports = router;
