'use strict';

/**
 * R4.5 closure — widget status + reconnect in parent settings (native only).
 */
(function (global) {
  const CHILD_STORAGE_KEY = 'stjarndag_widget_bind_child_v1';

  function pt(key, params) {
    return (typeof global.pt === 'function') ? global.pt(key, params) : key;
  }

  function brandParam() {
    const brand = pt('onboarding.common.brand');
    return brand !== 'onboarding.common.brand' ? brand : 'My Starday';
  }

  function esc(s) {
    if (typeof global.escHtml === 'function') return global.escHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isNativeWidget() {
    return global.WidgetBridgeClient && global.WidgetBridgeClient.isNative();
  }

  function privacyLabel(mode) {
    if (mode === 'full' || mode === 'standard') return pt('settings.widget.settings.privacyFull');
    if (mode === 'minimal') return pt('settings.widget.settings.privacyLimited');
    return String(mode || pt('settings.widget.settings.privacyFull'));
  }

  function setMessage(mount, text, isError) {
    const el = mount.querySelector('#widgetSettingsMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className =
      'text-sm min-h-[1.4em] mt-2 ' +
      (isError ? 'text-red-600 widget-settings-msg--error' : 'text-green-700 widget-settings-msg--ok');
  }

  function flash(msg, isError) {
    if (typeof global.showToast === 'function') {
      global.showToast(msg, isError);
    }
  }

  async function loadChildren() {
    try {
      if (typeof global.apiFetch === 'function') {
        const res = await global.apiFetch('/api/children');
        if (!res.ok) return [];
        const body = await res.json();
        return Array.isArray(body) ? body : body.children || [];
      }
      if (global.Auth && typeof Auth.api === 'function') {
        const data = await Auth.api('/api/children');
        return Array.isArray(data) ? data : data.children || [];
      }
    } catch (_) { /* ignore */ }
    return [];
  }

  function storedChildId() {
    try {
      return global.localStorage.getItem(CHILD_STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function saveChildId(childId) {
    try {
      if (childId) global.localStorage.setItem(CHILD_STORAGE_KEY, childId);
    } catch (_) { /* ignore */ }
  }

  function resolveDefaultChildId(children) {
    if (!children.length) return null;
    const stored = storedChildId();
    if (stored && children.some(function (c) { return c.id === stored; })) return stored;
    return children[0].id;
  }

  function readSelectedChildId(mount, children) {
    const select = mount.querySelector('#widgetSettingsChildSelect');
    if (select && select.value) return select.value;
    return resolveDefaultChildId(children);
  }

  function childPickerHtml(children, selectedId) {
    if (children.length <= 1) return '';
    const opts = children
      .map(function (c) {
        const label = (c.emoji ? c.emoji + ' ' : '') + (c.name || pt('settings.widget.settings.childFallbackName'));
        const sel = c.id === selectedId ? ' selected' : '';
        return '<option value="' + esc(c.id) + '"' + sel + '>' + esc(label) + '</option>';
      })
      .join('');
    return (
      '<label class="block text-sm font-semibold text-navy mb-1" for="widgetSettingsChildSelect">' + esc(pt('settings.widget.settings.childPickerLabel')) + '</label>' +
      '<select id="widgetSettingsChildSelect" class="w-full mb-3 px-3 py-2 rounded-xl border border-lavender text-navy min-h-[44px]">' +
      opts +
      '</select>'
    );
  }

  function mapBindingError(result) {
    const code = result && result.data && result.data.status;
    if (code === 'offline_unavailable') {
      return pt('settings.widget.settings.errors.offlineUnavailable');
    }
    if (code === 'reauth_required' || code === 'device_revoked') {
      return pt('settings.widget.settings.errors.reauthRequired');
    }
    if (result && result.reason === 'native_configure_failed') {
      return pt('settings.widget.settings.errors.nativeConfigureFailed');
    }
    if (result && (result.status === 403 || result.status === 401)) {
      return pt('settings.widget.settings.errors.notEnabled');
    }
    return null;
  }

  async function reconnectWidget(mount, children) {
    const user = global.Auth && Auth.getUser ? Auth.getUser() : null;
    if (!global.WidgetBridgeProvision) {
      setMessage(mount, pt('settings.widget.settings.supportMissing'), true);
      return;
    }

    let childId = null;
    if (user && user.type === 'child') {
      childId = user.id;
    } else if (user && user.type === 'parent') {
      childId = readSelectedChildId(mount, children);
      if (!childId) {
        const msg = pt('settings.widget.settings.addChildFirst');
        setMessage(mount, msg, true);
        flash(msg, true);
        return;
      }
      saveChildId(childId);
    } else if (!user) {
      const msg = pt('settings.widget.settings.loginRequired');
      setMessage(mount, msg, true);
      flash(msg, true);
      return;
    }

    setMessage(mount, pt('settings.widget.settings.connecting'), false);
    try {
      const result = await global.WidgetBridgeProvision.syncBinding({ childId: childId, force: true });

      if (result && result.superseded) {
        return;
      }

      if (result && result.ok) {
        const okMsg = pt('settings.widget.settings.success', { brand: brandParam() });
        setMessage(mount, okMsg, false);
        flash(okMsg, false);
        await renderWidgetSettings(mount);
        return;
      }

      if (result && result.skipped && result.reason === 'no_child_context') {
        const pickMsg = pt('settings.widget.settings.pickChild');
        setMessage(mount, pickMsg, true);
        flash(pickMsg, true);
        return;
      }

      const mapped = mapBindingError(result);
      if (mapped) {
        setMessage(mount, mapped, true);
        flash(mapped, true);
        return;
      }

      const failMsg = pt('settings.widget.settings.retryLater');
      setMessage(mount, failMsg, true);
      flash(failMsg, true);
    } catch (_err) {
      const failMsg = pt('settings.widget.settings.networkError');
      setMessage(mount, failMsg, true);
      flash(failMsg, true);
    }
  }

  async function renderWidgetSettings(mount) {
    if (!mount || !isNativeWidget()) {
      if (mount) mount.innerHTML = '';
      return;
    }

    let status = {};
    try {
      status = await global.WidgetBridgeClient.getStatus();
    } catch (_) {
      status = {};
    }
    const hasBinding = !!status.hasBinding;
    const privacy = privacyLabel(status.privacyMode);
    const children = await loadChildren();
    const defaultChild = resolveDefaultChildId(children);

    mount.innerHTML =
      '<h2 class="font-heading text-lg text-navy mb-2">' + esc(pt('settings.widget.settings.title')) + '</h2>' +
      '<p class="text-sm text-text-soft mb-3">' + esc(pt('settings.widget.settings.description')) + '</p>' +
      childPickerHtml(children, defaultChild) +
      '<dl class="text-sm space-y-2 mb-4 text-navy">' +
      '<div><dt class="font-semibold inline">' + esc(pt('settings.widget.settings.statusLabel')) + ' </dt><dd class="inline text-text-soft">' +
      esc(hasBinding ? pt('settings.widget.settings.statusConnected') : pt('settings.widget.settings.statusReconnect')) +
      '</dd></div>' +
      '<div><dt class="font-semibold inline">' + esc(pt('settings.widget.settings.privacyLabel')) + ' </dt><dd class="inline text-text-soft">' +
      esc(privacy) +
      '</dd></div>' +
      '</dl>' +
      '<button type="button" id="widgetSettingsReconnect" class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold min-h-[44px]">' +
      esc(pt('settings.widget.settings.reconnectBtn')) +
      '</button>' +
      '<button type="button" id="widgetSettingsGuide" class="w-full mt-2 px-4 py-3 rounded-xl font-semibold min-h-[44px] border border-lavender/60 text-navy bg-white/10">' +
      esc(pt('settings.widget.settings.guideBtn')) +
      '</button>' +
      '<p id="widgetSettingsMsg" class="text-sm min-h-[1.4em] mt-2 text-text-soft" role="status" aria-live="polite"></p>';

    const select = mount.querySelector('#widgetSettingsChildSelect');
    if (select) {
      select.addEventListener('change', function () {
        saveChildId(select.value);
      });
    }

    const btn = mount.querySelector('#widgetSettingsReconnect');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        reconnectWidget(mount, children).finally(function () {
          btn.disabled = false;
        });
      });
    }

    const guideBtn = mount.querySelector('#widgetSettingsGuide');
    if (guideBtn && global.WidgetInstallPrompt) {
      guideBtn.addEventListener('click', function () {
        global.WidgetInstallPrompt.openGuide();
      });
    }
  }

  function scheduleMountRetries() {
    const mount = document.getElementById('widgetSettingsSection');
    if (!mount) return;
    [0, 400, 1200].forEach(function (delay) {
      setTimeout(function () {
        renderWidgetSettings(mount);
      }, delay);
    });
  }

  global.SettingsWidgets = {
    mount: renderWidgetSettings,
  };

  document.addEventListener('DOMContentLoaded', function () {
    const mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
    scheduleMountRetries();
  });
  global.addEventListener('pageshow', function () {
    const mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
  });
  document.addEventListener('parent-i18n-ready', function () {
    const mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
  });
  document.addEventListener('locale-changed', function () {
    const mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
  });
})(window);
