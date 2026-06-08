/** Enable in-app feedback button for all families (was off in seed on fresh VPS). */
module.exports = {
  name: '1798000000000_feedback_formular_live',

  up: async (client) => {
    await client.query(`
      UPDATE features SET status = 'live', updated_at = NOW()
      WHERE slug = 'feedback_formular'
    `);
  },

  down: async (client) => {
    await client.query(`
      UPDATE features SET status = 'off', updated_at = NOW()
      WHERE slug = 'feedback_formular'
    `);
  },
};
