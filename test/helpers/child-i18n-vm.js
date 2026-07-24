'use strict';

const path = require('path');
const i18n = require(path.join(__dirname, '../../src/lib/i18n'));

/**
 * Install client-style child i18n (I18n + cpt + childT) into a vm context.
 * @param {object} context
 * @param {string} [locale='sv-SE']
 */
function installChildI18nVm(context, locale) {
  const lang = locale || 'sv-SE';
  i18n.loadLocales();
  const bundle = i18n.getLocale(lang);

  context.window = context.window || {};
  const win = context.window;

  function lookup(key, params) {
    const keys = String(key).split('.');
    let value = bundle;
    for (let i = 0; i < keys.length; i++) {
      value = value && value[keys[i]];
    }
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return String((params && params[k]) != null ? params[k] : '');
    });
  }

  win.I18n = {
    lang: lang,
    locale: bundle,
    t: lookup,
    plural: function (baseKey, count, params) {
      const suffix = Number(count) === 1 ? 'one' : 'other';
      const nested = lookup(baseKey + '.' + suffix, Object.assign({ count: count }, params || {}));
      if (nested && nested !== baseKey + '.' + suffix) return nested;
      return lookup(baseKey + '_' + suffix, Object.assign({ count: count }, params || {}));
    },
  };

  win.cpt = function (key, params) {
    return lookup('child.' + key, params || {});
  };
  win.childPlural = function (key, count, params) {
    const nested = win.I18n.plural('child.' + key, count, params || {});
    if (nested && nested.indexOf('child.' + key) !== 0) return nested;
    const suffix = Number(count) === 1 ? 'one' : 'other';
    return lookup('child.' + key + '_' + suffix, Object.assign({ count: count }, params || {}));
  };
  win.childT = win.cpt;
  win.getChildUiLocale = function () { return lang; };

  context.cpt = win.cpt;
  context.childT = win.cpt;
  context.childPlural = win.childPlural;
  context.I18n = win.I18n;
}

module.exports = { installChildI18nVm };
