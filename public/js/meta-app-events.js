/**
 * meta-app-events.js — central Meta App Events abstraction for native Capacitor.
 *
 * WHAT: log install/open (SDK auto), CompleteRegistration, TutorialCompletion,
 *       child_access_completed, first_star_earned — never PII.
 * WHAT NOT: Purchase/Subscribe/StartTrial; web Pixel; direct Facebook SDK calls elsewhere.
 *
 * Gate: native + marketing consent + non-local host (or explicit debug enable).
 * Failures never throw into the app flow.
 */
(function (global) {
  'use strict';

  const META_APP_ID = '27941105858861495';
  const STORAGE_PREFIX = 'msd_meta_evt_once_';
  const DEBUG_FLAG_KEY = 'msd_meta_app_events_debug';

  const FORBIDDEN_PARAM_KEYS = [
    'email', 'phone', 'name', 'child_name', 'parent_name', 'username',
    'user_id', 'userId', 'family_id', 'familyId', 'child_id', 'childId',
    'parent_id', 'parentId', 'diagnosis', 'npf', 'activity_name', 'activityName',
    'reward_name', 'rewardName', 'schedule', 'birthday', 'birthdate', 'pin',
    'freetext', 'message', 'notes', 'content',
  ];

  const loggedOnceThisSession = Object.create(null);
  let attRequested = false;
  let autoLogEnabled = false;

  function debugLog(message, detail) {
    try {
      if (!isDebugLoggingEnabled()) return;
      if (detail !== undefined) {
        console.info('[MetaAppEvents]', message, detail);
      } else {
        console.info('[MetaAppEvents]', message);
      }
    } catch (_) { /* never break */ }
  }

  function isDebugLoggingEnabled() {
    try {
      if (global.__META_APP_EVENTS_DEBUG__ === true) return true;
      return localStorage.getItem(DEBUG_FLAG_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function isNative() {
    try {
      if (global.Platform && typeof global.Platform.isNative === 'function') {
        return !!global.Platform.isNative();
      }
      return !!(
        global.Capacitor &&
        typeof global.Capacitor.isNativePlatform === 'function' &&
        global.Capacitor.isNativePlatform()
      );
    } catch (_) {
      return false;
    }
  }

  function getPlatformName() {
    try {
      if (global.Platform) {
        if (typeof global.Platform.isIOS === 'function' && global.Platform.isIOS()) return 'ios';
        if (typeof global.Platform.isAndroid === 'function' && global.Platform.isAndroid()) return 'android';
      }
      if (global.Capacitor && typeof global.Capacitor.getPlatform === 'function') {
        return global.Capacitor.getPlatform();
      }
    } catch (_) { /* ignore */ }
    return 'unknown';
  }

  function getAppVersion() {
    try {
      const meta = document.querySelector('meta[name="app-version"]');
      if (meta && meta.content) return String(meta.content).slice(0, 32);
    } catch (_) { /* ignore */ }
    return undefined;
  }

  function isLiveHost() {
    try {
      const host = String(global.location && global.location.hostname || '').toLowerCase();
      if (!host) return false;
      if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false;
      if (host.indexOf('staging') !== -1 || host.indexOf('preview') !== -1) return false;
      // Release native WebView loads the live remote URL; local CAP_DEV is blocked above.
      return true;
    } catch (_) {
      return false;
    }
  }

  function isExplicitlyEnabled() {
    try {
      if (global.__META_APP_EVENTS_FORCE__ === true) return true;
      return localStorage.getItem(DEBUG_FLAG_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function hasMarketingConsent() {
    try {
      if (global.MarketingEvents && typeof global.MarketingEvents.hasMarketingConsent === 'function') {
        return !!global.MarketingEvents.hasMarketingConsent();
      }
      const raw = localStorage.getItem('cookie_consent');
      if (raw) {
        const cc = JSON.parse(raw);
        if (cc && typeof cc.marketing === 'boolean') return cc.marketing;
      }
      if (global.AppConsent && typeof global.AppConsent.get === 'function') {
        const ac = global.AppConsent.get();
        if (ac) return ac.ad_storage === 'granted';
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function shouldSend() {
    if (!isNative()) {
      debugLog('skip: not native');
      return false;
    }
    if (!isLiveHost() && !isExplicitlyEnabled()) {
      debugLog('skip: non-non-local host (set msd_meta_app_events_debug=1 to enable)');
      return false;
    }
    if (!hasMarketingConsent()) {
      debugLog('skip: no marketing consent');
      return false;
    }
    return true;
  }

  function getFacebookPlugin() {
    try {
      const plugins = global.Capacitor && global.Capacitor.Plugins;
      return plugins && plugins.FacebookEvents ? plugins.FacebookEvents : null;
    } catch (_) {
      return null;
    }
  }

  function getAttPlugin() {
    try {
      const plugins = global.Capacitor && global.Capacitor.Plugins;
      return plugins && plugins.AppTrackingTransparency ? plugins.AppTrackingTransparency : null;
    } catch (_) {
      return null;
    }
  }

  function sanitizeParams(params) {
    const out = Object.create(null);
    if (!params || typeof params !== 'object') return out;
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!key) continue;
      const lower = key.toLowerCase();
      if (FORBIDDEN_PARAM_KEYS.indexOf(lower) !== -1) {
        debugLog('stripped forbidden param key', key);
        continue;
      }
      if (lower.indexOf('id') !== -1 && lower !== 'content_id' && lower !== 'fb_content_id') {
        // Block opaque unique identifiers (family/child/user ids).
        debugLog('stripped identifier-like param key', key);
        continue;
      }
      const value = params[key];
      if (value == null) continue;
      if (typeof value === 'string') {
        const trimmed = value.trim().slice(0, 64);
        if (!trimmed) continue;
        out[key] = trimmed;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        out[key] = value;
      }
    }
    return out;
  }

  function baseParams(extra) {
    const base = {
      platform: getPlatformName(),
      environment: isLiveHost() ? 'live' : 'dev',
    };
    const version = getAppVersion();
    if (version) base.appversion = version;
    return Object.assign(base, sanitizeParams(extra || {}));
  }

  function onceKey(eventName) {
    return STORAGE_PREFIX + eventName;
  }

  function hasFiredOnce(eventName) {
    if (loggedOnceThisSession[eventName]) return true;
    try {
      return localStorage.getItem(onceKey(eventName)) === '1';
    } catch (_) {
      return !!loggedOnceThisSession[eventName];
    }
  }

  function markFiredOnce(eventName) {
    loggedOnceThisSession[eventName] = true;
    try {
      localStorage.setItem(onceKey(eventName), '1');
    } catch (_) { /* ignore */ }
  }

  async function syncTrackingSettings() {
    if (!shouldSend()) return;
    const facebook = getFacebookPlugin();
    if (!facebook) {
      debugLog('FacebookEvents plugin unavailable');
      return;
    }

    try {
      if (getPlatformName() === 'ios') {
        const att = getAttPlugin();
        let authorized = false;
        if (att && typeof att.getStatus === 'function') {
          if (!attRequested && typeof att.requestPermission === 'function') {
            attRequested = true;
            const req = await att.requestPermission();
            authorized = req && req.status === 'authorized';
          } else {
            const status = await att.getStatus();
            authorized = status && status.status === 'authorized';
          }
        }
        if (typeof facebook.setAdvertiserTrackingEnabled === 'function') {
          await facebook.setAdvertiserTrackingEnabled({ enabled: authorized });
          debugLog('ATE set', { enabled: authorized });
        }
      } else if (typeof facebook.setAdvertiserTrackingEnabled === 'function') {
        await facebook.setAdvertiserTrackingEnabled({ enabled: true });
      }
      autoLogEnabled = true;
    } catch (err) {
      debugLog('syncTrackingSettings failed', err && err.message ? err.message : 'error');
    }
  }

  async function logRaw(eventName, params) {
    if (!shouldSend()) return false;
    const facebook = getFacebookPlugin();
    if (!facebook || typeof facebook.logEvent !== 'function') {
      debugLog('skip log: plugin missing', eventName);
      return false;
    }
    try {
      await syncTrackingSettings();
      const safeParams = baseParams(params);
      await facebook.logEvent({ event: eventName, params: safeParams });
      debugLog('logged', { event: eventName, params: safeParams });
      return true;
    } catch (err) {
      debugLog('logEvent failed', err && err.message ? err.message : 'error');
      return false;
    }
  }

  async function logOnce(eventName, params) {
    if (hasFiredOnce(eventName)) {
      debugLog('skip duplicate once-event', eventName);
      return false;
    }
    // Reserve before await to avoid races from parallel success handlers.
    markFiredOnce(eventName);
    const ok = await logRaw(eventName, params);
    if (!ok) {
      // Allow retry later if plugin/consent was not ready.
      try { localStorage.removeItem(onceKey(eventName)); } catch (_) { /* ignore */ }
      delete loggedOnceThisSession[eventName];
    }
    return ok;
  }

  /**
   * Standard Meta: CompleteRegistration (native App Event name).
   * @param {{ method?: string }} [opts]
   */
  function trackRegistrationCompleted(opts) {
    const method = opts && opts.method ? String(opts.method) : 'email';
    return logOnce('fb_mobile_complete_registration', {
      fb_registration_method: method,
      onboarding_version: 'act1',
      flow: 'signup',
    }).catch(function () { return false; });
  }

  /**
   * Standard Meta: TutorialCompletion — first schedule/routine saved.
   * @param {{ flow?: string }} [opts]
   */
  function trackFirstScheduleSaved(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'wizard';
    return logOnce('fb_mobile_tutorial_completion', {
      fb_success: '1',
      fb_content_id: 'first_schedule',
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  /**
   * Custom: verified child PIN login only (not parent preview).
   */
  function trackChildAccessCompleted(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'child_login';
    return logOnce('child_access_completed', {
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  /**
   * Custom: family's first earned star / first completion (idempotent).
   */
  function trackFirstStarEarned(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'child_complete';
    return logOnce('first_star_earned', {
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  /**
   * Apply server-authored milestone flags from API responses.
   * @param {object|null|undefined} milestones
   */
  function handleServerMilestones(milestones) {
    try {
      if (!milestones || typeof milestones !== 'object') return;
      if (milestones.tutorial_completion) {
        trackFirstScheduleSaved({ flow: milestones.flow || 'wizard' });
      }
      if (milestones.child_access_completed) {
        trackChildAccessCompleted({ flow: milestones.flow || 'child_login' });
      }
      if (milestones.first_star_earned) {
        trackFirstStarEarned({ flow: milestones.flow || 'child_complete' });
      }
      if (milestones.complete_registration) {
        trackRegistrationCompleted({ method: milestones.method || 'email' });
      }
    } catch (err) {
      debugLog('handleServerMilestones failed', err && err.message ? err.message : 'error');
    }
  }

  function onConsentGranted() {
    syncTrackingSettings().catch(function () {});
  }

  global.MetaAppEvents = {
    META_APP_ID: META_APP_ID,
    trackRegistrationCompleted: trackRegistrationCompleted,
    trackFirstScheduleSaved: trackFirstScheduleSaved,
    trackChildAccessCompleted: trackChildAccessCompleted,
    trackFirstStarEarned: trackFirstStarEarned,
    handleServerMilestones: handleServerMilestones,
    onConsentGranted: onConsentGranted,
    // Test/introspection helpers (no PII)
    _internal: {
      shouldSend: shouldSend,
      sanitizeParams: sanitizeParams,
      hasFiredOnce: hasFiredOnce,
      markFiredOnce: markFiredOnce,
      onceKey: onceKey,
      FORBIDDEN_PARAM_KEYS: FORBIDDEN_PARAM_KEYS,
      isNative: isNative,
      isLiveHost: isLiveHost,
      hasMarketingConsent: hasMarketingConsent,
      baseParams: baseParams,
      resetSessionDedupe: function () {
        Object.keys(loggedOnceThisSession).forEach(function (k) {
          delete loggedOnceThisSession[k];
        });
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
