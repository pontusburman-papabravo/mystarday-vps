/**
 * Bearer auth for GET /api/ops/ireland-funnel-health.
 * Env: IRELAND_FUNNEL_MONITOR_TOKEN (raw token, no Bearer prefix).
 * Never logs the token or Authorization header.
 */
'use strict';

const { verifyStaticBearerToken } = require('../lib/static-bearer-auth');

function requireIrelandFunnelMonitorAuth(req, res, next) {
  const expected = process.env.IRELAND_FUNNEL_MONITOR_TOKEN;
  const result = verifyStaticBearerToken(req.headers.authorization, expected);

  if (!result.configured) {
    console.error('[ops/ireland-funnel-health] monitor token is not configured');
    return res.status(503).json({ error: 'Monitor not configured' });
  }

  if (!result.authorized) {
    console.warn('[ops/ireland-funnel-health] unauthorized');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = {
  requireIrelandFunnelMonitorAuth,
};
