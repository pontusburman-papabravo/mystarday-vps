/**
 * parental-gate.js — App-lås-PIN (förälder), INTE barn-PIN (Sprint 3b).
 * Kräver inloggad session (child eller parent cookie) + POST /api/family/verify-pin.
 */
(function () {
  'use strict';

  function showParentPinGate(onSuccess, onCancel) {
    var cancel = onCancel || function () {};
    var success = function () {
      if (window.DeviceMode) DeviceMode.enterParent();
      if (onSuccess) onSuccess(window._ppinGateToken);
    };

    if (typeof showParentPinGateOverlay === 'function') {
      showParentPinGateOverlay(success, cancel);
      return;
    }
    if (window.Auth && typeof Auth._showParentPinGateOverlay === 'function') {
      Auth._showParentPinGateOverlay(success, cancel);
      return;
    }
    if (window.DeviceMode && DeviceMode.isChildMode()) DeviceMode.enterParent();
    if (window.LoginMagic && typeof LoginMagic.showParentLogin === 'function') {
      LoginMagic.showParentLogin();
      return;
    }
    window.location.href = '/login';
  }

  /**
   * Om barnläge aktivt: visa PG innan vuxen-flöde. Annars kör onAllowed direkt.
   */
  function requireParentMode(onAllowed, onCancel) {
    if (!window.DeviceMode || !DeviceMode.isChildMode()) {
      if (onAllowed) onAllowed();
      return;
    }
    showParentPinGate(onAllowed, onCancel);
  }

  window.ParentalGate = {
    show: showParentPinGate,
    requireParentMode: requireParentMode,
  };
})();
