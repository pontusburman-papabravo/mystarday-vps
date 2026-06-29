'use strict';

/**
 * Skip this router when req.path does not match — lets sibling routers on the same
 * mount (e.g. /api/me) handle other paths. Use before router-level requireChild/requireParent.
 */
function scopeRouterToPath(...prefixes) {
  return (req, res, next) => {
    const path = req.path || '';
    const match = prefixes.some((p) => path === p || path.startsWith(`${p}/`));
    if (!match) return next('router');
    next();
  };
}

module.exports = { scopeRouterToPath };
