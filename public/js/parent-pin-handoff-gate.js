/**
 * parent-pin-handoff-gate.js — Require adult PIN before shared-device child handoff.
 * Uses canonical POST /api/family/set-pin (no parallel PIN system).
 */
(function () {
  'use strict';

  var _hasPinCache = null;
  var _fetchPromise = null;

  function ot(key, params) {
    return window.ot ? window.ot(key, params) : key;
  }

  function usageRequiresParentPin(usage) {
    return usage === 'shared_with_children' || usage === 'child_device';
  }

  function invalidateCache() {
    _hasPinCache = null;
    _fetchPromise = null;
  }

  async function fetchHasParentPin() {
    if (_hasPinCache !== null) return _hasPinCache;
    if (_fetchPromise) return _fetchPromise;
    _fetchPromise = (async function () {
      try {
        if (!window.apiFetch) return false;
        const res = await window.apiFetch('/api/family/parent-pin-status');
        if (!res.ok) return false;
        const data = await res.json();
        return data.has_pin === true;
      } catch (_) {
        return false;
      } finally {
        _fetchPromise = null;
      }
    })();
    const hasPin = await _fetchPromise;
    _hasPinCache = hasPin;
    return hasPin;
  }

  async function saveParentPin(pin, confirmPin) {
    const res = await window.apiFetch('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: pin, confirmPin: confirmPin }),
    });
    if (res.ok) {
      _hasPinCache = true;
    }
    return res;
  }

  function readPinDigits(prefix) {
    return [1, 2, 3, 4].map(function (i) {
      return (document.getElementById(prefix + i)?.value || '').trim();
    }).join('');
  }

  function wirePinDigits(ids) {
    ids.forEach(function (id, i) {
      const input = document.getElementById(id);
      if (!input || input.dataset.ppGateWired) return;
      input.dataset.ppGateWired = '1';
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && i < ids.length - 1) {
          document.getElementById(ids[i + 1]).focus();
        }
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && i > 0) {
          document.getElementById(ids[i - 1]).focus();
        }
      });
    });
  }

  function clearPinDigits(prefixes) {
    prefixes.forEach(function (prefix) {
      [1, 2, 3, 4].forEach(function (i) {
        const el = document.getElementById(prefix + i);
        if (el) el.value = '';
      });
    });
  }

  function showModal(message) {
    return new Promise(function (resolve) {
      if (document.getElementById('parentPinHandoffGateModal')) {
        resolve(false);
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'parentPinHandoffGateModal';
      overlay.className = 'fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-navy/60 p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'parentPinHandoffGateTitle');

      overlay.innerHTML =
        '<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl safe-area-bottom">' +
        '<h2 id="parentPinHandoffGateTitle" class="text-lg font-heading font-bold text-navy mb-2">' +
        (window.escapeHtml ? window.escapeHtml(ot('onboarding.parentPin.title')) : ot('onboarding.parentPin.title')) +
        '</h2>' +
        '<p class="text-sm text-text-soft mb-4 leading-relaxed">' +
        (window.escapeHtml ? window.escapeHtml(message || ot('onboarding.parentPin.handoffRequired')) : (message || ot('onboarding.parentPin.handoffRequired'))) +
        '</p>' +
        '<p class="text-sm font-semibold text-navy mb-2">' + (window.escapeHtml ? window.escapeHtml(ot('onboarding.parentPin.choosePin')) : ot('onboarding.parentPin.choosePin')) + '</p>' +
        '<div class="pin-input-group mb-3">' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateD1" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateD2" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateD3" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateD4" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '</div>' +
        '<p class="text-sm font-semibold text-navy mb-2">' + (window.escapeHtml ? window.escapeHtml(ot('onboarding.parentPin.confirmPin')) : ot('onboarding.parentPin.confirmPin')) + '</p>' +
        '<div class="pin-input-group mb-2">' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateC1" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateC2" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateC3" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '<input type="tel" maxlength="1" class="pin-digit" id="ppGateC4" inputmode="numeric" pattern="[0-9]" autocomplete="off" />' +
        '</div>' +
        '<div id="parentPinHandoffGateError" class="hidden error-box text-xs mb-3"></div>' +
        '<button type="button" id="parentPinHandoffGateSave" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 rounded-xl min-h-[44px]">' +
        (window.escapeHtml ? window.escapeHtml(ot('onboarding.parentPin.saveAndContinue')) : ot('onboarding.parentPin.saveAndContinue')) +
        '</button>' +
        '<button type="button" id="parentPinHandoffGateCancel" class="w-full text-sm font-semibold text-text-soft hover:text-navy py-2 mt-2 min-h-[44px]">' +
        (window.escapeHtml ? window.escapeHtml(ot('onboarding.common.cancel')) : ot('onboarding.common.cancel')) +
        '</button>' +
        '</div>';

      document.body.appendChild(overlay);
      wirePinDigits(['ppGateD1', 'ppGateD2', 'ppGateD3', 'ppGateD4']);
      wirePinDigits(['ppGateC1', 'ppGateC2', 'ppGateC3', 'ppGateC4']);

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      overlay.querySelector('#parentPinHandoffGateCancel').addEventListener('click', function () {
        close(false);
      });

      overlay.querySelector('#parentPinHandoffGateSave').addEventListener('click', async function () {
        const errorEl = overlay.querySelector('#parentPinHandoffGateError');
        const pin = readPinDigits('ppGateD');
        const confirm = readPinDigits('ppGateC');
        if (errorEl) errorEl.classList.add('hidden');

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          if (errorEl) {
            errorEl.textContent = ot('onboarding.parentPin.pinRequiredForHandoff');
            errorEl.classList.remove('hidden');
          }
          return;
        }
        if (pin !== confirm) {
          if (errorEl) {
            errorEl.textContent = ot('onboarding.parentPin.pinMismatch');
            errorEl.classList.remove('hidden');
          }
          return;
        }

        const btn = overlay.querySelector('#parentPinHandoffGateSave');
        btn.disabled = true;
        try {
          const res = await saveParentPin(pin, confirm);
          if (!res.ok) {
            const data = await res.json().catch(function () { return {}; });
            if (errorEl) {
              errorEl.textContent = data.error || ot('onboarding.parentPin.saveFailed');
              errorEl.classList.remove('hidden');
            }
            btn.disabled = false;
            return;
          }
          close(true);
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = err.message || ot('onboarding.parentPin.saveFailed');
            errorEl.classList.remove('hidden');
          }
          btn.disabled = false;
        }
      });

      const first = overlay.querySelector('#ppGateD1');
      if (first) first.focus();
    });
  }

  function prepareOnboardingStep6PinBlock() {
    const block = document.getElementById('onboardingParentPinBlock');
    const laterLink = document.getElementById('showParentPinLink');
    if (!block) return;
    block.classList.remove('hidden');
    if (laterLink) laterLink.classList.add('hidden');
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function ensureOnboardingStep6PinSaved() {
    const block = document.getElementById('onboardingParentPinBlock');
    if (!block) return showModal();
    prepareOnboardingStep6PinBlock();

    const pin = readPinDigits('ppObD');
    const confirm = readPinDigits('ppObC');
    const errorEl = document.getElementById('onboardingParentPinError');

    if (errorEl) errorEl.classList.add('hidden');

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      if (errorEl) {
        errorEl.textContent = ot('onboarding.parentPin.pinRequiredForHandoff');
        errorEl.classList.remove('hidden');
      }
      return false;
    }
    if (pin !== confirm) {
      if (errorEl) {
        errorEl.textContent = ot('onboarding.parentPin.pinMismatch');
        errorEl.classList.remove('hidden');
      }
      return false;
    }

    try {
      const res = await saveParentPin(pin, confirm);
      if (!res.ok) {
        const data = await res.json().catch(function () { return {}; });
        if (errorEl) {
          errorEl.textContent = data.error || ot('onboarding.parentPin.saveFailed');
          errorEl.classList.remove('hidden');
        }
        return false;
      }
      return true;
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || ot('onboarding.parentPin.saveFailed');
        errorEl.classList.remove('hidden');
      }
      return false;
    }
  }

  /**
   * @param {{ usage?: string, childHandoff?: boolean, preferOnboardingBlock?: boolean }} [opts]
   * @returns {Promise<boolean>}
   */
  async function ensureBeforeChildHandoff(opts) {
    opts = opts || {};
    if (opts.usage && !usageRequiresParentPin(opts.usage)) {
      return true;
    }
    if (await fetchHasParentPin()) {
      return true;
    }

    if (opts.preferOnboardingBlock && document.getElementById('onboardingParentPinBlock')) {
      return ensureOnboardingStep6PinSaved();
    }

    if (document.getElementById('step6') && document.getElementById('step6').classList.contains('active')) {
      return ensureOnboardingStep6PinSaved();
    }

    return showModal();
  }

  async function prepareOnboardingHandoffStep(stepNumber) {
    if (stepNumber !== 6 && stepNumber !== 5) return;
    if (await fetchHasParentPin()) return;
    if (stepNumber === 6) {
      prepareOnboardingStep6PinBlock();
    }
  }

  window.ParentPinHandoffGate = {
    usageRequiresParentPin: usageRequiresParentPin,
    fetchHasParentPin: fetchHasParentPin,
    invalidateCache: invalidateCache,
    ensureBeforeChildHandoff: ensureBeforeChildHandoff,
    prepareOnboardingHandoffStep: prepareOnboardingHandoffStep,
    prepareOnboardingStep6PinBlock: prepareOnboardingStep6PinBlock,
    showModal: showModal,
  };
})();
