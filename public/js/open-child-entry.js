/**
 * open-child-entry.js — semantic /open/child landing (native deep link + web fallback).
 * Delegates child entry to AppEntryOrchestrator / TrustedDeviceBootstrap only.
 */
(function () {
  'use strict';

  function isNativeApp() {
    return (
      typeof window.Platform !== 'undefined'
      && typeof Platform.isNative === 'function'
      && Platform.isNative()
    );
  }

  function showFallback() {
    var loading = document.getElementById('openChildLoading');
    var fallback = document.getElementById('openChildFallback');
    if (loading) loading.classList.add('hidden');
    if (fallback) fallback.classList.remove('hidden');
  }

  function showError(message) {
    var el = document.getElementById('openChildError');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  async function tryChildEntry() {
    try {
      window.__DEFER_SESSION_GATE_FOR_ENTRY__ = true;
    } catch (_) { /* ignore */ }

    if (window.AppEntryOrchestrator
      && typeof AppEntryOrchestrator.redirectAuthoritativeEntryOrLegacy === 'function') {
      var orch = await AppEntryOrchestrator.redirectAuthoritativeEntryOrLegacy({
        source: 'open_child_semantic_link',
      });
      if (orch && orch.handled && orch.code !== 'ORCHESTRATOR_OFF') {
        return true;
      }
    }

    if (window.TrustedDeviceBootstrap
      && typeof TrustedDeviceBootstrap.tryColdStart === 'function') {
      var td = await TrustedDeviceBootstrap.tryColdStart({
        source: 'open_child_semantic_link',
      });
      if (td && td.ok) return true;
    }

    return false;
  }

  async function beginWebChildEntry() {
    var btn = document.getElementById('openChildContinueBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Öppnar…';
    }
    var ok = await tryChildEntry();
    if (!ok) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Fortsätt i webbläsaren';
      }
      showError('Kunde inte öppna barnupplevelsen här. Prova appen eller logga in som förälder först.');
    }
    return ok;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var continueBtn = document.getElementById('openChildContinueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', function () {
        beginWebChildEntry();
      });
    }

    if (isNativeApp()) {
      var nativeOk = await tryChildEntry();
      if (!nativeOk) showFallback();
      return;
    }

    showFallback();
  });
})();
