/**
 * Subscription component price metadata (display / IAP reference).
 * Payment path: RevenueCat / App Store / Play Store.
 */

/**
 * @typedef {Object} ComponentDef
 * @property {string} name               - Display name in Swedish
 * @property {number} price_monthly_sek  - Monthly price in SEK
 */

/** @type {Record<string, ComponentDef>} */
const COMPONENT_PRICE_MAP = {
  basic_app: {
    name: 'Basic',
    price_monthly_sek: 59,
  },
  reporting: {
    name: 'Rapportering',
    price_monthly_sek: 19,
  },
  pedagog: {
    name: 'Pedagog',
    price_monthly_sek: 29,
  },
  teacch: {
    name: 'Extra stöd',
    price_monthly_sek: 39,
  },
};

module.exports = { COMPONENT_PRICE_MAP };
