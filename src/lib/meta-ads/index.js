'use strict';

const config = require('./config');
const schema = require('./schema');
const copyGuard = require('./copy-guard');
const graph = require('./graph');
const publisher = require('./publisher');

module.exports = {
  ...config,
  ...schema,
  ...copyGuard,
  ...graph,
  ...publisher,
};
