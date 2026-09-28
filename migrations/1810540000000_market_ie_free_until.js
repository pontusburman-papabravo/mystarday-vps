'use strict';

/**
 * Ireland complimentary launch access cutoff.
 * 2027-01-01T00:00:00.000Z = 2027-01-01 00:00:00 Europe/Dublin.
 * Does not open markets, create subscriptions, or change Swedish entitlements.
 */

const IRELAND_FREE_UNTIL = '2027-01-01T00:00:00.000Z';

module.exports = {
  name: '1810540000000_market_ie_free_until',
  snapshotContract: {
    backwardCompatible: true,
    allowedBusinessTableFingerprintChanges: [],
  },
  up: async (client) => {
    await client.query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('market_ie_free_until', $1::jsonb, NOW())
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify(IRELAND_FREE_UNTIL)]);

    await client.query(`
      INSERT INTO app_config (key, value, description, updated_at)
      VALUES (
        'market_ie_free_until',
        $1,
        'Ireland complimentary launch access ends at this instant (2027-01-01 00:00 Europe/Dublin). No subscription is created.',
        NOW()
      )
      ON CONFLICT (key) DO NOTHING
    `, [IRELAND_FREE_UNTIL]);
  },

  down: async (client) => {
    await client.query(`DELETE FROM app_settings WHERE key = 'market_ie_free_until'`);
    await client.query(`DELETE FROM app_config WHERE key = 'market_ie_free_until'`);
  },
};
