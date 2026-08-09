'use strict';

/**
 * R4.5 closure — lightweight widget status in parent settings (native only).
 */
(function (global) {
  function isNativeWidget() {
    return global.WidgetBridgeClient && global.WidgetBridgeClient.isNative();
  }

  async function renderWidgetSettings(mount) {
    if (!mount || !isNativeWidget()) {
      if (mount) mount.innerHTML = '';
      return;
    }
    var status = {};
    try {
      status = await global.WidgetBridgeClient.getStatus();
    } catch (e) {
      status = {};
    }
    var hasBinding = !!status.hasBinding;
    var privacy = status.privacyMode || 'full';
    mount.innerHTML =
      '<h2 class="font-heading text-lg text-navy mb-2">Widgets och snabbåtkomst</h2>' +
      '<p class="text-sm text-navy-soft mb-3">Personlig widget = ett barn. Familjewidget = flera barn. Välj barn på själva widgeten.</p>' +
      '<dl class="text-sm space-y-2 mb-4">' +
      '<div><dt class="font-semibold inline">Status: </dt><dd class="inline">' +
      (hasBinding ? 'Ansluten' : 'Behöver återanslutas') + '</dd></div>' +
      '<div><dt class="font-semibold inline">Integritet: </dt><dd class="inline">' + privacy + '</dd></div>' +
      '</dl>' +
      '<button type="button" id="widgetSettingsReconnect" class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold min-h-[44px]">' +
      'Återanslut widget' +
      '</button>' +
      '<button type="button" id="widgetSettingsGuide" class="w-full mt-2 px-4 py-3 bg-lavender/40 text-navy rounded-xl font-semibold min-h-[44px]">' +
      'Visa guide för hemskärmswidget' +
      '</button>';

    var btn = mount.querySelector('#widgetSettingsReconnect');
    if (btn && global.WidgetBridgeProvision) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        global.WidgetBridgeProvision.syncBinding({}).finally(function () {
          btn.disabled = false;
          renderWidgetSettings(mount);
        });
      });
    }
    var guideBtn = mount.querySelector('#widgetSettingsGuide');
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
    var mount = document.getElementById('widgetSettingsSection');
    if (mount) renderWidgetSettings(mount);
  });
})(window);
