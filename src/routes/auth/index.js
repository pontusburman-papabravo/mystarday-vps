'use strict';

/**
 * Auth routes (mounted at /api/auth) — split into domain modules.
 * Owns: login, register, logout, token refresh, password reset,
 * email verification, child login, Apple/Google sign in.
 *
 * Shared session helpers live in ./session (parseDuration, completeLogin,
 * clearAllSessionCookies). See docs/refactor/e2-auth-endpoint-map.md.
 */

const express = require('express');

const router = express.Router();

// ─── Login / session routes (login, logout, me, me/preferences, picker) ───────
router.use('/', require('./login'));

// ─── Registration route ───────────────────────────────────────────────────────
router.use('/', require('./register'));

// ─── CSRF + refresh token routes ──────────────────────────────────────────────
router.use('/', require('./refresh'));

// ─── Child login route ────────────────────────────────────────────────────────
router.use('/', require('./child-login'));

// ─── Email-flow routes (verify / resend / forgot / reset) ─────────────────────
router.use('/', require('./email'));

// ─── OAuth Sign In routes (Apple + Google) ────────────────────────────────────
router.use('/', require('./oauth-apple'));
router.use('/', require('./oauth-google'));

module.exports = router;
