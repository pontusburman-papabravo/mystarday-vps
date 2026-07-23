'use strict';

module.exports = {
  name: '1810100000001_english_app_flag',

  up: async (client) => {
    await client.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ($1, false, $2)
       ON CONFLICT (key) DO NOTHING`,
      [
        'english_app',
        'English product UI — when OFF, en-GB locale selection is hidden for existing families; new registrations from /en may still set locale',
      ]
    );
  },

  down: async (client) => {
    await client.query(`DELETE FROM feature_flag WHERE key = 'english_app'`);
  },
};
