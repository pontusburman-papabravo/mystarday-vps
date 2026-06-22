/**
 * Child view routing — A/B toggle between classic and new child views.
 * Owns: /child/:childId redirect logic based on child_view_config.view_mode,
 *       /child-new/:childId → child-new.html
 * Does NOT own: auth middleware (handled at mount level), daily-log rendering.
 * Feature gate: ny_barnvy gates access to the new view. If feature is off, the
 * child_view_config setting is ignored and all children go to the classic view.
 * Magic preview families: view_mode 'new' routes to child-dashboard (AppViewMode magic),
 * not child-new.html. Other families still use child-new for 'new'.
 * Admin bypass: req.user.isAdmin skips feature gates.
 */
const express = require('express');
const db = require('../lib/db');
const { optionalAuth } = require('../middleware/auth');
const { redirectIfNoAccess } = require('../middleware/feature-gate');
const { familyHasMagicViewAccess } = require('../lib/magic-view-access');
const { resolveChildViewPath } = require('../lib/child-view-redirect');

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return UUID_REGEX.test(id);
}

// ─── GET /child/:childId — A/B toggle ──────────────────────
// Reads child_view_config.view_mode, redirects to classic or new view.
// Gates 'ny_barnvy' — if feature is off, all children go to classic view.
// redirectIfNoAccess handles admin bypass automatically.
router.get('/:childId', optionalAuth, redirectIfNoAccess('ny_barnvy', '/child/today'), async (req, res) => {
  try {
    const { childId } = req.params;
    if (!isValidUuid(childId)) {
      return res.redirect('/child-login');
    }

    const result = await db.query(
      'SELECT family_id, child_view_config FROM child WHERE id = $1',
      [childId]
    );
    if (result.rows.length === 0) {
      return res.redirect('/child-login');
    }

    const row = result.rows[0];
    const { view_mode: viewMode } = row.child_view_config || {};

    const target = await resolveChildViewPath({
      viewMode,
      childId,
      familyId: row.family_id,
      hasMagicAccess: familyHasMagicViewAccess,
    });
    return res.redirect(target);
  } catch (err) {
    console.error('[CHILD-VIEW] Route error:', err);
    return res.redirect('/child-login');
  }
});

// ─── GET /child/new/:childId — functional V2 child view ───
// Gates 'ny_barnvy' — direct navigation to new view requires feature access.
// redirectIfNoAccess handles admin bypass automatically.
router.get('/new/:childId', optionalAuth, redirectIfNoAccess('ny_barnvy', '/child/today'), async (req, res) => {
  const { childId } = req.params;
  if (!isValidUuid(childId)) {
    return res.redirect('/child-login');
  }
  try {
    const result = await db.query(
      'SELECT family_id FROM child WHERE id = $1',
      [childId]
    );
    if (result.rows.length === 0) {
      return res.redirect('/child-login');
    }
    const hasMagicDashboard = await familyHasMagicViewAccess(result.rows[0].family_id);
    if (hasMagicDashboard) {
      return res.redirect(`/child/today?child=${childId}`);
    }
    res.redirect(`/child-new.html?child=${childId}`);
  } catch (err) {
    console.error('[CHILD-VIEW] /new route error:', err);
    res.redirect('/child-login');
  }
});

module.exports = router;