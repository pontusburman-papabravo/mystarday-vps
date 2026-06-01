/**
 * Sprint 3c — Barn-JWT får inte anropa vuxen-API (extra lager utöver requireParent).
 */
const CHILD_BLOCKED = [
  /^\/family(\/|$)/,
  /^\/account(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/stripe(\/|$)/,
  /^\/children(\/|$)/,
  /^\/schedule-templates(\/|$)/,
  /^\/rewards(\/|$)/,
  /^\/upload(\/|$)/,
  /^\/admin(\/|$)/,
];

const CHILD_ALLOWED = [
  /^\/me(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/push(\/|$)/,
  /^\/events(\/|$)/,
  /^\/i18n(\/|$)/,
  /^\/app-config$/,
  /^\/registration-status$/,
  /^\/consent(\/|$)/,
];

function childParentApiBlock(req, res, next) {
  if (!req.user || req.user.type !== 'child') return next();

  const subPath = req.path || '';
  for (let i = 0; i < CHILD_ALLOWED.length; i++) {
    if (CHILD_ALLOWED[i].test(subPath)) return next();
  }
  for (let j = 0; j < CHILD_BLOCKED.length; j++) {
    if (CHILD_BLOCKED[j].test(subPath)) {
      return res.status(403).json({
        error: 'Förbjuden — barnläge har inte åtkomst till denna funktion',
        code: 'CHILD_PARENT_API_BLOCKED',
      });
    }
  }
  return next();
}

module.exports = { childParentApiBlock };
