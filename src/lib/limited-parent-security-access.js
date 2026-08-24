'use strict';

/**
 * Narrow limited-parent allowlist for account/security PIN operations.
 * Exact path + HTTP method only — no broad /api/family/ prefix.
 */

const LIMITED_PARENT_SECURITY_ROUTES = Object.freeze({
  'GET /api/family/parent-pin-status': true,
  'POST /api/family/set-pin': true,
});

function normalizePathname(path) {
  if (!path || typeof path !== 'string') return '';
  const withoutQuery = path.split('?')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isLimitedParentSecurityRequestAllowed(req) {
  if (!req?.user || req.user.type === 'child') return false;
  const method = String(req.method || 'GET').toUpperCase();
  const path = normalizePathname(req.originalUrl || req.path || '');
  const key = `${method} ${path}`;
  return LIMITED_PARENT_SECURITY_ROUTES[key] === true;
}

module.exports = {
  LIMITED_PARENT_SECURITY_ROUTES,
  normalizePathname,
  isLimitedParentSecurityRequestAllowed,
};
