(function () {
  'use strict';

  /** Block pinch/double-tap zoom in native WebView (App Store–style shell). */
  function patchViewportNoZoom() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    var c = meta.getAttribute('content') || '';
    if (/\bmaximum-scale\s*=\s*1\b/i.test(c) && /\buser-scalable\s*=\s*no\b/i.test(c)) return;
    c = c.replace(/,?\s*maximum-scale\s*=[^,]*/gi, '');
    c = c.replace(/,?\s*user-scalable\s*=[^,]*/gi, '');
    c = c.trim().replace(/,\s*$/, '');
    meta.setAttribute('content', c + ', maximum-scale=1, user-scalable=no');
  }

  function detectNative() {
    if (typeof window.Platform !== 'undefined' &&
        typeof window.Platform.isNative === 'function' &&
        window.Platform.isNative()) {
      return true;
    }
    if (typeof Capacitor !== 'undefined' &&
        typeof Capacitor.isNativePlatform === 'function' &&
        Capacitor.isNativePlatform()) {
      return true;
    }
    return false;
  }

  function applyPlatformTheme() {
    var root = document.documentElement;
    var isNative = detectNative();

    root.classList.remove('platform-native', 'platform-web', 'platform-ios', 'platform-android', 'platform-child-page');

    if (isNative) {
      patchViewportNoZoom();
      root.classList.add('platform-native');
      var childPagePath = (window.location.pathname || '').replace(/\/$/, '');
      var isChildPage = childPagePath === '/child-dashboard' || childPagePath === '/child-login';
      if (isChildPage) root.classList.add('platform-child-page');
      if (typeof window.Platform !== 'undefined' && typeof window.Platform.isIOS === 'function' && window.Platform.isIOS()) {
        root.classList.add('platform-ios');
      } else if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') {
        root.classList.add('platform-ios');
      }
      if (typeof window.Platform !== 'undefined' && typeof window.Platform.isAndroid === 'function' && window.Platform.isAndroid()) {
        root.classList.add('platform-android');
      } else if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() === 'android') {
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
            return;
          }
        }
      } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent('platform-theme-applied', { detail: { native: true } }));
      } catch (_) {}
    } else {
      root.classList.add('platform-web');
      try {
        sessionStorage.removeItem('native_landing_redirected');
      } catch (_) {}
    }
  }

  function scheduleApply() {
    applyPlatformTheme();
    if (detectNative()) return;

    // Capacitor bridge can appear slightly after DOMContentLoaded in remote-URL WebView.
    var attempts = 0;
    var maxAttempts = 40;
    var timer = setInterval(function () {
      attempts += 1;
      if (detectNative()) {
        clearInterval(timer);
        applyPlatformTheme();
        return;
      }
      if (attempts >= maxAttempts) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleApply);
  } else {
    scheduleApply();
  }
})();
