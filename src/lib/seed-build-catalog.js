'use strict';

/**
 * Idempotent seed for build_project_catalog (7 MVP adventures).
 * Fixes local DBs where migrations ran but catalog rows are missing.
 */

const db = require('./db');

const MVP_CATALOG = [
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
    desc: 'Bygg båt, fiska och utforska sjön.',
    config: { verbs: ['kasta', 'dra_in', 'mata', 'polera'] },
  },
  {
    slug: 'laxor',
    name: 'Plugga & läxor',
    icon: '📚',
    parts: 8,
    season: 'school',
    world: 'study_room',
    unlock: 'Läxbordet',
    order: 6,
    desc: 'Plugga, läs och samla stjärnor för skolarbetet.',
    config: { verbs: ['las', 'skriv', 'rakna', 'visa'] },
  },
  {
    slug: 'vardag',
    name: 'Vardagsäventyr',
    icon: '⭐',
    parts: 6,
    season: 'routine',
    world: 'routine_home',
    unlock: 'Mitt rum',
    order: 7,
    desc: 'Samma saker som i schemat: bädda säng, klä på dig, frukost…',
    config: {
      mirrors_activities: true,
      zones: ['morgon', 'hygien', 'mat', 'kvall'],
    },
  },
];

async function ensureBuildCatalog() {
  const count = await db.query('SELECT COUNT(*)::int AS n FROM build_project_catalog');
  if (count.rows[0].n > 0) return { seeded: false, count: count.rows[0].n };

  for (const a of MVP_CATALOG) {
    await db.query(
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

  await db.query(`
    UPDATE build_project_catalog
    SET sort_order = 90,
        config = COALESCE(config, '{}'::jsonb) || '{"deprecated":true}'::jsonb
    WHERE slug IN ('rymdraket', 'kompis', 'valp')
  `).catch(() => {});

  const after = await db.query('SELECT COUNT(*)::int AS n FROM build_project_catalog');
  return { seeded: true, count: after.rows[0].n };
}

module.exports = { ensureBuildCatalog, MVP_CATALOG };
