'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../../lib/db');
const { hashPassword, comparePassword } = require('../../lib/hash');
const { requireParent } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { SetPasswordSchema } = require('./schemas');
const { getAccountAuth } = require('./helpers');

const router = express.Router();

// ─── POST /api/account/link-apple ──────────────────────
// Link Apple ID to current account (from Settings, iOS only).
// Auth: requireParent + CSRF. Body: { idToken }.
router.post('/link-apple', requireParent, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken krävs' });
    }

    // Verify Apple JWT
    const { verifyAppleIdToken } = require('../../lib/apple-auth');
    const appleUser = await verifyAppleIdToken(idToken);
    if (!appleUser) {
      return res.status(401).json({ error: 'Ogiltig Apple-identitetstoken' });
    }

    const { sub: appleUserId, email: appleEmail } = appleUser;
    const parentId = req.user.id;

    // Check if already linked on THIS account
    const current = await db.query(
      'SELECT apple_user_id FROM parent WHERE id = $1', [parentId]
    );
    if (current.rows[0]?.apple_user_id) {
      return res.status(409).json({ error: 'Apple-konto är redan kopplat till detta konto' });
    }

    // Check if apple_user_id belongs to ANOTHER account
    const existing = await db.query(
      'SELECT id FROM parent WHERE apple_user_id = $1', [appleUserId]
    );
    if (existing.rows.length > 0 && existing.rows[0].id !== parentId) {
      return res.status(409).json({ error: 'Detta Apple-konto är redan kopplat till ett annat konto' });
    }

    // Link it
    await db.query(
      'UPDATE parent SET apple_user_id = $2, apple_email = $3 WHERE id = $1',
      [parentId, appleUserId, appleEmail || null]
    );

    const accountAuth = await getAccountAuth(parentId);
    res.json({
      message: 'Apple-konto länkat!',
      accountAuth,
    });
  } catch (err) {
    console.error('[ACCOUNT] link-apple error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/account/unlink-apple ─────────────────
// Unlink Apple ID from current account. Requires password.
// Auth: requireParent + CSRF. Body: { password }.
router.delete('/unlink-apple', requireParent, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Lösenord krävs för att koppla bort Apple' });
    }

    const parentId = req.user.id;

    // Verify current parent has a password
    const parentRow = await db.query(
      'SELECT password_hash, password_hash IS NOT NULL AS has_password, apple_user_id FROM parent WHERE id = $1',
      [parentId]
    );
    if (!parentRow.rows.length) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    const row = parentRow.rows[0];
    if (!row.has_password) {
      return res.status(400).json({ error: 'Sätt ett lösenord innan du kopplar bort Apple' });
    }

    // Verify password
    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Felaktigt lösenord' });
    }

    await db.query(
      'UPDATE parent SET apple_user_id = NULL, apple_email = NULL WHERE id = $1',
      [parentId]
    );

    const accountAuth = await getAccountAuth(parentId);
    res.json({
      message: 'Apple-konto bortkopplat',
      accountAuth,
    });
  } catch (err) {
    console.error('[ACCOUNT] unlink-apple error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/link-google ─────────────────────
// Link Google ID to current account (from Settings).
router.post('/link-google', requireParent, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken krävs' });
    }

    const { verifyGoogleIdToken } = require('../../lib/google-auth');
    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      console.error('[ACCOUNT] Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const googleUserId = payload.sub;
    if (!googleUserId) {
      return res.status(401).json({ error: 'Ogiltig Google-identitetstoken' });
    }

    const parentId = req.user.id;

    const current = await db.query(
      'SELECT google_user_id FROM parent WHERE id = $1', [parentId]
    );
    if (current.rows[0]?.google_user_id) {
      return res.status(409).json({ error: 'Google-konto är redan kopplat till detta konto' });
    }

    const existing = await db.query(
      'SELECT id FROM parent WHERE google_user_id = $1', [googleUserId]
    );
    if (existing.rows.length > 0 && existing.rows[0].id !== parentId) {
      return res.status(409).json({ error: 'Detta Google-konto är redan kopplat till ett annat konto' });
    }

    await db.query(
      'UPDATE parent SET google_user_id = $2 WHERE id = $1',
      [parentId, googleUserId]
    );

    const accountAuth = await getAccountAuth(parentId);
    res.json({
      message: 'Google-konto länkat!',
      accountAuth,
    });
  } catch (err) {
    console.error('[ACCOUNT] link-google error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── DELETE /api/account/unlink-google ─────────────────
router.delete('/unlink-google', requireParent, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Lösenord krävs för att koppla bort Google' });
    }

    const parentId = req.user.id;
    const parentRow = await db.query(
      'SELECT password_hash, password_hash IS NOT NULL AS has_password, google_user_id FROM parent WHERE id = $1',
      [parentId]
    );
    if (!parentRow.rows.length) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    const row = parentRow.rows[0];
    if (!row.has_password) {
      return res.status(400).json({ error: 'Sätt ett lösenord innan du kopplar bort Google' });
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Felaktigt lösenord' });
    }

    await db.query(
      'UPDATE parent SET google_user_id = NULL WHERE id = $1',
      [parentId]
    );

    const accountAuth = await getAccountAuth(parentId);
    res.json({
      message: 'Google-konto bortkopplat',
      accountAuth,
    });
  } catch (err) {
    console.error('[ACCOUNT] unlink-google error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/change-email/request ────────────
// Request email change — sends verification link to new address.
// Auth: requireParent + CSRF. Body: { newEmail, password }.
router.post('/change-email/request', requireParent, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ error: 'Ny e-postadress och lösenord krävs' });
    }
    const normalizedEmail = newEmail.toLowerCase().trim();
    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }

    const parentId = req.user.id;

    // Require password (Apple-only without password → can't change email)
    const parentRow = await db.query(
      'SELECT password_hash IS NOT NULL AS has_password, email FROM parent WHERE id = $1',
      [parentId]
    );
    if (!parentRow.rows.length) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    if (!parentRow.rows[0].has_password) {
      return res.status(400).json({ error: 'Sätt ett lösenord först innan du kan byta e-postadress' });
    }

    // Verify password
    const valid = await comparePassword(password, parentRow.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Felaktigt lösenord' });
    }

    // Check email is not already taken
    const existing = await db.query(
      'SELECT id FROM parent WHERE LOWER(email) = $1 AND id != $2',
      [normalizedEmail, parentId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'E-postadressen är redan registrerad på ett annat konto' });
    }

    // Invalidate all existing tokens for this parent
    await db.query(
      'UPDATE email_change_token SET used_at = NOW() WHERE parent_id = $1 AND used_at IS NULL',
      [parentId]
    );

    // Create new token (64 hex = 32 bytes)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await db.query(
      'INSERT INTO email_change_token (parent_id, new_email, token, expires_at) VALUES ($1, $2, $3, $4)',
      [parentId, normalizedEmail, token, expiresAt]
    );

    // Send verification email to NEW address
    const baseUrl = process.env.APP_BASE_URL || 'https://mystarday.se'; // pragma: allowlist secret
    const confirmUrl = `${baseUrl}/verify-email-change?token=${token}`;
    const { sendEmail } = require('../../lib/email');
    sendEmail({
      to: normalizedEmail,
      subject: 'Bekräfta din nya e-postadress — Min Stjärndag', // pragma: allowlist secret
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1B2340;">Byt e-postadress ⭐</h2>
          <p>Klicka på knappen nedan för att bekräfta din nya e-postadress:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${confirmUrl}" style="display: inline-block; background: #F5A623; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Bekräfta e-post</a>
          </div>
          <p style="color: #5A6178; font-size: 14px;">Länken är giltig i 24 timmar. Ignorera detta mail om du inte begärde en e-poständring.</p>
        </div>
      `,
    }).catch(err => {
      console.warn('[ACCOUNT] Email change verification mail failed:', err.message);
    });

    res.json({
      message: `Vi har skickat en bekräftelselänk till ${normalizedEmail}`,
      pendingEmail: normalizedEmail,
    });
  } catch (err) {
    console.error('[ACCOUNT] change-email/request error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/change-email/confirm ────────────
// Confirm email change using token from the email link.
// CSRF EXEMPT — user is not logged in when clicking the email link.
router.post('/change-email/confirm', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token krävs' });
    }

    // Validate token: not expired, not used
    const tokenRow = await db.query(
      'SELECT id, parent_id, new_email, expires_at, used_at FROM email_change_token WHERE token = $1',
      [token]
    );
    if (!tokenRow.rows.length) {
      return res.status(400).json({ error: 'Ogiltig eller utgången länk. Begär en ny ändring i Inställningar.' });
    }
    const tk = tokenRow.rows[0];
    if (tk.used_at) {
      return res.status(400).json({ error: 'Länken har redan använts. Begär en ny ändring i Inställningar.' });
    }
    if (new Date(tk.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Länken har gått ut. Begär en ny ändring i Inställningar.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE parent SET email = $1 WHERE id = $2', [tk.new_email, tk.parent_id]);
      await client.query('UPDATE email_change_token SET used_at = NOW() WHERE id = $1', [tk.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: 'E-postadressen har uppdaterats! Du kan nu logga in med din nya adress.',
    });
  } catch (err) {
    console.error('[ACCOUNT] change-email/confirm error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/account/set-password ────────────────────
// Set initial password (for Apple-only accounts). Only works when password_hash IS NULL.
// Auth: requireParent + CSRF (via app-level csrfProtect on /api/*).
router.post('/set-password', requireParent, validate(SetPasswordSchema), async (req, res) => {
  try {
    const parentId = req.user.id;

    // Check current password state
    const existing = await db.query(
      'SELECT password_hash IS NOT NULL AS has_password, email, apple_user_id, apple_email, google_user_id FROM parent WHERE id = $1',
      [parentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }
    const row = existing.rows[0];

    if (row.has_password) {
      return res.status(409).json({ error: 'Lösenord finns redan. Använd "Byt lösenord" för att uppdatera.' });
    }

    const { newPassword } = req.body;
    const hashed = await hashPassword(newPassword);

    await db.query(
      'UPDATE parent SET password_hash = $2, updated_at = NOW() WHERE id = $1',
      [parentId, hashed]
    );

    const accountAuth = {
      hasPassword: true,
      hasAppleLinked: !!row.apple_user_id,
      hasGoogleLinked: !!row.google_user_id,
      email: row.email,
      appleEmail: row.apple_email || null,
      canUnlinkApple: !!row.apple_user_id,
      canUnlinkGoogle: !!row.google_user_id,
    };

    res.json({
      message: 'Lösenordet har satts. Du kan nu logga in med e-post och lösenord.',
      accountAuth,
    });
  } catch (err) {
    console.error('[ACCOUNT] set-password error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

module.exports = router;
