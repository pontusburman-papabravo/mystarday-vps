/**
 * widget-bridge-client.js — notify native layer when child context or completions change.
 * No-op on web/PWA; Capacitor plugin wired in native builds (R4.5b+).
 */
(function (global) {
  'use strict';

  function getPlugin() {
    const cap = global.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
    return cap.Plugins && cap.Plugins.WidgetBridge ? cap.Plugins.WidgetBridge : null;
  }

  function refreshAll() {
    const plugin = getPlugin();
    if (plugin && typeof plugin.refreshAll === 'function') {
      plugin.refreshAll().catch(function () {});
    }
  }

  function clearBindings() {
    const plugin = getPlugin();
    if (plugin && typeof plugin.clearBindings === 'function') {
      plugin.clearBindings().catch(function () {});
    }
  }

  function notifyChildChanged() {
    const plugin = getPlugin();
    if (plugin && typeof plugin.notifyChildChanged === 'function') {
      plugin.notifyChildChanged().catch(function () {});
    }
    refreshAll();
  }

  global.WidgetBridgeClient = {
    refreshAll: refreshAll,
    clearBindings: clearBindings,
    notifyChildChanged: notifyChildChanged,
  };
})(typeof window !== 'undefined' ? window : globalThis);
