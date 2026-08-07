/**
 * widget-bridge-client.js — native WidgetBridge facade (no-op on web/PWA).
 */
(function (global) {
  'use strict';

  function getPlugin() {
    var cap = global.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
    return cap.Plugins && cap.Plugins.WidgetBridge ? cap.Plugins.WidgetBridge : null;
  }

  function isNative() {
    return !!getPlugin();
  }

  function refreshAll() {
    var plugin = getPlugin();
    if (plugin && typeof plugin.refreshAll === 'function') {
      return plugin.refreshAll().catch(function () {});
    }
    return Promise.resolve();
  }

  function clearBindings() {
    var plugin = getPlugin();
    if (plugin && typeof plugin.clearBindings === 'function') {
      return plugin.clearBindings().catch(function () {});
    }
    return Promise.resolve();
  }

  function configureBinding(opts) {
    var plugin = getPlugin();
    if (!plugin || typeof plugin.configureBinding !== 'function') {
      return Promise.resolve({ ok: false, platform: 'web' });
    }
    return plugin.configureBinding(opts);
  }

  function notifyChildChanged(activeChildId) {
    var plugin = getPlugin();
    var payload = activeChildId ? { activeChildId: activeChildId } : {};
    if (plugin && typeof plugin.notifyChildChanged === 'function') {
      return plugin.notifyChildChanged(payload).catch(function () {});
    }
    return Promise.resolve();
  }

  function getStatus() {
    var plugin = getPlugin();
    if (plugin && typeof plugin.getStatus === 'function') {
      return plugin.getStatus();
    }
    return Promise.resolve({
      hasBinding: false,
      platform: 'web',
    });
  }

  async function notifyChildChangedAndRefresh(activeChildId) {
    await notifyChildChanged(activeChildId);
    await refreshAll();
  }

  global.WidgetBridgeClient = {
    isNative: isNative,
    refreshAll: refreshAll,
    clearBindings: clearBindings,
    configureBinding: configureBinding,
    notifyChildChanged: notifyChildChanged,
    notifyChildChangedAndRefresh: notifyChildChangedAndRefresh,
    getStatus: getStatus,
  };
})(typeof window !== 'undefined' ? window : globalThis);
