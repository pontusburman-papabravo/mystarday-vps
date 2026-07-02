/**
 * Weekly schedule routes.
 *
 * Organized into 5 sub-routers across 3 mounted routers:
 *
 * childRouter (/api/children/:childId/schedules)
 *   ├── child-crud.js    — list/create/delete schedules, once-tasks
 *   ├── child-bulk.js    — copy-day, copy-to-child, copy-to-weeks, apply-date-range,
 *   │                     copy-item-to-day, copy-item-to-child, swap-day
 *   └── fill-week.js     — fill-week (insert template into multiple days)
 *
 * scheduleRouter (/api/schedules/:scheduleId/items)
 *   └── items.js         — list/add/update/delete/reorder items
 *
 * familyRouter (/api/schedule-templates)
 *   └── templates.js     — list/create/delete templates, create-from-standard, apply
 */

const express = require('express');
const authz = require('../../middleware/authz');
const childCrudRouter = require('./child-crud');
const childBulkRouter = require('./child-bulk');
const fillWeekRouter = require('./fill-week');
const itemsRouter = require('./items');
const templatesRouter = require('./templates');

const childRouter = express.Router({ mergeParams: true });
const scheduleRouter = express.Router({ mergeParams: true });
const familyRouter = express.Router();

childRouter.use(authz.requireChildAccess('childId'));
scheduleRouter.use(authz.requireScheduleAccess('scheduleId'));

// Child-scoped routes: mount sub-routers at their specific paths
childRouter.use('/', childCrudRouter);             // GET /, POST /, DELETE /:scheduleId, POST /once-tasks
childRouter.use('/', childBulkRouter);            // POST /copy-day, /copy-to-child, /copy-to-weeks,
                                                   // POST /copy-item-to-day, /copy-item-to-child, /swap-day
childRouter.use('/', fillWeekRouter);             // POST /fill-week

// Schedule-item routes
scheduleRouter.use('/', itemsRouter);             // GET /, POST /, PUT /reorder, PUT /:itemId, DELETE /:itemId

// Family template routes
familyRouter.use('/', templatesRouter);           // GET /, GET /:templateId, POST /, POST /from-standard/:standardId,
                                                   // DELETE /:templateId, POST /:templateId/apply

module.exports = { childRouter, scheduleRouter, familyRouter };