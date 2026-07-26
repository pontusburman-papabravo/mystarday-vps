'use strict';

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.EMAIL_ENABLED = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const { setupTestDb } = require('../../helpers/setup');
const { listenApp } = require('../../helpers/http');

async function createE2eContext() {
  const db = await setupTestDb();
  if (db.skip) {
    return { skip: true, reason: 'No real DATABASE_URL' };
  }

  const { createApp } = require('../../../app');
  const http = await listenApp(createApp);
  const pg = require('../../../src/lib/db');

  return {
    skip: false,
    db,
    http,
    baseUrl: http.baseUrl,
    query: (text, params) => pg.query(text, params),
    async close() {
      await http.close();
      await db.cleanup();
    },
  };
}

module.exports = { createE2eContext };
