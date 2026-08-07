/**
 * widget-installation-id.js — stable anonymous installation id for widget idempotency.
 *
 * Lifecycle: created once per app install in native secure prefs (Android/iOS plugin store)
 * or sessionStorage on web tests. Cleared on native clearBindings / reinstall.
 * Not derived from email, advertising id, or child name (no PII).
 */
(function (global) {
  'use strict';

  var WEB_KEY = 'stjarndag_widget_installation_id_v1'; // pragma: allowlist secret

  function randomId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    var s = '';
    for (var i = 0; i < 32; i++) {
      s += Math.floor(Math.random() * 16).toString(16);
    }
    return 'inst-' + s;
  }

  function isNative() {
    var cap = global.Capacitor;
    return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  }

  async function getFromNative() {
    var plugin = global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.WidgetBridge;
    if (!plugin || typeof plugin.getStatus !== 'function') return null;
    try {
      var status = await plugin.getStatus();
      if (status && status.installationId) return status.installationId;
    } catch (e) { /* ignore */ }
    return null;
  }

  async function getOrCreate() {
    if (isNative()) {
      var nativeId = await getFromNative();
      if (nativeId) return nativeId;
    }
    try {
      var existing = sessionStorage.getItem(WEB_KEY);
      if (existing) return existing;
      var id = randomId();
      sessionStorage.setItem(WEB_KEY, id);
      return id;
    } catch (e) {
      return randomId();
    }
  }

  global.WidgetInstallationId = {
    getOrCreate: getOrCreate,
    randomId: randomId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
