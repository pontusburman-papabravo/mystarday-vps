'use strict';

/**
 * Lek-världar — persistence + shell-världar (v1 placeholder).
 * Handgjorda spel: se docs/build-play-worlds-spec.md + public/build-pet-home.html
 */

const { playHrefForSlug, isPlayWorldSlug, SHELL_SLUGS } = require('./play-world-registry');
const { normalizePetHomeState, DEFAULT_PET_HOME } = require('./play/pet-home-state');

const PLAY_WORLD_SLUGS = ['husdjur', ...SHELL_SLUGS];

const PLAY_WORLDS = {
  husdjur: {
    catalog_slug: 'husdjur',
    title: 'Husdjurshemmet',
    icon: '🐾',
    subtitle: 'Mata, borsta och lek med din kompis!',
    game: 'pet-home',
    defaults: DEFAULT_PET_HOME,
  },
  dinosaurie: {
    catalog_slug: 'dinosaurie',
    title: 'Dino-dalen',
    icon: '🦕',
    subtitle: 'Gräv, borsta ben och bygg skelett!',
    theme: 'bpw--dino',
    hero_svg: '/img/build/svg/dino-hero.svg',
    scene_svg: '/img/build/svg/dino-scene.svg',
    stats: [
      { key: 'bones', label: 'Ben', icon: '🦴', max: 10 },
      { key: 'skeleton', label: 'Skelett', icon: '🦕', max: 100 },
      { key: 'knowledge', label: 'Fakta', icon: '📋', max: 100 },
    ],
    pickers: [{
      key: 'dino_id',
      label: 'Välj dinosaurie',
      options: [
        { id: 'trex', label: 'T-rex', icon: '🦖' },
        { id: 'triceratops', label: 'Triceratops', icon: '🦕' },
        { id: 'stego', label: 'Stegosaurus', icon: '🦴' },
      ],
    }],
    actions: [
      { id: 'dig', label: 'Gräv', icon: '⛏️' },
      { id: 'brush', label: 'Borsta', icon: '🖌️' },
      { id: 'assemble', label: 'Montera', icon: '🧩' },
      { id: 'read', label: 'Läs fakta', icon: '📖' },
    ],
    defaults: { dino_id: 'trex', bones: 2, skeleton: 20, knowledge: 10 },
  },
  dockhus: {
    catalog_slug: 'dockhus',
    title: 'Dockhuset',
    icon: '🏠',
    subtitle: 'Bygg rum, måla och bjud in gäster!',
    theme: 'bpw--doll',
    hero_svg: '/img/build/svg/doll-hero.svg',
    scene_svg: '/img/build/svg/doll-scene.svg',
    stats: [
      { key: 'rooms', label: 'Rum', icon: '🚪', max: 4 },
      { key: 'decor', label: 'Inredning', icon: '🛋️', max: 100 },
      { key: 'guests', label: 'Gäster', icon: '🎉', max: 10 },
    ],
    pickers: [{
      key: 'room_id',
      label: 'Välj rum',
      options: [
        { id: 'living', label: 'Vardagsrum', icon: '🛋️' },
        { id: 'bedroom', label: 'Sovrum', icon: '🛏️' },
        { id: 'kitchen', label: 'Kök', icon: '🍳' },
      ],
    }],
    actions: [
      { id: 'paint', label: 'Måla', icon: '🎨' },
      { id: 'furnish', label: 'Inred', icon: '🪑' },
      { id: 'invite', label: 'Bjud in', icon: '💌' },
      { id: 'play', label: 'Lek', icon: '🪆' },
    ],
    defaults: { room_id: 'living', rooms: 1, decor: 30, guests: 0 },
  },
  fiske: {
    catalog_slug: 'fiske',
    title: 'Båtkajen',
    icon: '🎣',
    subtitle: 'Kasta, dra in och hala upp fångsten!',
    theme: 'bpw--fish',
    hero_svg: '/img/build/svg/fish-hero.svg',
    scene_svg: '/img/build/svg/fish-scene.svg',
    stats: [
      { key: 'catch', label: 'Fiskar', icon: '🐠', max: 20 },
      { key: 'boat', label: 'Båt', icon: '⛵', max: 100 },
      { key: 'shine', label: 'Glans', icon: '✨', max: 100 },
    ],
    pickers: [{
      key: 'spot_id',
      label: 'Fiskeplats',
      options: [
        { id: 'dock', label: 'Bryggan', icon: '🎣' },
        { id: 'lake', label: 'Sjön', icon: '🏞️' },
        { id: 'boat', label: 'Båten', icon: '⛵' },
      ],
    }],
    actions: [
      { id: 'cast', label: 'Kasta', icon: '🎣' },
      { id: 'reel', label: 'Dra in', icon: '🔄' },
      { id: 'polish', label: 'Polera båt', icon: '✨' },
      { id: 'feed_fish', label: 'Mata fisk', icon: '🐟' },
    ],
    defaults: { spot_id: 'dock', catch: 0, boat: 50, shine: 80 },
  },
  laxor: {
    catalog_slug: 'laxor',
    title: 'Läxbordet',
    icon: '📚',
    subtitle: 'Läs, skriv och räkna — lekfullt!',
    theme: 'bpw--study',
    hero_svg: '/img/build/svg/study-hero.svg',
    scene_svg: '/img/build/svg/study-scene.svg',
    stats: [
      { key: 'letters', label: 'Bokstäver', icon: '🔤', max: 26 },
      { key: 'math', label: 'Räkna', icon: '🔢', max: 100 },
      { key: 'books', label: 'Läst', icon: '📖', max: 10 },
    ],
    pickers: [{
      key: 'subject_id',
      label: 'Välj ämne',
      options: [
        { id: 'abc', label: 'Alfabetet', icon: '🔤' },
        { id: 'math', label: 'Matte', icon: '➕' },
        { id: 'read', label: 'Läsa', icon: '📖' },
      ],
    }],
    actions: [
      { id: 'write', label: 'Skriv', icon: '✏️' },
      { id: 'count', label: 'Räkna', icon: '🔢' },
      { id: 'read', label: 'Läs', icon: '📖' },
      { id: 'show', label: 'Visa', icon: '⭐' },
    ],
    defaults: { subject_id: 'abc', letters: 3, math: 15, books: 1 },
  },
  vardag: {
    catalog_slug: 'vardag',
    title: 'Mitt rum',
    icon: '⭐',
    subtitle: 'Ditt eget mysiga rum — som i schemat!',
    theme: 'bpw--room',
    hero_svg: '/img/build/svg/room-hero.svg',
    scene_svg: '/img/build/svg/room-scene.svg',
    stats: [
      { key: 'cozy', label: 'Mys', icon: '🛏️', max: 100 },
      { key: 'tidy', label: 'Städat', icon: '🧹', max: 100 },
      { key: 'stars', label: 'Stjärnor', icon: '⭐', max: 20 },
    ],
    pickers: [{
      key: 'zone_id',
      label: 'Tid på dygnet',
      options: [
        { id: 'morning', label: 'Morgon', icon: '🌅' },
        { id: 'day', label: 'Dag', icon: '☀️' },
        { id: 'evening', label: 'Kväll', icon: '🌙' },
      ],
    }],
    actions: [
      { id: 'bed', label: 'Bädda', icon: '🛏️' },
      { id: 'teeth', label: 'Tänder', icon: '🪥' },
      { id: 'dress', label: 'Klä på', icon: '👕' },
      { id: 'breakfast', label: 'Frukost', icon: '🥣' },
    ],
    defaults: { zone_id: 'morning', cozy: 60, tidy: 70, stars: 2 },
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function worldConfig(slug) {
  return PLAY_WORLDS[slug] || null;
}

function normalizePlayCustomization(slug, raw) {
  if (slug === 'husdjur') return normalizePetHomeState(raw);
  const cfg = worldConfig(slug);
  if (!cfg) return {};
  const c = { ...cfg.defaults, ...(raw && typeof raw === 'object' ? raw : {}) };
  (cfg.stats || []).forEach(function (s) {
    c[s.key] = clamp(c[s.key], 0, s.max);
  });
  (cfg.pickers || []).forEach(function (p) {
    const ids = p.options.map(function (o) { return o.id; });
    if (ids.indexOf(c[p.key]) < 0) c[p.key] = cfg.defaults[p.key];
  });
  if (Array.isArray(raw && raw.milestone_perks)) {
    c.milestone_perks = raw.milestone_perks.filter(Boolean);
  }
  return c;
}

function applyPlayAction(slug, customization, actionId) {
  const c = { ...customization };
  const messages = {
    husdjur: {
      feed: { hunger: Math.min(100, (c.hunger || 0) + 25), happiness: Math.min(100, (c.happiness || 0) + 8), msg: 'Nom nom! Husdjuret är mätt 🥣' },
      brush: { cleanliness: 100, happiness: Math.min(100, (c.happiness || 0) + 12), msg: 'Så mjuk och fin päls! 🪮' },
      pet: { happiness: Math.min(100, (c.happiness || 0) + 15), msg: 'Gos-gos! Den är så glad 🤚' },
      walk: { happiness: Math.min(100, (c.happiness || 0) + 10), hunger: Math.max(0, (c.hunger || 0) - 8), msg: 'Bra promenad! 🦮' },
    },
    dinosaurie: {
      dig: { bones: Math.min(10, (c.bones || 0) + 1), msg: 'Du grävde fram ett ben! ⛏️' },
      brush: { skeleton: Math.min(100, (c.skeleton || 0) + 8), msg: 'Benet är rent och fint 🖌️' },
      assemble: { skeleton: Math.min(100, (c.skeleton || 0) + 12), msg: 'Skelettet växer! 🧩' },
      read: { knowledge: Math.min(100, (c.knowledge || 0) + 15), msg: 'Coolt dino-fakta! 📖' },
    },
    dockhus: {
      paint: { decor: Math.min(100, (c.decor || 0) + 12), msg: 'Så fint målat! 🎨' },
      furnish: { decor: Math.min(100, (c.decor || 0) + 15), rooms: Math.min(4, (c.rooms || 0) + (c.decor > 80 ? 0 : 0)), msg: 'Ny möbel på plats! 🪑' },
      invite: { guests: Math.min(10, (c.guests || 0) + 1), msg: 'Gäst på besök! 💌' },
      play: { decor: Math.min(100, (c.decor || 0) + 8), guests: Math.min(10, (c.guests || 0) + 1), msg: 'Lek i dockhuset! 🪆' },
    },
    fiske: {
      cast: { msg: 'Plask! Spöet är i vattnet 🎣' },
      reel: { catch: Math.min(20, (c.catch || 0) + 1), msg: 'Du fångade en fisk! 🐠' },
      polish: { shine: 100, boat: Math.min(100, (c.boat || 0) + 10), msg: 'Båten glänser! ✨' },
      feed_fish: { catch: Math.min(20, (c.catch || 0)), msg: 'Fiskarna är glada 🐟' },
    },
    laxor: {
      write: { letters: Math.min(26, (c.letters || 0) + 1), msg: 'Bra bokstav! ✏️' },
      count: { math: Math.min(100, (c.math || 0) + 12), msg: 'Rätt svar! 🔢' },
      read: { books: Math.min(10, (c.books || 0) + 1), msg: 'Fint läst! 📖' },
      show: { math: Math.min(100, (c.math || 0) + 8), letters: Math.min(26, (c.letters || 0) + 1), msg: 'Du visade hur duktig du är! ⭐' },
    },
    vardag: {
      bed: { cozy: Math.min(100, (c.cozy || 0) + 15), tidy: Math.min(100, (c.tidy || 0) + 10), msg: 'Sängen är bäddad! 🛏️' },
      teeth: { tidy: Math.min(100, (c.tidy || 0) + 12), stars: Math.min(20, (c.stars || 0) + 1), msg: 'Pärlvita tänder! 🪥' },
      dress: { tidy: Math.min(100, (c.tidy || 0) + 10), msg: 'Snyggt påklädd! 👕' },
      breakfast: { cozy: Math.min(100, (c.cozy || 0) + 10), stars: Math.min(20, (c.stars || 0) + 1), msg: 'Gott frukost! 🥣' },
    },
  };
  const worldActions = messages[slug] || {};
  const effect = worldActions[actionId];
  if (!effect) return { customization: c, message: 'Bra jobbat!' };
  const patch = { ...effect };
  const msg = patch.msg;
  delete patch.msg;
  Object.assign(c, patch);
  return { customization: normalizePlayCustomization(slug, c), message: msg };
}

function publicWorldConfig(slug) {
  const cfg = worldConfig(slug);
  if (!cfg) return null;
  return {
    catalog_slug: cfg.catalog_slug,
    title: cfg.title,
    icon: cfg.icon,
    subtitle: cfg.subtitle,
    theme: cfg.theme,
    hero_svg: cfg.hero_svg,
    scene_svg: cfg.scene_svg,
    stats: cfg.stats,
    pickers: cfg.pickers,
    actions: cfg.actions,
    play_href: playHrefForSlug(slug),
  };
}

module.exports = {
  PLAY_WORLD_SLUGS,
  PLAY_WORLDS,
  isPlayWorldSlug,
  worldConfig,
  playHrefForSlug,
  normalizePlayCustomization,
  applyPlayAction,
  publicWorldConfig,
};
