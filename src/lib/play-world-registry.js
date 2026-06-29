'use strict';

/**
 * Lek-världar — routing & status. Ingen spelmekanik här.
 * @see docs/build-play-worlds-spec.md
 */

const PLAY_WORLD_REGISTRY = {
  racerbil: {
    catalog_slug: 'racerbil',
    href: '/child/garage',
    status: 'live',
    title: 'Garaget',
    icon: '🏎️',
  },
  husdjur: {
    catalog_slug: 'husdjur',
    href: '/child/pet-home',
    status: 'live',
    title: 'Husdjurshemmet',
    icon: '🐾',
  },
  dinosaurie: {
    catalog_slug: 'dinosaurie',
    href: null,
    status: 'planned',
    title: 'Dino-dalen',
    icon: '🦕',
  },
  dockhus: {
    catalog_slug: 'dockhus',
    href: null,
    status: 'planned',
    title: 'Dockhuset',
    icon: '🏠',
  },
  fiske: {
    catalog_slug: 'fiske',
    href: null,
    status: 'planned',
    title: 'Båtkajen',
    icon: '🎣',
  },
  laxor: {
    catalog_slug: 'laxor',
    href: null,
    status: 'planned',
    title: 'Läxbordet',
    icon: '📚',
  },
  vardag: {
    catalog_slug: 'vardag',
    href: null,
    status: 'planned',
    title: 'Mitt rum',
    icon: '⭐',
  },
};

const SHELL_SLUGS = ['dinosaurie', 'dockhus', 'fiske', 'laxor', 'vardag'];

function registryEntry(slug) {
  return PLAY_WORLD_REGISTRY[slug] || null;
}

function playHrefForSlug(catalogSlug) {
  const entry = registryEntry(catalogSlug);
  if (entry && entry.href) return entry.href;
  if (entry && entry.status === 'planned') {
    return '/child/play/' + catalogSlug;
  }
  return '/child/world';
}

function isPlayWorldSlug(slug) {
  return slug in PLAY_WORLD_REGISTRY && slug !== 'racerbil';
}

function livePlaySlugs() {
  return Object.keys(PLAY_WORLD_REGISTRY).filter(function (s) {
    return PLAY_WORLD_REGISTRY[s].status === 'live' && s !== 'racerbil';
  });
}

module.exports = {
  PLAY_WORLD_REGISTRY,
  SHELL_SLUGS,
  registryEntry,
  playHrefForSlug,
  isPlayWorldSlug,
  livePlaySlugs,
};
