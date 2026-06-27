/**
 * Optional campaign_ref on survey_responses — links /tyck submits to För dig email cohort.
 */
module.exports = {
  name: '1808930000000_survey_response_campaign_ref',

  up: async (client) => {
    await client.query(`
      ALTER TABLE survey_responses
        ADD COLUMN IF NOT EXISTS campaign_ref VARCHAR(64)
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE survey_responses
        DROP COLUMN IF EXISTS campaign_ref
    `);
  },
};
