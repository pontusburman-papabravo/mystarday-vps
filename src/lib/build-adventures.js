'use strict';

/**
 * MVP build-loop — 7 äventyrstyper (metadata + hjälpare).
 * Katalograd i DB är source of truth; detta speglar defaults för tester/fallback.
 */

const MVP_ADVENTURE_SLUGS = [
  'racerbil',
  'husdjur',
  'dinosaurie',
  'dockhus',
  'fiske',
  'laxor',
  'vardag',
];

/** Delar att samla per äventyr innan världen låses upp. */
const BUILD_PARTS_REQUIRED = 75;

const WORLD_LABELS = {
  garage: 'Garaget',
  pet_home: 'Husdjurshemmet',
  dino_lab: 'Dino-dalen',
  dollhouse: 'Dockhuset',
  fishing_dock: 'Båtkajen',
  study_room: 'Läxbordet',
  routine_home: 'Mitt rum',
};

function enrichCatalogRow(row) {
  if (!row) return null;
  const config = row.config && typeof row.config === 'object' ? row.config : {};
  if (config.deprecated) return null;
  return {
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    description: row.description || '',
    parts_required: row.parts_required,
    season_slug: row.season_slug,
    world_slug: row.world_slug || null,
    world_label: WORLD_LABELS[row.world_slug] || row.unlock_label,
    unlock_label: row.unlock_label,
    sort_order: row.sort_order,
    config,
  };
}

function filterMvpCatalog(rows) {
  return (rows || [])
    .map(enrichCatalogRow)
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function isMvpSlug(slug) {
  return MVP_ADVENTURE_SLUGS.includes(slug);
}

function partLabelForProject(partsCollected, partsRequired) {
  const n = partsCollected + 1;
  const total = partsRequired || BUILD_PARTS_REQUIRED;
  return 'Del ' + Math.min(n, total) + ' av ' + total;
}

module.exports = {
  MVP_ADVENTURE_SLUGS,
  BUILD_PARTS_REQUIRED,
  WORLD_LABELS,
  enrichCatalogRow,
  filterMvpCatalog,
  isMvpSlug,
  partLabelForProject,
};
