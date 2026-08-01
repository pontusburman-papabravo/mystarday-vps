/**
 * Platform abstraction layer — isolates Capacitor-specific logic.
 * Loaded early in <head>, before all other scripts.
 *
 * WHAT: exposes window.Platform with isNative/isIOS/isAndroid/isWeb detection,
 * native plugin shims (haptics, share, push), and a ready() promise.
 *
 * WHAT NOT: does NOT load @capacitor/core — that happens only after native init
 * via the Capacitor bundler. On web, this file works without any dependencies.
 */

/** Native WebView: drop any PWA service worker before sw-register.js runs (prevents reload loop). */
(function earlyNativeServiceWorkerGuard() {
  function capNative() {
    return typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform();
  }
  if (!capNative()) return;
  try {
    window.WEBVIEW_SERVER_URL = window.location.origin;
  } catch (_) {}
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) { r.unregister(); });
  }).catch(function () {});
})();

const Platform = (function () {
  function isNative() {
    return typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform();
  }

  function isIOS() {
    return isNative() && Capacitor.getPlatform() === 'ios';
  }

  function isAndroid() {
    return isNative() && Capacitor.getPlatform() === 'android';
  }

  function isWeb() {
    return !isNative();
  }

  /** Native iOS, or web/PWA (Apple JS when client ID configured). */
  function isAppleSignInAvailable() {
    if (isNative() && isIOS()) {
      return !!(typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.SignInWithApple);
    }
    if (isWeb()) return true;
    return false;
  }

  /** Native Android, or web/PWA (Google Identity Services). */
  function isGoogleSignInAvailable() {
    if (isNative() && isAndroid()) return true;
    if (isWeb()) return true;
    return false;
  }

  let _googleClientId = null;
  const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';

  function loadGoogleClientId() {
    if (_googleClientId) return Promise.resolve(_googleClientId);
    return fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        _googleClientId = (cfg && cfg.googleWebClientId) || '';
        return _googleClientId;
      })
      .catch(function () { return ''; });
  }

  function loadGoogleGsi() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve();
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      return new Promise(function (resolve, reject) {
        let attempts = 0;
        function wait() {
          if (window.google && window.google.accounts && window.google.accounts.id) {
            resolve();
            return;
          }
          attempts += 1;
          if (attempts > 80) {
            reject(new Error('Google Sign In JS inte tillgänglig'));
            return;
          }
          setTimeout(wait, 50);
        }
        wait();
      });
    }
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = GOOGLE_GSI_URL;
      script.async = true;
      script.defer = true;
      script.onload = function () {
        let attempts = 0;
        function wait() {
          if (window.google && window.google.accounts && window.google.accounts.id) {
            resolve();
            return;
          }
          attempts += 1;
          if (attempts > 80) {
            reject(new Error('Google Sign In JS inte tillgänglig'));
            return;
          }
          setTimeout(wait, 50);
        }
        wait();
      };
      script.onerror = function () {
        reject(new Error('Kunde inte ladda Google Sign In'));
      };
      document.head.appendChild(script);
    });
  }

  function webGoogleSignIn(clientId) {
    return loadGoogleGsi().then(function () {
      return new Promise(function (resolve, reject) {
        let settled = false;
        function finish(err, result) {
          if (settled) return;
          settled = true;
          if (err) reject(err);
          else resolve(result);
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: function (response) {
            if (response && response.credential) {
              finish(null, { idToken: response.credential });
            } else {
              finish(new Error('Google-inloggning misslyckades'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt(function (notification) {
          if (!notification) return;
          if (notification.isNotDisplayed && notification.isNotDisplayed()) {
            const host = document.createElement('div');
            host.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
            document.body.appendChild(host);
            window.google.accounts.id.renderButton(host, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
            });
            const btn = host.querySelector('div[role="button"]');
            if (btn && typeof btn.click === 'function') btn.click();
            else finish(new Error('Google-inloggning är inte tillgänglig i den här webbläsaren'));
            setTimeout(function () { host.remove(); }, 10000);
          } else if (notification.isDismissedMoment && notification.isDismissedMoment()) {
            finish(new Error('Avbruten'));
          }
        });
      });
    });
  }

  const googleSignIn = {
    isAvailable: isGoogleSignInAvailable,
    async signIn() {
      const clientId = await loadGoogleClientId();
      if (!clientId) {
        throw new Error('Google Sign In är inte redo — försök igen om en stund.');
      }
      if (isNative() && isAndroid()) {
        const GoogleAuth =
          typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.GoogleAuth;
        if (!GoogleAuth || typeof GoogleAuth.initialize !== 'function' || typeof GoogleAuth.signIn !== 'function') {
          throw new Error(
            'Google Sign In-plugin saknas. Kör: npm i @codetrix-studio/capacitor-google-auth && npx cap sync android'
          );
        }
        await GoogleAuth.initialize({
          clientId: clientId,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
        const result = await GoogleAuth.signIn();
        const idToken =
          (result && result.authentication && result.authentication.idToken) ||
          (result && result.idToken);
        return { idToken: idToken };
      }
      if (isWeb()) {
        return webGoogleSignIn(clientId);
      }
      throw new Error('Google Sign In är inte tillgängligt på den här enheten');
    },
  };

  function ready() {
    if (isNative()) {
      // Capacitor has already initialised — resolve immediately.
      return Promise.resolve();
    }
    // On web, there's nothing to wait for.
    return Promise.resolve();
  }

  // ── Vibration toggle (localStorage) ──────────────────────────────────
  function isHapticsEnabled() {
    // Stored per-child via childId key, or a global default if no child context.
    try {
      return localStorage.getItem('stjarndag_haptics_enabled') !== 'false';
    } catch (_) {
      return true;
    }
  }

  function setHapticsEnabled(val) {
    try {
      localStorage.setItem('stjarndag_haptics_enabled', val ? 'true' : 'false');
    } catch (_) {}
  }

  // Haptics — navigator.vibrate on native Android WebView (bare-specifier @capacitor/haptics
  // imports fail in remote-URL WebView). iOS native uses bridge when plugin is present.
  function nativeVibrate(ms) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  function getHapticsPlugin() {
    return (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Haptics) || null;
  }

  async function runNativeHaptic(kind) {
    const Haptics = getHapticsPlugin();
    if (Haptics && typeof Haptics.impact === 'function' && !isAndroid()) {
      try {
        await Haptics.impact({ style: kind });
        return;
      } catch (_) {}
    }
    if (kind === 'light') nativeVibrate(10);
    else if (kind === 'medium') nativeVibrate(25);
    else nativeVibrate(50);
  }

  const haptics = {
    async light() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        await runNativeHaptic('light');
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    async medium() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        await runNativeHaptic('medium');
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    },
    async heavy() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        await runNativeHaptic('heavy');
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    async success() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        const Haptics = getHapticsPlugin();
        if (Haptics && typeof Haptics.notification === 'function' && !isAndroid()) {
          try {
            await Haptics.notification({ type: 'SUCCESS' });
            return;
          } catch (_) {}
        }
        nativeVibrate([30, 50, 30]);
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    },
    async error() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        const Haptics = getHapticsPlugin();
        if (Haptics && typeof Haptics.notification === 'function' && !isAndroid()) {
          try {
            await Haptics.notification({ type: 'ERROR' });
            return;
          } catch (_) {}
        }
        nativeVibrate([80, 30, 80]);
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 30, 80]);
      }
    },
    isEnabled() { return isHapticsEnabled(); },
    setEnabled(val) { setHapticsEnabled(val); }
  };

  // Share — Capacitor bridge on native (bare-specifier imports fail in remote-URL WebView).
  const share = async function (opts) {
    if (isNative()) {
      const Share = (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Share) || null;
      if (Share && typeof Share.share === 'function') {
        try {
          return await Share.share({
            title: opts.title || '',
            text: opts.text || '',
            url: opts.url || '',
          });
        } catch (err) {
          console.warn('[Platform.share] Native share failed:', err.message);
        }
      }
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        return await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      } catch (err) {
        // User cancelled — not an error
        if (err.name !== 'AbortError') throw err;
        return;
      }
    }
    // Fallback: copy text to clipboard
    if (opts.text) {
      try {
        await navigator.clipboard.writeText(opts.text);
        return { copied: true };
      } catch (_) {}
    }
    throw new Error('Share not supported');
  };

  // Native push token cache (for unregister + bridge listener).
  let _lastNativePushToken = null;
  let _nativePushListenersReady = false;

  function pushAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const csrf = (window.Auth && window.Auth.getCsrfToken && window.Auth.getCsrfToken()) ||
      (function () {
        const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : null;
      })();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  }

  /** Capacitor bridge — bare-specifier imports fail in remote-URL WebView. */
  function getPushNotificationsPlugin() {
    return (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PushNotifications) || null;
  }

  async function ensureNativePushListeners(PushNotifications) {
    if (_nativePushListenersReady) return;
    _nativePushListenersReady = true;
    await PushNotifications.addListener('registration', async function (tokenEvt) {
      _lastNativePushToken = tokenEvt.value;
      const platform = isIOS() ? 'ios' : 'android';
      try {
        const res = await fetch('/api/push/register-native', {
          method: 'POST',
          headers: pushAuthHeaders(),
          body: JSON.stringify({ token: tokenEvt.value, platform: platform }),
          credentials: 'include',
        });
        if (!res.ok) {
          console.error('[Platform.push] Token registration failed:', res.status, await res.text().catch(function () { return ''; }));
        }
      } catch (err) {
        console.error('[Platform.push] Token registration failed:', err);
      }
    });
    await PushNotifications.addListener('registrationError', function (err) {
      console.error('[Platform.push] Registration error:', err);
    });
  }

  // Push — Web Push on web, Capacitor PushNotifications on native.
  const push = {
    /**
     * Request push notification permission and register the device token.
     * On web: registers with the backend's VAPID subscription endpoint.
     * On iOS/Android: requests Capacitor PushNotifications permission and
     *   registers the APNs/FCM token via /api/push/register-native.
     */
    async register() {
      if (isNative()) {
        try {
          const PushNotifications = getPushNotificationsPlugin();
          if (!PushNotifications) {
            console.warn('[Platform.push] PushNotifications plugin not available — run npx cap sync ios');
            return { success: false, reason: 'push_plugin_unavailable' };
          }
          await ensureNativePushListeners(PushNotifications);
          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive !== 'granted') {
            console.warn('[Platform.push] Permission denied:', permResult);
            return { success: false, reason: 'permission_denied' };
          }
          await PushNotifications.register();
          return { success: true, token: _lastNativePushToken };
        } catch (err) {
          console.error('[Platform.push] Register failed:', err);
          return { success: false, reason: err.message || 'register_failed' };
        }
      } else {
        // Web: use the Service Worker registration + VAPID subscription
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return { success: false, reason: 'push_not_supported' };
        }
        const swReg = await navigator.serviceWorker.ready;
        const pubKeyRes = await fetch('/api/push/vapid-public-key');
        if (!pubKeyRes.ok) {
          const err = await pubKeyRes.json().catch(() => ({}));
          return { success: false, reason: err.error || 'not_configured' };
        }
        const { publicKey } = await pubKeyRes.json();
        const sub = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: pushAuthHeaders(),
          body: JSON.stringify({ subscription: sub.toJSON() }),
          credentials: 'include',
        });
        if (!subRes.ok) {
          const err = await subRes.json().catch(function () { return {}; });
          return { success: false, reason: err.error || 'subscribe_failed' };
        }
        return { success: true };
      }
    },

    /**
     * Unregister this device from push notifications.
     * Removes the token/subscription from the backend.
     */
    async unregister() {
      if (isNative()) {
        try {
          const PushNotifications = getPushNotificationsPlugin();
          if (PushNotifications && typeof PushNotifications.unregister === 'function') {
            await PushNotifications.unregister();
          }
          const platform = isIOS() ? 'ios' : 'android';
          await fetch('/api/push/unregister-native', {
            method: 'POST',
            headers: pushAuthHeaders(),
            body: JSON.stringify({ platform: platform, token: _lastNativePushToken || '' }),
            credentials: 'include',
          }).catch(function () {});
          _lastNativePushToken = null;
          return { success: true };
        } catch (err) {
          console.error('[Platform.push] Unregister failed:', err);
          return { success: false, reason: err.message };
        }
      } else {
        try {
          const swReg = await navigator.serviceWorker.ready;
          const sub = await swReg.pushManager.getSubscription();
          if (sub) {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: pushAuthHeaders(),
              body: JSON.stringify({ endpoint: sub.endpoint }),
              credentials: 'include',
            });
            await sub.unsubscribe();
          }
          return { success: true };
        } catch (err) {
          console.error('[Platform.push] Unregister failed:', err);
          return { success: false, reason: err.message };
        }
      }
    },
  };

  // ── Helper: VAPID key decoding ─────────────────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  let _appleWebConfig = null;

  function loadAppleWebConfig() {
    if (_appleWebConfig) return Promise.resolve(_appleWebConfig);
    return fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        const clientId = (cfg && cfg.appleClientId) || '';
        const redirectUri = (cfg && cfg.appleWebRedirectUri) || window.location.origin;
        _appleWebConfig = { clientId: clientId, redirectUri: redirectUri };
        return _appleWebConfig;
      })
      .catch(function () {
        return { clientId: '', redirectUri: window.location.origin };
      });
  }

  // ── Apple Sign In ────────────────────────────────────────────────
  // Native: uses Capacitor bridge (Capacitor.Plugins.SignInWithApple)
  //   from @capacitor-community/apple-sign-in — no ES import needed.
  //   On Capacitor 4+ the plugin registers directly on the bridge.
  // Web: falls back to Sign in with Apple JS (Apple CDN).
  // Requires the site origin registered as Return URL in Apple Developer.
  const APPLE_AUTH_JS_URL =
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

  const appleSignIn = {
    /** Returns true if the native Capacitor plugin is registered. */
    isAvailable() {
      return isNative() && !!(Capacitor && Capacitor.Plugins && Capacitor.Plugins.SignInWithApple);
    },

    /**
     * Start Apple Sign In and return the identity token.
     * On native: calls the Capacitor plugin via bridge.
     * On web: loads Apple's JS and uses the Sign in with Apple popup flow.
     * Returns: { idToken, name } or throws on failure/cancel.
     */
    async signIn() {
      if (isNative()) {
        try {
          // Access via Capacitor bridge — bare-specifier imports don't resolve
          // in a remote-URL WebView without a bundler.
          const plugin = Capacitor && Capacitor.Plugins && Capacitor.Plugins.SignInWithApple;
          if (!plugin) throw new Error('SIGN_IN_UNAVAILABLE');
          const result = await plugin.authorize({
            clientId: 'se.mystarday.app',
            redirectURI: 'se.mystarday.app://oauth-callback',
            scopes: 'email name',
          });
          const resp = result.response || result;
          // The native plugin returns given/family name either at the response
          // top level (our patched Plugin.swift) or nested under fullName.
          const given = (resp.fullName && resp.fullName.givenName) || resp.givenName || '';
          const family = (resp.fullName && resp.fullName.familyName) || resp.familyName || '';
          const fullName = (given + ' ' + family).trim();
          return {
            idToken: resp.identityToken,
            name: fullName || null,
          };
        } catch (err) {
          const msg = (err && (err.message || err.errorMessage)) || String(err || '');
          const code = err && (err.code || err.errorCode);
          if (
            msg === 'cancel' ||
            msg === 'SIGN_IN_UNAVAILABLE' ||
            code === 'ERR_CANCELED' ||
            code === 1001 ||
            code === '1001' ||
            /AuthorizationError error 1001/i.test(msg) ||
            /cancel/i.test(msg)
          ) {
            return null;
          }
          // Native plugin errors — avoid leaking raw ASAuthorizationError strings to users.
          console.warn('[Platform] Apple Sign In failed:', msg, code);
          throw new Error('APPLE_SIGN_IN_FAILED');
        }
      }
      // Web: use Sign in with Apple JS
      return loadAppleAuthJs()
        .then(loadAppleWebConfig)
        .then(function (cfg) {
          if (!cfg.clientId) {
            return Promise.reject(new Error('Apple Sign In är inte konfigurerat'));
          }
          return attemptWebSignIn(cfg.clientId, cfg.redirectUri);
        });
    },
  };

  function waitForAppleId(attempts) {
    if (window.AppleID && window.AppleID.auth) return Promise.resolve();
    if (attempts >= 40) {
      return Promise.reject(new Error('Apple Sign In JS inte tillgänglig'));
    }
    return new Promise(function (resolve) {
      setTimeout(resolve, 50);
    }).then(function () {
      return waitForAppleId(attempts + 1);
    });
  }

  function loadAppleAuthJs() {
    if (window.AppleID && window.AppleID.auth) return Promise.resolve();

    const existing = document.getElementById('apple-id-auth');
    if (existing) {
      if (existing.dataset.loadState === 'error') {
        existing.remove();
      } else if (existing.dataset.loadState === 'ready') {
        return waitForAppleId(0);
      } else {
        return waitForAppleId(0);
      }
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.id = 'apple-id-auth';
      script.src = APPLE_AUTH_JS_URL;
      script.async = true;
      script.onload = function () {
        script.dataset.loadState = 'ready';
        waitForAppleId(0).then(resolve).catch(reject);
      };
      script.onerror = function () {
        script.dataset.loadState = 'error';
        reject(new Error('Kunde inte ladda Apple Sign In'));
      };
      document.head.appendChild(script);
    });
  }

  function attemptWebSignIn(clientId, redirectUri) {
    const apple = window.AppleID;
    if (!apple || !apple.auth) {
      return Promise.reject(new Error('Apple Sign In JS inte tillgänglig'));
    }

    try {
      apple.auth.init({
        clientId: clientId,
        scope: 'name email',
        redirectURI: redirectUri || window.location.origin,
        usePopup: true,
        responseMode: 'web_message',
      });
    } catch (_) {}

    return apple.auth.signIn().then(function (res) {
      return { idToken: res.authorization.id_token, name: null };
    }).catch(function (err) {
      if (err && (err.error === 'user_cancelled' || err.error === 'popup_closed_by_user')) {
        return null;
      }
      throw err;
    });
  }

  // ── Camera / Photo Picker ────────────────────────────────────────────────
  // Native: Capacitor bridge (bare-specifier imports fail in remote-URL WebView).
  // Web/PWA: standard file input.

  function getCameraPlugin() {
    return (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Camera) || null;
  }

  async function ensurePhotosPermission(Camera, opts) {
    if (!Camera || typeof Camera.checkPermissions !== 'function') return true;
    const needCamera = opts && opts.source === 'camera';
    try {
      const status = await Camera.checkPermissions();
      let photosOk = status.photos === 'granted' || status.photos === 'limited';
      let cameraOk = status.camera === 'granted';
      if (!needCamera && photosOk) return true;
      if (needCamera && cameraOk) return true;
      if (!needCamera && photosOk) return true;
      if (status.photos === 'denied' && (!needCamera || status.camera === 'denied')) {
        if (typeof Camera.requestPermissions !== 'function') return false;
      } else if (typeof Camera.requestPermissions === 'function') {
        const requested = await Camera.requestPermissions({ permissions: needCamera ? ['camera', 'photos'] : ['photos'] });
        photosOk = requested.photos === 'granted' || requested.photos === 'limited';
        cameraOk = requested.camera === 'granted';
      }
      if (needCamera) return cameraOk || photosOk;
      return photosOk;
    } catch (err) {
      console.warn('[Platform.camera] permission check failed:', err);
      return true;
    }
  }

  function nativePhotoQuality(opts) {
    return opts && opts.quality === 'high' ? 90 : opts && opts.quality === 'low' ? 25 : 50;
  }

  async function pickViaGallery(Camera, opts) {
    if (!Camera || typeof Camera.pickImages !== 'function') return null;
    try {
      const gallery = await Camera.pickImages({
        quality: nativePhotoQuality(opts),
        limit: 1,
      });
      if (!gallery || !gallery.photos || !gallery.photos.length) return null;
      const photo = gallery.photos[0];
      const webPath = photo.webPath || capacitorFileUrl(photo.path);
      if (!webPath) return null;
      const resp = await fetch(webPath);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await blobToDataUrlPick(blob);
    } catch (err) {
      console.warn('[Platform.camera] pickImages failed:', err);
      return null;
    }
  }

  async function pickViaFileInput() {
    return new Promise(function (resolve) {
      let settled = false;
      let picking = true;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/*';
      input.style.cssText = 'position:fixed;left:-9999px;opacity:0;width:1px;height:1px;';
      document.body.appendChild(input);

      function finish(val) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener('focus', onWindowFocus);
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(val);
      }

      function onWindowFocus() {
        window.setTimeout(function () {
          if (!settled && picking && (!input.files || !input.files.length)) finish(null);
        }, 1000);
      }

      input.onchange = function () {
        picking = false;
        if (!input.files || !input.files[0]) { finish(null); return; }
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
          finish({
            dataUrl: e.target.result,
            mimeType: file.type || 'image/jpeg',
            file: file,
          });
        };
        reader.onerror = function () { finish(null); };
        reader.readAsDataURL(file);
      };

      const timer = window.setTimeout(function () { finish(null); }, 120000);
      window.addEventListener('focus', onWindowFocus);
      input.click();
    });
  }

  async function tryCapacitorPick(opts) {
    const Camera = getCameraPlugin();
    if (!Camera) return null;
    const photosOk = await ensurePhotosPermission(Camera, opts);
    if (!photosOk) {
      return { error: 'Tillåt fotoåtkomst under Inställningar på din enhet.' };
    }
    return await nativePickWithFallbacks(Camera, opts);
  }

  function pickErrorMessage(err, stage) {
    const detail = (err && err.message) ? String(err.message).trim() : '';
    if (detail && detail.length < 120) {
      return (stage || 'Kunde inte välja bild') + ': ' + detail;
    }
    return stage || 'Kunde inte välja bild. Stäng appen helt och öppna igen.';
  }
  function isPickCancelled(err) {
    const msg = ((err && err.message) || String(err || '')).toLowerCase();
    return msg.includes('cancel') || msg.includes('cancelled') || msg.includes('canceled');
  }

  async function tryNativeGetPhoto(Camera, opts, source, resultType) {
    const result = await Camera.getPhoto({
      quality: nativePhotoQuality(opts),
      allowEditing: false,
      resultType: resultType,
      source: source,
      correctOrientation: true,
      presentationStyle: 'fullscreen',
      promptLabelHeader: 'Välj foto',
      promptLabelPhoto: 'Från bilder',
      promptLabelPicture: 'Ta foto',
      promptLabelCancel: 'Avbryt',
    });
    return await photoResultToPick(result);
  }

  async function nativePickWithFallbacks(Camera, opts) {
    const wantCamera = opts && opts.source === 'camera';
    let lastErr = null;

    if (!wantCamera) {
      const galleryPick = await pickViaGallery(Camera, opts);
      if (galleryPick) return galleryPick;
    }

    const sources = wantCamera
      ? ['CAMERA', 'PROMPT']
      : ['PHOTOS', 'PROMPT', 'CAMERA'];
    const resultTypes = ['uri', 'base64'];

    for (let si = 0; si < sources.length; si++) {
      for (let ri = 0; ri < resultTypes.length; ri++) {
        try {
          const picked = await tryNativeGetPhoto(Camera, opts, sources[si], resultTypes[ri]);
          if (picked) return picked;
        } catch (err) {
          if (isPickCancelled(err)) return null;
          lastErr = err;
          console.warn('[Platform.camera] getPhoto failed:', sources[si], resultTypes[ri], err);
        }
      }
    }

    if (lastErr) throw lastErr;
    return null;
  }

  function capacitorFileUrl(path) {
    if (!path) return null;
    if (typeof Capacitor !== 'undefined' && typeof Capacitor.convertFileSrc === 'function') {
      return Capacitor.convertFileSrc(path);
    }
    return path;
  }

  async function photoResultToPick(result) {
    if (!result) return null;
    if (result.base64String) {
      return {
        dataUrl: 'data:image/jpeg;base64,' + result.base64String,
        mimeType: 'image/jpeg',
      };
    }
    if (result.dataUrl) {
      return {
        dataUrl: result.dataUrl,
        mimeType: 'image/jpeg',
      };
    }
    const fetchPath = result.webPath || capacitorFileUrl(result.path);
    if (fetchPath) {
      const resp = await fetch(fetchPath);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await blobToDataUrlPick(blob);
    }
    return null;
  }

  function normalizePublicUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (trimmed.indexOf('/') === 0) {
      return window.location.origin + trimmed;
    }
    return trimmed;
  }

  function blobToDataUrlPick(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({
          dataUrl: reader.result,
          mimeType: blob.type || 'image/jpeg',
          file: blob,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Kunde inte läsa bilden'));
      };
      img.src = url;
    });
  }

  /** Resize + JPEG compress so avatar upload stays under 2 MB server limit. */
  async function compressAvatarBlob(blob) {
    const maxBytes = 1800000;
    const maxDim = 800;
    if (!blob || !(blob instanceof Blob)) throw new Error('Ogiltig bild');
    try {
      const img = await loadImageFromBlob(blob);
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Kunde inte bearbeta bilden');
      ctx.drawImage(img, 0, 0, cw, ch);
      let quality = 0.88;
      let compressed = null;
      while (quality >= 0.45) {
        compressed = await new Promise(function (resolve) {
          canvas.toBlob(resolve, 'image/jpeg', quality);
        });
        if (compressed && compressed.size <= maxBytes) return compressed;
        quality -= 0.08;
      }
      if (compressed) return compressed;
    } catch (compressErr) {
      console.warn('[Platform.camera] compress fallback:', compressErr);
      if (blob.size <= maxBytes) return blob;
    }
    throw new Error('Bilden är för stor — prova en mindre bild');
  }

  function postFormDataNative(url, fd, headers) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.withCredentials = true;
      if (headers) {
        Object.keys(headers).forEach(function (key) {
          xhr.setRequestHeader(key, headers[key]);
        });
      }
      xhr.onload = function () {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          clone: function () { return this; },
          json: function () {
            try { return Promise.resolve(JSON.parse(xhr.responseText || '{}')); }
            catch (_) { return Promise.resolve({}); }
          },
        });
      };
      xhr.onerror = function () { reject(new Error('Nätverksfel vid uppladdning')); };
      xhr.send(fd);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error('Ogiltig bilddata');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function blobFromPickResult(result) {
    if (result.file instanceof Blob) return result.file;
    if (result.dataUrl) return dataUrlToBlob(result.dataUrl);
    throw new Error('Ingen bild vald');
  }

  const camera = {
    /**
     * Pick a photo from the library or camera (iOS native only).
     * Web: shows a standard file input picker.
     *
     * Options:
     *   source: 'library' | 'camera'   (native only; web ignores)
     *   quality: 'low' | 'medium' | 'high'   (default 'medium')
     *
     * Returns: { dataUrl: string(base64 JPEG), mimeType: string }
     *          or null if cancelled.
     */
    async pick(opts) {
      opts = opts || {};
      if (isNative()) {
        let lastErr = null;

        // iOS WKWebView: HTML file input is more reliable than @capacitor/camera.
        if (isIOS()) {
          try {
            const iosFilePick = await pickViaFileInput();
            if (iosFilePick && !iosFilePick.error) return iosFilePick;
          } catch (fileErr) {
            lastErr = fileErr;
            console.warn('[Platform.camera] iOS file input failed:', fileErr);
          }
        }

        try {
          const capacitorPick = await tryCapacitorPick(opts);
          if (capacitorPick && capacitorPick.error) return capacitorPick;
          if (capacitorPick) return capacitorPick;
        } catch (err) {
          if (isPickCancelled(err)) return null;
          lastErr = err;
          console.warn('[Platform.camera] Capacitor pick failed:', err);
        }

        if (!isIOS()) {
          try {
            const androidFilePick = await pickViaFileInput();
            if (androidFilePick && !androidFilePick.error) return androidFilePick;
          } catch (fileErr2) {
            lastErr = fileErr2;
          }
        }

        if (lastErr && (lastErr.code === 'USER_DID_NOT_GRANT_PERMISSION' || lastErr.code === 'permission-denied')) {
          return { error: 'Tillåt fotoåtkomst under Inställningar på din enhet.' };
        }
        return { error: pickErrorMessage(lastErr, 'Kunde inte öppna fotobiblioteket') };
      }

      return pickViaFileInput();
    },

    /**
     * Compress pick result to a JPEG File (no upload).
     */
    async toAvatarFile(dataUrlOrResult) {
      let blob;
      if (typeof dataUrlOrResult === 'string') {
        blob = dataUrlToBlob(dataUrlOrResult);
      } else if (dataUrlOrResult && dataUrlOrResult.file) {
        blob = dataUrlOrResult.file;
      } else if (dataUrlOrResult && dataUrlOrResult.dataUrl) {
        blob = dataUrlToBlob(dataUrlOrResult.dataUrl);
      } else if (dataUrlOrResult && typeof dataUrlOrResult === 'object') {
        const fromPick = blobFromPickResult(dataUrlOrResult);
        if (fromPick) blob = fromPick;
      }
      if (!blob) {
        throw new Error('Ingen bild att bearbeta');
      }
      blob = await compressAvatarBlob(blob);
      return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    },

    /**
     * Upload avatar to authenticated PUT endpoint. Returns avatar_src from API.
     */
    async upload(dataUrlOrResult, options) {
      options = options || {};
      const file = await this.toAvatarFile(dataUrlOrResult);
      if (options.defer) return { file: file };

      const endpoint = options.endpoint;
      if (!endpoint) {
        throw new Error('Profilbilder laddas upp via PUT /api/children/:id/avatar eller /api/account/avatar');
      }

      const authObj = (typeof Auth !== 'undefined' && Auth) || window.Auth;
      if (!authObj || typeof authObj.ensureCsrfToken !== 'function') {
        throw new Error('Ej inloggad');
      }
      await authObj.ensureCsrfToken();
      const csrf = authObj.getCsrfToken();
      if (!csrf) throw new Error('Kunde inte hämta CSRF-token — ladda om sidan och försök igen');

      if (!_nativeFormPostReady()) {
        /* fetch path (default) */
      }

      const fd = new FormData();
      fd.append('image', file, 'avatar.jpg');
      const result = await fetch(endpoint, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrf },
        body: fd,
      });
      if (!result.ok) {
        const err = await result.json().catch(function () { return {}; });
        if (result.status === 413) throw new Error('Bilden är för stor (max 2 MB)');
        throw new Error(err.error || 'Uppladdning misslyckades (' + result.status + ')');
      }
      const json = await result.json();
      if (!json.avatar_src) throw new Error('Servern returnerade ingen bild-URL');
      return normalizePublicUrl(json.avatar_src);
    },
  };

  function _nativeFormPostReady() {
    return typeof postFormDataNative === 'function';
  }

  return {
    isNative: isNative,
    isIOS: isIOS,
    isAndroid: isAndroid,
    isWeb: isWeb,
    isAppleSignInAvailable: isAppleSignInAvailable,
    isGoogleSignInAvailable: isGoogleSignInAvailable,
    googleSignIn: googleSignIn,
    ready: ready,
    haptics: haptics,
    share: share,
    push: push,
    isHapticsEnabled: isHapticsEnabled,
    setHapticsEnabled: setHapticsEnabled,
    appleSignIn: appleSignIn,
    camera: camera,
  };
})();

// Expose globally.
window.Platform = Platform;

(function applyPlatformDomClasses() {
  function run() {
    const html = document.documentElement;
    const body = document.body;
    if (!Platform.isNative()) return;
    html.classList.add('is-native');
    if (body) body.classList.add('is-native');
    if (Platform.isIOS()) html.classList.add('is-native-ios');
    if (Platform.isAndroid()) html.classList.add('is-native-android');
  }
  // Synchronous — Android GPU guards must be active before first paint.
  run();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
