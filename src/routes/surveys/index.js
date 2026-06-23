'use strict';

const admin = require('./admin');
const publicRouter = require('./public');
const shortlinkRouter = require('./shortlink');

module.exports = {
  adminRouter: admin.adminRouter,
  publicRouter,
  shortlinkRouter,
  seedBuiltInSurveys: admin.seedBuiltInSurveys,
};

