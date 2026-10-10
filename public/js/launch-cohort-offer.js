/**
 * Register-page notice for the first-25 offer.
 * The notice appears only when the server says show === true.
 * Remaining places are printed only when the server sends an integer.
 */
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch];
    });
  }

  function currentLocale() {
    if (window.I18n && typeof I18n.getLocale === 'function' && I18n.getLocale()) {
      return I18n.getLocale();
    }
    return document.documentElement.lang || 'en-GB';
  }

  function hide(mount) {
    mount.hidden = true;
    mount.classList.add('hidden');
    mount.innerHTML = '';
  }

  async function refresh() {
    const mount = document.getElementById('launchCohortOffer');
    if (!mount) return;
    const select = document.getElementById('countryChoiceSelect');
    const code = select && select.value ? String(select.value).trim() : '';
    if (!code) {
      hide(mount);
      return;
    }
    try {
      const url = '/api/market/launch-cohort-offer?country_code='
        + encodeURIComponent(code)
        + '&locale='
        + encodeURIComponent(currentLocale());
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('offer');
      const body = await res.json();
      if (!body || body.show !== true || !body.copy) {
        hide(mount);
        return;
      }
      const copy = body.copy;
      const parts = [
        '<p class="font-semibold">' + escapeHtml(copy.headline) + '</p>',
        '<p class="mt-2">' + escapeHtml(copy.duration) + '</p>',
        '<p class="mt-2">' + escapeHtml(copy.no_payment_method) + ' ' + escapeHtml(copy.no_auto_charge) + '</p>',
        '<p class="mt-2">' + escapeHtml(copy.after) + '</p>',
      ];
      if (Number.isInteger(body.slots_remaining) && copy.remaining) {
        parts.push('<p class="mt-2 font-semibold">' + escapeHtml(copy.remaining) + '</p>');
      }
      mount.innerHTML = parts.join('');
      mount.hidden = false;
      mount.classList.remove('hidden');
    } catch (_) {
      hide(mount);
    }
  }

  document.addEventListener('country-choice-confirmed', refresh);
  document.addEventListener('change', function (event) {
    if (event.target && event.target.id === 'countryChoiceSelect') refresh();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
