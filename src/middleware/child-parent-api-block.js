/**
 * Sprint 3c — Barn-JWT: deny-by-default; endast explicit tillåtna vuxen/barn-API.
 * Om barn-cookie är aktiv men förälder sparade session finns, återställ förälder
 * för vuxen-API (t.ex. GET /api/children) så daglig logg/dashboard fungerar.
 */
const { restoreParentUserFromCookie } = require('./auth');

const CHILD_ALLOWED = [
  /^\/me(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/auth\/login-picker-children$/,
  /^\/push(\/|$)/,
  /^\/events(\/|$)/,
  /^\/i18n(\/|$)/,
  /^\/app-config$/,
  /^\/registration-status$/,
  /^\/consent(\/|$)/,
  /^\/features(\/|$)/,
  /^\/family\/verify-pin$/,
  /^\/family\/restore-parent-session$/,
  /^\/children\/[^/]+\/view-config$/,
  /^\/children\/[^/]+\/visual-theme$/,
  /^\/children\/[^/]+\/pictogram-pack$/,
];

function childParentApiBlock(req, res, next) {
  if (!req.user || req.user.type !== 'child') return next();

  const subPath = req.path || '';
  for (let i = 0; i < CHILD_ALLOWED.length; i++) {
    if (CHILD_ALLOWED[i].test(subPath)) return next();
  }

  if (restoreParentUserFromCookie(req)) return next();

  return res.status(403).json({
    error: 'Förbjuden — barnläge har inte åtkomst till denna funktion',
    code: 'CHILD_PARENT_API_BLOCKED',
  });
}

module.exports = { childParentApiBlock };
