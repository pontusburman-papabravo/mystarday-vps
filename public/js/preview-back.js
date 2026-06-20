/**
 * Back navigation for marketing previews vs in-app previews.
 */
(function (global) {
  'use strict';

  function isMarketingVisit() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    return from === 'landing' || from === 'pricing';
  }

  function resolveBackHref() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    if (from === 'pricing') return '/pricing-info';
    if (from === 'landing') return '/#program';
    if (global.Auth && typeof global.Auth.isLoggedIn === 'function' && global.Auth.isLoggedIn()) {
      return '/dashboard';
    }
    return '/';
  }

  function resolveBackLabel() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    if (from === 'pricing') return '← Tillbaka till programmen';
    if (from === 'landing') return '← Tillbaka till startsidan';
    if (global.Auth && typeof global.Auth.isLoggedIn === 'function' && global.Auth.isLoggedIn()) {
      return '← Till dashboard';
    }
    return '← Till startsidan';
  }

  function apply(linkEl) {
    if (!linkEl) return;
    linkEl.href = resolveBackHref();
    linkEl.textContent = resolveBackLabel();
    linkEl.title = 'Tillbaka';
  }

  function appendMarketingQuery(path) {
    if (!path) return path;
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'from=landing';
  }

  global.PreviewBack = {
    isMarketingVisit: isMarketingVisit,
    resolveBackHref: resolveBackHref,
    resolveBackLabel: resolveBackLabel,
    apply: apply,
    appendMarketingQuery: appendMarketingQuery,
  };
})(window);
