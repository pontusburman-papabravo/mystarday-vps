/**
 * Subscription component definitions.
 * Maps component names to Stripe price IDs and display metadata.
 *
 * Payment UI is NOT yet activated — this is the configuration only.
 * When payment is enabled, set STRIPE_ENABLED=true and configure the price IDs below.
 */

/**
 * @typedef {Object} ComponentDef
 * @property {string} stripe_price_id    - Stripe Price ID (set when payment is activated)
 * @property {string} name               - Display name in Swedish
 * @property {number} price_monthly_sek  - Monthly price in SEK
 */

/** @type {Record<string, ComponentDef>} */
const STRIPE_COMPONENT_MAP = {
  basic_app: {
    stripe_price_id: null, // TODO: configure when payment is activated
    name: 'Basic',
    price_monthly_sek: 59,
  },
  reporting: {
    stripe_price_id: null, // TODO: configure when payment is activated
    name: 'Rapportering',
    price_monthly_sek: 19,
  },
  pedagog: {
    stripe_price_id: null,
    name: 'Pedagog',
    price_monthly_sek: 29,
  },
  teacch: {
    stripe_price_id: null,
    name: 'Extra stöd',
    price_monthly_sek: 39,
  },
};

/**
 * Whether Stripe payment is currently active.
 * When false, no payment UI is shown and trial logic is DB-only.
 */
const STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';

module.exports = { STRIPE_COMPONENT_MAP, STRIPE_ENABLED };