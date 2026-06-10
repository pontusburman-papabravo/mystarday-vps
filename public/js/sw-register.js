/**
 * sw-register.js — Service Worker registration with update detection.
 * Owns: SW lifecycle management, update banner, version cache busting.
 * Does NOT own: push subscriptions (push-manager.js), offline queue (offline-queue.js).
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

  // Native Capacitor: never register SW — it caches remote HTML/JS and the app looks like PWA.
  if (isNativeShell()) {
    unregisterAllServiceWorkers();
    return;
  }

  // Capacitor bridge may load after this script — recheck briefly before registering SW.
  var nativeRechecks = 0;
  var nativeTimer = setInterval(function () {
    nativeRechecks += 1;
    if (isNativeShell()) {
      clearInterval(nativeTimer);
      unregisterAllServiceWorkers();
      return;
    }
    if (nativeRechecks >= 20) clearInterval(nativeTimer);
  }, 50);

  // Gate 2I: offline_pwa — only register SW if the feature is available for this family.
  // If the feature check fails (non-critical), register anyway (SW failure is non-fatal).
  async function registerSW() {

  // Prevent double-reload when controllerchange fires during a navigation
  var refreshing = false;

  // ─── Auto-reload when a new SW takes control ────────────
  // This fires after skipWaiting() + clients.claim() completes on the new SW.
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // ─── Reload banner ──────────────────────────────────────────
  // waitingWorker: reference to the SW in "waiting" state, if any.
  // When present, the reload button messages it to skipWaiting.
  // When absent (SW already activated), the reload button does a plain reload.
  function showUpdateBanner(waitingWorker) {
    if (document.getElementById('sw-update-banner')) return; // already shown

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
      // If we have a reference to a waiting worker, tell it to activate.
      // controllerchange listener (above) will trigger the actual reload.
      if (waitingWorker && waitingWorker.state === 'installed') {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        // Fallback: if controllerchange doesn't fire within 2s
        // (e.g. the SW was already activating), force a reload.
        setTimeout(function () {
          if (!refreshing) window.location.reload();
        }, 2000);
      } else {
        // No waiting worker — the new SW already activated.
        // A plain reload picks up the new assets.
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

    // Wait for body if script runs in <head>
    var attach = function () { document.body.appendChild(banner); };
    if (document.body) {
      attach();
    } else {
      window.addEventListener('DOMContentLoaded', attach, { once: true });
    }
  }

  // ─── Listen for messages from activated SW ────────────────
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (!event.data) return;

    // Cookie-only auth migration: purge stale localStorage token on SW upgrade.
    // Why: old localStorage token caused login-loop (expired token in Authorization
    // header took priority over valid httpOnly cookie in server auth middleware).
    if (event.data.type === 'CLEANUP_AUTH') {
      try {
        localStorage.removeItem('stjarndag_token');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
      } catch (e) { /* localStorage unavailable */ }
    }

    // SW_UPDATED: new SW activated immediately via skipWaiting (no waiting state).
    if (event.data.type === 'SW_UPDATED') {
      showUpdateBanner(null); // already activated, no waiting worker
    }
  });

  // ─── Track waiting worker from updatefound / statechange ───
  function watchRegistration(reg) {
    reg.addEventListener('updatefound', function () {
      var newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', function () {
        // Worker installed but waiting for old SW to release clients
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(newWorker);
        }
        // Worker already activated (skipWaiting fired during install)
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          showUpdateBanner(null);
        }
      });
    });
  }

  // ─── PWA badge clear on app open ─────────────────────────────
  // When the user opens the PWA (or switches back to it), clear the home
  // screen badge so the red number disappears. Badging API: Chrome 81+,
  // Safari 16.4+ — no-op where unsupported.
  function clearBadgeIfSupported() {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(function () { /* non-fatal */ });
    }
  }

  // Clear badge when page becomes visible (user switches to PWA)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      clearBadgeIfSupported();
    }
  });

  // Clear badge on initial page load (user taps PWA icon to open)
  window.addEventListener('load', function () {
    clearBadgeIfSupported();
  });

  // ─── Register SW (Gate 2I: offline_pwa) ─────────────────────
  // Only register the service worker if offline_pwa feature is available.
  // If feature check fails, register anyway (SW failure is non-fatal).
  window.addEventListener('load', async function () {
    if (isNativeShell()) {
      unregisterAllServiceWorkers();
      return;
    }
    clearBadgeIfSupported();
    try {
      const resp = await fetch('/api/features', { credentials: 'include' });
      if (resp.ok) {
        const features = await resp.json();
        const slugs = features.map(function(f) { return f.slug; });
        if (!slugs.includes('offline_pwa')) return; // skip SW registration
      }
    } catch (_) { /* non-critical — proceed with registration */ }

    navigator.serviceWorker
      .register('/sw.js')
      .then(function (reg) {
        watchRegistration(reg);

        // A worker is already waiting from a previous visit —
        // show banner immediately with a reference to it.
        if (reg.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(reg.waiting);
        }
      })
      .catch(function () {
        // Registration failure is non-fatal; app works without SW
      });
  });
})();
