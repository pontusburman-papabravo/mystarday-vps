/**
 * settings-subscription.js — Prenumeration section on /settings#prenumeration (vuxenmeny v2 Sprint 4).
 */
(function () {
  'use strict';

  function tierLabel(tier) {
    if (tier === 'lifetime_free') return 'Livstidsåtkomst';
    if (tier === 'trial') return 'Provperiod';
    if (tier === 'paid') return 'Aktiv prenumeration';
    return 'Prenumeration';
  }

  function tierDescription(status) {
    if (status.tier === 'lifetime_free') {
      return 'Er familj har full tillgång utan kostnad.';
    }
    if (status.tier === 'trial') {
      if (status.trial_expired) {
        return 'Provperioden har gått ut. Välj ett paket för att fortsätta.';
      }
      var days = status.trial_days_remaining;
      if (days != null && days <= 7) {
        return 'Provperioden slutar om ' + days + ' dag' + (days === 1 ? '' : 'ar') + '.';
      }
      if (days != null) {
        return 'Provperiod: ' + days + ' dagar kvar.';
      }
      return 'Ni har en aktiv provperiod.';
    }
    if (status.tier === 'paid') {
      return 'Tack för att ni använder appen!';
    }
    return 'Hantera er familjs tillgång till appen.';
  }

  async function renderSubscription() {
    var mount = document.getElementById('subscriptionMount');
    if (!mount) return;

    var isNative =
      (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
    if (isNative) {
      mount.innerHTML =
        '<p class="text-sm text-text-soft">Prenumeration hanteras via webbläsaren (inte i appen).</p>';
      return;
    }

    try {
      var status = await Auth.api('/api/subscription/status');
      var html =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">Prenumeration</h3>' +
        '<p class="text-sm font-semibold text-navy mb-1">' + tierLabel(status.tier) + '</p>' +
        '<p class="text-sm text-text-soft mb-4">' + tierDescription(status) + '</p>';

      if (status.tier === 'trial' && !status.trial_expired && status.payment_enabled) {
        html +=
          '<a href="/pricing-info" class="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">' +
          'Se paket och priser</a>';
      } else if (status.tier !== 'lifetime_free' && status.payment_enabled) {
        html +=
          '<a href="/pricing-info" class="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-soft text-white rounded-xl font-heading font-bold transition-colors">' +
          'Hantera prenumeration</a>';
      }

      if (window.fetchPackageAccess) {
        try {
          var access = await window.fetchPackageAccess();
          if (access && access.rollout_mode && access.rollout_mode !== 'off') {
            html +=
              '<p class="text-sm text-text-soft mt-4">' +
              '<a href="/pricing-info" class="text-gold font-semibold underline">Kommande paket och förhandsvisningar →</a>' +
              '</p>';
          }
        } catch (_) { /* optional */ }
      }

      mount.innerHTML = html;
    } catch (err) {
      mount.innerHTML =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">Prenumeration</h3>' +
        '<p class="text-sm text-text-soft">Kunde inte ladda prenumerationsstatus.</p>';
      console.error('[settings-subscription]', err);
    }
  }

  function scrollToHash() {
    if (window.location.hash === '#prenumeration') {
      var el = document.getElementById('prenumeration');
      if (el) {
        setTimeout(function () {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderSubscription();
      scrollToHash();
    });
  } else {
    renderSubscription();
    scrollToHash();
  }
})();
