/**
 * Extra stöd — seven_questions JSONB on activity_template (§7.2, E6).
 */
module.exports = {
  name: '1807100000000_seven_questions',

  up: async (client) => {
    await client.query(`
      ALTER TABLE activity_template
        ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE activity_template DROP COLUMN IF EXISTS seven_questions
    `);
  },
};
