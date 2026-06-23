'use strict';

/**
 * Child login route (E2). POST /api/auth/child-login.
 * Name + PIN with pin_lockout exponential backoff + parent notification.
 * Mounted at /api/auth in index.js.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { comparePassword } = require('../../lib/hash');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { childLoginLimiter } = require('../../middleware/rateLimiter');
const { generateCsrfToken } = require('../../middleware/csrf');
const {
  createRefreshToken,
  setRefreshCookie,
  setAccessCookie,
} = require('../../lib/refresh-tokens');
const pinLockout = require('../../../db/pin-lockout');
const { sendPinWarningEmail } = require('../../lib/email');
const { createSystemMessage } = require('../../../db/system-messages');
const { broadcast } = require('../../lib/sse-broadcast');
const { validate } = require('../../middleware/validate');
const { ChildLoginSchema } = require('../../lib/schemas');
const { parseDuration } = require('./session');

const router = express.Router();

// ─── POST /api/auth/child-login ───────────────────────────
// Requires BOTH name + PIN. Tracks attempts in pin_lockout table with
// exponential backoff (5 attempts → 1min, 8 → 5min, 11 → 15min).
// Notifies parent at 3rd failed attempt (in-app + email, with email cooldown).
router.post('/child-login', childLoginLimiter, validate(ChildLoginSchema), async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Namn krävs' });
    }
    if (!pin) {
      return res.status(400).json({ error: 'PIN-kod krävs' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN-koden måste vara 4 siffror' });
    }

    const normalizedInput = username.toLowerCase().trim();
    const clientIp = req.ip || 'unknown';

    // Find child — username match first, then display name
    const childResult = await db.query(
      'SELECT id, family_id, name, emoji, username, pin, avatar_url FROM child WHERE LOWER(username) = $1',
      [normalizedInput]
    );
    let child = childResult.rows[0];

    if (!child) {
      const nameResult = await db.query(
        'SELECT id, family_id, name, emoji, username, pin, avatar_url FROM child WHERE LOWER(name) = $1',
        [normalizedInput]
      );
      if (nameResult.rows.length === 1) {
        child = nameResult.rows[0];
      } else if (nameResult.rows.length > 1) {
        // Multiple children with same display name — PIN disambiguates
        for (const candidate of nameResult.rows) {
          if (await comparePassword(pin, candidate.pin)) {
            child = candidate;
            break;
          }
        }
        if (!child) {
          // Can't determine which child — record generic failure and return error
          // (no child_id to attach lockout to in this edge case)
          await db.query(
            'INSERT INTO login_attempt (identifier, ip_address, success) VALUES ($1, $2, false)',
            [normalizedInput, clientIp]
          );
          return res.status(401).json({ error: 'Felaktigt namn eller PIN-kod', attempts_remaining: null });
        }
      }
    }

    // If child not found at all — return generic error (don't reveal child existence)
    if (!child) {
      await db.query(
        'INSERT INTO login_attempt (identifier, ip_address, success) VALUES ($1, $2, false)',
        [normalizedInput, clientIp]
      );
      return res.status(401).json({ error: 'Felaktigt namn eller PIN-kod', attempts_remaining: null });
    }

    // ── Check existing lockout (DB-based, child_id scoped) ──────────────
    const lockoutStatus = await pinLockout.checkLockout(child.id);
    if (lockoutStatus.locked) {
      const minutes = lockoutStatus.lockout_minutes;
      const minuteText = minutes === 1 ? 'minut' : 'minuter';
      console.warn(
        `[PIN] Blocked attempt during lockout — child=${child.id} ip=${clientIp} ` +
        `locked_until=${lockoutStatus.locked_until}`
      );
      return res
        .set('Retry-After', String(lockoutStatus.retry_after_seconds))
        .status(429)
        .json({
          error: `Vänta en liten stund ⏰ Du kan försöka igen om ${minutes} ${minuteText}`,
          locked: true,
          retry_after: lockoutStatus.retry_after_seconds,
          locked_until: lockoutStatus.locked_until,
        });
    }

    // ── Validate PIN ──────────────────────────────────────────────────────
    const pinCorrect = await comparePassword(pin, child.pin);
    if (!pinCorrect) {
      // Record failure and get updated lockout state
      const updated = await pinLockout.recordFailedAttempt(child.id, clientIp);
      const attemptCount = updated.attempt_count;
      const attemptsRemaining = updated.attempts_remaining;

      // Also record in legacy login_attempt table
      await db.query(
        'INSERT INTO login_attempt (identifier, ip_address, success) VALUES ($1, $2, false)',
        [normalizedInput, clientIp]
      );

      // Audit
      pinLockout.auditLog(child.id, child.family_id, 'attempt_failed', clientIp, {
        attempt_count: attemptCount,
        lockout_minutes: updated.lockout_minutes,
      }).catch(() => {});

      // ── Parent notification at 3rd failed attempt ──────────────────────
      if (attemptCount === 3) {
        try {
          // In-app notification via system_messages (visible in parent dashboard)
          const msg = `${child.name} har försökt logga in med fel PIN-kod 3 gånger (${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })})`;
          await createSystemMessage(child.family_id, msg);
          await pinLockout.recordNotification(child.id, child.family_id, 'in_app');

          // Broadcast to any connected parents via SSE
          broadcast(child.family_id, 'PIN_FAILED_WARNING', { childId: child.id, childName: child.name, attemptCount });

          // Email cooldown check — max 1 email per child per N minutes
          const cooldownActive = await pinLockout.isEmailCooldownActive(child.id);
          if (!cooldownActive) {
            const parentResult = await db.query(
              `SELECT p.email FROM parent_child pc
               JOIN parent p ON p.id = pc.parent_id
               WHERE pc.child_id = $1
               ORDER BY pc.role = 'primary' DESC
               LIMIT 1`,
              [child.id]
            );
            if (parentResult.rows[0]?.email) {
              if (process.env.EMAIL_ENABLED !== 'false') {
                sendPinWarningEmail(parentResult.rows[0].email, child.name).catch(() => {});
              }
              await pinLockout.recordNotification(child.id, child.family_id, 'email');
              pinLockout.auditLog(child.id, child.family_id, 'parent_notified', clientIp, { channel: 'email' }).catch(() => {});
            }
          } else {
            pinLockout.auditLog(child.id, child.family_id, 'email_suppressed', clientIp, { reason: 'cooldown_active' }).catch(() => {});
          }
        } catch (notifyErr) {
          // Non-fatal — notification failure must not block the auth response
          console.error('[PIN] Parent notification error:', notifyErr);
        }
      }

      // ── New lockout triggered? ────────────────────────────────────────
      if (updated.lockout_minutes > 0) {
        const minutes = updated.lockout_minutes;
        const minuteText = minutes === 1 ? 'minut' : 'minuter';
        console.warn(
          `[PIN] Lockout triggered — child=${child.id} ip=${clientIp} ` +
          `attempts=${attemptCount} lockout=${minutes}min`
        );
        pinLockout.auditLog(child.id, child.family_id, 'lockout', clientIp, {
          lockout_minutes: minutes,
          attempt_count: attemptCount,
        }).catch(() => {});
        return res
          .set('Retry-After', String(minutes * 60))
          .status(429)
          .json({
            error: `Vänta en liten stund ⏰ Du kan försöka igen om ${minutes} ${minuteText}`,
            locked: true,
            retry_after: minutes * 60,
            locked_until: updated.locked_until,
          });
      }

      // ── Soft warning — attempts remaining ────────────────────────────
      let warningMessage;
      if (attemptsRemaining === 1) {
        warningMessage = `Nästan slut på försök! 1 försök kvar — fråga mamma eller pappa om du behöver hjälp 💛`;
      } else if (attemptsRemaining <= 2) {
        warningMessage = `Hmm, det var inte rätt PIN 🤔 Du har ${attemptsRemaining} försök kvar`;
      } else {
        warningMessage = `Felaktigt namn eller PIN-kod`;
      }

      return res.status(401).json({
        error: warningMessage,
        attempts_remaining: attemptsRemaining,
        attempt_count: attemptCount,
        max_attempts: pinLockout.MAX_ATTEMPTS,
      });
    }

    // ── Successful login ──────────────────────────────────────────────────
    await pinLockout.recordSuccessfulLogin(child.id);
    await db.query(
      'INSERT INTO login_attempt (identifier, ip_address, success) VALUES ($1, $2, true)',
      [normalizedInput, clientIp]
    );
    pinLockout.auditLog(child.id, child.family_id, 'attempt_success', clientIp, {}).catch(() => {});

    // Record login event for analytics
    db.query(
      'INSERT INTO login_event (user_id, role, family_id) VALUES ($1, $2, $3)',
      [child.id, 'child', child.family_id]
    ).catch(() => {});

    const accessToken = jwt.sign(
      { id: child.id, type: 'child', familyId: child.family_id, username: child.username, name: child.name },
      config.jwt.secret,
      { expiresIn: config.jwt.childExpiresIn }
    );

    // Issue 7-day refresh token — same as parent login.
    // Without this, child sessions cannot silently refresh and expire permanently
    // when the access token dies (8h for children).
    const rawRefresh = await createRefreshToken({
      userId: child.id,
      userType: 'child',
      familyId: child.family_id,
    });

    // ── Save parent session before overwriting cookies ─────────────────────
    // When a parent logs in as a child, their httpOnly tokens get overwritten.
    // Save them now so restoreParentSession middleware can restore the parent
    // view when the user navigates back to parent-facing pages.
    const parentAccessToken = req.cookies?.access_token;
    const parentRefreshToken = req.cookies?.refresh_token;
    if (parentAccessToken && parentRefreshToken) {
      try {
        const parentPayload = JSON.stringify({
          access_token: parentAccessToken,
          refresh_token: parentRefreshToken,
        });
        const encoded = Buffer.from(parentPayload).toString('base64');
        const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days, same as refresh token
        res.cookie('stjarndag_parent_session', encoded, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: maxAgeMs,
          path: '/',
        });
      } catch (saveErr) {
        // Non-fatal: parent session save failure must not block child login
        console.error('[AUTH] Parent session save failed:', saveErr.message);
      }
    }

    setRefreshCookie(res, rawRefresh);

    // Set access token as httpOnly cookie — XSS cannot read it.
    const expiresInSecs = parseDuration(config.jwt.childExpiresIn);
    setAccessCookie(res, accessToken, expiresInSecs);

    const csrfToken = generateCsrfToken(res);
    const user = {
      id: child.id,
      name: child.name,
      emoji: child.emoji,
      avatar_url: child.avatar_url || null,
      familyId: child.family_id,
      username: child.username,
      type: 'child',
    };
    // expiresAt lets the frontend schedule proactive silent refresh
    const expiresAt = Date.now() + expiresInSecs * 1000;
    return res.json({ csrfToken, user, expiresAt });

  } catch (err) {
    console.error('[AUTH] Child login error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});
module.exports = router;
