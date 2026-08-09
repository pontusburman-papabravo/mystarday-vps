'use strict';

/**
 * R4.5 closure — widget status + reconnect in parent settings (native only).
 */
(function (global) {
  const CHILD_STORAGE_KEY = 'stjarndag_widget_bind_child_v1';

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
    if (mode === 'full' || mode === 'standard') return 'Full';
    if (mode === 'minimal') return 'Begränsad';
    return String(mode || 'Full');
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
        const label = (c.emoji ? c.emoji + ' ' : '') + (c.name || 'Barn');
        const sel = c.id === selectedId ? ' selected' : '';
        return '<option value="' + esc(c.id) + '"' + sel + '>' + esc(label) + '</option>';
      })
      .join('');
    return (
      '<label class="block text-sm font-semibold text-navy mb-1" for="widgetSettingsChildSelect">Vilket barn ska widgeten visa?</label>' +
      '<select id="widgetSettingsChildSelect" class="w-full mb-3 px-3 py-2 rounded-xl border border-lavender text-navy min-h-[44px]">' +
      opts +
      '</select>'
    );
  }

  async function reconnectWidget(mount, children) {
    const user = global.Auth && Auth.getUser ? Auth.getUser() : null;
    if (!global.WidgetBridgeProvision) {
      setMessage(mount, 'Widget-stöd saknas i den här versionen. Uppdatera appen.', true);
      return;
    }

    let childId = null;
    if (user && user.type === 'child') {
      childId = user.id;
    } else if (user && user.type === 'parent') {
      childId = readSelectedChildId(mount, children);
      if (!childId) {
        const msg = 'Lägg till ett barn i familjen först, sedan kan du ansluta widgeten.';
        setMessage(mount, msg, true);
        flash(msg, true);
        return;
      }
      saveChildId(childId);
    }

    setMessage(mount, 'Ansluter…', false);
    const result = await global.WidgetBridgeProvision.syncBinding({ childId: childId });

    if (result && result.ok) {
      const okMsg = 'Klart! Lägg till widgeten på hemskärmen (+ → Min Stjärndag) om du inte redan gjort det.'; // pragma: allowlist secret
      setMessage(mount, okMsg, false);
      flash(okMsg, false);
      await renderWidgetSettings(mount);
      return;
    }

    if (result && result.skipped && result.reason === 'no_child_context') {
      const pickMsg = 'Välj barn i listan ovan och försök igen.';
      setMessage(mount, pickMsg, true);
      flash(pickMsg, true);
      return;
    }

    if (result && (result.status === 403 || result.status === 401)) {
      const offMsg = 'Widgeten är inte aktiverad eller sessionen behöver förnyas. Logga ut och in igen.';
      setMessage(mount, offMsg, true);
      flash(offMsg, true);
      return;
    }

    const failMsg = 'Kunde inte ansluta just nu. Försök igen om en stund.';
    setMessage(mount, failMsg, true);
    flash(failMsg, true);
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
      '<h2 class="font-heading text-lg text-navy mb-2">Widgets och snabbåtkomst</h2>' +
      '<p class="text-sm text-text-soft mb-3">Personlig widget = ett barn. Familjewidget = flera barn. Välj barn här om ni är flera.</p>' +
      childPickerHtml(children, defaultChild) +
      '<dl class="text-sm space-y-2 mb-4 text-navy">' +
      '<div><dt class="font-semibold inline">Status: </dt><dd class="inline text-text-soft">' +
      (hasBinding ? 'Ansluten' : 'Behöver återanslutas') +
      '</dd></div>' +
      '<div><dt class="font-semibold inline">Integritet: </dt><dd class="inline text-text-soft">' +
      esc(privacy) +
      '</dd></div>' +
      '</dl>' +
      '<button type="button" id="widgetSettingsReconnect" class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold min-h-[44px]">' +
      'Återanslut widget' +
      '</button>' +
      '<button type="button" id="widgetSettingsGuide" class="w-full mt-2 px-4 py-3 rounded-xl font-semibold min-h-[44px] border border-lavender/60 text-navy bg-white/10">' +
      'Visa guide för hemskärmswidget' +
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

  global.SettingsWidgets = {
    mount: renderWidgetSettings,
  };

  document.addEventListener('DOMContentLoaded', function () {
    const mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
  });
})(window);
