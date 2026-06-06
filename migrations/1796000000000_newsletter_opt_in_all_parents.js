/**
 * Opt in all existing parents to email newsletter (email_subscriptions).
 * New parents are already subscribed on registration (auth.js).
 * Users can opt out in Inställningar or via unsubscribe link in emails.
 */
module.exports = {
  name: '1796000000000_newsletter_opt_in_all_parents',

  up: async (client) => {
    const inserted = await client.query(`
      INSERT INTO email_subscriptions (parent_id, email, subscribed, subscribed_at, unsubscribe_token)
      SELECT p.id, p.email, true, NOW(), gen_random_uuid()
      FROM parent p
      WHERE p.email IS NOT NULL
        AND TRIM(p.email) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM email_subscriptions es WHERE es.parent_id = p.id
        )
    `);

    const reenabled = await client.query(`
      UPDATE email_subscriptions
      SET subscribed = true,
          subscribed_at = COALESCE(subscribed_at, NOW()),
          unsubscribed_at = NULL,
          updated_at = NOW()
      WHERE subscribed = false
    `);

    await client.query(`
      UPDATE parent
      SET newsletter_subscribed = true
      WHERE email IS NOT NULL
        AND TRIM(email) <> ''
        AND (newsletter_subscribed IS NULL OR newsletter_subscribed = false)
    `);

    console.log(
      `[MIGRATION] newsletter opt-in: ${inserted.rowCount} new subscriptions, ${reenabled.rowCount} re-enabled`
    );
  },

  down: async () => {
    // Data backfill — prior opt-out state is not restored.
  },
};
