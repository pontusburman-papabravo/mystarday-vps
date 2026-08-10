'use strict';

/**
 * Family routes (mounted at /api/family) — split into domain modules.
 *
 * Mount order matters (endpoint-map R1):
 *   1. invites-public  — unauthenticated invite validation/acceptance (BEFORE the gate)
 *   2. session-public  — child JWT + saved parent session (activate before gate)
 *   3. requireParent   — parent auth gate (with child→parent session restore)
 *   4. everything else — inherits the parent gate
 *
 * See docs/refactor/e1-family-endpoint-map.md.
 */

const express = require('express');
const { requireParent } = require('../../middleware/auth');

const router = express.Router();

// ─── Public family-invite routes (no auth) — mounted BEFORE requireParent ──
router.use('/', require('./invites-public'));

// Child session + saved parent session (before requireParent gate)
router.use('/', require('./session-public'));

// Fas 3A — adult privilege escalation (child JWT + handoff → parent activate)
router.use('/', require('./adult-privilege'));

// All remaining routes require parent auth
router.use(requireParent);

// ─── Core family routes (read/update, settings, stats, readiness, …) ──────────
router.use('/', require('./core'));

// ─── Locale context + English beta offer ─────────────────────────────────────
router.use('/', require('./locale'));

// ─── Product Engine API (compatibility adapter during Journey migration) ─────
router.use('/', require('./first-success'));

// ─── Canonical next-action (Journey authority, flag-gated) ───────────────────
router.use('/', require('./next-action'));

// ─── R4.7 growth (dismiss snooze, weekly highlight) ────────────────────────
router.use('/', require('./growth'));

// ─── Account-deletion route ───────────────────────────────────────────────────
router.use('/', require('./account'));

// ─── Parent-invite routes (check / create / revoke / add-parent / accept) ─────
router.use('/', require('./invites'));

// ─── Family member + child management routes ──────────────────────────────────
router.use('/', require('./members'));

// ─── Pedagog invite + access routes (primary-parent gated where noted) ────────
router.use('/', require('./pedagog'));

// ─── Parent PIN + login-picker session routes ────────────────────────────────
router.use('/', require('./pin'));

// ─── Trusted devices (R4.2) ─────────────────────────────────────────────────
router.use('/', require('./trusted-devices'));

// ─── FEAT-1 boendeschema (custody_schedule_beta) ─────────────────────────────
router.use('/custody', require('./custody'));

// ─── Family image library (activity photos) ─────────────────────────────────
router.use('/images', require('../family-images'));

module.exports = router;
