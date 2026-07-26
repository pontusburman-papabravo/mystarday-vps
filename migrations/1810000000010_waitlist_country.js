/**
 * Waitlist country_code — optional Q3 on /en/thank-you survey (EU launch).
 */
module.exports = {
  name: '1810000000010_waitlist_country',

  up: async (client) => {
    await client.query(`
      ALTER TABLE waitlist
      ADD COLUMN IF NOT EXISTS country_code CHAR(2)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_country_code ON waitlist (country_code)
      WHERE country_code IS NOT NULL
    `);
  },

  down: async (client) => {
    await client.query('DROP INDEX IF EXISTS idx_waitlist_country_code');
    await client.query(`
      ALTER TABLE waitlist
      DROP COLUMN IF EXISTS country_code
    `);
  },
};
