'use strict';

/**
 * Semantic HTTPS entry for opening the child experience in the app.
 * Used by growth emails and deep links — not legacy /child-login semantics.
 */

const config = require('./config');

const OPEN_CHILD_ENTRY_PATH = '/open/child';

function appBaseUrl() {
  return String(process.env.APP_URL || config.email?.baseUrl || '').replace(/\/$/, '');
}

function openChildEntryUrl() {
  const base = appBaseUrl();
  return base ? `${base}${OPEN_CHILD_ENTRY_PATH}` : OPEN_CHILD_ENTRY_PATH;
}

module.exports = {
  OPEN_CHILD_ENTRY_PATH,
  openChildEntryUrl,
};
