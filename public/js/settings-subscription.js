/**
 * settings-subscription.js — Prenumeration section on /settings#prenumeration (PAYMENTS V1).
 */
(function () {
  'use strict';

  function isNative() {
    return (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('sv-SE');
    } catch (_) {
      return iso;
    }
  }

  function describePremium(premium) {
    if (!premium || !premium.active) {
      return {
        title: 'Ingen aktiv Premium',
        body: 'Aktivera Premium för full tillgång till appen.',
        cta: { href: '/paywall', label: 'Aktivera Premium' },
      };
    }
    if (premium.is_grandfathered) {
      return { title: 'Premium permanent', body: 'Er familj har permanent Premium.', cta: null };
    }
    if (premium.trial) {
      return {
        title: 'Premium – gratis provperiod',
        body: 'Slutar ' + formatDate(premium.expires_at),
        cta: null,
      };
    }
    if (premium.source === 'gift') {
      return {
        title: 'Premium – presentkort',
        body: 'Gäller till ' + formatDate(premium.expires_at),
        cta: null,
      };
    }
    if (premium.status === 'grace_period') {
      return {
        title: 'Premium – betalning behöver uppdateras',
        body: 'Tillgången fungerar fortfarande, men betalningen behöver åtgärdas i ' +
          (premium.store === 'google' ? 'Google Play' : 'App Store') + '.',
        cta: { href: '#manage-subscription', label: 'Hantera abonnemang' },
      };
    }
    const storeLabel = premium.store === 'google' ? 'Google Play' : 'Apple';
    const planLabel = premium.plan === 'yearly' ? 'årsabonnemang' : 'månadsabonnemang';
    return {
      title: 'Premium – ' + planLabel + ' via ' + storeLabel,
      body: premium.expires_at ? ('Gäller till ' + formatDate(premium.expires_at)) : '',
      cta: { href: '#manage-subscription', label: 'Hantera abonnemang' },
    };
  }

  async function openManageSubscription() {
    if (!window.IAPManager) return;
    await IAPManager.init();
    const purchases = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Purchases;
    if (purchases && purchases.showManageSubscriptions) {
      await purchases.showManageSubscriptions();
      return;
    }
    if (window.Platform && Platform.getPlatform && Platform.getPlatform() === 'android') {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    } else {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    }
  }

  async function renderSubscription() {
    const mount = document.getElementById('subscriptionMount');
    if (!mount) return;

    try {
      const status = await Auth.api('/api/subscription/status');
      const premium = status.premium || {};
      const copy = describePremium(premium);

      let html =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">Prenumeration</h3>' +
        '<p class="text-sm font-semibold text-navy mb-1">' + copy.title + '</p>' +
        '<p class="text-sm text-text-soft mb-4">' + copy.body + '</p>';

      if (copy.cta) {
        html +=
          '<a href="' + copy.cta.href + '" id="subscriptionPrimaryCta" ' +
          'class="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">' +
          copy.cta.label + '</a>';
      }

      if (isNative() && window.IAPManager && IAPManager.canPurchase && IAPManager.canPurchase()) {
        html +=
          '<div class="mt-4 flex flex-col gap--2">' +
          '<button type="button" id="restorePurchasesBtn" class="text-sm font-semibold text-navy underline text-left">Återställ köp</button>' +
          '<button type="button" id="manageSubscriptionBtn" class="text-sm font-semibold text-navy underline text-left">Hantera abonnemang</button>' +
          '</div>';
      } else if (!premium.active) {
        html +=
          '<p class="text-sm text-text-soft mt-4">Premium aktiveras i iPhone- eller Android-appen.</p>' +
          '<a href="/paywall" class="inline-flex mt-3 px-5 py-2.5 bg-navy text-white rounded-xl font-heading font-bold">Så här aktiverar du Premium</a>';
      }

      mount.innerHTML = html;

      document.getElementById('restorePurchasesBtn')?.addEventListener('click', async function () {
        const result = await IAPManager.restorePurchases();
        if (result.ok && result.active) {
          await Auth.api('/api/iap/sync', { method: 'POST', body: JSON.stringify({}) }).catch(function () {});
          await renderSubscription();
          return;
        }
        alert(result.ok && !result.active ? 'Inga köp hittades att återställa.' : 'Kunde inte återställa köp.');
      });
      document.getElementById('manageSubscriptionBtn')?.addEventListener('click', function () {
        openManageSubscription().catch(function () {});
      });
      document.getElementById('subscriptionPrimaryCta')?.addEventListener('click', function (ev) {
        if (this.getAttribute('href') === '#manage-subscription') {
          ev.preventDefault();
          openManageSubscription().catch(function () {});
        }
      });
    } catch (err) {
      mount.innerHTML =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">Prenumeration</h3>' +
        '<p class="text-sm text-text-soft">Kunde inte ladda prenumerationsstatus.</p>';
      console.error('[settings-subscription]', err);
    }
  }

  function scrollToHash() {
    if (window.location.hash !== '#prenumeration') return;
    const el = document.getElementById('prenumeration');
    if (el) {
      setTimeout(function () {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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
