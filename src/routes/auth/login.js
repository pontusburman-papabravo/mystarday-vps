'use strict';

/**
 * Login / session routes (E2): login, logout, me, me/preferences,
 * login-picker-children. Mounted at /api/auth in index.js.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { comparePassword } = require('../../lib/hash');
const db = require('../../lib/db');
const config = require('../../lib/config');
const { loginLimiter } = require('../../middleware/rateLimiter');
const { getParentRoles, getChildrenForParent, syncAccountType } = require('../../../db/parent-access');
const { recordLoginEvent } = require('../../lib/login-event');
const { isEmailAllowlisted, familyHasMagicViewAccess } = require('../../lib/magic-view-access');
const { requireAuth } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const {
  createRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  setAccessCookie,
} = require('../../lib/refresh-tokens');
const parentPinDb = require('../../../db/parent-pin');
const familySubscriptions = require('../../../db/family-subscriptions');
const { validate } = require('../../middleware/validate');
const { LoginSchema } = require('../../lib/schemas');

const router = express.Router();

const { parseDuration, clearAllSessionCookies } = require('./session');

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', loginLimiter, validate(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-post och lösenord krävs' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await db.query(
      'SELECT id, family_id, email, password_hash, verified, is_admin, created_at, COALESCE(locked, false) as locked, COALESCE(onboarding_completed, true) as onboarding_completed FROM parent WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    // Log attempt
    await db.query(
      'INSERT INTO login_attempt (identifier, ip_address, success) VALUES ($1, $2, $3)',
      [normalizedEmail, req.ip || 'unknown', false]
    );

    const parent = result.rows[0];
    if (!parent || !(await comparePassword(password, parent.password_hash))) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    if (parent.locked) {
      return res.status(403).json({ error: 'Ditt konto har spärrats. Kontakta administratören.' });
    }

    // Email verification with 24h grace period.
    // New registrations can log in freely for 24h without verifying.
    // After that, verification is enforced.
    if (!parent.verified) {
      const createdAt = new Date(parent.created_at);
      const gracePeriodMs = 24 * 60 * 60 * 1000;
      const graceDeadline = new Date(createdAt.getTime() + gracePeriodMs);
      const now = new Date();

      if (now > graceDeadline) {
        return res.status(403).json({
          error: 'Du måste verifiera din e-postadress för att fortsätta',
          code: 'EMAIL_VERIFICATION_REQUIRED',
          email: normalizedEmail,
        });
      }
      // Within grace period — allow login but include verification status
    }

    // Mark attempt as success
    await db.query(
      `UPDATE login_attempt SET success = true
       WHERE identifier = $1 AND created_at >= NOW() - INTERVAL '1 second'`,
      [normalizedEmail]
    );

    // Record login event for analytics
    const loginRole = parent.is_admin ? 'admin' : 'parent';
    recordLoginEvent({ userId: parent.id, role: loginRole, familyId: parent.family_id }).catch(() => {});

    const accessToken = jwt.sign(
      {
        id: parent.id,
        type: 'parent',
        familyId: parent.family_id,
        email: parent.email,
        isAdmin: parent.is_admin,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Issue 7-day refresh token (stored hashed in DB, raw value in httpOnly cookie)
    const rawRefresh = await createRefreshToken({
      userId: parent.id,
      userType: 'parent',
      familyId: parent.family_id,
    });
    setRefreshCookie(res, rawRefresh);

    // Set access token as httpOnly cookie — XSS cannot read it.
    // Cookie maxAge matches JWT TTL so they expire together.
    const expiresInSecs = typeof config.jwt.expiresIn === 'string'
      ? parseDuration(config.jwt.expiresIn)
      : config.jwt.expiresIn;
    setAccessCookie(res, accessToken, expiresInSecs);

    // Issue fresh CSRF token for the new session
    const csrfToken = generateCsrfToken(res);

    const user = {
      id: parent.id,
      email: parent.email,
      familyId: parent.family_id,
      isAdmin: parent.is_admin,
      type: 'parent',
      onboarding_completed: parent.onboarding_completed,
    };

    // expiresAt lets the frontend schedule proactive silent refresh
    // (the access token itself is in an httpOnly cookie — JS can't decode it)
    const expiresAt = Date.now() + expiresInSecs * 1000;
    res.json({ csrfToken, user, expiresAt });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/me/preferences ───────────────────────
// Update parent's preferred_view_mode. Only parents with active pedagog children can switch to 'pedagog'.
router.post('/me/preferences', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'parent') {
      return res.status(400).json({ error: 'Endast föräldrar kan uppdatera visningsläge' });
    }
    const { preferredViewMode } = req.body || {};
    if (!preferredViewMode || !['parent', 'pedagog'].includes(preferredViewMode)) {
      return res.status(400).json({ error: 'preferredViewMode must be "parent" or "pedagog"' });
    }
    if (preferredViewMode === 'pedagog') {
      const roles = await getParentRoles(req.user.id);
      if (roles.pedagogChildIds.length === 0) {
        return res.status(400).json({ error: 'NO_PEDAGOG_ACCESS' });
      }
    }
    await db.query(
      'UPDATE parent SET preferred_view_mode = $2 WHERE id = $1',
      [req.user.id, preferredViewMode]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] me/preferences error:', err);
    res.status(500).json({ error: 'Kunde inte spara inställningar' });
  }
});

// ─── POST /api/auth/me/view-mode ─────────────────────────
// Persist the parent's UI view mode ('classic' | 'magic') so the chosen
// menu/design follows the account across devices (was localStorage-only).
router.post('/me/view-mode', requireAuth, async (req, res) => {
  try {
    if (req.user.type !== 'parent') {
      return res.status(400).json({ error: 'Endast föräldrar kan uppdatera vyläge' });
    }
    const { uiViewMode } = req.body || {};
    if (!uiViewMode || !['classic', 'magic'].includes(uiViewMode)) {
      return res.status(400).json({ error: 'uiViewMode must be "classic" or "magic"' });
    }
    await db.query(
      'UPDATE parent SET ui_view_mode = $2 WHERE id = $1',
      [req.user.id, uiViewMode]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] me/view-mode error:', err);
    res.status(500).json({ error: 'Kunde inte spara vyläge' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.type === 'parent') {
      const parentResult = await db.query(
        `SELECT p.id, p.email, p.family_id, p.is_admin, p.verified, p.created_at,
                COALESCE(p.onboarding_completed, true) as onboarding_completed,
                COALESCE(p.account_type, 'family') as account_type,
                COALESCE(p.preferred_view_mode, 'parent') as preferred_view_mode,
                f.is_lifetime_free,
                p.password_hash IS NOT NULL AS has_password,
                p.apple_user_id IS NOT NULL AS has_apple_linked,
                p.apple_email
         FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE p.id = $1`,
        [req.user.id]
      );
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Användare hittades inte' });
      }

      const parent = parentResult.rows[0];

      // Read the parent's stored UI view mode defensively: the ui_view_mode
      // column is added by a migration that may not yet have run in every
      // environment. A missing column must NOT 500 /api/auth/me (that logs
      // every parent out via authGuard). Default to 'classic'.
      let uiViewMode = 'classic';
      try {
        const vmResult = await db.query(
          `SELECT ui_view_mode FROM parent WHERE id = $1`,
          [req.user.id]
        );
        if (vmResult.rows[0] && vmResult.rows[0].ui_view_mode) {
          uiViewMode = vmResult.rows[0].ui_view_mode;
        }
      } catch (_) {
        // Column not present yet — keep default 'classic'.
      }

      // Get parent roles (primary/shared vs pedagog-only)
      const roles = await getParentRoles(req.user.id);
      const hasPedagogChildren = roles.pedagogChildIds.length > 0;
      const isDualRole = roles.isDualRole;

      // Determine effective view mode — fallback to 'parent' if set to 'pedagog'
      // but no pedagog children remain (e.g., all pedagogen children unlinked)
      let effectiveViewMode = parent.preferred_view_mode;
      if (effectiveViewMode === 'pedagog' && roles.pedagogChildIds.length === 0) {
        effectiveViewMode = 'parent';
        // Sync account_type since pedagogen-only children are gone
        if (parent.account_type === 'educator') {
          await syncAccountType(req.user.id);
        }
      }

      // Get children via getChildrenForParent (revoked_at filtering applied there)
      const children = await getChildrenForParent(req.user.id, { allowedRoles: ['primary', 'shared'] });
      // Strip sensitive fields before sending to client
      for (const child of children) {
        delete child.pin;
        delete child.pin_fingerprint;
        delete child.pin_hint;
        delete child.pin_is_set;
      }

      return res.json({
        ...parent,
        type: 'parent',
        ui_view_mode: uiViewMode,
        isAdmin: !!parent.is_admin,
        magic_view_enabled: isEmailAllowlisted(parent.email),
        account_type: parent.account_type,
        preferred_view_mode: effectiveViewMode,
        hasPedagogChildren,
        isDualRole,
        is_lifetime_free: parent.is_lifetime_free,
        accountAuth: {
          hasPassword: parent.has_password,
          hasAppleLinked: parent.has_apple_linked,
          email: parent.email,
          appleEmail: parent.apple_email || null,
          canUnlinkApple: parent.has_password && parent.has_apple_linked,
        },
        children,
      });
    }

    if (req.user.type === 'child') {
      const childResult = await db.query(
        `SELECT id, name, emoji, avatar_url, family_id, username, view_mode, timezone, birthday, created_at
         FROM child WHERE id = $1`,
        [req.user.id]
      );
      if (childResult.rows.length === 0) {
        return res.status(404).json({ error: 'Användare hittades inte' });
      }

      const child = childResult.rows[0];
      const magicViewEnabled = await familyHasMagicViewAccess(child.family_id);

      return res.json({ ...child, type: 'child', magic_view_enabled: magicViewEnabled });
    }

    res.status(400).json({ error: 'Okänd användartyp' });
  } catch (err) {
    console.error('[AUTH] Me error:', err);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── GET /api/auth/login-picker-children ───────────────────
// Barnväljare: barn i familjen (namn + avatar) utan att aktivera vuxensession i klienten.
// Response: { hasSession, children[], parent? } — parent enables add-child onboarding without full re-login.
router.get('/login-picker-children', async (req, res) => {
  try {
    const { resolveParentIdForLoginPicker } = require('../../middleware/auth');
    const parentId = resolveParentIdForLoginPicker(req);
    if (!parentId) {
      return res.json({ hasSession: false, children: [] });
    }

    const parentResult = await db.query(
      `SELECT id, email, family_id, is_admin, onboarding_completed
       FROM parent WHERE id = $1`,
      [parentId]
    );
    const parentRow = parentResult.rows[0];
    if (!parentRow) {
      return res.json({ hasSession: false, children: [] });
    }

    const children = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
    res.json({
      hasSession: true,
      children: children.map((c) => ({
        username: c.username,
        name: c.name,
        emoji: c.emoji || '⭐',
        avatar_url: c.avatar_url || null,
        familyId: c.family_id || null,
      })),
      parent: {
        id: parentRow.id,
        email: parentRow.email || null,
        familyId: parentRow.family_id,
        isAdmin: parentRow.is_admin || false,
        type: 'parent',
        onboarding_completed: parentRow.onboarding_completed,
      },
    });
  } catch (err) {
    console.error('[AUTH] login-picker-children error:', err.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen senare.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────
// Revoke the refresh token and clear cookies.
// When a child logs out, if a parent session was saved (via stjarndag_parent_session),
// restore it so the parent remains logged in.
// Body { switchChild: true } — end child session only; keep parent session cookie for barnväljare.

router.post('/logout', async (req, res) => {
  try {
    const switchChild = req.body?.switchChild === true;
    const raw = req.cookies?.refresh_token;
    const accessTokenStr = req.cookies?.access_token;
    const decoded = accessTokenStr ? jwt.decode(accessTokenStr) : null;

    if (raw) {
      await revokeRefreshToken(raw);
    }
    clearAllSessionCookies(res);

    // ── Byt barn: end child JWT only; keep stjarndag_parent_session for barnväljare ──
    if (switchChild && decoded?.type === 'child') {
      return res.json({ message: 'Utloggad', switchChild: true });
    }

    // ── Restore parent session only if CHILD is logging out ────────────────
    if (decoded?.type !== 'child') {
      res.clearCookie('stjarndag_parent_session', { path: '/' });
      return res.json({ message: 'Utloggad' });
    }

    const parentSessionCookie = req.cookies?.stjarndag_parent_session;
    if (parentSessionCookie) {
      let session;
      try {
        session = JSON.parse(Buffer.from(parentSessionCookie, 'base64').toString('utf8'));
      } catch {
        // Invalid cookie — just clear it
        res.clearCookie('stjarndag_parent_session', { path: '/' });
        return res.json({ message: 'Utloggad' });
      }

      if (session?.access_token && session?.refresh_token) {
        // Require PIN if the saved parent account has one set.
        try {
          let savedParentId = null;
          try {
            const parentDecoded = jwt.decode(session.access_token);
            if (parentDecoded?.type === 'parent') savedParentId = parentDecoded.id;
          } catch { /* fall through */ }

          const needsPin = savedParentId
            ? await parentPinDb.parentHasPin(savedParentId)
            : await parentPinDb.familyAnyParentHasPin(decoded.familyId);

          if (needsPin) {
            return res.json({ message: 'Utloggad', needsParentPin: true });
          }
        } catch (err) {
          console.error('[AUTH] Logout: parent-pin check failed:', err.message);
          // On error, fall through to auto-restore (favor usability)
        }

        // No parent PIN → auto-restore parent session
        res.cookie('access_token', session.access_token, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
          path: '/',
        });
        res.cookie('refresh_token', session.refresh_token, {
          httpOnly: true,
          secure: config.cookieSecure,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/api/auth',
        });
        res.clearCookie('stjarndag_parent_session', { path: '/' });
        return res.json({ message: 'Utloggad', sessionRestored: true });
      }
    }

    res.clearCookie('stjarndag_parent_session', { path: '/' });
    res.json({ message: 'Utloggad' });
  } catch (err) {
    console.error('[AUTH] Logout error:', err);
    clearAllSessionCookies(res);
    res.clearCookie('stjarndag_parent_session', { path: '/' });
    res.json({ message: 'Utloggad' });
  }
});

module.exports = router;
