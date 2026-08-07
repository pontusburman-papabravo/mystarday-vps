import { registerPlugin } from '@capacitor/core';

class WidgetBridgeWeb {
  configureBinding() {
    return Promise.resolve({ ok: true, platform: 'web' });
  }
  refreshAll() {
    return Promise.resolve({ ok: true });
  }
  clearBindings() {
    return Promise.resolve({ ok: true });
  }
  notifyChildChanged() {
    return Promise.resolve({ ok: true });
  }
  getStatus() {
    return Promise.resolve({
      hasBinding: false,
      platform: 'web',
      installationId: null,
      activeChildId: null,
      viewerMode: null,
      privacyMode: null,
      lastRefreshAt: null,
    });
  }
}

export const WidgetBridge = registerPlugin('WidgetBridge', {
  web: () => Promise.resolve(new WidgetBridgeWeb()),
});
