/**
 * Feature-gated HTML page routes.
 * Owns: /reports, /pedagog-note, /pedagog-oversikt HTML pages with feature access checks.
 * Does NOT own: feature definitions, auth middleware core.
 *
 * Routes:
 *   GET /reports          — reports.html, requires 'klinisk_rapportering' feature
 *   GET /pedagog-note     — pedagog-note.html, requires 'pedagoganteckningar' feature
 *   GET /pedagog-oversikt — pedagog-oversikt.html, requires 'pedagoganteckningar' feature + pedagog role
 */

const express = require('express');
const path = require('path');
const { optionalAuth } = require('../middleware/auth');
const { gateHtmlPage } = require('../middleware/feature-gate');
const db = require('../lib/db');

const router = express.Router();

function requireParentPage(req, res, next) {
  if (!req.user || req.user.type !== 'parent') {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl || '/dashboard'));
  }
  next();
}

// ─── GET /reports ────────────────────────────────────────
// Page loads for all parents; preview-shell or real UI per package-access (§6.6).
router.get('/reports', optionalAuth, requireParentPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'reports.html'));
});

// ─── GET /samarbete — pedagog hub (preview or real per component) ───
router.get('/samarbete', optionalAuth, requireParentPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'samarbete.html'));
});

// ─── GET /barn-stod — teacch + child shortcuts hub ───
router.get('/barn-stod', optionalAuth, requireParentPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'barn-stod.html'));
});

// ─── GET /pedagog-note ───────────────────────────────────
// Requires 'pedagoganteckningar' feature. Redirects to /dashboard if no access.
router.get('/pedagog-note', optionalAuth, gateHtmlPage('pedagoganteckningar', '/dashboard'), (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'pedagog-note.html'));
});

// ─── GET /pedagog-oversikt ──────────────────────────────
// Requires 'pedagoganteckningar' feature + at least one active pedagog link.
// Redirects to /dashboard if no access or no pedagog role.
async function requirePedagogRole(req, res, next) {
  if (!req.user) return res.redirect('/dashboard');
  const result = await db.query(`
    SELECT 1 FROM parent_child
    WHERE parent_id = $1 AND role = 'pedagog' AND revoked_at IS NULL
    LIMIT 1
  `, [req.user.id]);
  if (result.rows.length === 0) return res.redirect('/dashboard');
  next();
}

router.get('/pedagog-oversikt', optionalAuth, gateHtmlPage('pedagoganteckningar', '/dashboard'), requirePedagogRole, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'pedagog-oversikt.html'));
});

// ─── GET /for-dig ────────────────────────────────────────
router.get('/for-dig', optionalAuth, gateHtmlPage('for_dig', '/dashboard'), (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'for-dig.html'));
});

module.exports = router;