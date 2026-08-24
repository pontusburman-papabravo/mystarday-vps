/**
 * device-setup-prompt.js — Fas 4B one-time setup when this device is not enrolled.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'device_setup_prompt_shown_v1';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function track(eventName, meta) {
    if (window.analytics && typeof analytics.track === 'function') {
      analytics.track(eventName, meta || {});
    }
  }

  function shouldRunOnPage() {
    const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    return path === '/dashboard' || path === '/home' || path === '/';
  }

  function detectPlatform() {
    if (window.TrustedDeviceClient && TrustedDeviceClient.isNative && TrustedDeviceClient.isNative()) {
      return document.documentElement.classList.contains('is-native-android') ? 'android' : 'ios';
    }
    return 'web';
  }

  function markShown() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (_) { /* ignore */ }
  }

  function wasShownThisSession() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function removeModal() {
    const el = document.getElementById('deviceSetupModal');
    if (el) el.remove();
  }

  function showModal(state) {
    if (document.getElementById('deviceSetupModal')) return;
    const children = state.allowed_children || [];
    const single = children.length === 1 ? children[0] : null;

    const overlay = document.createElement('div');
    overlay.id = 'deviceSetupModal';
    overlay.className = 'fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'deviceSetupTitle');

    let buttons =
      '<button type="button" class="device-setup-choice w-full min-h-[52px] rounded-xl border-2 border-lavender bg-white font-semibold text-navy mb-2" data-usage="shared_with_children">' +
      pt('settings.thisDevice.usageShared') + '</button>';
    if (single) {
      buttons +=
        '<button type="button" class="device-setup-choice w-full min-h-[52px] rounded-xl border-2 border-lavender bg-white font-semibold text-navy mb-2" data-usage="child_device" data-child="' +
        single.id + '">' +
        pt('settings.thisDevice.openForChild', { name: single.name }) + '</button>';
    }
    buttons +=
      '<button type="button" class="device-setup-choice w-full min-h-[52px] rounded-xl border-2 border-lavender bg-white font-semibold text-navy mb-2" data-usage="parent_phone">' +
      pt('settings.thisDevice.usageParent') + '</button>';

    overlay.innerHTML =
      '<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 safe-area-bottom">' +
      '<h2 id="deviceSetupTitle" class="text-xl font-bold text-navy mb-2">' + pt('settings.thisDevice.setupTitle') + '</h2>' +
      '<p class="text-sm text-gray-700 mb-4">' + pt('settings.thisDevice.setupLead') + '</p>' +
      buttons +
      '<button type="button" id="deviceSetupLater" class="w-full min-h-[44px] text-sm font-semibold text-gray-600 mt-2">' +
      pt('settings.thisDevice.setupLater') + '</button>' +
      '<a href="/settings#this-device" class="block text-center text-sm text-navy font-semibold mt-3 min-h-[44px] leading-[44px]">' +
      pt('settings.thisDevice.openSettings') + '</a>' +
      '</div>';

    document.body.appendChild(overlay);
    track('device_setup_shown', { allowed_children: children.length });

    overlay.querySelector('#deviceSetupLater').addEventListener('click', function () {
      markShown();
      removeModal();
    });

    overlay.querySelectorAll('.device-setup-choice').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        const usage = btn.getAttribute('data-usage');
        const childId = btn.getAttribute('data-child');
        if (window.ParentPinHandoffGate && typeof ParentPinHandoffGate.ensureBeforeChildHandoff === 'function') {
          const pinOk = await ParentPinHandoffGate.ensureBeforeChildHandoff({ usage: usage });
          if (!pinOk) {
            btn.disabled = false;
            return;
          }
        }
        const body = {
          usage: usage,
          platform: detectPlatform(),
          start_mode: childId ? 'child' : (usage === 'parent_phone' ? 'parent' : 'choose_child'),
          start_child_id: childId,
        };
        const doPost = function () {
          if (!window.apiFetch) {
            return Promise.resolve({ ok: false, status: 0 });
          }
          return window.apiFetch('/api/family/trusted-devices/this-device/setup', {
            method: 'POST',
            body: JSON.stringify(body),
          });
        };
        const res = await doPost();
        if (res.ok) {
          track('device_role_selected', { usage: usage, source: 'setup_prompt' });
          markShown();
          removeModal();
          if (window.AppEntryOrchestrator && typeof AppEntryOrchestrator.applyAfterDeviceSetup === 'function') {
            await AppEntryOrchestrator.applyAfterDeviceSetup();
          }
          return;
        }
        btn.disabled = false;
        alert(pt('settings.thisDevice.saveFailed'));
      });
    });
  }

  async function fetchSetupState() {
    try {
      if (!window.apiFetch) return null;
      const res = await window.apiFetch('/api/family/trusted-devices/this-device');
      if (!res.ok) return null;
      return res.json();
    } catch (_) {
      return null;
    }
  }

  async function maybePrompt() {
    if (!shouldRunOnPage() || wasShownThisSession()) return;
    const state = await fetchSetupState();
    if (!state || !state.enabled || !state.setup_required) return;
    showModal(state);
  }

  window.DeviceSetupPrompt = { maybePrompt: maybePrompt };

  document.addEventListener('DOMContentLoaded', function () {
    window.setTimeout(maybePrompt, 800);
  });
})();
