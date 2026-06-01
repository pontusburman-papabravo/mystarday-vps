/**
 * Optional role (mamma/pappa/…) stored on invite until invitee accepts.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE family_invite
    ADD COLUMN IF NOT EXISTS invitee_family_role VARCHAR(32);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE family_invite
    DROP COLUMN IF EXISTS invitee_family_role;
  `);
};
