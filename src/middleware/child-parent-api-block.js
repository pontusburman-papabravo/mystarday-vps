/**
 * Sprint 3c — Barn-JWT: deny-by-default; endast explicit tillåtna vuxen/barn-API.
 * Om barn-cookie är aktiv men förälder sparade session finns, återställ förälder
 * för vuxen-API (t.ex. GET /api/children) så daglig logg/dashboard fungerar.
 */
const { restoreParentUserFromCookie } = require('./auth');
const { isAdultPrivilegeEnabled } = require('../lib/adult-privilege-flags');

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
  /^\/subscription\/access$/,
  /^\/family\/verify-pin$/,
  /^\/family\/restore-parent-session$/,
  /^\/family\/activate-saved-parent-session$/,
  /^\/family\/adult-privilege\/status$/,
  /^\/family\/adult-privilege\/unlock$/,
  /^\/family\/adult-privilege\/expire$/,
  /^\/family\/adult-privilege\/policy$/,
  /^\/family\/parent-pin-status-picker$/,
  /^\/family\/verify-pin-picker$/,
  /^\/children\/[^/]+\/view-config$/,
  /^\/children\/[^/]+\/visual-theme$/,
  /^\/children\/[^/]+\/pictogram-pack$/,
  /^\/children\/[^/]+\/activity-card-size$/,
  /^\/widget(\/|$)/,
  /^\/avatars\/[^/]+\/[^/]+$/,
];

function childParentApiBlock(req, res, next) {
  if (!req.user || req.user.type !== 'child') return next();

  const subPath = req.path || '';
  for (let i = 0; i < CHILD_ALLOWED.length; i++) {
    if (CHILD_ALLOWED[i].test(subPath)) return next();
  }

  const familyId = req.user.familyId;
  isAdultPrivilegeEnabled(familyId)
    .then((privilegeV1) => {
      if (privilegeV1) {
        return res.status(403).json({
          error: 'Förbjuden — barnläge har inte åtkomst till denna funktion',
          code: 'CHILD_PARENT_API_BLOCKED',
          adultPrivilegeRequired: true,
        });
      }
      return restoreParentUserFromCookie(req, res).then((restored) => {
        if (restored) return next();
        return res.status(403).json({
          error: 'Förbjuden — barnläge har inte åtkomst till denna funktion',
          code: 'CHILD_PARENT_API_BLOCKED',
        });
      });
    })
    .catch(next);
}

module.exports = { childParentApiBlock };
