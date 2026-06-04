/**
 * Optional role (mamma/pappa/…) stored on invite until invitee accepts.
 */
module.exports = {
  name: '1793000000000_family_invite_role',

  up: async (client) => {
    await client.query(`
      ALTER TABLE family_invite
      ADD COLUMN IF NOT EXISTS invitee_family_role VARCHAR(32)
    `);
  },
};
