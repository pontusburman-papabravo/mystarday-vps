/**
 * Ensure every parent with email has an active newsletter subscription.
 * Fixes admin prenumerantlista showing "Avslutad" after incomplete backfill.
 */
const { backfillAllParentsNewsletterSubscriptions } = require('../src/lib/newsletter-subscribe');

module.exports = {
  name: '1804000000000_ensure_all_parents_newsletter_subscribed',

  up: async (client) => {
    const { inserted, reenabled } = await backfillAllParentsNewsletterSubscriptions(client);
    console.log(
      `[MIGRATION] newsletter ensure-all: ${inserted} new, ${reenabled} re-enabled`
    );
  },

  down: async () => {
    // Data backfill — prior opt-out state is not restored.
  },
};
