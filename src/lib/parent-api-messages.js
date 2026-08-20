'use strict';

/**
 * Localized JSON messages for parent-facing API routes (goals, rewards, settings).
 */

const { t } = require('./i18n');
const { resolveFamilyLocale } = require('./locale');

const API_PREFIX = 'parent.api.';

/**
 * @param {string} lang canonical locale
 * @param {string} key dot path under parent.api (e.g. errors.generic)
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
function parentApiMessage(lang, key, params = {}) {
  const canonical = resolveFamilyLocale(lang);
  const fullKey = `${API_PREFIX}${key}`;
  const text = t(canonical, fullKey, params);
  return text !== fullKey ? text : t(canonical, `parent.${key}`, params);
}

module.exports = {
  parentApiMessage,
};
