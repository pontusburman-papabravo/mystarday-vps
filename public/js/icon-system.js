/**
 * icon-system.js — Stjärndag Icon System v1.0
 * Assets: public/img/stjarnadag-icons/ (manifest.json)
 */
(function () {
  'use strict';

  const BASE = '/img/stjarnadag-icons/';

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
    nav: 24,
    header: 28,
    hub: 32,
    hero: 48,
    childNav: 32,
  };

  function has(name) {
    return !!(name && PATHS[name]);
  }

  function url(name) {
    const path = PATHS[name];
    return path ? BASE + path : null;
  }

  function render(name, opts) {
    opts = opts || {};
    const src = url(name);
    if (!src) {
      return opts.fallback != null ? String(opts.fallback) : '';
    }
    const size = opts.size || SIZES.nav;
    const cls = opts.className || 'app-icon';
    const alt = opts.alt != null ? String(opts.alt) : '';
    const hidden = opts.decorative !== false ? ' aria-hidden="true"' : '';
    return (
      '<img src="' + src + '" class="' + cls + '" width="' + size + '" height="' + size + '"' +
      ' alt="' + alt + '" decoding="async"' + hidden + '>'
    );
  }

  function nav(name, fallback) {
    return render(name, {
      size: SIZES.nav,
      className: 'app-icon app-icon--nav',
      fallback: fallback,
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
    BASE: BASE,
    PATHS: PATHS,
    SIZES: SIZES,
    has: has,
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
