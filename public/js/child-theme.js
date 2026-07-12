/**
 * child-theme.js — Per-child visual theme for Barnets samling (presentation only).
 * Gate: barnets_samling ON. Does not use legacy Min värld house themes.
 * PR 1: CSS accents + emoji icon fallback. PR 2: WebP backgrounds. PR 3: WebP tab icons.
 * PR 4: Theme picker (Min samling) — listThemes + preview via apply().
 */
(function () {
  'use strict';

  const DEFAULT_THEME = 'adventure';

  const THEME_IDS = [
    'adventure',
    'space',
    'dinosaurs',
    'vehicles',
    'animals',
    'ocean',
    'sports',
    'builders',
    'music',
    'arcade',
  ];

  const THEME_ALIASES = {
    fantasy: 'adventure',
    cars: 'vehicles',
    airplanes: 'vehicles',
    dolls: 'builders',
  };

  const ASSET_BASE = '/images/child/themes';

  function themeAssets(id) {
    const base = ASSET_BASE + '/' + id;
    return {
      background: base + '/background@2x.webp',
      icons: {
        today: base + '/icon-today@2x.webp',
        collection: base + '/icon-collection@2x.webp',
        treasure: base + '/icon-treasure@2x.webp',
        family: base + '/icon-family@2x.webp',
      },
    };
  }

  const CHILD_THEMES = {
    adventure: {
      label: 'Äventyr',
      className: 'theme-adventure',
      roomHint: 'utforskarrum',
      direction: 'kartor, stigar, märken, gömda platser',
      accents: { primary: '#C17F3E', soft: '#F5E6C8', glow: '#F5A623' },
      icons: { today: '🧭', collection: '🏅', treasure: '🗺️', family: '❤️' },
      assets: themeAssets('adventure'),
    },
    space: {
      label: 'Rymd',
      className: 'theme-space',
      roomHint: 'stjärnarkiv',
      direction: 'planeter, raketspår, kontrollpanel',
      accents: { primary: '#6C5CE7', soft: '#A29BFE', glow: '#F4C542' },
      icons: { today: '☀️', collection: '🏆', treasure: '🎁', family: '❤️' },
      assets: themeAssets('space'),
    },
    dinosaurs: {
      label: 'Dinosaurier',
      className: 'theme-dinosaurs',
      roomHint: 'dino-museum',
      direction: 'fossil, fotspår, djungel, utgrävning',
      accents: { primary: '#8A9A5B', soft: '#C4B59A', glow: '#F5C542' },
      icons: { today: '🌞', collection: '🦴', treasure: '🥚', family: '💚' },
      assets: themeAssets('dinosaurs'),
    },
    vehicles: {
      label: 'Fordon',
      className: 'theme-vehicles',
      roomHint: 'banrum',
      direction: 'banor, hjul, ramper, vägmarkeringar',
      accents: { primary: '#3B82C4', soft: '#E8DCC8', glow: '#F5A623' },
      icons: { today: '☀️', collection: '🏁', treasure: '🎁', family: '❤️' },
      assets: themeAssets('vehicles'),
    },
    animals: {
      label: 'Vilda djur',
      className: 'theme-animals',
      roomHint: 'safari-samling',
      direction: 'spår, habitat, safari, natur',
      accents: { primary: '#7A9E7E', soft: '#F5EDD6', glow: '#E8B84A' },
      icons: { today: '🌞', collection: '🐾', treasure: '🎁', family: '❤️' },
      assets: themeAssets('animals'),
    },
    ocean: {
      label: 'Havet',
      className: 'theme-ocean',
      roomHint: 'undervattensarkiv',
      direction: 'undervattensvärld, vågor, ubåt, koraller',
      accents: { primary: '#2E86AB', soft: '#B8E0F0', glow: '#5BC0EB' },
      icons: { today: '🌊', collection: '🐚', treasure: '💎', family: '❤️' },
      assets: themeAssets('ocean'),
    },
    sports: {
      label: 'Sport',
      className: 'theme-sports',
      roomHint: 'resultattavla',
      direction: 'planer, mål, koner, resultattavla',
      accents: { primary: '#2D9C5C', soft: '#D4F0DC', glow: '#F5A623' },
      icons: { today: '☀️', collection: '🏆', treasure: '⚽', family: '❤️' },
      assets: themeAssets('sports'),
    },
    builders: {
      label: 'Bygg & skapa',
      className: 'theme-builders',
      roomHint: 'verkstadsrum',
      direction: 'klossar, kugghjul, ritningar, verktyg',
      accents: { primary: '#E67E22', soft: '#FDEBD0', glow: '#F5C542' },
      icons: { today: '🔧', collection: '🧱', treasure: '📐', family: '❤️' },
      assets: themeAssets('builders'),
    },
    music: {
      label: 'Musik & rytm',
      className: 'theme-music',
      roomHint: 'scenrum',
      direction: 'instrument, beats, ljudvågor, scen',
      accents: { primary: '#9B59B6', soft: '#F0E6F6', glow: '#F4C542' },
      icons: { today: '🎵', collection: '🎸', treasure: '🎹', family: '❤️' },
      assets: themeAssets('music'),
    },
    arcade: {
      label: 'Spelhall',
      className: 'theme-arcade',
      roomHint: 'nivåarkiv',
      direction: 'banor, nivåer, pixelformer, power-ups',
      accents: { primary: '#E74C3C', soft: '#FADBD8', glow: '#F1C40F' },
      icons: { today: '👾', collection: '🕹️', treasure: '⭐', family: '❤️' },
      assets: themeAssets('arcade'),
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
  let _bgLoadToken = 0;

  function isSamlingGateOn() {
    if (typeof document === 'undefined') return false;
    if (document.documentElement.getAttribute('data-barnets-samling') === 'on') return true;
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function normalizeThemeId(raw) {
    if (raw == null || String(raw).trim() === '') {
      return DEFAULT_THEME;
    }
    const requestedId = String(raw).trim().toLowerCase();
    const resolvedId = THEME_ALIASES[requestedId] || requestedId;
    return THEME_IDS.includes(resolvedId) ? resolvedId : DEFAULT_THEME;
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
    _bgLoadToken += 1;
    const root = document.documentElement;
    root.removeAttribute('data-child-theme');
    THEME_IDS.forEach(function (tid) {
      const cn = CHILD_THEMES[tid] && CHILD_THEMES[tid].className;
      if (cn) document.body.classList.remove(cn);
    });
    const scene = document.querySelector('.cwb-theme-scene');
    if (scene && scene.parentNode) scene.parentNode.removeChild(scene);
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

  function preloadThemeBackground(scene, backgroundUrl) {
    if (!scene || !backgroundUrl) return;
    _bgLoadToken += 1;
    const token = _bgLoadToken;
    scene.classList.remove('ct-bg-loaded');
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.onload = function () {
      if (token !== _bgLoadToken) return;
      scene.classList.add('ct-bg-loaded');
    };
    img.onerror = function () {
      if (token !== _bgLoadToken) return;
      scene.classList.remove('ct-bg-loaded');
    };
    img.src = backgroundUrl;
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
      scene.style.setProperty('--ct-background-image', 'url("' + theme.assets.background + '")');
      preloadThemeBackground(scene, theme.assets.background);
    }

    _activeThemeId = id;
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

  function iconAssetForWorld(worldId, themeId) {
    const theme = getTheme(themeId || _activeThemeId);
    const key = iconKeyForWorld(worldId);
    const icons = theme.assets && theme.assets.icons;
    return (icons && icons[key]) || null;
  }

  function iconHtmlForWorld(worldId, themeId) {
    if (!isSamlingGateOn()) {
      const emoji = iconForWorld(worldId, themeId);
      return '<span class="child-theme-nav-emoji" aria-hidden="true">' + emoji + '</span>';
    }
    const id = normalizeThemeId(themeId || _activeThemeId);
    const theme = getTheme(id);
    const key = iconKeyForWorld(worldId);
    const emoji = (theme.icons && theme.icons[key]) || '⭐';
    const assetUrl = theme.assets && theme.assets.icons && theme.assets.icons[key];
    if (!assetUrl) {
      return '<span class="child-theme-nav-emoji" aria-hidden="true">' + emoji + '</span>';
    }
    const lazyAttr = worldId === 'today' ? '' : ' loading="lazy"';
    return (
      '<span class="child-nav-icon" aria-hidden="true">' +
      '<img class="child-nav-icon-img" src="' + assetUrl + '" alt="" decoding="async"' + lazyAttr + ' width="32" height="32">' +
      '<span class="child-nav-icon-fallback" aria-hidden="true">' + emoji + '</span>' +
      '</span>'
    );
  }

  function accent(name, themeId) {
    const theme = getTheme(themeId || _activeThemeId);
    const accents = theme.accents || {};
    return accents[name] || accents.primary || '#F5A623';
  }

  function listThemes() {
    return THEME_IDS.map(function (id) {
      const theme = CHILD_THEMES[id];
      return {
        id: id,
        label: theme.label,
        className: theme.className,
        assets: theme.assets,
        accents: theme.accents,
        emojiIcons: theme.icons,
      };
    });
  }

  function childPayloadWithTheme(child, themeId) {
    const base = child && typeof child === 'object' ? child : {};
    const cfg = Object.assign({}, base.child_view_config || {}, {
      visual_theme: normalizeThemeId(themeId),
    });
    return Object.assign({}, base, { child_view_config: cfg });
  }

  function applyPreview(child, themeId, opts) {
    if (!isSamlingGateOn()) return DEFAULT_THEME;
    const theme = normalizeThemeId(themeId);
    applyThemeDom(theme);
    if (!opts || !opts.silent) {
      document.dispatchEvent(new CustomEvent('child-theme-preview', {
        detail: { themeId: theme },
      }));
    }
    return theme;
  }

  function revertToSaved(child, opts) {
    if (!isSamlingGateOn()) {
      clearThemeDom();
      return DEFAULT_THEME;
    }
    return apply(child, opts);
  }

  window.ChildTheme = {
    DEFAULT_THEME: DEFAULT_THEME,
    THEME_IDS: THEME_IDS,
    THEME_ALIASES: THEME_ALIASES,
    CHILD_THEMES: CHILD_THEMES,
    normalizeThemeId: normalizeThemeId,
    resolveTheme: resolveTheme,
    getTheme: getTheme,
    getActiveThemeId: getActiveThemeId,
    isSamlingGateOn: isSamlingGateOn,
    listThemes: listThemes,
    childPayloadWithTheme: childPayloadWithTheme,
    applyPreview: applyPreview,
    revertToSaved: revertToSaved,
    apply: apply,
    clearThemeDom: clearThemeDom,
    iconForWorld: iconForWorld,
    iconAssetForWorld: iconAssetForWorld,
    iconHtmlForWorld: iconHtmlForWorld,
    iconKeyForWorld: iconKeyForWorld,
    accent: accent,
  };

  document.addEventListener('child-worlds-configured', function () {
    if (!isSamlingGateOn()) clearThemeDom();
  });
})();
