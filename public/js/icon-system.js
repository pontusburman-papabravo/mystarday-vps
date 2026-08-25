/**
 * icon-system.js — Stjärndag Icon System (v4 only)
 * Nav: public/img/stjarnadag-icons-v4/
 * Hem quick actions: public/img/stjarnadag-quick-actions-v4/
 */
(function () {
  'use strict';

  const BASE_V4 = '/img/stjarnadag-icons-v4/';
  const BASE_QA_V4 = '/img/stjarnadag-quick-actions-v4/';
  const HUB_ASSET_VERSION = '4';

  /** Bottom-nav destinations with unique v4 geometry + active/inactive assets. */
  const NAV_V4_KEYS = {
    hem: true,
    schema: true,
    'for-dig': true,
    familj: true,
    aktiviteter: true,
    beloningar: true,
    installningar: true,
  };

  /** Keys that reuse a nav icon (inactive) on hub/header surfaces. */
  const NAV_ALIASES = {
    beloning: 'beloningar',
  };

  /** Header chrome — Nordic Calm v4. */
  const CHROME_V4_KEYS = {
    notiser: true,
    tipsa: true,
  };

  /** Hub cards and secondary parent surfaces. */
  const HUB_V4_KEYS = {
    kalender: true,
    historik: true,
    rapport: true,
    redigera: true,
    'kopiera-aktivitet': true,
    pedagog: true,
    support: true,
    profil: true,
    info: true,
    barn: true,
    statistik: true,
    skattkammaren: true,
    trofe: true,
    dag: true,
  };

  /** Child bottom-nav fallback icons (v4). */
  const CHILD_V4_KEYS = {
    'min-dag': true,
    'mina-stjarnor': true,
    skattkammaren: true,
    profil: true,
  };

  /** Hem snabbåtgärder — Nordic Calm v4 (dark / dark-active / light SVG folders). */
  const QUICK_ACTION_V4 = {
    'registrera-i-efterhand': 'i-efterhand.svg',
    engangsaktivitet: 'engangsaktivitet.svg',
    'extra-stjarnor': 'extra-stjarnor.svg',
    'ledig-dag': 'ledig-dag.svg',
  };

  const CHILD_THEME_KEYS = {
    today: 'min-dag',
    collection: 'mina-stjarnor',
    treasure: 'skattkammaren',
    family: 'profil',
  };

  const CHILD_KEY_ALIASES = {
    'child-skattkammaren': 'skattkammaren',
    'child-profil': 'profil',
  };

  const SIZES = {
    nav: 28,
    header: 28,
    hub: 44,
    quickAction: 48,
    hero: 48,
    childNav: 32,
  };

  /**
   * Icons rendered as INLINE <svg> markup instead of <img src>. Used for
   * icons where the external-asset chain (URL -> service worker -> network
   * fetch -> WKWebView image decode) has proven unreliable on native iOS
   * even with a correct HTTP 200 image/svg+xml response, correct
   * Content-Type, and correct SW precache (2026-08-25 physical QA:
   * Settings -> Prenumeration kept showing a broken-image placeholder for
   * `trofe` regardless). Inline SVG removes that entire chain for this one
   * icon — geometry copied verbatim from
   * public/img/stjarnadag-icons-v4/hub/trofe.svg, which stays on disk for
   * any other consumer. Every other icon key is unaffected.
   */
  const INLINE_SVG_ICONS = {
    trofe: {
      viewBox: '0 0 32 32',
      label: 'Trofé',
      markup:
        '<path d="M10.2 8.8h11.6v5.4c0 3.8-2.6 6.8-5.8 6.8s-5.8-3-5.8-6.8V8.8Z" stroke="#B9B5AE" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M8.2 10.2H6.2a2 2 0 0 0-2 2v1.2a2 2 0 0 0 2 2h2M23.8 10.2h2a2 2 0 0 1 2 2v1.2a2 2 0 0 1-2 2h-2" stroke="#B9B5AE" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M12.8 24.8h6.4M16 20.8v4" stroke="#8FA9A5" stroke-width="2.2" stroke-linecap="round"/>',
    },
  };

  function hasInlineSvg(name) {
    return !!(name && INLINE_SVG_ICONS[name]);
  }

  function renderInlineSvg(name, opts) {
    const spec = INLINE_SVG_ICONS[name];
    const size = opts.size || SIZES.nav;
    const cls = opts.className || 'app-icon';
    const decorative = opts.decorative !== false;
    const ariaAttrs = decorative
      ? ' aria-hidden="true"'
      : ' role="img" aria-label="' + (opts.alt != null ? String(opts.alt) : spec.label) + '"';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + spec.viewBox + '" fill="none"' +
      ' width="' + size + '" height="' + size + '" class="' + cls + '"' + ariaAttrs + '>' +
      spec.markup +
      '</svg>'
    );
  }

  function resolveNavKey(name) {
    if (!name) return null;
    if (NAV_V4_KEYS[name]) return name;
    if (NAV_ALIASES[name]) return NAV_ALIASES[name];
    return null;
  }

  function resolveChildKey(name) {
    if (!name) return null;
    const aliased = CHILD_KEY_ALIASES[name] || name;
    return CHILD_V4_KEYS[aliased] ? aliased : null;
  }

  function isChromeV4(name) {
    return !!(name && CHROME_V4_KEYS[name]);
  }

  function isQuickActionV4(name) {
    return !!(name && QUICK_ACTION_V4[name]);
  }

  function isNavV4(name) {
    return !!resolveNavKey(name);
  }

  function isHubV4(name) {
    return !!(name && HUB_V4_KEYS[name]);
  }

  function isChildV4(name) {
    return !!resolveChildKey(name);
  }

  function has(name) {
    return isQuickActionV4(name)
      || isChromeV4(name)
      || isNavV4(name)
      || isHubV4(name)
      || isChildV4(name);
  }

  function navUrl(navKey, active) {
    const folder = active ? 'navigation-active/' : 'navigation-inactive/';
    return BASE_V4 + folder + navKey + '.svg';
  }

  function url(name, opts) {
    opts = opts || {};
    if (isChromeV4(name)) {
      const file = opts.active ? name + '-active.svg' : name + '.svg';
      return BASE_V4 + 'chrome/' + file;
    }
    if (isQuickActionV4(name)) {
      const file = QUICK_ACTION_V4[name];
      const theme = opts.active ? 'dark-active' : (opts.theme || 'dark');
      return BASE_QA_V4 + 'svg/' + theme + '/' + file;
    }
    const navKey = resolveNavKey(name);
    if (navKey) {
      return navUrl(navKey, !!opts.active);
    }
    if (isHubV4(name)) {
      return BASE_V4 + 'hub/' + name + '.svg?v=' + HUB_ASSET_VERSION;
    }
    const childKey = resolveChildKey(name);
    if (childKey) {
      return BASE_V4 + 'child/' + childKey + '.svg';
    }
    return null;
  }

  function render(name, opts) {
    opts = opts || {};
    if (hasInlineSvg(name)) {
      return renderInlineSvg(name, opts);
    }
    const src = url(name, opts);
    if (!src) {
      return opts.fallback != null ? String(opts.fallback) : '';
    }
    const size = opts.size || SIZES.nav;
    const cls = opts.className || 'app-icon';
    const alt = opts.alt != null ? String(opts.alt) : '';
    const hidden = opts.decorative !== false ? ' aria-hidden="true"' : '';
    const stateClass = isNavV4(name)
      ? (opts.active ? ' app-icon--nav-active' : ' app-icon--nav-inactive')
      : isChromeV4(name)
        ? (opts.active ? ' app-icon--chrome-active' : ' app-icon--chrome-default')
        : isQuickActionV4(name)
          ? (opts.active ? ' app-icon--quick-active' : ' app-icon--quick-default')
          : '';
    return (
      '<img src="' + src + '" class="' + cls + stateClass + '" width="' + size + '" height="' + size + '"' +
      ' alt="' + alt + '" decoding="async"' + hidden + '>'
    );
  }

  function nav(name, fallback, active) {
    return render(name, {
      size: SIZES.nav,
      className: 'app-icon app-icon--nav',
      fallback: fallback,
      active: !!active,
    });
  }

  function header(name, fallback, active) {
    return render(name, {
      size: SIZES.header,
      className: 'parent-hub-icon-img app-icon app-icon--header',
      fallback: fallback,
      active: !!active,
    });
  }

  function hub(name, fallback) {
    return render(name, {
      size: SIZES.hub,
      className: 'app-icon app-icon--hub',
      fallback: fallback,
    });
  }

  function quickAction(name, fallback, active) {
    return render(name, {
      size: SIZES.quickAction,
      className: 'app-icon app-icon--quick-action',
      fallback: fallback,
      active: !!active,
    });
  }

  function hero(name, fallback) {
    return render(name, {
      size: SIZES.hero,
      className: 'app-icon app-icon--hero',
      fallback: fallback,
    });
  }

  function forItem(item, size, className) {
    if (!item) return '';
    const key = item.icon;
    if (has(key)) {
      return render(key, {
        size: size || SIZES.nav,
        className: className || 'app-icon app-icon--nav',
        active: !!(item.active || item.isActive),
      });
    }
    return key || '';
  }

  function childFallback(themeKey) {
    const mapped = CHILD_THEME_KEYS[themeKey];
    if (!mapped || !has(mapped)) return null;
    return render(mapped, {
      size: SIZES.childNav,
      className: 'child-nav-icon-img app-icon app-icon--child-nav',
    });
  }

  window.IconSystem = {
    BASE: BASE_V4,
    BASE_V4: BASE_V4,
    BASE_QA_V4: BASE_QA_V4,
    HUB_ASSET_VERSION: HUB_ASSET_VERSION,
    NAV_V4_KEYS: NAV_V4_KEYS,
    NAV_ALIASES: NAV_ALIASES,
    CHROME_V4_KEYS: CHROME_V4_KEYS,
    HUB_V4_KEYS: HUB_V4_KEYS,
    CHILD_V4_KEYS: CHILD_V4_KEYS,
    QUICK_ACTION_V4: QUICK_ACTION_V4,
    SIZES: SIZES,
    has: has,
    isChromeV4: isChromeV4,
    isQuickActionV4: isQuickActionV4,
    isNavV4: isNavV4,
    isHubV4: isHubV4,
    isChildV4: isChildV4,
    url: url,
    render: render,
    nav: nav,
    header: header,
    hub: hub,
    quickAction: quickAction,
    hero: hero,
    forItem: forItem,
    childFallback: childFallback,
  };

  window.ParentNavIcons = {
    notiser: header('notiser'),
    settings: header('installningar'),
    tipsa: header('tipsa'),
    share: header('tipsa'),
    renderNotiser: function (active) {
      return header('notiser', undefined, active);
    },
  };
})();
