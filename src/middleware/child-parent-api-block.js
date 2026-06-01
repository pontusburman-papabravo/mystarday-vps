/**
 * Sprint 3c — Barn-JWT: deny-by-default; endast explicit tillåtna vuxen/barn-API.
 */
const CHILD_ALLOWED = [
  /^\/me(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/push(\/|$)/,
  /^\/events(\/|$)/,
  /^\/i18n(\/|$)/,
  /^\/app-config$/,
  /^\/registration-status$/,
  /^\/consent(\/|$)/,
  /^\/features(\/|$)/,
  /^\/family\/verify-pin$/,
  /^\/family\/restore-parent-session$/,
];

function childParentApiBlock(req, res, next) {
  if (!req.user || req.user.type !== 'child') return next();

  const subPath = req.path || '';
  for (let i = 0; i < CHILD_ALLOWED.length; i++) {
    if (CHILD_ALLOWED[i].test(subPath)) return next();
  }

  return res.status(403).json({
    error: 'Förbjuden — barnläge har inte åtkomst till denna funktion',
    code: 'CHILD_PARENT_API_BLOCKED',
  });
}

module.exports = { childParentApiBlock };
