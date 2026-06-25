/**
 * sw-register.js — Service Worker registration with update detection.
 * Owns: SW lifecycle management, update banner, version cache busting.
 * Does NOT own: push subscriptions (push-manager.js), offline queue (offline-queue.js).
 *
 * Native Capacitor WebView: never register — remote URL + SW causes stale cache and reload loops.
 *
 * Update flow (standard skipWaiting pattern):
 *   1. Browser detects new sw.js and installs it.
 *   2. New SW may call skipWaiting() during install (fast path) OR sit in waiting state.
 *   3. This script detects the waiting worker (via updatefound/statechange or reg.waiting on load).
 *   4. Shows the "Ladda om nu" banner.
 *   5. On click: sends SKIP_WAITING to the waiting worker, which calls self.skipWaiting().
 *   6. controllerchange fires when the new SW takes over → page reloads automatically.
 *   7. If controllerchange doesn't fire within 2s (new SW already active), falls back to location.reload().
 */

(function () {
  if (!('serviceWorker' in navigator)) return;

  function isNativeShell() {
    if (typeof window !== 'undefined' && typeof window.WEBVIEW_SERVER_URL === 'string' && window.WEBVIEW_SERVER_URL) {
      return true;
    }
    if (typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      return true;
    }
    if (typeof window !== 'undefined' && window.Platform && typeof window.Platform.isNative === 'function' && window.Platform.isNative()) {
      return true;
    }
    return false;
  }

  function unregisterAllServiceWorkers() {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
  }

  // ─── Reload banner ──────────────────────────────────────────
  function showUpdateBanner(waitingWorker) {
    if (document.getElementById('sw-update-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'z-index:99999',
      'background:#1e293b',
      'color:#f8fafc',
      'padding:12px 16px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'font-family:system-ui,sans-serif',
      'font-size:14px',
      'box-shadow:0 -2px 12px rgba(0,0,0,0.25)',
      'flex-wrap:wrap',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = '✨ En ny version av appen är redo!';
    text.style.cssText = 'flex:1;min-width:0;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

    var reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Ladda om nu';
    reloadBtn.style.cssText = [
      'background:#6366f1',
      'color:#fff',
      'border:none',
      'border-radius:6px',
      'padding:8px 16px',
      'font-size:14px',
      'font-weight:600',
      'cursor:pointer',
      'white-space:nowrap',
    ].join(';');

    reloadBtn.addEventListener('click', function () {
      if (waitingWorker && waitingWorker.state === 'installed') {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(function () {
          if (!window.__swRegisterRefreshing) window.location.reload();
        }, 2000);
      } else {
        window.location.reload();
      }
    });

    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Senare';
    dismissBtn.setAttribute('aria-label', 'Stäng uppdateringsbanner');
    dismissBtn.style.cssText = [
      'background:transparent',
      'color:#94a3b8',
      'border:1px solid #475569',
      'border-radius:6px',
      'padding:8px 12px',
      'font-size:13px',
      'cursor:pointer',
      'white-space:nowrap',
    ].join(';');
    dismissBtn.addEventListener('click', function () { banner.remove(); });

    btnRow.appendChild(reloadBtn);
    btnRow.appendChild(dismissBtn);
    banner.appendChild(text);
    banner.appendChild(btnRow);

    var attach = function () { document.body.appendChild(banner); };
    if (document.body) {
      attach();
    } else {
      window.addEventListener('DOMContentLoaded', attach, { once: true });
    }
  }

  function watchRegistration(reg) {
    reg.addEventListener('updatefound', function () {
      var newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', function () {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newWorker);
        }
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          showUpdateBanner(null);
        }
      });
    });
  }

  function clearBadgeIfSupported() {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(function () { /* non-fatal */ });
    }
  }

  /** Web/PWA only — never call on native (controllerchange + unregister causes reload loops). */
  function startWebServiceWorker() {
    if (isNativeShell()) {
      unregisterAllServiceWorkers();
      return;
    }

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (window.__swRegisterRefreshing || isNativeShell()) return;
      window.__swRegisterRefreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (!event.data) return;

      if (event.data.type === 'CLEANUP_AUTH') {
        try {
          localStorage.removeItem('stjarndag_token');
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
        } catch (e) { /* localStorage unavailable */ }
      }

      if (event.data.type === 'SW_UPDATED') {
        showUpdateBanner(null);
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        clearBadgeIfSupported();
      }
    });

    window.addEventListener('load', function () {
      if (isNativeShell()) {
        unregisterAllServiceWorkers();
        return;
      }
      clearBadgeIfSupported();
      (async function registerSw() {
        try {
          const resp = await fetch('/api/features', { credentials: 'include' });
          if (resp.ok) {
            const features = await resp.json();
            const slugs = features.map(function (f) { return f.slug; });
            if (!slugs.includes('offline_pwa')) return;
          }
        } catch (_) { /* non-critical — proceed with registration */ }

        if (isNativeShell()) {
          unregisterAllServiceWorkers();
          return;
        }

        navigator.serviceWorker
          .register('/sw.js')
          .then(function (reg) {
            watchRegistration(reg);
            if (reg.waiting && navigator.serviceWorker.controller) {
              showUpdateBanner(reg.waiting);
            }
          })
          .catch(function () {
            // Registration failure is non-fatal; app works without SW
          });
      })();
    });
  }

  // Wait for Capacitor bridge before attaching controllerchange (avoids native reload loop).
  if (isNativeShell()) {
    unregisterAllServiceWorkers();
    return;
  }

  var nativeRechecks = 0;
  var nativeTimer = setInterval(function () {
    nativeRechecks += 1;
    if (isNativeShell()) {
      clearInterval(nativeTimer);
      unregisterAllServiceWorkers();
      return;
    }
    if (nativeRechecks >= 40) {
      clearInterval(nativeTimer);
      startWebServiceWorker();
    }
  }, 50);
})();
