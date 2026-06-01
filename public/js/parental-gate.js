/**
 * parental-gate.js — App-lås-PIN (förälder), INTE barn-PIN (Sprint 3b).
 * Kräver inloggad session (child eller parent cookie) + POST /api/family/verify-pin.
 */
(function () {
  'use strict';

  function showParentPinGate(onSuccess, onCancel) {
    if (typeof showParentPinGateOverlay === 'function') {
      showParentPinGateOverlay(function () {
        if (window.DeviceMode) DeviceMode.enterParent();
        if (onSuccess) onSuccess(window._ppinGateToken);
      }, onCancel || function () {});
      return;
    }
    if (window.confirm('Föräldralås kräver PIN — logga in som vuxen på inställningar.')) {
      window.location.href = '/login';
    }
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
