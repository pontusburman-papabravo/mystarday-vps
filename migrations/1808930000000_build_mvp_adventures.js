/**
 * Build-loop MVP — 7 äventyrstyper + utökad katalogmetadata.
 */
module.exports = {
  name: '1808930000000_build_mvp_adventures',

  up: async (client) => {
    await client.query(`
      ALTER TABLE build_project_catalog
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS world_slug VARCHAR(32),
        ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    const adventures = [
      {
        slug: 'racerbil',
        name: 'Mecka med bilen',
        icon: '🏎️',
        parts: 6,
        season: 'vehicles',
        world: 'garage',
        unlock: 'Garaget',
        order: 1,
        desc: 'Bygg din racerbil del för del — mecka, måla och kör i garaget.',
        config: { workshop: ['wheel_change', 'wash', 'tune'], vehicle: true },
      },
      {
        slug: 'husdjur',
        name: 'Ta hand om husdjur',
        icon: '🐾',
        parts: 8,
        season: 'pets',
        world: 'pet_home',
        unlock: 'Husdjurshemmet',
        order: 2,
        desc: 'Mata, borsta och lek med hund, katt, hamster eller häst.',
        config: {
          pet_options: [
            { id: 'hund', label: 'Hund', icon: '🐶' },
            { id: 'katt', label: 'Katt', icon: '🐱' },
            { id: 'hamster', label: 'Hamster', icon: '🐹' },
            { id: 'hast', label: 'Häst', icon: '🐴' },
          ],
          verbs: ['mata', 'klappa', 'borsta', 'promenera'],
        },
      },
      {
        slug: 'dinosaurie',
        name: 'Forska om dinosaurier',
        icon: '🦕',
        parts: 10,
        season: 'dinosaurs',
        world: 'dino_lab',
        unlock: 'Dino-dalen',
        order: 3,
        desc: 'Gräv fram ben, sätt ihop skelett och lär dig fakta om urtiden.',
        config: { verbs: ['grava', 'borsta', 'montera', 'las_skylt'] },
      },
      {
        slug: 'dockhus',
        name: 'Dockor & dockhus',
        icon: '🏠',
        parts: 8,
        season: 'dolls',
        world: 'dollhouse',
        unlock: 'Dockhuset',
        order: 4,
        desc: 'Bygg rum, möbler och dockor — inred ditt eget minihem.',
        config: { verbs: ['bygg_vagg', 'mal', 'inred', 'bjud_in'] },
      },
      {
        slug: 'fiske',
        name: 'Fiska & båtliv',
        icon: '🎣',
        parts: 8,
        season: 'fishing',
        world: 'fishing_dock',
        unlock: 'Båtkajen',
        order: 5,
        desc: 'Bygg båt, spö och drag — fiska och dra upp fångsten.',
        config: { verbs: ['kasta', 'dra', 'hala_upp', 'mata_fisk'] },
      },
      {
        slug: 'laxor',
        name: 'Läxor & lärande',
        icon: '📚',
        parts: 6,
        season: 'learning',
        world: 'study_room',
        unlock: 'Läxbordet',
        order: 6,
        desc: 'Öva bokstäver, siffror, läsa, skriva och matte i lekfullt format.',
        config: {
          modes: [
            { id: 'bokstaver', label: 'Bokstäver', icon: '🔤' },
            { id: 'siffror', label: 'Siffror', icon: '🔢' },
            { id: 'lasa', label: 'Läsa', icon: '📖' },
            { id: 'skriva', label: 'Skriva', icon: '✏️' },
            { id: 'matte', label: 'Matte', icon: '➕' },
          ],
        },
      },
      {
        slug: 'vardag',
        name: 'Vardagsäventyr',
        icon: '⭐',
        parts: 6,
        season: 'routines',
        world: 'routine_home',
        unlock: 'Mitt rum',
        order: 7,
        desc: 'Samma saker som i schemat: bädda säng, klä på dig, frukost, borsta tänder…',
        config: {
          mirrors_activities: true,
          zones: ['morgon', 'hygien', 'mat', 'kvall'],
          example_tasks: [
            'Bädda sängen', 'Klä på dig', 'Äta frukost', 'Borsta tänderna',
            'Packa väskan', 'Hänga av jackan', 'Handtvätt', 'Lägg dig',
          ],
        },
      },
    ];

    for (const a of adventures) {
      await client.query(
        `INSERT INTO build_project_catalog
           (slug, name, icon, parts_required, season_slug, unlock_label, sort_order,
            description, world_slug, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           parts_required = EXCLUDED.parts_required,
           season_slug = EXCLUDED.season_slug,
           unlock_label = EXCLUDED.unlock_label,
           sort_order = EXCLUDED.sort_order,
           description = EXCLUDED.description,
           world_slug = EXCLUDED.world_slug,
           config = EXCLUDED.config`,
        [
          a.slug, a.name, a.icon, a.parts, a.season, a.unlock, a.order,
          a.desc, a.world, JSON.stringify(a.config),
        ]
      );
    }

    await client.query(`
      UPDATE build_project_catalog
      SET sort_order = 90,
          config = config || '{"deprecated":true}'::jsonb
      WHERE slug IN ('rymdraket', 'kompis', 'valp')
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS build_part_grant (
        child_id            UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
        project_id          UUID NOT NULL REFERENCES child_build_project(id) ON DELETE CASCADE,
        daily_log_item_id   UUID NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (child_id, daily_log_item_id)
      )
    `);
  },

  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS build_part_grant');
    await client.query(`
      UPDATE build_project_catalog
      SET sort_order = CASE slug
        WHEN 'racerbil' THEN 1
        WHEN 'dinosaurie' THEN 2
        WHEN 'rymdraket' THEN 3
        WHEN 'kompis' THEN 4
        WHEN 'valp' THEN 5
        ELSE sort_order
      END,
      config = config - 'deprecated'
      WHERE slug IN ('rymdraket', 'kompis', 'valp', 'racerbil', 'dinosaurie')
    `);
    await client.query(`
      DELETE FROM build_project_catalog
      WHERE slug IN ('husdjur', 'dockhus', 'fiske', 'laxor', 'vardag')
    `);
    await client.query(`
      ALTER TABLE build_project_catalog
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS world_slug,
        DROP COLUMN IF EXISTS config
    `);
  },
};
