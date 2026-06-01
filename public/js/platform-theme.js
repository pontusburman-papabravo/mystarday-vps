(function () {
  'use strict';
  var root = document.documentElement;
  var isNative =
    typeof window.Platform !== 'undefined' &&
    typeof window.Platform.isNative === 'function' &&
    window.Platform.isNative();
  if (isNative) {
    root.classList.add('platform-native');
    var childPagePath = (window.location.pathname || '').replace(/\/$/, '');
    var isChildPage = childPagePath === '/child-dashboard' || childPagePath === '/child-login';
    if (isChildPage) root.classList.add('platform-child-page');
    if (typeof window.Platform.isIOS === 'function' && window.Platform.isIOS()) {
      root.classList.add('platform-ios');
    }
    if (typeof window.Platform.isAndroid === 'function' && window.Platform.isAndroid()) {
      root.classList.add('platform-android');
    }
    try {
      if (!sessionStorage.getItem('native_landing_redirected')) {
        var path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
        var nonRedirectPaths = ['/login', '/register', '/child-login', '/dashboard',
          '/child-dashboard', '/foralder', '/barn', '/settings', '/scheman',
          '/aktiviteter', '/beloningar', '/rapporter', '/pedagoger', '/faq',
          '/inkorg', '/nyheter', '/villkor', '/integritet', '/faq'];
        if (
          (path === '/' || path === '/index.html' || path === '/en' || path === '/en.html') &&
          nonRedirectPaths.indexOf(path) === -1 &&
          !window.location.pathname.startsWith('/api/')
        ) {
          sessionStorage.setItem('native_landing_redirected', '1');
          window.location.replace('/login');
        }
      }
    } catch (_) {}
  } else {
    root.classList.add('platform-web');
    try {
      sessionStorage.removeItem('native_landing_redirected');
    } catch (_) {}
  }
})();
