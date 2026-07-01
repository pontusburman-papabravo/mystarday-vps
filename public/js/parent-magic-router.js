/**
 * parent-magic-router.js — Soft navigation between parent magic shell pages (no full reload).
 */
(function (global) {
  'use strict';

  // NOTE: /dashboard (Hem) and /schedule are intentionally NOT soft-navigable.
  // Dashboard renders into #parentHomeHubMount; schedule pulls in schedule-core +
  // six satellite scripts + dozens of modals — soft swap leaves "Laddar…" / 0 barn.
  // Full page load runs the HTML script order reliably.
  const SOFT_PATHS = {
    '/planning': 'planning',
    '/rewards': 'rewards',
    '/for-dig': 'for-dig',
    '/family': 'family',
    '/skattkammaren': 'skattkammaren',
    '/upgrade': 'upgrade',
  };

  /** Heavy / multi-script pages — always hard-navigate (planering-hub deep links). */
  const FULL_LOAD_PATHS = {
    '/library': true,
    '/schedule': true,
    '/calendar': true,
    '/assign-schedule': true,
    '/daily-log': true,
    '/print-schema': true,
    '/settings': true,
  };

  const PAGE_STYLES = {
    dashboard: ['/css/dashboard-magic.css?v=5'],
    'for-dig': ['/css/for-dig.css?v=5'],
    skattkammaren: ['/css/skattkammaren-parent.css?v=1'],
  };

  // Loaded before every soft-nav page — dom-utils defines window.renderChildAvatar + escapeHtml.
  const SHARED_SCRIPTS = [
    '/js/dom-utils.js?v=2.13.0',
  ];

  const PAGE_SCRIPTS = {
    dashboard: [
      '/js/dashboard-home-hub.js?v=5',
      '/js/dashboard-daily-summary.js?v=2026-06-09-warmth',
      '/js/dashboard-child-handoff.js?v=2026-06-10-handoff',
      '/js/dashboard.js?v=2.38.0',
      '/js/coparent-invite-ui.js?v=1',
    ],
    'for-dig': ['/js/for-dig.js?v=2.11'],
    family: [
      '/js/family-invite-scan.js?v=1',
      '/js/settings-account.js?v=2.18.0',
      '/js/family-museum.js?v=1.1.0',
      '/js/family-chest-setting.js?v=1.0.0',
      '/js/custody-settings.js?v=3',
      '/js/family-hub.js?v=1.0.0',
      '/js/family.js?v=2.15.0',
      '/js/coparent-invite-ui.js?v=1',
    ],
    planning: ['/js/planning-back-nav.js?v=1', '/js/planning-hub.js?v=1.6.1'],
    rewards: [
      '/js/pending-approvals.js?v=1',
      '/js/rewards-hub.js?v=1.2.1',
    ],
    skattkammaren: ['/js/skattkammaren-parent-page.js?v=2'],
    upgrade: [
      '/js/preview-shell.js?v=1.0.0',
      '/js/upgrade-packages.js?v=2.0.0',
    ],
    settings: ['/js/coparent-invite-ui.js?v=1'],
  };

  let _navigating = false;
  let _bound = false;

  function normalizePath(path) {
    let p = (path || '/').split('?')[0].replace(/\/$/, '') || '/';
    if (p.endsWith('.html')) p = p.slice(0, -5);
    return p;
  }

  function shouldSoftNav() {
    return global.AppViewMode
      && AppViewMode.isAllowed()
      && AppViewMode.isMagic()
      && !global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isSoftNavPath(path) {
    return !!SOFT_PATHS[normalizePath(path)];
  }

  function isFullLoadPath(href) {
    const path = normalizePath((href || '').split('#')[0].split('?')[0]);
    return !!FULL_LOAD_PATHS[path];
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function isLibraryShellDocument() {
    return global.document.body.classList.contains('parent-magic-library');
  }

  function stripLibraryShellClasses() {
    const cls = Array.from(global.document.body.classList);
    cls.forEach(function (c) {
      if (c === 'parent-magic-library' || c.indexOf('library-magic-') === 0) {
        global.document.body.classList.remove(c);
      }
    });
  }

  function applyBodyFromPage(doc, pageId) {
    const newBody = doc.body;
    if (!newBody) return;
    const magic = global.AppViewMode && AppViewMode.isMagic();

    Array.from(global.document.body.classList).forEach(function (c) {
      if (c.indexOf('parent-magic-page-') === 0) {
        global.document.body.classList.remove(c);
      }
    });

    Array.from(newBody.classList).forEach(function (c) {
      if (c === 'parent-magic-view' || c.indexOf('parent-magic-page-') === 0) return;
      global.document.body.classList.add(c);
    });

    global.document.body.classList.toggle('parent-magic-view', !!magic);
    if (magic && pageId) {
      global.document.body.classList.add('parent-magic-page-' + pageId);
    }
    if (pageId) global.document.body.setAttribute('data-magic-page', pageId);
    else global.document.body.removeAttribute('data-magic-page');
    if (doc.title) global.document.title = doc.title;
    if (pageId !== 'library') stripLibraryShellClasses();
  }

  function swapMain(doc) {
    const newMain = doc.querySelector('main');
    const curMain = global.document.querySelector('main');
    if (!newMain || !curMain) return false;

    const preserveIds = { appViewToggleMount: 1, parentMagicPageMount: 1, parentTopChrome: 1 };

    Array.from(curMain.children).forEach(function (child) {
      if (child.id && preserveIds[child.id]) return;
      if (child.matches && child.matches('[data-parent-nav-header]')) return;
      child.remove();
    });

    Array.from(newMain.children).forEach(function (child) {
      if (child.id && preserveIds[child.id]) return;
      if (child.matches && child.matches('[data-parent-nav-header]')) return;
      curMain.appendChild(child.cloneNode(true));
    });

    curMain.className = newMain.className;
    return true;
  }

  function ensureStyles(doc) {
    const head = global.document.head;
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.indexOf('parent-magic') !== -1) return;
      const exists = head.querySelector('link[rel="stylesheet"][href="' + href + '"]');
      if (!exists) {
        const copy = link.cloneNode(true);
        head.appendChild(copy);
      }
    });
  }

  function syncLegacyNavHide() {
    global.document.querySelectorAll('body > nav').forEach(function (nav) {
      if (nav.classList.contains('native-tab-bar') || nav.id === 'parentBottomNav') return;
      nav.classList.add('parent-magic-legacy-hide');
    });
  }

  function resetPageState(pageId) {
    if (pageId !== 'settings' && global.ParentMagicPageHub && global.ParentMagicPageHub.resetSettingsState) {
      global.ParentMagicPageHub.resetSettingsState();
    }
  }

  function ensurePageStyles(pageId) {
    const head = global.document.head;
    (PAGE_STYLES[pageId] || []).forEach(function (href) {
      const exists = head.querySelector('link[rel="stylesheet"][href="' + href + '"]');
      if (!exists) {
        const link = global.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        head.appendChild(link);
      }
    });
  }

  async function navigateTo(href, options) {
    options = options || {};
    if (_navigating) return false;

    const path = normalizePath(href);
    const pageId = SOFT_PATHS[path];
    if (!pageId) {
      global.location.href = href;
      return false;
    }

    if (!shouldSoftNav()) {
      global.location.href = href;
      return false;
    }

    // library.html is a full page shell — never soft-swap its body into other tabs
    if (isLibraryShellDocument()) {
      global.location.href = href;
      return false;
    }

    if (path === normalizePath(global.location.pathname) && !options.force) {
      if (global.ParentMagicShell && ParentMagicShell.navigateToPage) {
        ParentMagicShell.navigateToPage(pageId);
      }
      return true;
    }

    _navigating = true;

    try {
      const res = await fetch(href, {
        credentials: 'include',
        headers: { Accept: 'text/html' },
      });
      if (!res.ok) throw new Error('fetch_failed');

      const finalPath = normalizePath(new URL(res.url, global.location.origin).pathname);
      if (finalPath !== path) {
        if (SOFT_PATHS[finalPath]) {
          return navigateTo(finalPath, { replace: true, force: true });
        }
        global.location.href = res.url;
        return false;
      }

      const html = await res.text();
      const doc = parseHtml(html);
      ensureStyles(doc);
      ensurePageStyles(pageId);

      applyBodyFromPage(doc, pageId);
      resetPageState(pageId);

      const hubMount = global.document.getElementById('parentMagicPageMount');
      if (hubMount) {
        hubMount.innerHTML = '';
        hubMount.classList.add('hidden');
      }

      if (!swapMain(doc)) throw new Error('swap_main_failed');

      if (global.ParentMagicAuto) ParentMagicAuto.prepareDom();
      syncLegacyNavHide();
      if (global.ParentMagicAuto && ParentMagicAuto.ensureTopChrome) {
        ParentMagicAuto.ensureTopChrome();
      }

      if (global.ParentMagicShell && ParentMagicShell.navigateToPage) {
        ParentMagicShell.navigateToPage(pageId);
      }

      if (global.ParentMagicPageBoot) {
        await ParentMagicPageBoot.ensureScripts(SHARED_SCRIPTS);
        await ParentMagicPageBoot.ensureScripts(PAGE_SCRIPTS[pageId] || []);
        await ParentMagicPageBoot.run(pageId);
      }

      let url = path;
      const qIdx = href.indexOf('?');
      const hIdx = href.indexOf('#');
      if (qIdx >= 0) {
        url += href.slice(qIdx, hIdx >= 0 ? hIdx : undefined);
      }
      if (hIdx >= 0) {
        url += href.slice(hIdx);
      }
      if (options.replace) {
        global.history.replaceState({ magicSoft: true, pageId: pageId }, '', url);
      } else {
        global.history.pushState({ magicSoft: true, pageId: pageId }, '', url);
      }

      global.dispatchEvent(new CustomEvent('stjarndag-magic-navigated', {
        detail: { pageId: pageId, path: path },
      }));
      if (global.NativeTabBar && global.NativeTabBar.updateActiveTabs) {
        global.NativeTabBar.updateActiveTabs();
      }
      return true;
    } catch (err) {
      console.warn('[MAGIC-NAV] soft navigation failed, using full load:', err);
      global.location.href = href;
      return false;
    } finally {
      _navigating = false;
    }
  }

  function onNavLinkClick(e) {
    if (!shouldSoftNav()) return;
    const link = e.target.closest('a[href^="/"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    if (link.hasAttribute('data-full-load') || isFullLoadPath(href)) return;
    if (!isSoftNavPath(href)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;
    if (link.hasAttribute('download')) return;

    e.preventDefault();
    navigateTo(href);
  }

  function bind() {
    if (_bound) return;
    _bound = true;
    global.document.addEventListener('click', onNavLinkClick, true);
    global.addEventListener('popstate', function (e) {
      if (!shouldSoftNav()) return;
      const path = normalizePath(global.location.pathname);
      if (!SOFT_PATHS[path]) return;
      if (e.state && e.state.magicSoft) {
        navigateTo(global.location.pathname + global.location.search, { replace: true, force: true });
      }
    });
  }

  global.ParentMagicRouter = {
    bind: bind,
    navigateTo: navigateTo,
    isSoftNavPath: isSoftNavPath,
    isFullLoadPath: isFullLoadPath,
    shouldSoftNav: shouldSoftNav,
    SOFT_PATHS: SOFT_PATHS,
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})(window);
