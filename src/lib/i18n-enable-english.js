'use strict';

const db = require('./db');
const { ENGLISH_APP_SLUG } = require('./i18n-flags');

/**
 * @param {string} familyId
 * @param {{ client?: import('pg').PoolClient }} [opts]
 */
async function enableEnglishAppForFamily(familyId, opts = {}) {
  const q = opts.client && typeof opts.client.query === 'function' ? opts.client : db;
  await q.query(
    `INSERT INTO family_features (family_id, feature_slug)
     VALUES ($1, $2)
     ON CONFLICT (family_id, feature_slug) DO NOTHING`,
    [familyId, ENGLISH_APP_SLUG]
  );
}

module.exports = {
  enableEnglishAppForFamily,
};
