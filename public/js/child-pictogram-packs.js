/**
 * child-pictogram-packs.js — Barnets samling activity pictogram packs (client).
 * Gate: barnets_samling ON. Priority: photo → pack → simple → legacy pictogram/emoji.
 */
(function () {
  'use strict';

  const DEFAULT_PACK = 'simple';

  const PACKS = {
    simple: { id: 'simple', labelKey: 'settings.pictogramPackSimple', preview: '/images/child/pictograms/preview-simple.webp' },
    action: { id: 'action', labelKey: 'settings.pictogramPackAction', preview: '/images/child/pictograms/preview-action.webp' },
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

  /** Longest label first — matches manifest label_sv + common schedule names. */
  const NAME_LABELS = [
    ['plocka undan leksaker', 'tidy-toys'],
    ['gå ut och leka', 'outdoor-play'],
    ['ta på ytterkläder', 'outerwear'],
    ['borsta tänderna', 'brush-teeth'],
    ['tvätta händerna', 'wash-hands'],
    ['tvätta ansiktet', 'wash-face'],
    ['ta på pyjamas', 'pajamas'],
    ['packa väskan', 'pack-bag'],
    ['gå hemifrån', 'leave-home'],
    ['dricka vatten', 'drink-water'],
    ['lugn stund', 'calm-time'],
    ['plocka undan', 'clear-table'],
    ['klä på sig', 'get-dressed'],
    ['kamma håret', 'comb-hair'],
    ['mellanmål', 'snack'],
    ['skärmtid', 'screen-time'],
    ['kvällsaktivitet', 'screen-time'],
    ['pyjamas', 'pajamas'],
    ['frukost', 'breakfast'],
    ['middag', 'dinner'],
    ['lunch', 'lunch'],
    ['förskola', 'preschool'],
    ['skola', 'school'],
    ['läxor', 'homework'],
    ['läsa', 'read'],
    ['skriva', 'write'],
    ['räkna', 'math'],
    ['städa', 'clean-room'],
    ['leka', 'play'],
    ['sova', 'sleep'],
    ['vakna', 'wake-up'],
    ['toalett', 'toilet'],
    ['duscha', 'shower'],
    ['bada', 'bath'],
    ['medicin', 'medicine'],
    ['promenad', 'walk'],
    ['cykla', 'bike'],
    ['simma', 'swim'],
    ['fotboll', 'football'],
    ['träning', 'exercise'],
    ['paus', 'break'],
    ['musik', 'music'],
    ['dansa', 'dance'],
    ['rita', 'draw'],
    ['pyssla', 'craft'],
    ['bygga', 'build'],
    ['äta frukt', 'fruit'],
    ['laga mat', 'cook'],
    ['duka', 'set-table'],
    ['åka bil', 'travel-car'],
  ];

  const EMOJI_TO_KEYS = (function () {
    const map = {};
    Object.keys(ACTIVITY_EMOJI).forEach(function (key) {
      const emoji = ACTIVITY_EMOJI[key];
      if (!emoji) return;
      if (!map[emoji]) map[emoji] = [];
      map[emoji].push(key);
    });
    return map;
  })();

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

  function normalizeActivityName(name) {
    return String(name || '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .trim()
      .toLowerCase();
  }

  function matchNameToActivityKey(name) {
    const normalized = normalizeActivityName(name);
    if (!normalized) return null;
    for (let i = 0; i < NAME_LABELS.length; i++) {
      const label = NAME_LABELS[i][0];
      const key = NAME_LABELS[i][1];
      if (normalized === label || normalized.indexOf(label) >= 0) return key;
    }
    return null;
  }

  function matchEmojiToActivityKey(emoji) {
    const icon = String(emoji || '').trim();
    if (!icon) return null;
    const keys = EMOJI_TO_KEYS[icon];
    if (!keys || keys.length !== 1) return null;
    return keys[0];
  }

  /** icon_key → Swedish name → single-match emoji (legacy activities). */
  function inferActivityKey(item) {
    if (!item || typeof item !== 'object') return null;
    const fromKey = normalizeActivityKey(item.icon_key);
    if (fromKey) return fromKey;
    const fromName = matchNameToActivityKey(item.name);
    if (fromName) return fromName;
    return matchEmojiToActivityKey(item.icon);
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
    const activityKey = typeof iconKey === 'object'
      ? inferActivityKey(iconKey)
      : normalizeActivityKey(iconKey);
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
    const activityKey = typeof iconKey === 'object'
      ? inferActivityKey(iconKey)
      : normalizeActivityKey(iconKey);
    if (!activityKey) return null;
    return ACTIVITY_EMOJI[activityKey] || null;
  }

  function packLabel(pack) {
    if (pack.labelKey && typeof window.cpt === 'function') {
      const localized = cpt(pack.labelKey);
      if (localized && localized !== 'child.' + pack.labelKey) return localized;
    }
    if (pack.labelKey && typeof window.childT === 'function') {
      const localized = childT(pack.labelKey);
      if (localized) return localized;
    }
    return pack.id;
  }

  function listPacks() {
    return PACK_IDS.map(function (id) {
      const pack = PACKS[id];
      return { id: pack.id, label: packLabel(pack), preview: pack.preview };
    });
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
    packLabel: packLabel,
    resolvePack: resolvePack,
    resolveActivityAsset: resolveActivityAsset,
    normalizeActivityKey: normalizeActivityKey,
    inferActivityKey: inferActivityKey,
    matchNameToActivityKey: matchNameToActivityKey,
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
