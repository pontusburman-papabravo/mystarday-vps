/**
 * billing-ui.js — Client-side billing UI gate (vuxenmeny v2.3).
 * Uses /api/subscription/status.billing_ui_enabled when available.
 */
(function () {
  'use strict';

  let _enabled = null;

  async function refresh() {
    try {
      const status = await Auth.api('/api/subscription/status');
      _enabled = status.billing_ui_enabled === true;
    } catch (_) {
      _enabled = false;
    }
    return _enabled;
  }

  function isEnabled() {
    return _enabled === true;
  }

  window.BillingUi = {
    refresh: refresh,
    isEnabled: isEnabled,
  };
})();
