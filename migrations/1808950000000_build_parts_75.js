/**
 * All MVP äventyr kräver ~75 byggdelar innan världen låses upp.
 */
const { MVP_ADVENTURE_SLUGS, BUILD_PARTS_REQUIRED } = require('../src/lib/build-adventures');

module.exports = {
  name: '1808950000000_build_parts_75',

  up: async (client) => {
    await client.query(
      `UPDATE build_project_catalog
       SET parts_required = $1
       WHERE slug = ANY($2::varchar[])`,
      [BUILD_PARTS_REQUIRED, MVP_ADVENTURE_SLUGS]
    );
  },

  down: async (client) => {
    const legacy = {
      racerbil: 6,
      husdjur: 8,
      dinosaurie: 10,
      dockhus: 8,
      fiske: 8,
      laxor: 6,
      vardag: 6,
    };
    for (const [slug, parts] of Object.entries(legacy)) {
      await client.query(
        'UPDATE build_project_catalog SET parts_required = $1 WHERE slug = $2',
        [parts, slug]
      );
    }
  },
};
