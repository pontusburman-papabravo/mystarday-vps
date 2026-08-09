/**
 * widget-bridge-provision.js — server widget binding + native secure storage (R4.5c).
 * Uses POST /api/widget/bindings and POST /api/widget/switch-child — never raw trusted_device in extension.
 *
 * Binding intent: monotonic intent id. A newer sync invalidates older in-flight work
 * before native configureBinding (childId frozen at enqueue).
 */
(function (global) {
  'use strict';

  let _latestIntentId = 0;

  function isNative() {
    return global.WidgetBridgeClient && global.WidgetBridgeClient.isNative();
  }

  function platformName() {
    const cap = global.Capacitor;
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
      const ctx = ChildSessionContext.getActiveChildId();
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

  function bumpBindingIntent() {
    _latestIntentId += 1;
    return _latestIntentId;
  }

  function invalidateBindingIntents() {
    _latestIntentId += 1;
  }

  function isSuperseded(intentId) {
    return intentId < _latestIntentId;
  }

  async function fetchBinding(childId, installationId) {
    const body = {
      installation_id: installationId,
      platform: platformName(),
    };
    if (childId) body.child_id = childId;

    const headers = { 'Content-Type': 'application/json' };
    if (global.Auth && typeof Auth.getCsrfToken === 'function') {
      const csrf = Auth.getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    const res = await fetch('/api/widget/bindings', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(function () { return {}; });
    return { ok: res.ok, status: res.status, data: data };
  }

  async function syncBindingForIntent(intentId, frozen) {
    if (!isNative()) return { ok: false, skipped: true };
    if (!global.Auth || typeof Auth.getUser !== 'function') return { ok: false };

    const user = Auth.getUser();
    if (!user) return { ok: false };

    const childId = frozen.childId;
    if (user.type === 'parent' && !childId) {
      return { ok: false, skipped: true, reason: 'no_child_context' };
    }

    if (isSuperseded(intentId)) {
      return { ok: false, superseded: true };
    }

    const installationId = global.WidgetInstallationId
      ? await WidgetInstallationId.getOrCreate()
      : null;

    if (isSuperseded(intentId)) {
      return { ok: false, superseded: true };
    }

    const result = await fetchBinding(childId, installationId);
    if (isSuperseded(intentId)) {
      return { ok: false, superseded: true };
    }

    if (!result.ok) {
      if (result.status === 403 || result.status === 401) {
        invalidateBindingIntents();
        await global.WidgetBridgeClient.clearBindings();
        await global.WidgetBridgeClient.refreshAll();
      }
      return result;
    }

    const token = result.data.binding_token;
    const boundChild = result.data.child_id || childId;
    if (!token || !boundChild) return { ok: false, data: result.data };

    if (isSuperseded(intentId)) {
      return { ok: false, superseded: true };
    }

    try {
      const configured = await global.WidgetBridgeClient.configureBinding({
        bindingToken: token,
        activeChildId: boundChild,
        viewerMode: viewerModeForUser(user),
        privacyMode: 'standard',
        installationId: installationId,
      });
      if (isSuperseded(intentId)) {
        return { ok: false, superseded: true };
      }
      if (configured && configured.ok === false) {
        return { ok: false, reason: 'native_configure_failed', data: configured };
      }
    } catch (configureErr) {
      if (isSuperseded(intentId)) {
        return { ok: false, superseded: true };
      }
      return { ok: false, reason: 'native_configure_failed', error: configureErr };
    }

    if (isSuperseded(intentId)) {
      return { ok: false, superseded: true };
    }

    await global.WidgetBridgeClient.refreshAll();
    return { ok: true, childId: boundChild };
  }

  function enqueueSyncBinding(options) {
    options = options || {};
    if (!isNative()) return Promise.resolve({ ok: false, skipped: true });
    if (!global.Auth || typeof Auth.getUser !== 'function') {
      return Promise.resolve({ ok: false });
    }

    const user = Auth.getUser();
    if (!user) return Promise.resolve({ ok: false });

    const frozenChildId = resolveChildIdForBinding(user, options);
    if (user.type === 'parent' && !frozenChildId) {
      return Promise.resolve({ ok: false, skipped: true, reason: 'no_child_context' });
    }

    const intentId = bumpBindingIntent();
    const frozen = { childId: frozenChildId, force: !!options.force };

    return syncBindingForIntent(intentId, frozen);
  }

  async function switchBinding(targetChildId) {
    return enqueueSyncBinding({ childId: targetChildId });
  }

  global.WidgetBridgeProvision = {
    syncBinding: enqueueSyncBinding,
    switchBinding: switchBinding,
    invalidateBindingIntents: invalidateBindingIntents,
    handleAuthFailure: async function () {
      invalidateBindingIntents();
      await global.WidgetBridgeClient.clearBindings();
      await global.WidgetBridgeClient.refreshAll();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
