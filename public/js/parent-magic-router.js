/**
 * parent-magic-router.js — Soft navigation between parent magic shell pages (no full reload).
 */
(function (global) {
  'use strict';

  var SOFT_PATHS = {
    '/dashboard': 'dashboard',
    '/planning': 'planning',
    '/rewards': 'rewards',
    '/schedule': 'schedule',
    '/for-dig': 'for-dig',
    '/family': 'family',
    '/settings': 'settings',
    '/skattkammaren': 'skattkammaren',
    '/upgrade': 'upgrade',
  };

  var PAGE_STYLES = {
    dashboard: ['/css/dashboard-magic.css?v=4'],
  };

  var PAGE_SCRIPTS = {
    dashboard: [
      '/js/dashboard-home-hub.js?v=4',
      '/js/dashboard-daily-summary.js?v=2026-06-09-warmth',
      '/js/dashboard-child-handoff.js?v=2026-06-10-handoff',
      '/js/dashboard.js?v=2.38.0',
    ],
    schedule: [
      '/js/schedule-views.js?v=1.3.0',
      '/js/schedule.js?v=2.26.0',
    ],
    'for-dig': ['/js/for-dig.js?v=2.1'],
    family: [
      '/js/family-invite-scan.js?v=1',
      '/js/settings-account.js?v=2.18.0',
      '/js/family-museum.js?v=1.1.0',
      '/js/family-chest-setting.js?v=1.0.0',
      '/js/family.js?v=2.14.0',
    ],
    planning: [],
    rewards: [],
    skattkammaren: ['/js/skattkammaren-parent-page.js?v=1'],
    upgrade: [
      '/js/preview-shell.js?v=1.0.0',
      '/js/upgrade-packages.js?v=2.0.0',
    ],
    settings: [],
  };

  var _navigating = false;
  var _bound = false;

  function normalizePath(path) {
    var p = (path || '/').split('?')[0].replace(/\/$/, '') || '/';
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

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function applyBodyFromPage(doc, pageId) {
    var newBody = doc.body;
    if (!newBody) return;
    var magic = global.AppViewMode && AppViewMode.isMagic();

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
  }

  function swapMain(doc) {
    var newMain = doc.querySelector('main');
    var curMain = global.document.querySelector('main');
    if (!newMain || !curMain) return false;

    var preserveIds = { appViewToggleMount: 1, parentMagicPageMount: 1 };

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
    var head = global.document.head;
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('parent-magic') !== -1) return;
      var exists = head.querySelector('link[rel="stylesheet"][href="' + href + '"]');
      if (!exists) {
        var copy = link.cloneNode(true);
        head.appendChild(copy);
      }
    });
  }

  function ensurePageStyles(pageId) {
    var head = global.document.head;
    (PAGE_STYLES[pageId] || []).forEach(function (href) {
      var exists = head.querySelector('link[rel="stylesheet"][href="' + href + '"]');
      if (!exists) {
        var link = global.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        head.appendChild(link);
      }
    });
  }

  async function navigateTo(href, options) {
    options = options || {};
    if (_navigating) return false;

    var path = normalizePath(href);
    var pageId = SOFT_PATHS[path];
    if (!pageId) {
      global.location.href = href;
      return false;
    }

    if (!shouldSoftNav()) {
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
      var res = await fetch(href, {
        credentials: 'include',
        headers: { Accept: 'text/html' },
      });
      if (!res.ok) throw new Error('fetch_failed');

      var html = await res.text();
      var doc = parseHtml(html);
      ensureStyles(doc);
      ensurePageStyles(pageId);
      if (!swapMain(doc)) throw new Error('swap_main_failed');

      applyBodyFromPage(doc, pageId);
      if (global.ParentMagicAuto) ParentMagicAuto.prepareDom();

      if (global.ParentMagicPageBoot) {
        await ParentMagicPageBoot.ensureScripts(PAGE_SCRIPTS[pageId] || []);
        await ParentMagicPageBoot.run(pageId);
      }

      if (global.ParentMagicShell && ParentMagicShell.navigateToPage) {
        ParentMagicShell.navigateToPage(pageId);
      }

      var url = path + (href.indexOf('?') >= 0 ? href.slice(href.indexOf('?')) : '');
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
    var link = e.target.closest('#parentBottomNav a[href], .native-tab-bar a.tab-item[href]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    if (!isSoftNavPath(href)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;

    e.preventDefault();
    navigateTo(href);
  }

  function bind() {
    if (_bound) return;
    _bound = true;
    global.document.addEventListener('click', onNavLinkClick, true);
    global.addEventListener('popstate', function (e) {
      if (!shouldSoftNav()) return;
      var path = normalizePath(global.location.pathname);
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
    shouldSoftNav: shouldSoftNav,
    SOFT_PATHS: SOFT_PATHS,
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})(window);
