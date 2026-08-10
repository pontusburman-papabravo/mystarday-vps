/**
 * parental-gate.js — App-lås-PIN (förälder), INTE barn-PIN (Sprint 3b).
 * Kräver inloggad session (child eller parent cookie) + POST /api/family/verify-pin.
 */
(function () {
  'use strict';

  function showParentPinGate(onSuccess, onCancel) {
    const cancel = onCancel || function () {};
    const success = function () {
      if (window.DeviceMode) DeviceMode.enterParent();
      if (onSuccess) onSuccess(window._ppinGateToken);
    };

    if (
      window.AdultPrivilege
      && typeof AdultPrivilege.isFeatureEnabled === 'function'
      && AdultPrivilege.isFeatureEnabled()
      && typeof AdultPrivilege.requestEscalation === 'function'
    ) {
      AdultPrivilege.requestEscalation().then(function (result) {
        if (result && result.ok) {
          if (onSuccess) onSuccess();
          return;
        }
        if (result && result.code === 'BIOMETRIC_UNAVAILABLE') {
          AdultPrivilege.requestEscalation({ preferPin: true }).then(function (pinRes) {
            if (pinRes && pinRes.ok && onSuccess) onSuccess();
            else if (cancel) cancel();
          });
          return;
        }
        if (cancel) cancel();
      });
      return;
    }
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
    if (window.AdultPrivilege && typeof AdultPrivilege.refreshStatus === 'function') {
      AdultPrivilege.refreshStatus().then(function () {
        if (AdultPrivilege.isFeatureEnabled()) {
          AdultPrivilege.requestEscalation().then(function (result) {
            if (result && result.ok && onAllowed) onAllowed();
            else if (onCancel) onCancel();
          });
          return;
        }
        showParentPinGate(onAllowed, onCancel);
      });
      return;
    }
    showParentPinGate(onAllowed, onCancel);
  }

  window.ParentalGate = {
    show: showParentPinGate,
    requireParentMode: requireParentMode,
  };
})();
