/**
 * settings-trusted-devices.js — R4.2 list/revoke trusted devices + enroll this device for a child.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function sectionEl() {
    return document.getElementById('trustedDevicesSection');
  }

  function renderDisabled(root) {
    root.innerHTML = '<p class="text-sm text-gray-600">' + pt('settings.trustedDevices.disabled') + '</p>';
  }

  function modeLabel(mode) {
    if (mode === 'child') return pt('settings.trustedDevices.modeChild');
    if (mode === 'shared') return pt('settings.trustedDevices.modeShared');
    return pt('settings.trustedDevices.modeParent');
  }

  async function loadChildren() {
    const res = await window.apiFetch('/api/children');
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : body.children || [];
  }

  function renderDeviceRow(device) {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between gap-3 py-3 border-b border-lavender/40';
    const childLabel = device.child_name
      ? device.child_emoji + ' ' + device.child_name
      : pt('settings.trustedDevices.unknownChild');
    const meta = [
      modeLabel(device.device_mode),
      device.platform || 'web',
      device.label || '',
    ].filter(Boolean).join(' · ');
    li.innerHTML =
      '<div><p class="font-semibold text-sm">' + childLabel + '</p>' +
      '<p class="text-xs text-gray-600">' + meta + '</p></div>' +
      '<button type="button" class="text-sm font-semibold text-red-700 min-h-[44px] px-3" data-revoke="' +
      device.id + '">' + pt('settings.trustedDevices.revoke') + '</button>';
    return li;
  }

  async function render(root) {
    if (!window.TrustedDeviceClient) {
      renderDisabled(root);
      return;
    }
    const data = await TrustedDeviceClient.loadDevices();
    if (!data.enabled) {
      renderDisabled(root);
      return;
    }

    const children = await loadChildren();
    const enrollBlock = document.createElement('div');
    enrollBlock.className = 'mb-4 space-y-2';
    enrollBlock.innerHTML =
      '<p class="text-sm text-gray-700">' + pt('settings.trustedDevices.enrollHint') + '</p>';

    if (children.length) {
      const row = document.createElement('div');
      row.className = 'flex flex-col sm:flex-row gap-2';
      const select = document.createElement('select');
      select.className = 'flex-1 border-2 border-lavender rounded-xl px-3 py-2 min-h-[44px]';
      children.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = (c.emoji || '⭐') + ' ' + (c.name || c.username);
        select.appendChild(opt);
      });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-primary min-h-[44px] px-4 rounded-xl font-semibold';
      btn.textContent = pt('settings.trustedDevices.enrollThisDevice');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const childId = select.value;
        const child = children.find((c) => c.id === childId);
        const label = child ? child.name : null;
        const result = await TrustedDeviceClient.enrollChildDevice(childId, label, { enterChildMode: true });
        if (result.ok) {
          window.location.href = '/child/today';
          return;
        }
        btn.disabled = false;
        alert(pt('settings.trustedDevices.enrollFailed'));
      });
      row.appendChild(select);
      row.appendChild(btn);
      enrollBlock.appendChild(row);
    }

    const list = document.createElement('ul');
    list.className = 'divide-y divide-lavender/30';
    (data.devices || []).forEach((d) => list.appendChild(renderDeviceRow(d)));

    const revokeAllBtn = document.createElement('button');
    revokeAllBtn.type = 'button';
    revokeAllBtn.className = 'mt-4 text-sm font-semibold text-red-700 min-h-[44px]';
    revokeAllBtn.textContent = pt('settings.trustedDevices.revokeAll');
    revokeAllBtn.addEventListener('click', async () => {
      if (!window.confirm(pt('settings.trustedDevices.revokeAllConfirm'))) return;
      await window.apiFetch('/api/family/trusted-devices/revoke-all', { method: 'POST' });
      await init();
    });

    root.innerHTML = '';
    root.appendChild(enrollBlock);
    if (!data.devices || !data.devices.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-600';
      empty.textContent = pt('settings.trustedDevices.empty');
      root.appendChild(empty);
    } else {
      root.appendChild(list);
      root.appendChild(revokeAllBtn);
    }

    list.addEventListener('click', async (ev) => {
      const id = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-revoke');
      if (!id) return;
      await TrustedDeviceClient.revokeDevice(id);
      await init();
    });
  }

  async function init() {
    const root = sectionEl();
    if (!root) return;
    try {
      await render(root);
    } catch (err) {
      console.error('[settings-trusted-devices]', err.message);
      renderDisabled(root);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('parent-i18n-ready', init);

  window.SettingsTrustedDevices = { init: init };
})();
