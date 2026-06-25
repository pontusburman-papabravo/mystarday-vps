'use strict';

/**
 * Persist the parent's UI view mode (classic vs magic/"Ny design") on the
 * account so the chosen menu/design follows the parent across devices.
 *
 * Previously the parent toggle was stored only in localStorage (per device),
 * so a parent could see the new design on their phone but the classic menu on
 * an iPad. Children are already server-synced (child_view_config); this adds
 * the equivalent for parents.
 *
 * Values: 'classic' | 'magic'. Default 'classic' (no behavior change for
 * existing accounts; access is still gated by magic_view_enabled).
 */

module.exports = {
  name: '1808670000000_parent_ui_view_mode',

  up: async (client) => {
    await client.query(`
      ALTER TABLE parent
      ADD COLUMN IF NOT EXISTS ui_view_mode VARCHAR(10) NOT NULL DEFAULT 'classic'
    `);
  },

  down: async (client) => {
    await client.query(`
      ALTER TABLE parent
      DROP COLUMN IF EXISTS ui_view_mode
    `);
  },
};
