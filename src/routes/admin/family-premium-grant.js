'use strict';

/**
 * Admin Premium grant/revoke for a family.
 * Entitlement writes go through family-entitlements (no duplicate resolver).
 */

const express = require('express');
const { validate, validateParams } = require('../../middleware/validate');
const {
  FamilyIdParam,
  AdminPremiumGrantSchema,
  AdminPremiumRevokeSchema,
} = require('../../lib/schemas');
const {
  grantAdminPremium,
  revokeAdminPremium,
  getFamilyEntitlementOverview,
} = require('../../lib/family-entitlements');

const router = express.Router();

function mapGrantError(err, res, next) {
  if (err && err.code === 'FAMILY_NOT_FOUND') {
    return res.status(404).json({ error: 'Familjen hittades inte' });
  }
  if (err && (err.code === 'ADMIN_GRANT_INVALID_EXPIRES_AT' || err.code === 'ADMIN_GRANT_EXPIRES_NOT_FUTURE')) {
    return res.status(400).json({ error: 'Ogiltigt slutdatum', code: err.code });
  }
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'Aktiv admin-grant finns redan' });
  }
  return next(err);
}

router.post(
  '/families/:familyId/premium-grant',
  validateParams(FamilyIdParam),
  validate(AdminPremiumGrantSchema),
  async (req, res, next) => {
    try {
      const { familyId } = req.params;
      const { type, reason } = req.body;
      const permanent = type === 'permanent';
      const result = await grantAdminPremium(familyId, {
        permanent,
        expiresAt: permanent ? null : req.body.expiresAt,
        adminId: req.user.id,
        reason,
      });
      const overview = await getFamilyEntitlementOverview(familyId);
      res.json({
        ok: true,
        skipped: Boolean(result.skipped),
        applied: Boolean(result.applied),
        reason: result.reason || null,
        grant_id: result.grant_id || null,
        premium: overview.premium,
        access_kind: overview.access_kind,
        requires_paywall: overview.requires_paywall,
        sources: overview.sources,
        effective_source_before: result.effective_source_before,
        effective_source_after: result.effective_source_after,
      });
    } catch (err) {
      mapGrantError(err, res, next);
    }
  }
);

router.post(
  '/families/:familyId/premium-grant/revoke',
  validateParams(FamilyIdParam),
  (req, _res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      req.body = {};
    }
    next();
  },
  validate(AdminPremiumRevokeSchema),
  async (req, res, next) => {
    try {
      const { familyId } = req.params;
      const result = await revokeAdminPremium(familyId, {
        adminId: req.user.id,
        reason: req.body.reason || 'manual_revoke',
      });
      const overview = await getFamilyEntitlementOverview(familyId);
      res.json({
        ok: true,
        revoked: result.revoked,
        grant_id: result.grant_id,
        premium: overview.premium,
        access_kind: overview.access_kind,
        requires_paywall: overview.requires_paywall,
        sources: overview.sources,
        effective_source_before: result.effective_source_before,
        effective_source_after: result.effective_source_after,
      });
    } catch (err) {
      mapGrantError(err, res, next);
    }
  }
);

module.exports = router;
