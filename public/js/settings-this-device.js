/**
 * settings-this-device.js — Fas 4B "Den här enheten" (server canonical trusted_device).
 */
(function () {
  'use strict';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function track(eventName, meta) {
    if (window.analytics && typeof analytics.track === 'function') {
      analytics.track(eventName, meta || {});
    }
  }

  function sectionEl() {
    return document.getElementById('thisDeviceSection');
  }

  function detectPlatform() {
    if (window.TrustedDeviceClient && TrustedDeviceClient.isNative && TrustedDeviceClient.isNative()) {
      return document.documentElement.classList.contains('is-native-android') ? 'android' : 'ios';
    }
    return 'web';
  }

  function biometricLabel() {
    const p = detectPlatform();
    if (p === 'ios') return pt('settings.thisDevice.biometricIos');
    if (p === 'android') return pt('settings.thisDevice.biometricAndroid');
    return pt('settings.thisDevice.biometricWeb');
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function usageLabel(usage) {
    if (usage === 'parent_phone') return pt('settings.thisDevice.usageParent');
    if (usage === 'child_device') return pt('settings.thisDevice.usageChild');
    return pt('settings.thisDevice.usageShared');
  }

  function startLabel(state) {
    if (!state.device) return '';
    if (state.device.start_mode === 'parent') return pt('settings.thisDevice.startParent');
    if (state.device.start_mode === 'choose_child') return pt('settings.thisDevice.startChoose');
    if (state.device.start_child) {
      return (state.device.start_child.emoji || '⭐') + ' ' + (state.device.start_child.name || '');
    }
    return pt('settings.thisDevice.startChoose');
  }

  async function fetchThisDevice() {
    const res = await window.apiFetch('/api/family/trusted-devices/this-device');
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchPinStatus() {
    try {
      const res = await window.apiFetch('/api/family/parent-pin-status');
      if (!res.ok) return { hasPin: false };
      return res.json();
    } catch (_) {
      return { hasPin: false };
    }
  }

  async function loadWidgetSummary() {
    if (!window.WidgetBridgeClient || !WidgetBridgeClient.isNative || !WidgetBridgeClient.isNative()) {
      return null;
    }
    try {
      const status = await WidgetBridgeClient.getStatus();
      if (!status || !status.hasBinding) return null;
      return status;
    } catch (_) {
      return null;
    }
  }

  function renderEnrollForm(state, root) {
    const children = state.allowed_children || [];
    const singleChild = children.length === 1 ? children[0] : null;
    root.innerHTML =
      '<div class="space-y-4">' +
      '<p class="text-sm text-gray-700">' + esc(pt('settings.thisDevice.setupLead')) + '</p>' +
      '<div class="space-y-2" role="group" aria-labelledby="thisDeviceUsageLegend">' +
      '<p id="thisDeviceUsageLegend" class="text-sm font-semibold text-navy">' +
      esc(pt('settings.thisDevice.usageHeading')) + '</p>' +
      '<button type="button" class="this-device-setup-btn w-full text-left min-h-[52px] px-4 py-3 rounded-xl border-2 border-lavender bg-white font-semibold" data-usage="shared_with_children">' +
      esc(pt('settings.thisDevice.usageShared')) + '</button>' +
      (singleChild
        ? '<button type="button" class="this-device-setup-btn w-full text-left min-h-[52px] px-4 py-3 rounded-xl border-2 border-lavender bg-white font-semibold" data-usage="child_device" data-child="' +
          esc(singleChild.id) + '">' +
          esc(pt('settings.thisDevice.openForChild', { name: singleChild.name })) + '</button>'
        : '') +
      '<button type="button" class="this-device-setup-btn w-full text-left min-h-[52px] px-4 py-3 rounded-xl border-2 border-lavender bg-white font-semibold" data-usage="parent_phone">' +
      esc(pt('settings.thisDevice.usageParent')) + '</button>' +
      '</div></div>';

    root.querySelectorAll('.this-device-setup-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        completeSetup({
          usage: btn.getAttribute('data-usage'),
          start_child_id: btn.getAttribute('data-child') || null,
          start_mode: btn.getAttribute('data-child') ? 'child' : (btn.getAttribute('data-usage') === 'parent_phone' ? 'parent' : 'choose_child'),
        });
      });
    });
  }

  async function completeSetup(body) {
    if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
      const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({ usage: body.usage });
      if (!pinOk) return;
    }
    const payload = Object.assign({}, body, { platform: detectPlatform() });
    const res = await window.apiFetch('/api/family/trusted-devices/this-device/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert(pt('settings.thisDevice.saveFailed'));
      return;
    }
    track('device_role_selected', { usage: body.usage, source: 'settings' });
    if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.applyAfterDeviceSetup === 'function') {
      await AppEntryOrchestrator.applyAfterDeviceSetup();
      return;
    }
    await init();
  }

  async function savePatch(patch) {
    const res = await window.apiFetch('/api/family/trusted-devices/this-device', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      alert(pt('settings.thisDevice.saveFailed'));
      return false;
    }
    if (patch.usage) track('device_role_selected', { usage: patch.usage, source: 'settings' });
    if (patch.start_mode || patch.start_child_id) {
      track('device_start_mode_changed', {
        start_mode: patch.start_mode || (patch.start_child_id ? 'child' : 'choose_child'),
      });
    }
    return true;
  }

  function renderEnrolled(state, root, pinStatus, widgetStatus) {
    const d = state.device;
    const children = state.allowed_children || [];
    const childList = (d.children_on_device || []).map(function (c) {
      return '<li class="text-sm font-medium">' + esc((c.emoji || '⭐') + ' ' + (c.name || '')) + '</li>';
    }).join('');

    let widgetBlock = '';
    if (widgetStatus && widgetStatus.hasBinding) {
      widgetBlock =
        '<div class="mt-3"><p class="text-xs font-semibold text-navy mb-1">' +
        esc(pt('settings.thisDevice.widgetsHeading')) + '</p>' +
        '<p class="text-sm text-gray-700">' + esc(pt('settings.thisDevice.widgetsLinked')) + '</p></div>';
    } else if (WidgetBridgeClient && window.WidgetBridgeClient.isNative && WidgetBridgeClient.isNative()) {
      widgetBlock =
        '<p class="text-sm text-gray-600 mt-3">' + esc(pt('settings.thisDevice.widgetsNone')) + '</p>';
    }

    const pinText = pinStatus && pinStatus.hasPin
      ? pt('settings.thisDevice.adultPinSet')
      : pt('settings.thisDevice.adultPinMissing');

    root.innerHTML =
      '<div class="space-y-4">' +
      '<div class="rounded-xl bg-white/80 border border-lavender p-4">' +
      '<p class="text-lg font-bold text-navy">' + esc(d.label) + '</p>' +
      '<dl class="mt-3 space-y-2 text-sm">' +
      '<div><dt class="text-gray-600">' + esc(pt('settings.thisDevice.usageHeading')) + '</dt>' +
      '<dd class="font-semibold text-navy">' + esc(usageLabel(d.usage)) + '</dd></div>' +
      '<div><dt class="text-gray-600">' + esc(pt('settings.thisDevice.startHeading')) + '</dt>' +
      '<dd class="font-semibold text-navy">' + esc(startLabel(state)) + '</dd></div>' +
      (childList
        ? '<div><dt class="text-gray-600">' + esc(pt('settings.thisDevice.childrenHeading')) + '</dt>' +
          '<dd><ul class="mt-1 space-y-1">' + childList + '</ul></dd></div>'
        : '') +
      '<div><dt class="text-gray-600">' + esc(pt('settings.thisDevice.adultAccessHeading')) + '</dt>' +
      '<dd class="font-semibold text-navy">' + esc(biometricLabel()) + ' · ' + esc(pinText) + '</dd></div>' +
      '</dl>' + widgetBlock + '</div>' +

      '<div class="space-y-2">' +
      '<p class="text-sm font-semibold text-navy">' + esc(pt('settings.thisDevice.changeStartHeading')) + '</p>' +
      renderStartControls(state) +
      '</div>' +

      '<button type="button" id="thisDeviceRevokeBtn" class="w-full min-h-[48px] rounded-xl border-2 border-red-200 text-red-800 font-semibold text-sm">' +
      esc(pt('settings.thisDevice.revokeThis')) + '</button>' +
      '</div>';

    bindStartControls(root, state);
    const revokeBtn = document.getElementById('thisDeviceRevokeBtn');
    if (revokeBtn) {
      revokeBtn.addEventListener('click', function () {
        revokeThisDevice(d.id);
      });
    }
  }

  function renderStartControls(state) {
    const d = state.device;
    const children = state.allowed_children || [];
    if (d.usage === 'parent_phone') {
      return '<p class="text-sm text-gray-600">' + esc(pt('settings.thisDevice.startParentFixed')) + '</p>';
    }
    if (d.usage === 'child_device' && children.length <= 1) {
      return '<p class="text-sm text-gray-600">' + esc(pt('settings.thisDevice.startChildFixed')) + '</p>';
    }
    let html = '';
    if (d.usage === 'shared_with_children') {
      html += '<button type="button" class="this-device-start-btn w-full min-h-[48px] mb-2 rounded-xl border-2 border-lavender bg-white font-semibold text-sm" data-start="choose_child">' +
        esc(pt('settings.thisDevice.startChoose')) + '</button>';
    }
    children.forEach(function (c) {
      html += '<button type="button" class="this-device-start-btn w-full min-h-[48px] mb-2 rounded-xl border-2 border-lavender bg-white font-semibold text-sm" data-start="child" data-child="' +
        esc(c.id) + '">' + esc((c.emoji || '⭐') + ' ' + (c.name || '')) + '</button>';
    });
    return html;
  }

  function bindStartControls(root, state) {
    root.querySelectorAll('.this-device-start-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const start = btn.getAttribute('data-start');
        const childId = btn.getAttribute('data-child');
        const patch = { start_mode: start };
        if (start === 'child' && childId) patch.start_child_id = childId;
        if (start === 'choose_child') patch.start_child_id = null;
        const ok = await savePatch(patch);
        if (ok) await init();
      });
    });
  }

  async function revokeThisDevice(deviceId) {
    if (!window.confirm(pt('settings.thisDevice.revokeConfirm'))) return;
    const ok = await TrustedDeviceClient.revokeDevice(deviceId);
    if (!ok) {
      alert(pt('settings.thisDevice.saveFailed'));
      return;
    }
    track('device_access_revoked', { scope: 'this_device' });
    await init();
  }

  async function renderOtherDevices(root, currentId) {
    const data = await TrustedDeviceClient.loadDevices();
    const others = (data.devices || []).filter(function (d) { return d.id !== currentId; });
    if (!others.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'mt-6 pt-4 border-t border-lavender';
    wrap.innerHTML = '<h3 class="text-sm font-bold text-navy mb-2">' + esc(pt('settings.thisDevice.otherDevices')) + '</h3>';
    const list = document.createElement('ul');
    list.className = 'space-y-2';
    others.forEach(function (device) {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-2 text-sm';
      li.innerHTML = '<span>' + esc(device.label || device.platform || '') + '</span>' +
        '<button type="button" class="text-red-700 font-semibold min-h-[44px] px-2" data-revoke-other="' + esc(device.id) + '">' +
        esc(pt('settings.trustedDevices.revoke')) + '</button>';
      list.appendChild(li);
    });
    wrap.appendChild(list);
    root.appendChild(wrap);
    wrap.addEventListener('click', async function (ev) {
      const id = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-revoke-other');
      if (!id) return;
      if (!window.confirm(pt('settings.trustedDevices.revokeAllConfirm'))) return;
      await TrustedDeviceClient.revokeDevice(id);
      track('device_access_revoked', { scope: 'other_device' });
      await init();
    });
  }

  async function init() {
    const root = sectionEl();
    if (!root || !window.TrustedDeviceClient) return;
    root.innerHTML = '<p class="text-sm text-gray-600">' + esc(pt('common.loading')) + '</p>';
    try {
      const state = await fetchThisDevice();
      if (!state || !state.enabled) {
        root.innerHTML = '<p class="text-sm text-gray-600">' + esc(pt('settings.trustedDevices.disabled')) + '</p>';
        return;
      }
      const pinStatus = await fetchPinStatus();
      const widgetStatus = await loadWidgetSummary();
      if (!state.enrolled) {
        renderEnrollForm(state, root);
        return;
      }
      renderEnrolled(state, root, pinStatus, widgetStatus);
      await renderOtherDevices(root, state.device.id);
    } catch (err) {
      console.error('[settings-this-device]', err.message);
      root.innerHTML = '<p class="text-sm text-gray-600">' + esc(pt('settings.trustedDevices.disabled')) + '</p>';
    }
  }

  window.SettingsThisDevice = { init: init, fetchThisDevice: fetchThisDevice };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('parent-i18n-ready', init);
})();
