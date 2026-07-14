(function () {
  'use strict';

  /** Block pinch/double-tap zoom in native WebView (App Store–style shell). */
  function patchViewportNoZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    let c = meta.getAttribute('content') || '';
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

  function applyTabletClass(isNative) {
    const root = document.documentElement;
    if (!isNative) {
      root.classList.remove('platform-tablet');
      return;
    }
    const tabletMq = typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 768px)')
      : null;
    if (tabletMq && tabletMq.matches) root.classList.add('platform-tablet');
    else root.classList.remove('platform-tablet');
  }

  function applyPlatformTheme() {
    const root = document.documentElement;
    const isNative = detectNative();

    root.classList.remove('platform-native', 'platform-web', 'platform-ios', 'platform-android', 'platform-child-page', 'platform-tablet');

    if (isNative) {
      patchViewportNoZoom();
      root.classList.add('platform-native');
      const childPagePath = (window.location.pathname || '').replace(/\/$/, '');
      const isChildPage = childPagePath === '/child-login' || childPagePath.indexOf('/child/') === 0;
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
      applyTabletClass(true);
      try {
        const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
        const marketingPaths = ['/', '/index.html', '/en', '/en.html'];
        if (marketingPaths.indexOf(path) !== -1 && !window.location.pathname.startsWith('/api/')) {
          let loggedIn = false;
          try {
            loggedIn = !!localStorage.getItem('stjarndag_user');
          } catch (_) {}
          window.location.replace(loggedIn ? '/dashboard' : '/login');
          return;
        }
      } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent('platform-theme-applied', { detail: { native: true } }));
      } catch (_) {}
    } else {
      root.classList.add('platform-web');
    }
  }

  function scheduleApply() {
    applyPlatformTheme();
    if (detectNative()) return;

    // Capacitor bridge can appear slightly after DOMContentLoaded in remote-URL WebView.
    let attempts = 0;
    const maxAttempts = 40;
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

  if (typeof window.matchMedia === 'function') {
    const tabletLayoutMq = window.matchMedia('(min-width: 768px)');
    const onTabletLayoutChange = function () {
      if (detectNative()) applyTabletClass(true);
    };
    if (typeof tabletLayoutMq.addEventListener === 'function') {
      tabletLayoutMq.addEventListener('change', onTabletLayoutChange);
    } else if (typeof tabletLayoutMq.addListener === 'function') {
      tabletLayoutMq.addListener(onTabletLayoutChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleApply);
  } else {
    scheduleApply();
  }
})();
