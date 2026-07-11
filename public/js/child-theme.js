/**
 * child-theme.js — Per-child visual theme for Barnets samling (presentation only).
 * Gate: barnets_samling ON. Does not use legacy Min värld house themes.
 * PR 1: CSS accents + emoji icon fallback. Background/icon assets in follow-up PRs.
 */
(function () {
  'use strict';

  const DEFAULT_THEME = 'fantasy';

  const THEME_IDS = [
    'space',
    'dinosaurs',
    'cars',
    'dolls',
    'airplanes',
    'animals',
    'fantasy',
  ];

  const ASSET_BASE = '/images/child/themes';

  const CHILD_THEMES = {
    space: {
      label: 'Rymd',
      className: 'theme-space',
      roomHint: 'stjärnarkiv',
      accents: { primary: '#6C5CE7', soft: '#A29BFE', glow: '#F4C542' },
      icons: { today: '☀️', collection: '🏆', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/space/background@2x.webp',
        today: ASSET_BASE + '/space/icon-today@2x.webp',
        collection: ASSET_BASE + '/space/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/space/icon-treasure@2x.webp',
        family: ASSET_BASE + '/space/icon-family@2x.webp',
      },
    },
    dinosaurs: {
      label: 'Dinosaurier',
      className: 'theme-dinosaurs',
      roomHint: 'dino-museum',
      accents: { primary: '#8A9A5B', soft: '#C4B59A', glow: '#F5C542' },
      icons: { today: '🌞', collection: '🦴', treasure: '🥚', family: '💚' },
      assets: {
        background: ASSET_BASE + '/dinosaurs/background@2x.webp',
        today: ASSET_BASE + '/dinosaurs/icon-today@2x.webp',
        collection: ASSET_BASE + '/dinosaurs/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/dinosaurs/icon-treasure@2x.webp',
        family: ASSET_BASE + '/dinosaurs/icon-family@2x.webp',
      },
    },
    cars: {
      label: 'Bilar',
      className: 'theme-cars',
      roomHint: 'garagepokalrum',
      accents: { primary: '#3B82C4', soft: '#E8DCC8', glow: '#F5A623' },
      icons: { today: '☀️', collection: '🏁', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/cars/background@2x.webp',
        today: ASSET_BASE + '/cars/icon-today@2x.webp',
        collection: ASSET_BASE + '/cars/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/cars/icon-treasure@2x.webp',
        family: ASSET_BASE + '/cars/icon-family@2x.webp',
      },
    },
    dolls: {
      label: 'Dockor',
      className: 'theme-dolls',
      roomHint: 'dockhus-samlingsrum',
      accents: { primary: '#F8A8C8', soft: '#FFF5E6', glow: '#FFD966' },
      icons: { today: '🌞', collection: '🏆', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/dolls/background@2x.webp',
        today: ASSET_BASE + '/dolls/icon-today@2x.webp',
        collection: ASSET_BASE + '/dolls/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/dolls/icon-treasure@2x.webp',
        family: ASSET_BASE + '/dolls/icon-family@2x.webp',
      },
    },
    airplanes: {
      label: 'Flygplan',
      className: 'theme-airplanes',
      roomHint: 'flygarkiv',
      accents: { primary: '#A4C8E1', soft: '#FDF5E6', glow: '#F4C542' },
      icons: { today: '☀️', collection: '🏆', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/airplanes/background@2x.webp',
        today: ASSET_BASE + '/airplanes/icon-today@2x.webp',
        collection: ASSET_BASE + '/airplanes/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/airplanes/icon-treasure@2x.webp',
        family: ASSET_BASE + '/airplanes/icon-family@2x.webp',
      },
    },
    animals: {
      label: 'Djur',
      className: 'theme-animals',
      roomHint: 'skogssamling',
      accents: { primary: '#7A9E7E', soft: '#F5EDD6', glow: '#E8B84A' },
      icons: { today: '🌞', collection: '🐾', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/animals/background@2x.webp',
        today: ASSET_BASE + '/animals/icon-today@2x.webp',
        collection: ASSET_BASE + '/animals/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/animals/icon-treasure@2x.webp',
        family: ASSET_BASE + '/animals/icon-family@2x.webp',
      },
    },
    fantasy: {
      label: 'Fantasi',
      className: 'theme-fantasy',
      roomHint: 'magiskt samlingsrum',
      accents: { primary: '#9B7FD4', soft: '#F3E8FF', glow: '#F5C542' },
      icons: { today: '☀️', collection: '🏆', treasure: '🎁', family: '❤️' },
      assets: {
        background: ASSET_BASE + '/fantasy/background@2x.webp',
        today: ASSET_BASE + '/fantasy/icon-today@2x.webp',
        collection: ASSET_BASE + '/fantasy/icon-collection@2x.webp',
        treasure: ASSET_BASE + '/fantasy/icon-treasure@2x.webp',
        family: ASSET_BASE + '/fantasy/icon-family@2x.webp',
      },
    },
  };

  const WORLD_ICON_KEYS = {
    today: 'today',
    collection: 'collection',
    treasure: 'treasure',
    family: 'family',
    world: 'treasure',
    universe: 'treasure',
  };

  let _activeThemeId = DEFAULT_THEME;
  let _applied = false;

  function isSamlingGateOn() {
    if (typeof document === 'undefined') return false;
    if (document.documentElement.getAttribute('data-barnets-samling') === 'on') return true;
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function normalizeThemeId(raw) {
    if (raw == null || raw === '') return DEFAULT_THEME;
    const id = String(raw).trim().toLowerCase();
    return THEME_IDS.indexOf(id) >= 0 ? id : DEFAULT_THEME;
  }

  function resolveTheme(child) {
    if (!child || typeof child !== 'object') return DEFAULT_THEME;
    const direct = child.visual_theme;
    const nested = child.child_view_config && child.child_view_config.visual_theme;
    return normalizeThemeId(direct || nested || DEFAULT_THEME);
  }

  function getTheme(themeId) {
    const id = normalizeThemeId(themeId);
    return CHILD_THEMES[id] || CHILD_THEMES[DEFAULT_THEME];
  }

  function getActiveThemeId() {
    return _activeThemeId;
  }

  function clearThemeDom() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.removeAttribute('data-child-theme');
    THEME_IDS.forEach(function (tid) {
      const cn = CHILD_THEMES[tid] && CHILD_THEMES[tid].className;
      if (cn) document.body.classList.remove(cn);
    });
    const scene = document.querySelector('.cwb-theme-scene');
    if (scene && scene.parentNode) scene.parentNode.removeChild(scene);
    _applied = false;
  }

  function ensureThemeSceneLayer() {
    const host = document.getElementById('childWorldBg');
    if (!host) return null;
    let scene = host.querySelector('.cwb-theme-scene');
    if (!scene) {
      scene = document.createElement('div');
      scene.className = 'cwb-layer cwb-theme-scene';
      scene.setAttribute('role', 'presentation');
      scene.setAttribute('aria-hidden', 'true');
      host.appendChild(scene);
    }
    return scene;
  }

  function applyThemeDom(themeId) {
    const id = normalizeThemeId(themeId);
    const theme = getTheme(id);
    const root = document.documentElement;

    THEME_IDS.forEach(function (tid) {
      const cn = CHILD_THEMES[tid] && CHILD_THEMES[tid].className;
      if (cn) document.body.classList.remove(cn);
    });

    root.setAttribute('data-child-theme', id);
    if (theme.className) document.body.classList.add(theme.className);

    const scene = ensureThemeSceneLayer();
    if (scene) {
      scene.setAttribute('data-theme-scene', id);
      scene.style.setProperty('--ct-bg-image', 'url("' + theme.assets.background + '")');
    }

    _activeThemeId = id;
    _applied = true;
  }

  function apply(child, opts) {
    opts = opts || {};
    if (!isSamlingGateOn()) {
      clearThemeDom();
      return DEFAULT_THEME;
    }
    const themeId = resolveTheme(child);
    applyThemeDom(themeId);
    if (!opts.silent && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('child-theme-applied', {
        detail: { themeId: themeId },
      }));
    }
    if (window.ChildWorldsNav && typeof window.ChildWorldsNav.renderBottomNav === 'function') {
      window.ChildWorldsNav.renderBottomNav();
    }
    return themeId;
  }

  function iconKeyForWorld(worldId) {
    return WORLD_ICON_KEYS[worldId] || 'today';
  }

  function iconForWorld(worldId, themeId) {
    const id = normalizeThemeId(themeId || _activeThemeId);
    const theme = getTheme(id);
    const key = iconKeyForWorld(worldId);
    return (theme.icons && theme.icons[key]) || '⭐';
  }

  function iconHtmlForWorld(worldId, themeId) {
    const id = normalizeThemeId(themeId || _activeThemeId);
    const theme = getTheme(id);
    const key = iconKeyForWorld(worldId);
    const emoji = (theme.icons && theme.icons[key]) || '⭐';
    /* PR 3: swap to <img> when asset exists */
    return '<span class="child-theme-nav-emoji" aria-hidden="true">' + emoji + '</span>';
  }

  function accent(name, themeId) {
    const theme = getTheme(themeId || _activeThemeId);
    const accents = theme.accents || {};
    return accents[name] || accents.primary || '#F5A623';
  }

  window.ChildTheme = {
    DEFAULT_THEME: DEFAULT_THEME,
    THEME_IDS: THEME_IDS,
    CHILD_THEMES: CHILD_THEMES,
    normalizeThemeId: normalizeThemeId,
    resolveTheme: resolveTheme,
    getTheme: getTheme,
    getActiveThemeId: getActiveThemeId,
    isSamlingGateOn: isSamlingGateOn,
    apply: apply,
    clearThemeDom: clearThemeDom,
    iconForWorld: iconForWorld,
    iconHtmlForWorld: iconHtmlForWorld,
    iconKeyForWorld: iconKeyForWorld,
    accent: accent,
  };

  document.addEventListener('child-worlds-configured', function () {
    if (!isSamlingGateOn()) clearThemeDom();
  });
})();
