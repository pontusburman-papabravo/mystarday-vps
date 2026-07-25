/**
 * meta-app-events.js — central Meta App Events abstraction for native Capacitor.
 *
 * Privacy policy (EU/GDPR — blocking):
 *   No Meta App Events (including AutoLog install/open) until marketing consent.
 *   ATT is separate from marketing consent — the system ATT dialog is shown on iOS
 *   fresh install (native AppDelegate + JS fallback) before any tracking data.
 *
 *   metaEventsAllowed = marketingConsent === true
 *   advertiserTrackingAllowed = marketingConsent && platform==='ios' && attStatus==='authorized'
 *
 * WHAT NOT: Purchase/Subscribe/StartTrial; web Pixel; direct Facebook SDK calls elsewhere.
 * Failures never throw into the app flow.
 */
(function (global) {
  'use strict';

  const META_APP_ID = '27941105858861495';
  const STORAGE_PREFIX = 'msd_meta_evt_once_';
  const DEBUG_FLAG_KEY = 'msd_meta_app_events_debug';
  const CONSENT_STATE_KEY = 'msd_meta_marketing_consent_js';

  const FORBIDDEN_PARAM_KEYS = [
    'email', 'phone', 'name', 'child_name', 'parent_name', 'username',
    'user_id', 'userId', 'family_id', 'familyId', 'child_id', 'childId',
    'parent_id', 'parentId', 'diagnosis', 'npf', 'activity_name', 'activityName',
    'reward_name', 'rewardName', 'schedule', 'birthday', 'birthdate', 'pin',
    'freetext', 'message', 'notes', 'content',
  ];

  const loggedOnceThisSession = Object.create(null);
  let attRequested = false;
  let attStartupScheduled = false;
  let cachedAttStatus = null;
  let lastConfigureKey = '';

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

  function metaEventsAllowed() {
    return hasMarketingConsent() === true;
  }

  function isAttBlockingMeta() {
    if (getPlatformName() !== 'ios') return false;
    if (cachedAttStatus === null) return true;
    return cachedAttStatus === 'notDetermined';
  }

  function shouldSend() {
    if (!isNative()) {
      debugLog('skip: not native');
      return false;
    }
    if (!isLiveHost() && !isExplicitlyEnabled()) {
      debugLog('skip: non-live host (set msd_meta_app_events_debug=1 to enable)');
      return false;
    }
    if (isAttBlockingMeta()) {
      debugLog('skip: ATT not resolved');
      return false;
    }
    if (!metaEventsAllowed()) {
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

  function clearLocalMetaQueues() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(STORAGE_PREFIX) === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (_) { /* ignore */ }
    Object.keys(loggedOnceThisSession).forEach(function (k) {
      delete loggedOnceThisSession[k];
    });
    lastConfigureKey = '';
    try { localStorage.removeItem(CONSENT_STATE_KEY); } catch (_) { /* ignore */ }
  }

  /**
   * Resolve ATT status. Prompt only when allowPrompt is true and status is notDetermined.
   * ATT prompt is independent of marketing consent (Apple Guideline 2.1).
   */
  async function resolveAttStatus(options) {
    const allowPrompt = !!(options && options.allowPrompt);
    const platform = getPlatformName();
    if (platform !== 'ios') return 'not_applicable';

    const att = getAttPlugin();
    if (!att || typeof att.getStatus !== 'function') return 'unavailable';

    try {
      let statusResult = await att.getStatus();
      let status = statusResult && statusResult.status ? statusResult.status : 'notDetermined';
      cachedAttStatus = status;
      debugLog('att_status', { status: status, allowPrompt: allowPrompt });
      if (
        allowPrompt &&
        status === 'notDetermined' &&
        typeof att.requestPermission === 'function' &&
        !attRequested
      ) {
        attRequested = true;
        debugLog('att_request_attempted', {});
        statusResult = await att.requestPermission();
        status = statusResult && statusResult.status ? statusResult.status : status;
        cachedAttStatus = status;
        debugLog('att_request_completed', { status: status });
      }
      return status;
    } catch (err) {
      debugLog('ATT resolve failed', err && err.message ? err.message : 'error');
      return 'unavailable';
    }
  }

  function computeAdvertiserTrackingAllowed(attStatus) {
    return (
      metaEventsAllowed() === true &&
      getPlatformName() === 'ios' &&
      attStatus === 'authorized'
    );
  }

  /**
   * Push consent-derived flags into the native FacebookEvents plugin.
   * Native side enables AutoLog / activateApp only when marketingConsent is true.
   */
  async function applyNativeConsentConfig(options) {
    const facebook = getFacebookPlugin();
    if (!facebook) {
      debugLog('FacebookEvents plugin unavailable — app continues without Meta');
      return { applied: false, metaEventsAllowed: false, advertiserTrackingAllowed: false };
    }

    const marketing = metaEventsAllowed();
    let attStatus = 'not_applicable';
    if (getPlatformName() === 'ios') {
      attStatus = await resolveAttStatus({
        allowPrompt: !!(options && options.allowAttPrompt),
      });
    }

    const attBlocksMeta = getPlatformName() === 'ios' && attStatus === 'notDetermined';
    const effectiveMarketing = marketing && !attBlocksMeta;
    const advertiserTrackingAllowed = computeAdvertiserTrackingAllowed(attStatus);
    const configureKey = String(effectiveMarketing) + ':' + String(advertiserTrackingAllowed);

    try {
      if (typeof facebook.configureConsent === 'function') {
        if (configureKey !== lastConfigureKey) {
          await facebook.configureConsent({
            marketingConsent: effectiveMarketing,
            advertiserTrackingAllowed: advertiserTrackingAllowed,
          });
          lastConfigureKey = configureKey;
          debugLog('configureConsent applied', {
            marketingConsent: effectiveMarketing,
            advertiserTrackingAllowed: advertiserTrackingAllowed,
            attStatus: attStatus,
            attBlocksMeta: attBlocksMeta,
          });
        }
      } else if (typeof facebook.setAdvertiserTrackingEnabled === 'function') {
        // Legacy plugin fallback — still never claim consent without marketing.
        await facebook.setAdvertiserTrackingEnabled({ enabled: advertiserTrackingAllowed });
        debugLog('legacy setAdvertiserTrackingEnabled', { enabled: advertiserTrackingAllowed });
      }
      try {
        localStorage.setItem(CONSENT_STATE_KEY, marketing ? '1' : '0');
      } catch (_) { /* ignore */ }
      return {
        applied: true,
        metaEventsAllowed: effectiveMarketing,
        advertiserTrackingAllowed: advertiserTrackingAllowed,
        attStatus: attStatus,
      };
    } catch (err) {
      debugLog('applyNativeConsentConfig failed', err && err.message ? err.message : 'error');
      return { applied: false, metaEventsAllowed: marketing, advertiserTrackingAllowed: false };
    }
  }

  async function syncTrackingSettings() {
    if (!isNative()) return;
    if (!metaEventsAllowed()) {
      await applyNativeConsentConfig({ allowAttPrompt: false });
      return;
    }
    if (!isLiveHost() && !isExplicitlyEnabled()) {
      debugLog('skip native enable: non-live host');
      return;
    }
    await applyNativeConsentConfig({ allowAttPrompt: true });
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
      if (!metaEventsAllowed()) return false;
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
    if (!metaEventsAllowed()) {
      debugLog('skip once-event without marketing consent', eventName);
      return false;
    }
    if (hasFiredOnce(eventName)) {
      debugLog('skip duplicate once-event', eventName);
      return false;
    }
    markFiredOnce(eventName);
    const ok = await logRaw(eventName, params);
    if (!ok) {
      try { localStorage.removeItem(onceKey(eventName)); } catch (_) { /* ignore */ }
      delete loggedOnceThisSession[eventName];
    }
    return ok;
  }

  function trackRegistrationCompleted(opts) {
    const method = opts && opts.method ? String(opts.method) : 'email';
    return logOnce('fb_mobile_complete_registration', {
      fb_registration_method: method,
      onboarding_version: 'act1',
      flow: 'signup',
    }).catch(function () { return false; });
  }

  function trackFirstScheduleSaved(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'wizard';
    return logOnce('fb_mobile_tutorial_completion', {
      fb_success: '1',
      fb_content_id: 'first_schedule',
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  function trackChildAccessCompleted(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'child_login';
    return logOnce('child_access_completed', {
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  function trackFirstStarEarned(opts) {
    const flow = opts && opts.flow ? String(opts.flow) : 'child_complete';
    return logOnce('first_star_earned', {
      onboarding_version: 'act1',
      flow: flow,
    }).catch(function () { return false; });
  }

  function handleServerMilestones(milestones) {
    try {
      if (!milestones || typeof milestones !== 'object') return;
      if (!metaEventsAllowed()) {
        debugLog('skip server milestones — no marketing consent');
        return;
      }
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

  /**
   * iOS startup: ensure ATT is requested while the app is active on fresh install.
   * Native AppDelegate also schedules this; JS is a fallback if status stays notDetermined.
   */
  function scheduleAttStartupIfNeeded() {
    if (attStartupScheduled) return;
    if (!isNative() || getPlatformName() !== 'ios') return;
    attStartupScheduled = true;

    function run() {
      resolveAttStatus({ allowPrompt: true })
        .then(function () {
          return applyNativeConsentConfig({ allowAttPrompt: false });
        })
        .catch(function () {});
    }

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(run, 500);
      });
    } else {
      setTimeout(run, 500);
    }
  }

  /**
   * After marketing consent: persist flags for future native sessions.
   * Does NOT call activateApp() — native AppDelegate / handleOnStart activates
   * only when consent was already persisted before that process/foreground cycle.
   */
  function onConsentGranted() {
    syncTrackingSettings().catch(function () {});
  }

  function onConsentRevoked() {
    clearLocalMetaQueues();
    applyNativeConsentConfig({ allowAttPrompt: false }).catch(function () {});
  }

  // If consent was revoked while page was open, keep native in sync on load.
  try {
    if (isNative() && !hasMarketingConsent()) {
      applyNativeConsentConfig({ allowAttPrompt: false }).catch(function () {});
    }
    scheduleAttStartupIfNeeded();
  } catch (_) { /* ignore */ }

  global.MetaAppEvents = {
    META_APP_ID: META_APP_ID,
    trackRegistrationCompleted: trackRegistrationCompleted,
    trackFirstScheduleSaved: trackFirstScheduleSaved,
    trackChildAccessCompleted: trackChildAccessCompleted,
    trackFirstStarEarned: trackFirstStarEarned,
    handleServerMilestones: handleServerMilestones,
    onConsentGranted: onConsentGranted,
    onConsentRevoked: onConsentRevoked,
    _internal: {
      shouldSend: shouldSend,
      metaEventsAllowed: metaEventsAllowed,
      hasMarketingConsent: hasMarketingConsent,
      sanitizeParams: sanitizeParams,
      hasFiredOnce: hasFiredOnce,
      markFiredOnce: markFiredOnce,
      onceKey: onceKey,
      FORBIDDEN_PARAM_KEYS: FORBIDDEN_PARAM_KEYS,
      isNative: isNative,
      isLiveHost: isLiveHost,
      baseParams: baseParams,
      computeAdvertiserTrackingAllowed: computeAdvertiserTrackingAllowed,
      resolveAttStatus: resolveAttStatus,
      applyNativeConsentConfig: applyNativeConsentConfig,
      scheduleAttStartupIfNeeded: scheduleAttStartupIfNeeded,
      clearLocalMetaQueues: clearLocalMetaQueues,
      resetSessionDedupe: function () {
        Object.keys(loggedOnceThisSession).forEach(function (k) {
          delete loggedOnceThisSession[k];
        });
        lastConfigureKey = '';
      },
      resetAttForTests: function () {
        attRequested = false;
        attStartupScheduled = false;
        cachedAttStatus = null;
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
