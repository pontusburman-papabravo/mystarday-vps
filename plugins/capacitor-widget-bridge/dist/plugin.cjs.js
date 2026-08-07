'use strict';

var core = require('@capacitor/core');

const WidgetBridge = core.registerPlugin('WidgetBridge', {
  web: function () {
    return Promise.resolve().then(function () { return new WidgetBridgeWeb(); });
  },
});

function WidgetBridgeWeb() {}

WidgetBridgeWeb.prototype.configureBinding = function () {
  return Promise.resolve({ ok: true, platform: 'web' });
};
WidgetBridgeWeb.prototype.refreshAll = function () {
  return Promise.resolve({ ok: true });
};
WidgetBridgeWeb.prototype.clearBindings = function () {
  return Promise.resolve({ ok: true });
};
WidgetBridgeWeb.prototype.notifyChildChanged = function () {
  return Promise.resolve({ ok: true });
};
WidgetBridgeWeb.prototype.getStatus = function () {
  return Promise.resolve({
    hasBinding: false,
    platform: 'web',
    installationId: null,
    activeChildId: null,
    viewerMode: null,
    privacyMode: null,
    lastRefreshAt: null,
  });
};

module.exports = { WidgetBridge };
