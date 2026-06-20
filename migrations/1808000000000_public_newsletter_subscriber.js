/**
 * Public newsletter / package-interest leads (no parent account required).
 */
module.exports = {
  name: '1808000000000_public_newsletter_subscriber',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public_newsletter_subscriber (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email             TEXT NOT NULL UNIQUE,
        name              TEXT,
        subscribed        BOOLEAN NOT NULL DEFAULT true,
        package_interests TEXT[] NOT NULL DEFAULT '{}',
        source            TEXT NOT NULL DEFAULT 'landing',
        ip_address        TEXT,
        subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        unsubscribed_at   TIMESTAMPTZ,
        unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_public_newsletter_subscribed
      ON public_newsletter_subscriber (subscribed, subscribed_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_public_newsletter_interests
      ON public_newsletter_subscriber USING GIN (package_interests)
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS public_newsletter_subscriber');
  },
};
