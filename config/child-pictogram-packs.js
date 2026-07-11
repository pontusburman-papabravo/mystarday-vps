'use strict';

/**
 * Barnets samling — activity pictogram packs (simple / action).
 * Manifest: config/child-pictogram-manifest.json
 * Assets: public/images/child/pictograms/{pack}/{activity-key}@2x.webp
 */

const manifest = require('./child-pictogram-manifest.json');

const DEFAULT_PACK = manifest.default_pack || 'simple';

const PACKS = Object.freeze(
  Object.fromEntries(
    Object.entries(manifest.packs || {}).map(function ([id, meta]) {
      return [id, { id, label: meta.label }];
    })
  )
);

const PACK_IDS = Object.freeze(Object.keys(PACKS));

/** Legacy icon_key (snake_case / spec) → manifest activity key (kebab-case). */
const ICON_KEY_ALIASES = Object.freeze({
  wake_up: 'wake-up',
  wash_hands: 'wash-hands',
  brush_teeth: 'brush-teeth',
  pack_bag: 'pack-bag',
  dress: 'get-dressed',
  coat: 'outerwear',
  backpack: 'pack-bag',
  car: 'travel-car',
  read_book: 'read',
  book: 'read',
  quiet: 'calm-time',
  recess: 'break',
  pause: 'break',
  pe: 'football',
  cafeteria: 'lunch',
  library_room: 'read',
  pencil: 'write',
  art: 'draw',
  computer: 'screen-time',
  playground: 'outdoor-play',
  outside: 'outdoor-play',
  hair_brush: 'comb-hair',
  calm: 'calm-time',
  kitchen: 'cook',
  eat: 'cook',
  drink: 'drink-water',
  toy: 'play',
  screen: 'screen-time',
  toothbrush: 'brush-teeth',
});

const ACTIVITY_KEYS = Object.freeze(new Set(Object.keys(manifest.activities || {})));

const PREVIEW_PATHS = Object.freeze({
  simple: '/images/child/pictograms/preview-simple.webp',
  action: '/images/child/pictograms/preview-action.webp',
});

function normalizeActivityKey(iconKey) {
  if (iconKey == null || String(iconKey).trim() === '') return null;
  const raw = String(iconKey).trim();
  if (ICON_KEY_ALIASES[raw]) return ICON_KEY_ALIASES[raw];
  if (ACTIVITY_KEYS.has(raw)) return raw;
  const kebab = raw.replace(/_/g, '-');
  if (ACTIVITY_KEYS.has(kebab)) return kebab;
  return null;
}

function resolvePack(pack) {
  if (pack == null || String(pack).trim() === '') return DEFAULT_PACK;
  const normalized = String(pack).trim().toLowerCase();
  return PACK_IDS.includes(normalized) ? normalized : DEFAULT_PACK;
}

function packAssetPath(activityKey, packId) {
  const entry = manifest.activities[activityKey];
  if (!entry || !entry.files) return null;
  return entry.files[packId] || null;
}

function resolveActivityAsset(iconKey, pack) {
  const activityKey = normalizeActivityKey(iconKey);
  if (!activityKey) return null;
  const packId = resolvePack(pack);
  const selected = packAssetPath(activityKey, packId);
  if (selected) return selected;
  if (packId !== 'simple') {
    const simple = packAssetPath(activityKey, 'simple');
    if (simple) return simple;
  }
  return null;
}

function activityEmoji(iconKey) {
  const activityKey = normalizeActivityKey(iconKey);
  if (!activityKey) return null;
  const entry = manifest.activities[activityKey];
  return entry && entry.emoji ? entry.emoji : null;
}

function listPacks() {
  return PACK_IDS.map(function (id) {
    return {
      id,
      label: PACKS[id].label,
      preview: PREVIEW_PATHS[id] || null,
    };
  });
}

function listActivityKeys() {
  return Array.from(ACTIVITY_KEYS);
}

module.exports = {
  DEFAULT_PACK,
  PACKS,
  PACK_IDS,
  ICON_KEY_ALIASES,
  ACTIVITY_KEYS,
  PREVIEW_PATHS,
  normalizeActivityKey,
  resolvePack,
  resolveActivityAsset,
  activityEmoji,
  listPacks,
  listActivityKeys,
  manifest,
};
