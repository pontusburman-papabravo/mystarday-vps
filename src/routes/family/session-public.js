'use strict';

/**
 * Family session routes that must run before requireParent (child JWT still active).
 */
const express = require('express');
const db = require('../../lib/db');
const { requireAuth, resolveParentIdForLoginPicker } = require('../../middleware/auth');
const { generateCsrfToken } = require('../../middleware/csrf');
const { activateParentSessionCookies } = require('../../lib/parent-session-cookies');
const parentPinDb = require('../../../db/parent-pin');

const router = express.Router();

async function resolvePickerParentContext(req) {
  const parentId = resolveParentIdForLoginPicker(req);
  if (!parentId) return null;
  const parentResult = await db.query(
    `SELECT id, email, family_id, is_admin, onboarding_completed
     FROM parent WHERE id = $1`,
    [parentId]
  );
  const parentRow = parentResult.rows[0];
  if (!parentRow) return null;
  return {
    parentId: parentRow.id,
    familyId: parentRow.family_id,
    parent: parentRow,
  };
}

function toParentSessionUser(parentRow) {
  return {
    id: parentRow.id,
    email: parentRow.email || null,
    familyId: parentRow.family_id,
    isAdmin: parentRow.is_admin || false,
    type: 'parent',
    onboarding_completed: parentRow.onboarding_completed,
  };
}

// POST /api/family/activate-saved-parent-session
// Child cookie + saved parent session, family has no parent PIN.
router.post('/activate-saved-parent-session', requireAuth, async (req, res) => {
  try {
    if (req.user.type === 'parent') {
      return res.json({ ok: true, alreadyParent: true, parent: toParentSessionUser({
        id: req.user.id,
        email: req.user.email,
        family_id: req.user.familyId,
        is_admin: req.user.isAdmin,
        onboarding_completed: req.user.onboarding_completed,
      }) });
    }

    const ctx = await resolvePickerParentContext(req);
    if (!ctx) {
      return res.status(401).json({
        error: 'Ingen sparad föräldersession. Logga in som vuxen.',
        code: 'NO_SAVED_PARENT_SESSION',
      });
    }

    const hasPin = await parentPinDb.familyAnyParentHasPin(ctx.familyId);
    if (hasPin) {
      return res.status(403).json({
        error: 'Ange förälder-PIN för att fortsätta.',
        code: 'PARENT_PIN_REQUIRED',
      });
    }

    if (!activateParentSessionCookies(req, res)) {
      return res.status(401).json({
        error: 'Kunde inte återställa föräldersessionen.',
        code: 'ACTIVATE_FAILED',
      });
    }

    const csrfToken = generateCsrfToken(res);
    res.json({
      ok: true,
      csrfToken,
      parent: toParentSessionUser(ctx.parent),
    });
  } catch (err) {
    console.error('[FAMILY] activate-saved-parent-session error:', err);
    res.status(500).json({ error: 'Något gick fel.' });
  }
});

module.exports = router;
