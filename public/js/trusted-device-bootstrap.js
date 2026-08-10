/**
 * trusted-device-bootstrap.js — R4.3 shared device cold start + picker handoff.
 */
(function () {
  'use strict';

  function track(eventName, meta) {
    if (window.EntryAnalytics && typeof EntryAnalytics.track === 'function') {
      EntryAnalytics.track(eventName, meta || {});
    }
  }

  async function postRestore(options) {
    const reqBody = {};
    if (options && options.forcePicker) reqBody.force_picker = true;
    const res = await fetch('/api/auth/trusted-device/restore', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const body = await res.json().catch(function () { return {}; });
    return { status: res.status, body: body };
  }

  async function selectChild(childId) {
    const res = await fetch('/api/auth/trusted-device/select-child', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId }),
    });
    const body = await res.json().catch(function () { return {}; });
    return { ok: res.ok && body.ok, body: body };
  }

  function enterChildModeAndGo(redirect) {
    if (window.DeviceMode && DeviceMode.enterChild) DeviceMode.enterChild();
    window.location.replace(redirect || '/child/today');
  }

  async function applySessionUser(user) {
    if (window.Auth && typeof Auth.setAuth === 'function' && user) {
      Auth.setAuth(null, user);
    }
    if (window.ChildSessionContext && user && user.id) {
      ChildSessionContext.setActiveChildId(user.id);
    }
    if (window.DeviceMode && DeviceMode.enterChild) DeviceMode.enterChild();
    if (window.WidgetBridgeProvision && user && user.id) {
      WidgetBridgeProvision.syncBinding({ childId: user.id }).catch(function () {});
    }
  }

  async function tryColdStart(opts) {
    const options = opts || {};
    if (
      window.AppEntryOrchestrator
      && typeof AppEntryOrchestrator.runColdStart === 'function'
    ) {
      const orch = await AppEntryOrchestrator.runColdStart(options);
      if (orch && orch.code !== 'ORCHESTRATOR_OFF') {
        return orch;
      }
    }
    if (!options.force && window.Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
      return { ok: false, code: 'ALREADY_LOGGED_IN' };
    }
    const restored = await postRestore({
      forcePicker: options.forcePicker === true,
    });
    const body = restored.body || {};
    if (body.ok && body.user) {
      await applySessionUser(body.user);
      track('child_context_restore', {
        device_mode: body.device_mode || 'child',
        source: 'trusted_device_restore',
        outcome: 'success',
      });
      if (!options.skipRedirect) {
        window.location.replace(body.redirect || '/child/today');
      }
      return { ok: true, user: body.user };
    }
    if (body.code === 'SHARED_PICKER_REQUIRED' && Array.isArray(body.allowed_children)) {
      track('shared_device_picker_shown', {
        device_mode: 'shared',
        allowed_count_bucket: body.allowed_count_bucket || '2',
        source: options.source || 'cold_start',
      });
      if (typeof window.showSharedDevicePicker === 'function') {
        window.showSharedDevicePicker(body.allowed_children, {
          bucket: body.allowed_count_bucket,
        });
        return { ok: false, code: 'PICKER_SHOWN' };
      }
      try {
        sessionStorage.setItem('shared_device_picker_children', JSON.stringify(body.allowed_children));
      } catch (_) { /* ignore */ }
      window.location.replace('/child-login?shared_device=1');
      return { ok: false, code: 'REDIRECT_PICKER' };
    }
    track('child_context_restore_failed', {
      code: body.code || 'unknown',
      source: options.source || 'cold_start',
    });
    return { ok: false, code: body.code || 'RESTORE_FAILED' };
  }

  async function pickSharedChild(childId, meta) {
    const result = await selectChild(childId);
    if (!result.ok) {
      track('child_access_denied', { source: 'shared_device_select', outcome: result.body?.code || 'failed' });
      return result;
    }
    track('shared_device_child_selected', {
      device_mode: 'shared',
      allowed_count_bucket: (meta && meta.bucket) || '2',
      source: (meta && meta.source) || 'picker',
    });
    await applySessionUser(result.body.user);
    window.location.replace(result.body.redirect || '/child/today');
    return { ok: true };
  }

  window.TrustedDeviceBootstrap = {
    tryColdStart: tryColdStart,
    pickSharedChild: pickSharedChild,
    postRestore: postRestore,
  };
})();
