/**
 * widget-bridge-provision.js — server widget binding + native secure storage (R4.5c).
 * Uses POST /api/widget/bindings and POST /api/widget/switch-child — never raw trusted_device in extension.
 */
(function (global) {
  'use strict';

  var _syncPromise = null;
  var _syncKey = null;

  function isNative() {
    return global.WidgetBridgeClient && global.WidgetBridgeClient.isNative();
  }

  function platformName() {
    var cap = global.Capacitor;
    if (!cap || !cap.getPlatform) return 'ios';
    return cap.getPlatform() === 'android' ? 'android' : 'ios';
  }

  function resolveChildIdForBinding(user, options) {
    options = options || {};
    if (options.childId) return options.childId;
    if (!user) return null;
    if (user.type === 'child') return user.id;
    if (user.type === 'parent' && options.childId) return options.childId;
    if (global.ChildSessionContext && typeof ChildSessionContext.getActiveChildId === 'function') {
      var ctx = ChildSessionContext.getActiveChildId();
      if (ctx) return ctx;
    }
    return null;
  }

  function viewerModeForUser(user) {
    if (!user) return null;
    if (user.type === 'child') return 'child_session';
    if (user.type === 'parent') return 'parent';
    return null;
  }

  async function fetchBinding(childId, installationId) {
    var body = {
      installation_id: installationId,
      platform: platformName(),
    };
    if (childId) body.child_id = childId;

    var headers = { 'Content-Type': 'application/json' };
    if (global.Auth && typeof Auth.getCsrfToken === 'function') {
      var csrf = Auth.getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    var res = await fetch('/api/widget/bindings', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(body),
    });
    var data = await res.json().catch(function () { return {}; });
    return { ok: res.ok, status: res.status, data: data };
  }

  async function switchBinding(targetChildId) {
    return syncBinding({ childId: targetChildId });
  }

  async function syncBinding(options) {
    options = options || {};
    if (!isNative()) return { ok: false, skipped: true };
    if (!global.Auth || typeof Auth.getUser !== 'function') return { ok: false };

    var user = Auth.getUser();
    if (!user) return { ok: false };

    var installationId = global.WidgetInstallationId
      ? await WidgetInstallationId.getOrCreate()
      : null;

    var childId = resolveChildIdForBinding(user, options);
    if (user.type === 'parent' && !childId) {
      return { ok: false, skipped: true, reason: 'no_child_context' };
    }

    var result = await fetchBinding(childId, installationId);
    if (!result.ok) {
      if (result.status === 403 || result.status === 401) {
        await global.WidgetBridgeClient.clearBindings();
        await global.WidgetBridgeClient.refreshAll();
      }
      return result;
    }

    var token = result.data.binding_token;
    var boundChild = result.data.child_id || childId;
    if (!token || !boundChild) return { ok: false, data: result.data };

    try {
      var configured = await global.WidgetBridgeClient.configureBinding({
        bindingToken: token,
        activeChildId: boundChild,
        viewerMode: viewerModeForUser(user),
        privacyMode: 'standard',
        installationId: installationId,
      });
      if (configured && configured.ok === false) {
        return { ok: false, reason: 'native_configure_failed', data: configured };
      }
    } catch (configureErr) {
      return { ok: false, reason: 'native_configure_failed', error: configureErr };
    }
    await global.WidgetBridgeClient.refreshAll();
    return { ok: true, childId: boundChild };
  }

  function syncBindingCoalesced(options) {
    options = options || {};
    if (options.force) {
      return syncBinding(options);
    }
    var key = String(options.childId || '');
    if (_syncPromise && _syncKey === key) return _syncPromise;
    if (_syncPromise) {
      return _syncPromise.then(function () {
        return syncBindingCoalesced(options);
      });
    }
    _syncKey = key;
    _syncPromise = syncBinding(options).finally(function () {
      _syncPromise = null;
      _syncKey = null;
    });
    return _syncPromise;
  }

  global.WidgetBridgeProvision = {
    syncBinding: syncBindingCoalesced,
    switchBinding: switchBinding,
    handleAuthFailure: async function () {
      await global.WidgetBridgeClient.clearBindings();
      await global.WidgetBridgeClient.refreshAll();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
