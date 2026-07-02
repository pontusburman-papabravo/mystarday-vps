/**
 * Component-based feature gating middleware.
 * Owns: checking family_subscriptions.components for required components.
 * Does NOT own: Stripe, payment UI, trial logic.
 */

const familySubscriptions = require('../../db/family-subscriptions');

/**
 * Middleware factory that requires a specific subscription component.
 * Returns 403 if the family lacks the component or it has expired.
 *
 * Usage: router.get('/reports', requireComponent('reporting'), handler)
 *
 * @param {string} componentName - Component to require (e.g. 'basic_app', 'reporting')
 * @returns {Function} Express middleware
 */
function requireComponent(componentName) {
  return async (req, res, next) => {
    // Skip if no authenticated user (let auth middleware handle that)
    if (!req.user?.familyId && !req.user?.family_id) return next();

    const familyId = req.user.familyId || req.user.family_id;

    try {
      const sub = await familySubscriptions.getByFamilyId(familyId);

      // No subscription record — legacy families: basic_app only
      if (!sub) {
        if (componentName === 'basic_app') return next();
        return res.status(403).json({
          error: 'Komponent saknas',
          code: 'COMPONENT_MISSING',
          component: componentName,
          upgrade_url: '/upgrade',
        });
      }

      // lifetime_free: only basic_app included — other components need explicit grant
      if (sub.tier === 'lifetime_free' && componentName === 'basic_app') {
        return next();
      }

      const comp = (sub.components || []).find(c => c.component === componentName);
      if (!comp) {
        return res.status(403).json({
          error: 'Komponent saknas',
          code: 'COMPONENT_MISSING',
          component: componentName,
          upgrade_url: '/upgrade',
        });
      }

      const state = comp.state || 'active';
      if (state === 'archived') {
        return res.status(403).json({
          error: 'Komponent arkiverad',
          code: 'COMPONENT_ARCHIVED',
          component: componentName,
          upgrade_url: '/upgrade',
        });
      }
      if (state !== 'active') {
        return res.status(403).json({
          error: 'Komponent saknas',
          code: 'COMPONENT_MISSING',
          component: componentName,
          upgrade_url: '/upgrade',
        });
      }

      if (comp.expires_at && new Date(comp.expires_at) < new Date()) {
        return res.status(403).json({
          error: 'Komponent utgången',
          code: 'COMPONENT_EXPIRED',
          component: componentName,
          upgrade_url: '/upgrade',
        });
      }

      next();
    } catch (err) {
      console.error('[REQUIRE-COMPONENT] component check failed:', err.message);
      return res.status(503).json({ error: 'Tillfälligt fel, försök igen' });
    }
  };
}

module.exports = { requireComponent };
