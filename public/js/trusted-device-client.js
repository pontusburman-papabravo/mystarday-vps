/**
 * trusted-device-client.js — R4.2 child device enroll + silent restore (native-first).
 */
(function () {
  'use strict';

  const PREFS_KEY = 'stjarndag_trusted_device_token';

  function isNative() {
    return (window.Platform && Platform.isNative && Platform.isNative()) ||
      document.documentElement.classList.contains('platform-native') ||
      document.documentElement.classList.contains('is-native-android');
  }

  async function storeEnrollToken(raw) {
    if (!raw) return;
    try {
      if (isNative() && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences) {
        await Capacitor.Plugins.Preferences.set({ key: PREFS_KEY, value: raw });
      }
    } catch (_) { /* optional mirror; httpOnly cookie is primary on WebView */ }
  }

  async function tryRestoreSession() {
    try {
      const res = await fetch('/api/auth/trusted-device/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await res.json().catch(function () { return {}; });
      if (body.ok) {
        if (window.DeviceMode && DeviceMode.enterChild) DeviceMode.enterChild();
        return { ok: true, redirect: body.redirect || '/child/today', user: body.user };
      }
      if (body.code === 'SHARED_PICKER_REQUIRED') {
        return {
          ok: false,
          code: body.code,
          allowed_children: body.allowed_children,
          allowed_count_bucket: body.allowed_count_bucket,
        };
      }
      return { ok: false, status: res.status, code: body.code };
    } catch (_) {
      return { ok: false };
    }
  }

  async function enrollChildDevice(childId, label, options) {
    if (!window.apiFetch) return { ok: false };
    const platform = isNative()
      ? (document.documentElement.classList.contains('is-native-android') ? 'android' : 'ios')
      : 'web';
    const res = await window.apiFetch('/api/family/trusted-devices/child', {
      method: 'POST',
      body: JSON.stringify({
        child_id: childId,
        platform: platform,
        label: label || null,
      }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json();
    if (body.enroll_token) await storeEnrollToken(body.enroll_token);
    if (options && options.enterChildMode && window.DeviceMode && DeviceMode.enterChild) {
      DeviceMode.enterChild();
    }
    return { ok: true, device: body.device };
  }

  async function enrollSharedDevice(label, options) {
    if (!window.apiFetch) return { ok: false };
    const platform = isNative()
      ? (document.documentElement.classList.contains('is-native-android') ? 'android' : 'ios')
      : 'web';
    const res = await window.apiFetch('/api/family/trusted-devices/shared', {
      method: 'POST',
      body: JSON.stringify({
        platform: platform,
        label: label || null,
      }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json();
    if (body.enroll_token) await storeEnrollToken(body.enroll_token);
    if (options && options.enterChildMode && window.DeviceMode && DeviceMode.enterChild) {
      DeviceMode.enterChild();
    }
    return { ok: true, device: body.device };
  }

  async function loadDevices() {
    if (!window.apiFetch) return { enabled: false, devices: [] };
    const res = await window.apiFetch('/api/family/trusted-devices');
    if (!res.ok) return { enabled: false, devices: [] };
    return res.json();
  }

  async function revokeDevice(deviceId) {
    if (!window.apiFetch) return false;
    const res = await window.apiFetch('/api/family/trusted-devices/' + encodeURIComponent(deviceId), {
      method: 'DELETE',
    });
    return res.ok;
  }

  window.TrustedDeviceClient = {
    tryRestoreSession: tryRestoreSession,
    enrollChildDevice: enrollChildDevice,
    enrollSharedDevice: enrollSharedDevice,
    loadDevices: loadDevices,
    revokeDevice: revokeDevice,
    isNative: isNative,
  };
})();
