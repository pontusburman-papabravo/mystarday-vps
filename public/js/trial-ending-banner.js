/**
 * Parent Hem banner when a product trial has one day left.
 * Server sets trial_ending_notice. Intro year and grandfather never match.
 * Choice stays in the app (/paywall). Not a modal.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'trial_ending_banner_dismissed';

  function isDismissed(expiresAt) {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === String(expiresAt || '');
    } catch (_) {
      return false;
    }
  }

  function dismiss(expiresAt) {
    var el = document.getElementById('trialEndingBanner');
    if (el) el.classList.add('hidden');
    try {
      sessionStorage.setItem(DISMISS_KEY, String(expiresAt || ''));
    } catch (_) {}
  }

  function render(status) {
    var el = document.getElementById('trialEndingBanner');
    if (!el || !status || status.trial_ending_notice !== true) return;
    var premium = status.premium || {};
    if (isDismissed(premium.expires_at)) return;

    var title = el.querySelector('[data-trial-ending-title]');
    var body = el.querySelector('[data-trial-ending-body]');
    if (title) title.textContent = 'En dag kvar av provperioden';
    if (body) {
      body.textContent = 'Provperioden tar slut inom ett dygn. Välj abonnemang i appen om ni vill behålla full tillgång. All er data finns kvar.';
    }
    el.classList.remove('hidden');

    var closeBtn = el.querySelector('[data-trial-ending-close]');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', function () {
        dismiss(premium.expires_at);
      });
    }
  }

  async function init() {
    if (!window.Auth || typeof Auth.api !== 'function') return;
    var user = typeof Auth.getUser === 'function' ? Auth.getUser() : null;
    if (user && user.type === 'child') return;
    try {
      var status = await Auth.api('/api/subscription/status');
      render(status);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
