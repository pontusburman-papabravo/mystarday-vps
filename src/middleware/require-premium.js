'use strict';

/**
 * Limited-account gate — post payment_start families without Premium get restricted API access.
 */
const { resolveFamilyEntitlements } = require('../lib/family-entitlements');

const LIMITED_ACCOUNT_ALLOWED_PREFIXES = [
  '/api/auth/',
  '/api/subscription/',
  '/api/iap/',
  '/api/account/',
  '/api/gifts/',
  '/api/consent/',
  '/api/analytics/',
  '/api/push/',
  '/api/notifications/',
  '/api/feedback/',
  '/api/market/',
  '/api/onboarding/',
  '/api/public/',
  '/api/landing',
  '/api/i18n',
];

/** Child sessions without Premium may still reach auth, subscription read, and parent-restore flows. */
const CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES = [
  '/api/auth/',
  '/api/subscription/',
  '/api/consent/',
  '/api/analytics/',
  '/api/push/',
  '/api/i18n',
  '/api/public/',
  '/api/landing',
  '/api/app-config',
  '/api/registration-status',
  '/api/features/',
  '/api/events/',
  '/api/widget/',
  '/api/family/verify-pin',
  '/api/family/restore-parent-session',
  '/api/family/activate-saved-parent-session',
  '/api/family/adult-privilege/',
  '/api/family/parent-pin-status-picker',
  '/api/family/verify-pin-picker',
  '/api/avatars/',
];

function isLimitedAccountPath(path) {
  if (!path || typeof path !== 'string') return false;
  return LIMITED_ACCOUNT_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isChildLimitedAccountPath(path) {
  if (!path || typeof path !== 'string') return false;
  return CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Block parent API calls when family lacks Premium (limited account state).
 */
function requirePremiumApi() {
  return async (req, res, next) => {
    if (req.user?.isAdmin) return next();
    if (!req.user?.familyId && !req.user?.family_id) return next();

    const path = req.originalUrl?.split('?')[0] || req.path || '';
    const isChild = req.user?.type === 'child';

    if (isChild) {
      if (isChildLimitedAccountPath(path)) return next();
    } else if (isLimitedAccountPath(path)) {
      return next();
    }

    const familyId = req.user.familyId || req.user.family_id;
    try {
      const { premium } = await resolveFamilyEntitlements(familyId);
      if (premium.active) return next();

      return res.status(402).json({
        error: 'Premium krävs för att använda den här funktionen',
        code: 'PREMIUM_REQUIRED',
        limited_account: true,
        paywall_url: '/paywall',
        account_url: '/limited-account',
      });
    } catch (err) {
      console.error('[REQUIRE-PREMIUM] check failed:', err.message);
      return res.status(503).json({ error: 'Tillfälligt fel, försök igen' });
    }
  };
}

module.exports = {
  requirePremiumApi,
  isLimitedAccountPath,
  isChildLimitedAccountPath,
  LIMITED_ACCOUNT_ALLOWED_PREFIXES,
  CHILD_LIMITED_ACCOUNT_ALLOWED_PREFIXES,
};
