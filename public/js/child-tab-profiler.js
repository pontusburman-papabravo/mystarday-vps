/**
 * child-tab-profiler.js — Tab-switch performance instrumentation (measure only).
 *
 * Enable: localStorage.setItem('child_tab_profile', '1'); location.reload();
 * Disable: localStorage.removeItem('child_tab_profile');
 *
 * Output: console group per navigation + summary table (window.__childTabProfile).
 */
(function () {
  'use strict';

  function enabled() {
    try {
      if (localStorage.getItem('child_tab_profile') === '1') return true;
    } catch (_) { /* ignore */ }
    try {
      return /(?:^|[?&])child_profile=1(?:&|$)/.test(window.location.search || '');
    } catch (_) {
      return false;
    }
  }

  if (!enabled()) return;

  const sessions = [];
  let sessionIndex = 0;
  let current = null;
  const apiLog = [];

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function mark(label, extra) {
    if (!current) return;
    const entry = { t: now(), label: label };
    if (extra) entry.extra = extra;
    current.marks.push(entry);
    console.log('[child-tab-profile]', label, extra || '');
  }

  function startSession(kind, meta) {
    if (current) endSession('superseded');
    sessionIndex += 1;
    current = {
      id: sessionIndex,
      kind: kind,
      meta: meta || {},
      startedAt: now(),
      marks: [],
      apis: [],
    };
    mark('session_start', kind);
  }

  function endSession(reason) {
    if (!current) return;
    current.endedAt = now();
    current.durationMs = Math.round(current.endedAt - current.startedAt);
    current.reason = reason || 'done';
    current.apis = apiLog.slice();
    sessions.push(current);
    console.groupCollapsed(
      '[child-tab-profile] #' + current.id + ' ' + current.kind +
      ' — ' + current.durationMs + 'ms (' + reason + ')'
    );
    current.marks.forEach(function (m) {
      const rel = Math.round(m.t - current.startedAt);
      console.log('  +' + rel + 'ms', m.label, m.extra || '');
    });
    if (current.apis.length) {
      console.table(current.apis.map(function (a) {
        return { endpoint: a.url, ms: a.ms, status: a.status };
      }));
    }
    console.groupEnd();
    current = null;
    apiLog.length = 0;
  }

  function navType() {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav) return 'unknown';
    return nav.type || 'navigate';
  }

  function bootTiming() {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      type: nav.type,
      domInteractive: Math.round(nav.domInteractive),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadEventEnd: Math.round(nav.loadEventEnd),
      transferSize: nav.transferSize,
    };
  }

  function wrapAuthApi() {
    if (!window.Auth || !Auth.api || Auth.api.__childProfileWrapped) return;
    const orig = Auth.api.bind(Auth);
    Auth.api = async function (url, options) {
      const t0 = now();
      let status = 'ok';
      try {
        const result = await orig(url, options);
        return result;
      } catch (err) {
        status = err && err.status ? String(err.status) : 'err';
        throw err;
      } finally {
        const ms = Math.round(now() - t0);
        const row = { url: url, ms: ms, status: status };
        apiLog.push(row);
        if (current) current.apis.push(row);
        console.log('[child-tab-profile] API', ms + 'ms', url);
      }
    };
    Auth.api.__childProfileWrapped = true;
  }

  function wrapShowTab() {
    if (typeof window.showTab !== 'function' || window.showTab.__childProfileWrapped) return;
    const orig = window.showTab;
    window.showTab = function (tab) {
      startSession('showTab', { tab: tab, path: location.pathname });
      mark('showTab_call', tab);
      const t0 = now();
      try {
        return orig.apply(this, arguments);
      } finally {
        mark('showTab_sync_done', Math.round(now() - t0) + 'ms sync');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            mark('showTab_paint');
            setTimeout(function () { endSession('showTab'); }, 0);
          });
        });
      }
    };
    window.showTab.__childProfileWrapped = true;
  }

  function wrapNavigateWorld() {
    if (!window.ChildWorldsNav || !ChildWorldsNav.navigateWorld) return;
    if (ChildWorldsNav.navigateWorld.__childProfileWrapped) return;
    const orig = ChildWorldsNav.navigateWorld;
    ChildWorldsNav.navigateWorld = function (worldId) {
      const path = (window.ChildWorlds && ChildWorlds.worldById)
        ? (ChildWorlds.worldById(worldId) || {}).href
        : '';
      const willReload = path && path.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '');
      startSession('navigateWorld', { worldId: worldId, targetPath: path, fullPageReload: willReload });
      mark('navigateWorld_call', worldId);
      if (willReload) {
        mark('full_page_navigation', path);
        console.warn('[child-tab-profile] FULL PAGE RELOAD →', path);
      }
      return orig.apply(this, arguments);
    };
    ChildWorldsNav.navigateWorld.__childProfileWrapped = true;
  }

  function wrapRefresh(name, obj, method) {
    if (!obj || typeof obj[method] !== 'function' || obj[method].__childProfileWrapped) return;
    const orig = obj[method];
    obj[method] = function () {
      mark(name + '_start');
      const t0 = now();
      const result = orig.apply(this, arguments);
      const done = function () {
        mark(name + '_end', Math.round(now() - t0) + 'ms');
      };
      if (result && typeof result.then === 'function') {
        return result.then(function (r) { done(); return r; }, function (e) { done(); throw e; });
      }
      done();
      return result;
    };
    obj[method].__childProfileWrapped = true;
  }

  function install() {
    wrapAuthApi();
    wrapShowTab();
    wrapNavigateWorld();
    wrapRefresh('ChildSamlingView.refresh', window.ChildSamlingView, 'refresh');
    wrapRefresh('ChildTreasureView.refresh', window.ChildTreasureView, 'refresh');
    wrapRefresh('ChildFamilyHall.refresh', window.ChildFamilyHall, 'refresh');
    if (typeof window.loadDay === 'function' && !window.loadDay.__childProfileWrapped) {
      const origLoad = window.loadDay;
      window.loadDay = function () {
        mark('loadDay_start');
        const t0 = now();
        const p = origLoad.apply(this, arguments);
        if (p && typeof p.then === 'function') {
          return p.then(function (r) {
            mark('loadDay_end', Math.round(now() - t0) + 'ms');
            return r;
          });
        }
        mark('loadDay_end', Math.round(now() - t0) + 'ms');
        return p;
      };
      window.loadDay.__childProfileWrapped = true;
    }
  }

  startSession('page_boot', { path: location.pathname, nav: navType() });
  mark('profiler_installed');
  const boot = bootTiming();
  if (boot) mark('navigation_timing', JSON.stringify(boot));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mark('DOMContentLoaded');
      install();
    });
  } else {
    install();
  }

  window.addEventListener('load', function () {
    mark('window_load');
    endSession('boot_complete');
  });

  window.__childTabProfile = {
    sessions: sessions,
    dump: function () {
      return sessions.slice();
    },
    summary: function () {
      return sessions.map(function (s) {
        return {
          id: s.id,
          kind: s.kind,
          ms: s.durationMs,
          meta: s.meta,
          apiCount: (s.apis || []).length,
          apiMs: (s.apis || []).reduce(function (a, b) { return a + b.ms; }, 0),
        };
      });
    },
  };

  console.info(
    '[child-tab-profile] Active — disable with localStorage.removeItem("child_tab_profile")'
  );
})();
