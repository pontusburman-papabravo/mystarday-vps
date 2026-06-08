/**
 * push-manager.js — Web Push subscription + settings manager for Min Stjärndag.
 *
 * Exposes window.PushManager_StarDay with:
 *   init()                — passive init (VAPID key + SW ready)
 *   subscribe()           — request permission + subscribe device
 *   unsubscribe()         — unsubscribe current device
 *   isSubscribed()        — true if device has active subscription
 *   isSupported()         — true if browser supports push
 *   isIOS()               — true if running on iOS Safari
 *   isStandalone()        — true if running as installed PWA
 *   getPermission()       — current Notification.permission value
 *   getPreferences()      — fetch push_preferences from backend
 *   savePreferences(obj)  — PUT push_preferences to backend
 *   requestAndSubscribe() — request permission, subscribe, return result string
 *
 * Does NOT own: sending push payloads (see src/lib/push-notifications.js).
 */

(function () {
  'use strict';

  // ─── Internal state ─────────────────────────────────────
  let _vapidPublicKey = null;
  let _registration = null;
  let _initialized = false;
  let _isNative = null;   // null = unknown yet, true = native iOS/Android, false = web
  let _nativeRegistered = false; // true once Platform.push.register() succeeds

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  // Cookie-only auth: no token from localStorage. Browser sends httpOnly cookie.
  function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    // Include CSRF token for POST/PUT requests (required since auth hardening)
    const csrf = (window.Auth && window.Auth.getCsrfToken()) ||
                 (function() { var m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/); return m ? decodeURIComponent(m[1]) : null; })();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  }

  // ─── Core lifecycle ─────────────────────────────────────

  async function init() {
    if (_initialized) return true;

    // Detect platform once
    if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined') {
      _isNative = window.Platform.isNative();
    } else {
      _isNative = false;
    }

    // On native iOS/Android: Platform.push handles everything.
    // push-manager.js does NOT own the native flow.
    if (_isNative) return true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      const res = await fetch('/api/push/vapid-public-key');
      if (!res.ok) return false;
      const data = await res.json();
      _vapidPublicKey = data.publicKey;
      _registration = await navigator.serviceWorker.ready;
      _initialized = true;
      return true;
    } catch (err) {
      console.warn('[PushManager] Init failed:', err);
      return false;
    }
  }

  // ─── Feature detection helpers ──────────────────────────

  /** True if push notifications are supported (web or native). */
  function isSupported() {
    if (_isNative) return true;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /** True if running on iOS (native app or iOS Safari/PWA). */
  function isIOS() {
    if (isNative() && typeof window.Platform !== 'undefined' && typeof window.Platform.isIOS === 'function') {
      return window.Platform.isIOS();
    }
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /** True if running as a native iOS/Android Capacitor app. */
  function isNative() {
    if (_isNative !== null) return _isNative;
    if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined') {
      _isNative = window.Platform.isNative();
    } else {
      _isNative = false;
    }
    return _isNative;
  }

  /** True if running as installed PWA (standalone/fullscreen). */
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           navigator.standalone === true;
  }

  /** Current notification permission string: 'granted' | 'denied' | 'default'. */
  function getPermission() {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  }

  // ─── Subscription management ────────────────────────────

  async function isSubscribed() {
    if (!_initialized) await init();
    if (_isNative) {
      // On native, registration is driven by Platform.push. Store a flag in memory
      // when registration succeeds so we can report the current state.
      return _nativeRegistered === true;
    }
    if (!_registration) return false;
    const sub = await _registration.pushManager.getSubscription();
    return !!sub;
  }

  async function subscribe() {
    if (!_initialized) {
      const ok = await init();
      if (!ok) return { success: false, error: 'Push stöds inte i den här webbläsaren' };
    }

    // Native iOS/Android: delegate entirely to Platform.push
    if (_isNative) {
      if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined' && window.Platform.push) {
        const result = await window.Platform.push.register();
        if (result.success) {
          _nativeRegistered = true;
          return { success: true };
        }
        if (result.reason === 'permission_denied') return { success: false, denied: true, error: 'Notistillstånd nekades i app-inställningar.' };
        if (result.reason === 'push_plugin_unavailable') {
          return { success: false, error: 'Push-plugin saknas i appen. Kör npx cap sync ios och bygg om.' };
        }
        return { success: false, error: result.reason || 'Kunde inte aktivera push-notiser' };
      }
      return { success: false, error: 'Plattform push-stöd saknas' };
    }

    if (Notification.permission === 'denied') {
      return { success: false, denied: true, error: 'Notistillstånd nekades. Aktivera i webbläsarens inställningar.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, denied: true, error: 'Notistillstånd nekades' };
      }

      const subscription = await _registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(_vapidPublicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ subscription }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error || 'Prenumeration misslyckades' };
      }

      return { success: true };
    } catch (err) {
      console.warn('[PushManager] Subscribe error:', err);
      return { success: false, error: 'Kunde inte aktivera push-notiser' };
    }
  }

  async function unsubscribe() {
    if (!_initialized) await init();

    // Native iOS/Android: delegate entirely to Platform.push
    if (_isNative) {
      if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined' && window.Platform.push) {
        await window.Platform.push.unregister();
        return { success: true };
      }
      return { success: false };
    }

    if (!_registration) return { success: false };

    try {
      const subscription = await _registration.pushManager.getSubscription();
      if (!subscription) return { success: true };

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint }),
        credentials: 'include',
      });

      return { success: true };
    } catch (err) {
      console.warn('[PushManager] Unsubscribe error:', err);
      return { success: false, error: 'Kunde inte avaktivera push-notiser' };
    }
  }

  /**
   * Request permission + subscribe in one call.
   * Returns a result string for the settings UI:
   *   'granted'           — permission granted, subscription active
   *   'denied'            — user denied notification permission
   *   'ios-not-installed' — iOS user hasn't installed PWA
   *   'error'             — unexpected failure
   */
  async function requestAndSubscribe() {
    // iOS PWA requires standalone install — skip if native (Capacitor handles push natively)
    if (isIOS() && !isStandalone() && !isNative()) {
      return { status: 'ios-not-installed', message: 'Lägg till appen på hemskärmen för push i Safari.' };
    }

    const result = await subscribe();
    if (result.success) return { status: 'granted' };
    if (result.denied) return { status: 'denied', message: result.error };
    return { status: 'error', message: result.error || 'Kunde inte aktivera push-notiser' };
  }

  // ─── Backend preferences ────────────────────────────────

  /** Fetch push_preferences from GET /api/push/preferences. */
  async function getPreferences() {
    // Cookie-only auth: no Authorization header needed.
    const res = await fetch('/api/push/preferences', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Could not load preferences');
    return res.json();
  }

  /** Save push_preferences via PUT /api/push/preferences. */
  async function savePreferences(prefs) {
    const res = await fetch('/api/push/preferences', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(prefs),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Could not save preferences');
    return res.json();
  }

  // ─── Expose global API ──────────────────────────────────
  window.PushManager_StarDay = {
    init,
    subscribe,
    unsubscribe,
    isSubscribed,
    isSupported,
    isIOS,
    isNative,
    isStandalone,
    getPermission,
    getPreferences,
    savePreferences,
    requestAndSubscribe,
  };

  // Auto-init (passive — no permission prompt)
  async function autoRegister() {
    await init();
    // On native iOS/Android: auto-register on every app start if user has granted permission.
    // Platform.push.requestPermissions() only re-prompts if not already granted.
    if (_isNative) {
      if (typeof window !== 'undefined' && typeof window.Platform !== 'undefined' && window.Platform.push) {
        try {
          const result = await window.Platform.push.register();
          if (result.success) _nativeRegistered = true;
        } catch (_) {}
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRegister);
  } else {
    autoRegister();
  }
})();
