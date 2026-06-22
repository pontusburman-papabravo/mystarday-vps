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
var Platform = (function () {
  function noop() {}

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

  /** Native iOS with plugin, or iOS Safari (Apple JS). */
  function isAppleSignInAvailable() {
    if (isNative() && isIOS()) {
      return !!(typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.SignInWithApple);
    }
    if (isWeb() && typeof navigator !== 'undefined') {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    return false;
  }

  /** Native Android only — Google plugin wired in sprint 18. */
  function isGoogleSignInAvailable() {
    return isNative() && isAndroid();
  }

  var _googleClientId = null;

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

  var googleSignIn = {
    isAvailable: isGoogleSignInAvailable,
    async signIn() {
      if (!isGoogleSignInAvailable()) {
        throw new Error('Google Sign In är endast tillgängligt i Android-appen');
      }
      var clientId = await loadGoogleClientId();
      if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.GoogleAuth) {
        if (clientId && typeof Capacitor.Plugins.GoogleAuth.initialize === 'function') {
          try {
            await Capacitor.Plugins.GoogleAuth.initialize({
              clientId: clientId,
              scopes: ['profile', 'email'],
              grantOfflineAccess: false,
            });
          } catch (_) {}
        }
        const result = await Capacitor.Plugins.GoogleAuth.signIn();
        var idToken =
          (result && result.authentication && result.authentication.idToken) ||
          (result && result.idToken);
        return { idToken: idToken };
      }
      throw new Error(
        'Google Sign In-plugin saknas. Kör: npm i @codetrix-studio/capacitor-google-auth && npx cap sync android'
      );
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

  // Haptics — uses @capacitor/haptics on native, navigator.vibrate on web.
  var haptics = {
    async light() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    async medium() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    },
    async heavy() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    async success() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, NotificationType } = await import('@capacitor/haptics');
          await Haptics.notification({ type: NotificationType.Success });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    },
    async error() {
      if (!isHapticsEnabled()) return;
      if (isNative()) {
        try {
          const { Haptics, NotificationType } = await import('@capacitor/haptics');
          await Haptics.notification({ type: NotificationType.Error });
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 30, 80]);
      }
    },
    isEnabled() { return isHapticsEnabled(); },
    setEnabled(val) { setHapticsEnabled(val); }
  };

  // Share — @capacitor/share on native, Web Share API on web, clipboard fallback.
  var share = async function (opts) {
    if (isNative()) {
      try {
        const { Share } = await import('@capacitor/share');
        return await Share.share({
          title: opts.title || '',
          text: opts.text || '',
          url: opts.url || '',
        });
      } catch (err) {
        console.warn('[Platform.share] Native share failed:', err.message);
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
  var _lastNativePushToken = null;
  var _nativePushListenersReady = false;

  function pushAuthHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var csrf = (window.Auth && window.Auth.getCsrfToken && window.Auth.getCsrfToken()) ||
      (function () {
        var m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
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
      var platform = isIOS() ? 'ios' : 'android';
      try {
        var res = await fetch('/api/push/register-native', {
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
  var push = {
    /**
     * Request push notification permission and register the device token.
     * On web: registers with the backend's VAPID subscription endpoint.
     * On iOS/Android: requests Capacitor PushNotifications permission and
     *   registers the APNs/FCM token via /api/push/register-native.
     */
    async register() {
      if (isNative()) {
        try {
          var PushNotifications = getPushNotificationsPlugin();
          if (!PushNotifications) {
            console.warn('[Platform.push] PushNotifications plugin not available — run npx cap sync ios');
            return { success: false, reason: 'push_plugin_unavailable' };
          }
          await ensureNativePushListeners(PushNotifications);
          var permResult = await PushNotifications.requestPermissions();
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
          var PushNotifications = getPushNotificationsPlugin();
          if (PushNotifications && typeof PushNotifications.unregister === 'function') {
            await PushNotifications.unregister();
          }
          var platform = isIOS() ? 'ios' : 'android';
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

  var _appleWebConfig = null;

  function loadAppleWebConfig() {
    if (_appleWebConfig) return Promise.resolve(_appleWebConfig);
    return fetch('/api/app-config', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        var clientId = (cfg && cfg.appleClientId) || '';
        var redirectUri = (cfg && cfg.appleWebRedirectUri) || window.location.origin;
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
  var APPLE_AUTH_JS_URL =
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

  var appleSignIn = {
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
          var plugin = Capacitor && Capacitor.Plugins && Capacitor.Plugins.SignInWithApple;
          if (!plugin) throw new Error('SIGN_IN_UNAVAILABLE');
          var result = await plugin.authorize({
            clientId: 'se.mystarday.app',
            redirectURI: 'se.mystarday.app://oauth-callback',
            scopes: 'email name',
          });
          var resp = result.response || result;
          // The native plugin returns given/family name either at the response
          // top level (our patched Plugin.swift) or nested under fullName.
          var given = (resp.fullName && resp.fullName.givenName) || resp.givenName || '';
          var family = (resp.fullName && resp.fullName.familyName) || resp.familyName || '';
          var fullName = (given + ' ' + family).trim();
          return {
            idToken: resp.identityToken,
            name: fullName || null,
          };
        } catch (err) {
          var msg = (err && (err.message || err.errorMessage)) || String(err || '');
          var code = err && (err.code || err.errorCode);
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

    var existing = document.getElementById('apple-id-auth');
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
      var script = document.createElement('script');
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
    var apple = window.AppleID;
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

  async function ensurePhotosPermission(Camera) {
    if (!Camera || typeof Camera.checkPermissions !== 'function') return true;
    try {
      var status = await Camera.checkPermissions();
      var photosOk = status.photos === 'granted' || status.photos === 'limited';
      var cameraOk = status.camera === 'granted';
      if (photosOk && (cameraOk || status.camera === 'prompt')) return true;
      if (status.photos === 'denied' && status.camera === 'denied') return false;
      if (typeof Camera.requestPermissions !== 'function') return true;
      var requested = await Camera.requestPermissions({ permissions: ['photos', 'camera'] });
      photosOk = requested.photos === 'granted' || requested.photos === 'limited';
      cameraOk = requested.camera === 'granted';
      return photosOk || cameraOk;
    } catch (err) {
      console.warn('[Platform.camera] permission check failed:', err);
      return true;
    }
  }

  function nativePhotoSource(opts) {
    if (opts && opts.source === 'camera') return 'CAMERA';
    /* PROMPT is more reliable than PHOTOS on iOS native WebView (iPad + iPhone). */
    return 'PROMPT';
  }

  function nativePhotoQuality(opts) {
    return opts && opts.quality === 'high' ? 90 : opts && opts.quality === 'low' ? 25 : 50;
  }

  async function pickViaGallery(Camera, opts) {
    if (!Camera || typeof Camera.pickImages !== 'function') return null;
    try {
      var gallery = await Camera.pickImages({
        quality: nativePhotoQuality(opts),
        limit: 1,
      });
      if (!gallery || !gallery.photos || !gallery.photos.length) return null;
      var webPath = gallery.photos[0].webPath;
      if (!webPath) return null;
      var resp = await fetch(webPath);
      if (!resp.ok) return null;
      var blob = await resp.blob();
      return await new Promise(function (resolve, reject) {
        var reader = new FileReader();
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
    } catch (err) {
      console.warn('[Platform.camera] pickImages fallback failed:', err);
      return null;
    }
  }

  async function nativeGetPhoto(Camera, opts, source) {
    var result = await Camera.getPhoto({
      quality: nativePhotoQuality(opts),
      allowEditing: false,
      resultType: 'base64',
      source: source,
      presentationStyle: 'fullscreen',
      promptLabelHeader: 'Välj foto',
      promptLabelPhoto: 'Från bilder',
      promptLabelPicture: 'Ta foto',
      promptLabelCancel: 'Avbryt',
    });
    if (!result || !result.base64String) return null;
    return {
      dataUrl: 'data:image/jpeg;base64,' + result.base64String,
      mimeType: 'image/jpeg',
    };
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    if (parts.length < 2) throw new Error('Ogiltig bilddata');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var binary = atob(parts[1]);
    var len = binary.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function blobFromPickResult(result) {
    if (result.file instanceof Blob) return result.file;
    if (result.dataUrl) return dataUrlToBlob(result.dataUrl);
    throw new Error('Ingen bild vald');
  }

  var camera = {
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
        var Camera = getCameraPlugin();
        if (!Camera) {
          console.error('[Platform.camera] Camera plugin not registered — run cap sync ios');
          return { error: 'Kameran är inte tillgänglig i appen. Uppdatera till senaste versionen.' };
        }
        try {
          var photosOk = await ensurePhotosPermission(Camera);
          if (!photosOk) {
            return { error: 'Tillåt fotoåtkomst under Inställningar på din enhet.' };
          }
          var source = nativePhotoSource(opts);
          var picked = await nativeGetPhoto(Camera, opts, source);
          if (picked) return picked;
          return null;
        } catch (err) {
          var msg = (err && err.message) || '';
          if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('cancelled')) return null;
          if (err && (err.code === 'USER_DID_NOT_GRANT_PERMISSION' || err.code === 'permission-denied')) {
            return { error: 'Tillåt fotoåtkomst under Inställningar på din enhet.' };
          }
          try {
            var galleryPick = await pickViaGallery(Camera, opts);
            if (galleryPick) return galleryPick;
          } catch (_) { /* fall through */ }
          console.error('[Platform.camera] Pick failed:', msg || err);
          return { error: 'Kunde inte öppna fotobiblioteket. Försök igen.' };
        }
      }
      // Web/PWA fallback — file input (iOS Safari: oncancel fires rarely; use focus timeout)
      return new Promise(function (resolve) {
        var settled = false;
        var picking = true;
        var input = document.createElement('input');
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
          var file = input.files[0];
          if (file.size > 2 * 1024 * 1024) {
            finish({ error: 'Bilden får max vara 2 MB' });
            return;
          }
          var reader = new FileReader();
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

        var timer = window.setTimeout(function () { finish(null); }, 120000);
        window.addEventListener('focus', onWindowFocus);
        input.click();
      });
    },

    /**
     * Upload a child avatar (dataUrl) to /api/upload/avatar.
     * Returns the CDN URL on success, or throws on failure.
     * Uses the dedicated avatar endpoint (2MB, jpeg/png/webp).
     */
    async upload(dataUrlOrResult) {
      var blob;
      var filename = 'avatar.jpg';
      if (typeof dataUrlOrResult === 'string') {
        blob = dataUrlToBlob(dataUrlOrResult);
      } else if (dataUrlOrResult && dataUrlOrResult.file) {
        blob = dataUrlOrResult.file;
        var ext = (dataUrlOrResult.mimeType || '').split('/')[1] || 'jpg';
        if (ext === 'jpeg') ext = 'jpg';
        filename = 'avatar.' + ext;
      } else if (dataUrlOrResult && dataUrlOrResult.dataUrl) {
        blob = dataUrlToBlob(dataUrlOrResult.dataUrl);
      } else {
        throw new Error('Ingen bild att ladda upp');
      }

      var fd = new FormData();
      fd.append('image', blob, filename);

      async function postAvatar(retry) {
        var authObj = (typeof Auth !== 'undefined' && Auth) || window.Auth;
        if (!authObj || typeof authObj.ensureCsrfToken !== 'function') {
          throw new Error('Ej inloggad');
        }
        if (retry) localStorage.removeItem(authObj.CSRF_KEY);
        await authObj.ensureCsrfToken();
        var csrf = authObj.getCsrfToken();
        if (!csrf) throw new Error('Kunde inte hämta CSRF-token — ladda om sidan och försök igen');
        var headers = { 'X-CSRF-Token': csrf };
        return fetch('/api/upload/avatar', {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: fd,
        });
      }

      var result = await postAvatar(false);
      if (result.status === 403) {
        var errBody = await result.clone().json().catch(function () { return {}; });
        if (errBody.code === 'CSRF_MISSING' || errBody.code === 'CSRF_INVALID') {
          result = await postAvatar(true);
        }
      }
      if (!result.ok) {
        var err = await result.json().catch(function () { return {}; });
        throw new Error(err.error || 'Upload misslyckades');
      }
      var json = await result.json();
      return json.url;
    },
  };

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
    var html = document.documentElement;
    var body = document.body;
    if (!Platform.isNative()) return;
    html.classList.add('is-native');
    if (body) body.classList.add('is-native');
    if (Platform.isIOS()) html.classList.add('is-native-ios');
    if (Platform.isAndroid()) html.classList.add('is-native-android');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
