/**
 * Re-seed build_project_catalog when empty (migration drift on some local DBs).
 */
const { MVP_CATALOG } = require('../src/lib/seed-build-catalog');

module.exports = {
  name: '1808940000000_reseed_build_catalog',

  up: async (client) => {
    const count = await client.query('SELECT COUNT(*)::int AS n FROM build_project_catalog');
    if (count.rows[0].n > 0) return;

    for (const a of MVP_CATALOG) {
      await client.query(
        `INSERT INTO build_project_catalog
           (slug, name, icon, parts_required, season_slug, unlock_label, sort_order,
            description, world_slug, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (slug) DO NOTHING`,
        [
          a.slug, a.name, a.icon, a.parts, a.season, a.unlock, a.order,
          a.desc, a.world, JSON.stringify(a.config),
        ]
      );
    }
  },

  down: async () => {},
};
