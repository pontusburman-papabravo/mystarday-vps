/**
 * Back navigation for marketing previews vs in-app previews.
 */
(function (global) {
  'use strict';

  function isMarketingVisit() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    return from === 'landing' || from === 'pricing' || from === 'upgrade';
  }

  function isLoggedIn() {
    return global.Auth && typeof global.Auth.isLoggedIn === 'function' && global.Auth.isLoggedIn();
  }

  function resolveBackHref() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    if (from === 'upgrade') return '/upgrade';
    if (from === 'pricing') return '/pricing-info';
    if (from === 'landing' && !isLoggedIn()) return '/#program';
    if (from === 'landing' && isLoggedIn()) {
      var ref = global.document.referrer || '';
      if (ref.indexOf('/pricing-info') !== -1) return '/pricing-info';
      if (ref.indexOf('/upgrade') !== -1) return '/upgrade';
      return '/dashboard';
    }
    if (isLoggedIn()) {
      return '/dashboard';
    }
    return '/';
  }

  function resolveBackLabel() {
    var params = new URLSearchParams(global.location.search);
    var from = params.get('from');
    if (from === 'upgrade') return '← Tillbaka till Extra';
    if (from === 'pricing') return '← Tillbaka till programmen';
    if (from === 'landing' && !isLoggedIn()) return '← Tillbaka till startsidan';
    if (from === 'landing' && isLoggedIn()) {
      var ref = global.document.referrer || '';
      if (ref.indexOf('/pricing-info') !== -1) return '← Tillbaka till programmen';
      if (ref.indexOf('/upgrade') !== -1) return '← Tillbaka till Extra';
      return '← Till dashboard';
    }
    if (isLoggedIn()) {
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
