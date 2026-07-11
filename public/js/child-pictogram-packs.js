/**
 * child-pictogram-packs.js — Barnets samling activity pictogram packs (client).
 * Gate: barnets_samling ON. Priority: photo → pack → simple → legacy pictogram/emoji.
 */
(function () {
  'use strict';

  const DEFAULT_PACK = 'simple';

  const PACKS = {
    simple: { id: 'simple', label: 'Tydliga bilder', preview: '/images/child/pictograms/preview-simple.webp' },
    action: { id: 'action', label: 'Aktiva bilder', preview: '/images/child/pictograms/preview-action.webp' },
  };

  const PACK_IDS = ['simple', 'action'];

  const ICON_KEY_ALIASES = {
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
  };

  const ACTIVITY_KEYS = new Set([
    'wake-up', 'toilet', 'wash-hands', 'wash-face', 'brush-teeth', 'comb-hair', 'shower', 'bath',
    'get-dressed', 'outerwear', 'medicine', 'breakfast', 'snack', 'lunch', 'dinner', 'drink-water',
    'fruit', 'cook', 'set-table', 'clear-table', 'preschool', 'school', 'pack-bag', 'leave-home',
    'homework', 'read', 'write', 'math', 'clean-room', 'tidy-toys', 'play', 'build', 'draw', 'craft',
    'music', 'dance', 'outdoor-play', 'walk', 'bike', 'swim', 'football', 'exercise', 'break',
    'calm-time', 'screen-time', 'travel-car', 'pajamas', 'sleep',
  ]);

  const ACTIVITY_EMOJI = {
    'wake-up': '🌅', toilet: '🚽', 'wash-hands': '🧼', 'wash-face': '🫧', 'brush-teeth': '🪥',
    'comb-hair': '🪮', shower: '🚿', bath: '🛁', 'get-dressed': '👕', outerwear: '🧥', medicine: '💊',
    breakfast: '🥣', snack: '🍎', lunch: '🥪', dinner: '🍽️', 'drink-water': '🥤', fruit: '🍌',
    cook: '🍳', 'set-table': '🍽️', 'clear-table': '🧺', preschool: '🏠', school: '🏫',
    'pack-bag': '🎒', 'leave-home': '🚪', homework: '📚', read: '📖', write: '✏️', math: '➕',
    'clean-room': '🧹', 'tidy-toys': '🧸', play: '🪁', build: '🧱', draw: '🖍️', craft: '✂️',
    music: '🎵', dance: '🕺', 'outdoor-play': '🌳', walk: '👣', bike: '🚲', swim: '🏊',
    football: '⚽', exercise: '🏃', break: '⏸️', 'calm-time': '🪷', 'screen-time': '📱',
    'travel-car': '🚗', pajamas: '🌙', sleep: '😴',
  };

  const ASSET_BASE = '/images/child/pictograms';

  let _activePackId = DEFAULT_PACK;
  let _savedPackId = DEFAULT_PACK;

  function isSamlingGateOn() {
    if (typeof document !== 'undefined'
        && document.documentElement.getAttribute('data-barnets-samling') === 'on') {
      return true;
    }
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function isEnabled() {
    return isSamlingGateOn();
  }

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
    if (!activityKey || !packId) return null;
    return ASSET_BASE + '/' + packId + '/' + activityKey + '@2x.webp';
  }

  function resolveActivityAsset(iconKey, pack) {
    const activityKey = normalizeActivityKey(iconKey);
    if (!activityKey) return null;
    const packId = resolvePack(pack);
    const selected = packAssetPath(activityKey, packId);
    if (packId === 'simple' || packId === 'action') {
      if (packId === 'action') {
        return selected || packAssetPath(activityKey, 'simple');
      }
      return selected;
    }
    return selected;
  }

  function activityEmoji(iconKey) {
    const activityKey = normalizeActivityKey(iconKey);
    if (!activityKey) return null;
    return ACTIVITY_EMOJI[activityKey] || null;
  }

  function listPacks() {
    return PACK_IDS.map(function (id) { return PACKS[id]; });
  }

  function getActivePackId() {
    return _activePackId;
  }

  function getSavedPackId() {
    return _savedPackId;
  }

  function readPackFromConfig(viewConfig) {
    if (!viewConfig || viewConfig.pictogram_pack == null) return DEFAULT_PACK;
    return resolvePack(viewConfig.pictogram_pack);
  }

  function applyFromConfig(viewConfig, opts) {
    opts = opts || {};
    const packId = readPackFromConfig(viewConfig);
    _savedPackId = packId;
    _activePackId = packId;
    if (!opts.silent && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-pictogram-pack-applied', {
        detail: { packId: packId },
      }));
    }
    return packId;
  }

  function applyPreview(packId) {
    _activePackId = resolvePack(packId);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-pictogram-pack-preview', {
        detail: { packId: _activePackId },
      }));
    }
  }

  function revertToSaved(opts) {
    opts = opts || {};
    _activePackId = _savedPackId;
    if (!opts.silent && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-pictogram-pack-preview', {
        detail: { packId: _activePackId },
      }));
    }
  }

  function commitSaved(packId) {
    const resolved = resolvePack(packId);
    _savedPackId = resolved;
    _activePackId = resolved;
  }

  function childPayloadWithPack(child, packId) {
    const base = child && typeof child === 'object' ? Object.assign({}, child) : {};
    const cfg = Object.assign({}, base.child_view_config || {});
    cfg.pictogram_pack = resolvePack(packId);
    base.child_view_config = cfg;
    return base;
  }

  window.ChildPictogramPacks = {
    DEFAULT_PACK: DEFAULT_PACK,
    PACKS: PACKS,
    listPacks: listPacks,
    resolvePack: resolvePack,
    resolveActivityAsset: resolveActivityAsset,
    normalizeActivityKey: normalizeActivityKey,
    activityEmoji: activityEmoji,
    isEnabled: isEnabled,
    isSamlingGateOn: isSamlingGateOn,
    getActivePackId: getActivePackId,
    getSavedPackId: getSavedPackId,
    readPackFromConfig: readPackFromConfig,
    applyFromConfig: applyFromConfig,
    applyPreview: applyPreview,
    revertToSaved: revertToSaved,
    commitSaved: commitSaved,
    childPayloadWithPack: childPayloadWithPack,
  };
})();
