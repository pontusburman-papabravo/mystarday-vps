/**
 * icon-system.js — Stjärndag Icon System
 * Nav (v4 Nordic Calm): public/img/stjarnadag-icons-v4/
 * Parent / rewards / shared / child-fallback (v3): public/img/stjarnadag-icons/
 */
(function () {
  'use strict';

  const BASE_V3 = '/img/stjarnadag-icons/';
  const BASE_V4 = '/img/stjarnadag-icons-v4/';

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

  const PATHS = {
    hem: 'navigation/hem.svg',
    schema: 'navigation/schema.svg',
    'for-dig': 'navigation/for-dig.svg',
    familj: 'navigation/familj.svg',
    aktiviteter: 'navigation/aktiviteter.svg',
    beloningar: 'navigation/beloningar.svg',
    installningar: 'navigation/installningar.svg',
    notiser: 'parent/notiser.svg',
    tipsa: 'parent/tipsa.svg',
    engangsaktivitet: 'parent/engangsaktivitet.svg',
    'aterkommande-aktivitet': 'parent/aterkommande-aktivitet.svg',
    'registrera-i-efterhand': 'parent/registrera-i-efterhand.svg',
    'extra-stjarnor': 'parent/extra-stjarnor.svg',
    'ta-bort-stjarnor': 'parent/ta-bort-stjarnor.svg',
    'godkann-aktivitet': 'parent/godkann-aktivitet.svg',
    'missad-aktivitet': 'parent/missad-aktivitet.svg',
    'lagg-till-aktivitet': 'parent/lagg-till-aktivitet.svg',
    'redigera-aktivitet': 'parent/redigera-aktivitet.svg',
    'kopiera-aktivitet': 'parent/kopiera-aktivitet.svg',
    'flytta-aktivitet': 'parent/flytta-aktivitet.svg',
    'ta-bort-aktivitet': 'parent/ta-bort-aktivitet.svg',
    statistik: 'parent/statistik.svg',
    framsteg: 'parent/framsteg.svg',
    historik: 'parent/historik.svg',
    rapport: 'parent/rapport.svg',
    barn: 'parent/barn.svg',
    foralder: 'parent/foralder.svg',
    pedagog: 'parent/pedagog.svg',
    'bjud-in': 'parent/bjud-in.svg',
    profil: 'parent/profil.svg',
    support: 'parent/support.svg',
    skattkammaren: 'rewards/skattkammaren.svg',
    beloning: 'rewards/beloning.svg',
    trofe: 'rewards/trofe.svg',
    present: 'rewards/present.svg',
    'last-beloning': 'rewards/last-beloning.svg',
    'upplast-beloning': 'rewards/upplast-beloning.svg',
    'los-in': 'rewards/los-in.svg',
    stjarnsaldo: 'rewards/stjarnsaldo.svg',
    'lagg-till': 'shared/lagg-till.svg',
    'ta-bort': 'shared/ta-bort.svg',
    redigera: 'shared/redigera.svg',
    sok: 'shared/sok.svg',
    filter: 'shared/filter.svg',
    tillbaka: 'shared/tillbaka.svg',
    nasta: 'shared/nasta.svg',
    stang: 'shared/stang.svg',
    bekrafta: 'shared/bekrafta.svg',
    info: 'shared/info.svg',
    hjalp: 'shared/hjalp.svg',
    dela: 'shared/dela.svg',
    kalender: 'shared/kalender.svg',
    klocka: 'shared/klocka.svg',
    morgon: 'shared/morgon.svg',
    dag: 'shared/dag.svg',
    eftermiddag: 'shared/eftermiddag.svg',
    kvall: 'shared/kvall.svg',
    klar: 'child-fallback/klar.svg',
    'inte-klar': 'child-fallback/inte-klar.svg',
    'min-dag': 'child-fallback/min-dag.svg',
    'mina-stjarnor': 'child-fallback/mina-stjarnor.svg',
    'child-skattkammaren': 'child-fallback/skattkammaren.svg',
    'child-profil': 'child-fallback/profil.svg',
    'child-hjalp': 'child-fallback/hjalp.svg',
    'logga-ut': 'child-fallback/logga-ut.svg',
  };

  const CHILD_THEME_KEYS = {
    today: 'min-dag',
    collection: 'mina-stjarnor',
    treasure: 'child-skattkammaren',
    family: 'child-profil',
  };

  const SIZES = {
    nav: 28,
    header: 28,
    hub: 44,
    hero: 48,
    childNav: 32,
  };

  function has(name) {
    return !!(name && PATHS[name]);
  }

  function isNavV4(name) {
    return !!(name && NAV_V4_KEYS[name]);
  }

  function url(name, opts) {
    opts = opts || {};
    if (!PATHS[name]) return null;
    if (isNavV4(name)) {
      const folder = opts.active ? 'navigation-active/' : 'navigation-inactive/';
      return BASE_V4 + folder + name + '.svg';
    }
    return BASE_V3 + PATHS[name];
  }

  function render(name, opts) {
    opts = opts || {};
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

  function header(name, fallback) {
    return render(name, {
      size: SIZES.header,
      className: 'parent-hub-icon-img app-icon app-icon--header',
      fallback: fallback,
    });
  }

  function hub(name, fallback) {
    return render(name, {
      size: SIZES.hub,
      className: 'app-icon app-icon--hub',
      fallback: fallback,
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
    BASE: BASE_V3,
    BASE_V3: BASE_V3,
    BASE_V4: BASE_V4,
    PATHS: PATHS,
    NAV_V4_KEYS: NAV_V4_KEYS,
    SIZES: SIZES,
    has: has,
    isNavV4: isNavV4,
    url: url,
    render: render,
    nav: nav,
    header: header,
    hub: hub,
    hero: hero,
    forItem: forItem,
    childFallback: childFallback,
  };

  window.ParentNavIcons = {
    notiser: header('notiser'),
    settings: header('installningar'),
    tipsa: header('tipsa'),
    share: header('tipsa'),
  };
})();
