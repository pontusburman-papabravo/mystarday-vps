/**
 * adult-biometric-client.js — thin wrapper over Capacitor AdultBiometric (no credentials in JS).
 */
(function () {
  'use strict';

  function getPlugin() {
    const Cap = window.Capacitor;
    if (typeof Cap === 'undefined' || !Cap.isNativePlatform || !Cap.isNativePlatform()) {
      return null;
    }
    if (Cap.Plugins && Cap.Plugins.AdultBiometric) {
      return Cap.Plugins.AdultBiometric;
    }
    return null;
  }

  function isAvailable() {
    const plugin = getPlugin();
    if (!plugin) {
      return Promise.resolve({ available: false, platform: 'web', reason: 'web_unavailable' });
    }
    return plugin.isAvailable().catch(function () {
      return { available: false, platform: 'native', reason: 'plugin_error' };
    });
  }

  function authenticate(options) {
    const plugin = getPlugin();
    if (!plugin) {
      return Promise.reject(new Error('BIOMETRIC_UNAVAILABLE'));
    }
    const reason = (options && options.reason) || 'Bekräfta att du är vuxen';
    return plugin.authenticate({ reason: reason });
  }

  window.AdultBiometricClient = {
    isAvailable: isAvailable,
    authenticate: authenticate,
  };
})();
