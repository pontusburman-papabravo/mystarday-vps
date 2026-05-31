(function () {
  'use strict';
  var root = document.documentElement;
  var isNative =
    typeof Capacitor !== 'undefined' &&
    typeof Capacitor.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform();
  if (isNative) {
    root.classList.add('platform-native');
    // Child pages get platform-child-page class so CSS can hide tab bar
    var childPagePath = (window.location.pathname || '').replace(/\/$/, '');
    var isChildPage = childPagePath === '/child-dashboard' || childPagePath === '/child-login';
    if (isChildPage) root.classList.add('platform-child-page');
    if (typeof Capacitor.getPlatform === 'function') {
      var plat = Capacitor.getPlatform();
      if (plat === 'ios') root.classList.add('platform-ios');
      if (plat === 'android') root.classList.add('platform-android');
    }
    // Redirect marketing landing to login — only for exact root/en paths, never /login /register /dashboard /api/*
    // Guard with sessionStorage so a post-redirect page (or child page) can't trigger a loop
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
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        root.classList.add('platform-pwa');
      }
    } catch (_) {}
  }
})();