'use strict';

/**
 * Family routes (mounted at /api/family) — split into domain modules.
 *
 * Mount order matters (endpoint-map R1):
 *   1. invites-public  — unauthenticated invite validation/acceptance (BEFORE the gate)
 *   2. requireParent   — parent auth gate (with child→parent session restore)
 *   3. everything else — inherits the parent gate
 *
 * See docs/refactor/e1-family-endpoint-map.md.
 */

const express = require('express');
const { requireParent } = require('../../middleware/auth');

const router = express.Router();

// ─── Public family-invite routes (no auth) — mounted BEFORE requireParent ──
router.use('/', require('./invites-public'));

// All remaining routes require parent auth
router.use(requireParent);

// ─── Core family routes (read/update, settings, stats, readiness, …) ──────────
router.use('/', require('./core'));

// ─── Product Engine API (single source of truth) ─────────────────────────────
router.use('/', require('./first-success'));

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

// ─── FEAT-1 boendeschema (custody_schedule_beta) ─────────────────────────────
router.use('/custody', require('./custody'));

// ─── Family image library (activity photos) ─────────────────────────────────
router.use('/images', require('../family-images'));

module.exports = router;
