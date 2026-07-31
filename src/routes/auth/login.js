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
const { mapChildForFamilyApi, mapParentForFamilyApi, avatarApiFields } = require('../../lib/avatar-api');
const { recordLoginEvent } = require('../../lib/login-event');
const { isEmailAllowlisted, familyHasMagicViewAccess } = require('../../lib/magic-view-access');
const { isEnglishChildExperienceEnabled } = require('../../lib/i18n-flags');
const { resolveChildUiLocale } = require('../../lib/child-ui-locale');
const { requireAuth, verifyToken } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const {
  createRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenForSession,
  setRefreshCookie,
  setAccessCookie,
  clearAccessCookie,
  clearRefreshCookie,
  lookupRefreshTokenRow,
} = require('../../lib/refresh-tokens');
const parentPinDb = require('../../../db/parent-pin');
const familySubscriptions = require('../../../db/family-subscriptions');
const { validate } = require('../../middleware/validate');
const { LoginSchema } = require('../../lib/schemas');
const { applyLoginLocaleChoice } = require('../../lib/apply-login-locale');
const { resolveAuthApiLocale, authApiMessage } = require('../../lib/auth-api-messages');

const router = express.Router();

const { parseDuration, clearAllSessionCookies } = require('./session');

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', loginLimiter, validate(LoginSchema), async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    const { email, password, preferred_locale: preferredLocaleRaw, language } = req.body;
    if (!email || !password) {
      const msg = authApiMessage(lang, 'errors.emailAndPasswordRequired');
      return res.status(400).json({ code: 'EMAIL_PASSWORD_REQUIRED', error: msg, message: msg });
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
      const msg = authApiMessage(lang, 'errors.invalidCredentials');
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: msg, message: msg });
    }

    if (parent.locked) {
      const msg = authApiMessage(lang, 'errors.accountBlocked');
      return res.status(403).json({ code: 'ACCOUNT_BLOCKED', error: msg, message: msg });
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
        const msg = authApiMessage(lang, 'errors.emailVerificationRequired');
        return res.status(403).json({
          code: 'EMAIL_VERIFICATION_REQUIRED',
          error: msg,
          message: msg,
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

    const preferred_locale = await applyLoginLocaleChoice({
      familyId: parent.family_id,
      explicitLocale: preferredLocaleRaw,
      language,
    });

    const user = {
      id: parent.id,
      email: parent.email,
      familyId: parent.family_id,
      isAdmin: parent.is_admin,
      type: 'parent',
      onboarding_completed: parent.onboarding_completed,
      preferred_locale,
    };

    // expiresAt lets the frontend schedule proactive silent refresh
    // (the access token itself is in an httpOnly cookie — JS can't decode it)
    const expiresAt = Date.now() + expiresInSecs * 1000;
    res.json({ csrfToken, user, expiresAt });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    const msg = authApiMessage(lang, 'errors.serverError');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── POST /api/auth/me/preferences ───────────────────────
// Update parent's preferred_view_mode. Only parents with active pedagog children can switch to 'pedagog'.
router.post('/me/preferences', requireAuth, async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    if (req.user.type !== 'parent') {
      const msg = authApiMessage(lang, 'errors.parentOnlyViewMode');
      return res.status(400).json({ code: 'PARENT_ONLY', error: msg, message: msg });
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
    const msg = authApiMessage(lang, 'errors.preferencesSaveFailed');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── POST /api/auth/me/view-mode ─────────────────────────
// Persist the parent's UI view mode ('classic' | 'magic') so the chosen
// menu/design follows the account across devices (was localStorage-only).
router.post('/me/view-mode', requireAuth, async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    if (req.user.type !== 'parent') {
      const msg = authApiMessage(lang, 'errors.parentOnlyUiViewMode');
      return res.status(400).json({ code: 'PARENT_ONLY', error: msg, message: msg });
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
    const msg = authApiMessage(lang, 'errors.uiViewModeSaveFailed');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── POST /api/auth/me/theme ─────────────────────────────
// Persist the parent's background theme ('dark' | 'light') so the choice
// follows the account across devices.
router.post('/me/theme', requireAuth, async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    if (req.user.type !== 'parent') {
      const msg = authApiMessage(lang, 'errors.parentOnlyTheme');
      return res.status(400).json({ code: 'PARENT_ONLY', error: msg, message: msg });
    }
    const { theme } = req.body || {};
    if (!theme || !['dark', 'light'].includes(theme)) {
      return res.status(400).json({ error: 'theme must be "dark" or "light"' });
    }
    try {
      await db.query(
        'UPDATE parent SET theme_preference = $2 WHERE id = $1',
        [req.user.id, theme]
      );
    } catch (_) {
      // Column may not exist yet (migration pending) — accept silently so the
      // client's localStorage choice still applies; it will persist post-migration.
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] me/theme error:', err);
    const msg = authApiMessage(lang, 'errors.themeSaveFailed');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    if (req.user.type === 'parent') {
      const parentResult = await db.query(
        `SELECT p.id, p.email, p.name, p.family_id, p.is_admin, p.verified, p.created_at,
                p.avatar_storage_key, p.avatar_updated_at,
                COALESCE(p.onboarding_completed, true) as onboarding_completed,
                COALESCE(p.account_type, 'family') as account_type,
                COALESCE(p.preferred_view_mode, 'parent') as preferred_view_mode,
                f.is_lifetime_free,
                COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale,
                p.password_hash IS NOT NULL AS has_password,
                p.apple_user_id IS NOT NULL AS has_apple_linked,
                p.google_user_id IS NOT NULL AS has_google_linked,
                p.apple_email
         FROM parent p
         JOIN family f ON f.id = p.family_id
         WHERE p.id = $1`,
        [req.user.id]
      );
      if (parentResult.rows.length === 0) {
        const msg = authApiMessage(lang, 'errors.userNotFound');
        return res.status(404).json({ code: 'USER_NOT_FOUND', error: msg, message: msg });
      }

      const parent = parentResult.rows[0];

      // Read the parent's stored UI view mode + theme defensively: these
      // columns are added by migrations that may not yet have run in every
      // environment. A missing column must NOT 500 /api/auth/me (that logs
      // every parent out via authGuard). Defaults: view 'classic', theme 'dark'.
      let uiViewMode = 'classic';
      let themePreference = 'dark';
      try {
        const prefResult = await db.query(
          `SELECT ui_view_mode, theme_preference FROM parent WHERE id = $1`,
          [req.user.id]
        );
        const prefs = prefResult.rows[0];
        if (prefs) {
          if (prefs.ui_view_mode) uiViewMode = prefs.ui_view_mode;
          if (prefs.theme_preference) themePreference = prefs.theme_preference;
        }
      } catch (_) {
        // Columns not present yet — keep defaults.
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
      const childrenPublic = children.map((c) => mapChildForFamilyApi(c));

      const parentPublic = mapParentForFamilyApi(parent);

      return res.json({
        ...parentPublic,
        family_id: parent.family_id,
        preferred_locale: parent.preferred_locale || 'sv-SE',
        is_admin: parent.is_admin,
        verified: parent.verified,
        created_at: parent.created_at,
        onboarding_completed: parent.onboarding_completed,
        type: 'parent',
        ui_view_mode: uiViewMode,
        theme_preference: themePreference,
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
          hasGoogleLinked: parent.has_google_linked,
          email: parent.email,
          appleEmail: parent.apple_email || null,
          canUnlinkApple: parent.has_password && parent.has_apple_linked,
          canUnlinkGoogle: parent.has_password && parent.has_google_linked,
        },
        children: childrenPublic,
      });
    }

    if (req.user.type === 'child') {
      const childResult = await db.query(
        `SELECT c.id, c.name, c.emoji, c.avatar_storage_key, c.avatar_updated_at, c.family_id,
                c.username, c.view_mode, c.timezone, c.birthday, c.created_at,
                COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
         FROM child c
         JOIN family f ON f.id = c.family_id
         WHERE c.id = $1`,
        [req.user.id]
      );
      if (childResult.rows.length === 0) {
        const msg = authApiMessage(lang, 'errors.userNotFound');
        return res.status(404).json({ code: 'USER_NOT_FOUND', error: msg, message: msg });
      }

      const child = childResult.rows[0];
      const magicViewEnabled = await familyHasMagicViewAccess(child.family_id);
      const englishChild = await isEnglishChildExperienceEnabled(child.family_id);
      const childUiLocale = resolveChildUiLocale(child.preferred_locale, englishChild);

      return res.json({
        ...mapChildForFamilyApi(child),
        family_id: child.family_id,
        username: child.username,
        view_mode: child.view_mode,
        timezone: child.timezone,
        birthday: child.birthday,
        created_at: child.created_at,
        type: 'child',
        magic_view_enabled: magicViewEnabled,
        preferred_locale: child.preferred_locale,
        english_child_experience_enabled: englishChild,
        child_ui_locale: childUiLocale,
      });
    }

    const msg = authApiMessage(lang, 'errors.unknownUserType');
    res.status(400).json({ code: 'UNKNOWN_USER_TYPE', error: msg, message: msg });
  } catch (err) {
    console.error('[AUTH] Me error:', err);
    const msg = authApiMessage(lang, 'errors.serverError');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── GET /api/auth/login-picker-children ───────────────────
// Child picker: family children (name + avatar) without activating parent session in the client.
// Response: { hasSession, children[], parent? } — parent enables add-child onboarding without full re-login.
router.get('/login-picker-children', async (req, res) => {
  const lang = resolveAuthApiLocale(req);
  try {
    const { resolveParentIdForLoginPicker } = require('../../middleware/auth');
    const parentId = await resolveParentIdForLoginPicker(req, res);
    if (!parentId) {
      return res.json({ hasSession: false, children: [] });
    }

    const parentResult = await db.query(
      `SELECT p.id, p.email, p.family_id, p.is_admin, p.onboarding_completed,
              COALESCE(f.preferred_locale, 'sv-SE') AS preferred_locale
       FROM parent p
       JOIN family f ON f.id = p.family_id
       WHERE p.id = $1`,
      [parentId]
    );
    const parentRow = parentResult.rows[0];
    if (!parentRow) {
      return res.json({ hasSession: false, children: [] });
    }

    const children = await getChildrenForParent(parentId, { allowedRoles: ['primary', 'shared'] });
    const englishChild = await isEnglishChildExperienceEnabled(parentRow.family_id);
    const childUiLocale = resolveChildUiLocale(parentRow.preferred_locale, englishChild);
    res.json({
      hasSession: true,
      preferred_locale: parentRow.preferred_locale,
      english_child_experience_enabled: englishChild,
      child_ui_locale: childUiLocale,
      children: children.map((c) => ({
        username: c.username,
        name: c.name,
        emoji: c.emoji || '⭐',
        familyId: c.family_id || null,
        ...avatarApiFields(c, 'child'),
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
    const msg = authApiMessage(lang, 'errors.serverError');
    res.status(500).json({ code: 'SERVER_ERROR', error: msg, message: msg });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────
// Revoke the refresh token and clear cookies.
// When a child logs out, if a parent session was saved (via stjarndag_parent_session),
// restore it so the parent remains logged in.
// Body { switchChild: true } — end child session only; keep parent session cookie for child picker.

router.post('/logout', async (req, res) => {
  const {
    evaluateHandoffForRequest,
    consumeHandoffAndActivateSession,
    clearHandoffCookie,
    logHandoffLogoutDiagnostics,
  } = require('../../lib/parent-session-handoff');

  function verifyChildAccess(accessTokenStr) {
    if (!accessTokenStr) return null;
    try {
      const decoded = verifyToken(accessTokenStr);
      if (decoded.type !== 'child' || !decoded.id || !decoded.familyId) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  function verifyAccessPayload(accessTokenStr) {
    if (!accessTokenStr) return null;
    try {
      return verifyToken(accessTokenStr);
    } catch {
      return null;
    }
  }

  try {
    const switchChild = req.body?.switchChild === true;
    const rawRefresh = req.cookies?.refresh_token;
    const accessTokenStr = req.cookies?.access_token;
    const refreshRow = await lookupRefreshTokenRow(rawRefresh);
    const refreshSessionType = refreshRow?.user_type || null;
    const verifiedAccess = verifyAccessPayload(accessTokenStr);
    const accessSessionType = verifiedAccess?.type || null;
    const sessionType = accessSessionType === 'child'
      ? 'child'
      : (refreshSessionType || accessSessionType);
    let childSession = verifyChildAccess(accessTokenStr);
    if (!childSession && refreshRow?.user_type === 'child' && refreshRow.child_id) {
      const accessParent = accessSessionType === 'parent';
      if (accessParent) {
        childSession = {
          id: refreshRow.child_id,
          familyId: refreshRow.family_id,
          type: 'child',
        };
      }
    }
    const hasHandoffCookie = Boolean(req.cookies?.stjarndag_parent_session);

    if (
      refreshRow?.user_type === 'child'
      && accessTokenStr
      && !verifyChildAccess(accessTokenStr)
      && accessSessionType !== 'parent'
    ) {
      if (hasHandoffCookie) {
        clearAllSessionCookies(res);
        clearHandoffCookie(res);
        return res.status(401).json({
          code: 'CHILD_SESSION_INVALID',
          requiresParentLogin: true,
        });
      }
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      return res.json({ loggedOut: true, handoffAvailable: false });
    }

    // ── Switch child: end child JWT only; keep handoff for picker ─────────
    if (switchChild) {
      if (!childSession) {
        return res.status(401).json({ code: 'CHILD_SESSION_INVALID' });
      }
      await revokeRefreshTokenForSession(rawRefresh, {
        userType: 'child',
        userId: childSession.id,
        familyId: childSession.familyId,
      });
      clearAccessCookie(res);
      clearRefreshCookie(res);
      res.clearCookie('csrf_token', { path: '/' });
      return res.json({ message: 'Utloggad', switchChild: true });
    }

    // ── Parent logout ─────────────────────────────────────────────────────
    if (sessionType === 'parent') {
      if (rawRefresh) {
        await revokeRefreshToken(rawRefresh);
      }
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      return res.json({ message: 'Utloggad', loggedOut: true });
    }

    // Invalid/expired child JWT with handoff must not fall through to anonymous logout.
    if (sessionType !== 'child') {
      if (hasHandoffCookie) {
        clearAllSessionCookies(res);
        clearHandoffCookie(res);
        return res.status(401).json({
          code: 'CHILD_SESSION_INVALID',
          requiresParentLogin: true,
        });
      }
      if (rawRefresh) {
        await revokeRefreshToken(rawRefresh);
      }
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      return res.json({ loggedOut: true, handoffAvailable: false });
    }

    // ── Child logout (valid child JWT) ──────────────────────────────────────
    if (!childSession) {
      if (hasHandoffCookie) {
        clearAllSessionCookies(res);
        clearHandoffCookie(res);
        return res.status(401).json({
          code: 'CHILD_SESSION_INVALID',
          requiresParentLogin: true,
        });
      }
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      return res.json({ loggedOut: true, handoffAvailable: false });
    }

    const childId = childSession.id;
    const childFamilyId = childSession.familyId;
    const handoffEval = hasHandoffCookie
      ? await evaluateHandoffForRequest(req, res)
      : { ok: false, reason: 'cookie_missing', code: 'HANDOFF_COOKIE_MISSING' };

    if (hasHandoffCookie) {
      await logHandoffLogoutDiagnostics(req, 'child_logout_pre', handoffEval, childSession, rawRefresh);
    }

    if (hasHandoffCookie && handoffEval.ok && handoffEval.familyId !== childFamilyId) {
      await revokeRefreshTokenForSession(rawRefresh, {
        userType: 'child',
        userId: childId,
        familyId: childFamilyId,
      });
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      return res.status(409).json({
        code: 'PARENT_HANDOFF_INVALID',
        requiresParentLogin: true,
      });
    }

    if (hasHandoffCookie && !handoffEval.ok) {
      await revokeRefreshTokenForSession(rawRefresh, {
        userType: 'child',
        userId: childId,
        familyId: childFamilyId,
      });
      clearAllSessionCookies(res);
      clearHandoffCookie(res);
      console.warn(
        '[AUTH] Child logout handoff invalid',
        req.id,
        handoffEval.code || handoffEval.reason
      );
      return res.status(409).json({
        code: 'PARENT_HANDOFF_INVALID',
        requiresParentLogin: true,
      });
    }

    if (hasHandoffCookie && handoffEval.ok) {
      let needsPin = false;
      try {
        needsPin = await parentPinDb.parentHasPin(handoffEval.parentId);
      } catch (err) {
        console.error('[AUTH] Logout: parent-pin check failed:', req.id, err.message);
        return res.status(500).json({ code: 'SERVER_ERROR' });
      }

      const revokeResult = await revokeRefreshTokenForSession(rawRefresh, {
        userType: 'child',
        userId: childId,
        familyId: childFamilyId,
      });
      if (revokeResult.reason === 'identity_mismatch') {
        console.warn('[AUTH] Child logout refresh identity mismatch — skipping destructive revoke', req.id);
      }

      clearAllSessionCookies(res);

      if (needsPin) {
        return res.json({ needsParentPin: true });
      }

      const restored = await consumeHandoffAndActivateSession(req, res);
      await logHandoffLogoutDiagnostics(req, 'child_logout_post_consume', handoffEval, childSession, null);

      if (restored.ok) {
        return res.json({ sessionRestored: true });
      }

      console.error('[AUTH] Handoff consume failed after child logout', req.id, restored.code);
      clearHandoffCookie(res);
      return res.status(500).json({ code: 'HANDOFF_CONSUME_FAILED' });
    }

    // Child without handoff — normal barnlogout
    await revokeRefreshTokenForSession(rawRefresh, {
      userType: 'child',
      userId: childId,
      familyId: childFamilyId,
    });
    clearAllSessionCookies(res);
    clearHandoffCookie(res);
    return res.json({ loggedOut: true, handoffAvailable: false });
  } catch (err) {
    console.error('[AUTH] Logout error:', req.id, err.message);
    clearAllSessionCookies(res);
    clearHandoffCookie(res);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
});

module.exports = router;
