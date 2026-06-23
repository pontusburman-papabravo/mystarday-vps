/**
 * Daily log API routes — re-exports split routers from ./daily-logs/.
 *
 * GET  /api/children/:childId/daily-log?date=YYYY-MM-DD
 * GET  /api/children/:childId/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 * PUT  /api/daily-log-items/:itemId/complete|uncomplete|…
 * PUT  /api/daily-logs/:logId/pause|unpause|bump-time|…
 * GET/PUT /api/me/daily-log* (child self-access)
 */

const childRouter = require('./daily-logs/parent');
const itemRouter = require('./daily-logs/items');
const logRouter = require('./daily-logs/logs');
const childSelfRouter = require('./daily-logs/child-self');

module.exports = { childRouter, itemRouter, logRouter, childSelfRouter };
