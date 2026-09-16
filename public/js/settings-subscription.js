/**
 * settings-subscription.js — Premium / prenumeration UI (legacy settings + Magic settings hub).
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
      const locale = (window.I18n && typeof I18n.getLocale === 'function')
        ? I18n.getLocale()
        : 'sv-SE';
      return new Date(iso).toLocaleDateString(locale === 'en-GB' ? 'en-GB' : 'sv-SE');
    } catch (_) {
      return iso;
    }
  }

  function spt(key, params) {
    if (typeof window.pt === 'function') return window.pt(key, params);
    if (window.I18n && typeof I18n.t === 'function') return I18n.t(key, params);
    return key;
  }

  function describePremium(premium, paidTransition, billingUiEnabled, nativePurchaseEligible) {
    const transition = paidTransition || {};
    if (premium && premium.source === 'prebilling') {
      const cutoff = formatDate(transition.cutoff_at || premium.expires_at);
      if (transition.kind === 'hold') {
        return {
          title: spt('settings.subscription.launchHoldTitle'),
          body: spt('settings.subscription.launchHoldBody'),
          cta: null,
        };
      }
      return {
        title: spt('settings.subscription.launchTitle'),
        body: cutoff
          ? spt('settings.subscription.launchBodyUntil', { date: cutoff })
          : spt('settings.subscription.launchBody'),
        cta: null,
      };
    }
    if (!premium || !premium.active) {
      if (nativePurchaseEligible === true) {
        return {
          title: spt('settings.subscription.noPremium'),
          body: spt('settings.subscription.choosePlan'),
          cta: { href: '/paywall', label: spt('settings.subscription.activate') },
        };
      }
      if (billingUiEnabled !== true) {
        return {
          title: spt('settings.subscription.noPremium'),
          body: spt('settings.subscription.billingNotLive'),
          cta: null,
        };
      }
      return {
        title: spt('settings.subscription.noPremium'),
        body: spt('settings.subscription.activateBody'),
        cta: { href: '/paywall', label: spt('settings.subscription.activate') },
      };
    }
    if (premium.is_grandfathered) {
      return {
        title: spt('settings.subscription.grandfatheredTitle'),
        body: spt('settings.subscription.grandfatheredBody'),
        cta: null,
      };
    }
    if (premium.trial) {
      return {
        title: spt('settings.subscription.trialTitle'),
        body: spt('settings.subscription.ends', { date: formatDate(premium.expires_at) }),
        cta: null,
      };
    }
    if (premium.source === 'gift') {
      return {
        title: spt('settings.subscription.giftTitle'),
        body: spt('settings.subscription.validUntil', { date: formatDate(premium.expires_at) }),
        cta: null,
      };
    }
    if (premium.status === 'grace_period') {
      const store = premium.store === 'google' ? 'Google Play' : 'App Store';
      return {
        title: spt('settings.subscription.graceTitle'),
        body: spt('settings.subscription.graceBody', { store: store }),
        cta: { href: '#manage-subscription', label: spt('settings.subscription.manage') },
      };
    }
    const storeLabel = premium.store === 'google' ? 'Google Play' : 'Apple';
    const planLabel = premium.plan === 'yearly'
      ? spt('settings.subscription.planYearly')
      : spt('settings.subscription.planMonthly');
    return {
      title: spt('settings.subscription.activeTitle', { plan: planLabel, store: storeLabel }),
      body: premium.expires_at ? spt('settings.subscription.validUntil', { date: formatDate(premium.expires_at) }) : '',
      cta: { href: '#manage-subscription', label: spt('settings.subscription.manage') },
    };
  }

  /**
   * Branded toast feedback (see toast.js) instead of a bare browser alert() —
   * falls back to alert() only if toast.js hasn't been loaded on the page.
   */
  function notify(msg, isError) {
    if (isError && typeof window.showToast === 'function') {
      window.showToast(msg, true);
      return;
    }
    if (!isError && typeof window.showSuccessToast === 'function') {
      window.showSuccessToast(msg);
      return;
    }
    alert(msg);
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

  function resolveMount(mountEl) {
    if (mountEl) return mountEl;
    return document.getElementById('subscriptionMount');
  }

  async function renderSubscription(mountEl) {
    const mount = resolveMount(mountEl);
    if (!mount) return { visible: false };

    try {
      const status = await Auth.api('/api/subscription/status');
      if (status.subscription_ui_visible !== true) {
        mount.innerHTML = '';
        const section = mount.closest('section');
        if (section) section.classList.add('hidden');
        return { visible: false, status: status };
      }

      const section = mount.closest('section');
      if (section) section.classList.remove('hidden');

      const premium = status.premium || {};
      const nativePurchaseEligible = status.native_purchase_eligible === true;
      const nativeRestoreEligible = status.native_restore_eligible === true;
      const copy = describePremium(
        premium,
        status.paid_transition,
        status.billing_ui_enabled,
        nativePurchaseEligible
      );
      const billingUiEnabled = status.billing_ui_enabled === true;
      const nativeSdkOnDevice = isNative() && (nativePurchaseEligible || nativeRestoreEligible)
        && window.IAPManager && typeof IAPManager.init === 'function';
      let iapPurchaseReady = false;
      let iapRestoreReady = false;
      if (nativeSdkOnDevice) {
        await IAPManager.init();
        if (typeof IAPManager.canPurchase === 'function') {
          iapPurchaseReady = IAPManager.canPurchase();
        }
        if (typeof IAPManager.canRestore === 'function') {
          iapRestoreReady = IAPManager.canRestore();
        }
      }

      let html =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">' + spt('settings.subscription.title') + '</h3>' +
        '<p class="text-sm font-semibold text-navy mb-1">' + copy.title + '</p>' +
        '<p class="text-sm text-text-soft mb-4">' + copy.body + '</p>';

      // The iapPurchaseReady block below already renders its own "Hantera abonnemang"
      // button (manageSubscriptionBtn). Skip the primary CTA link when it would be
      // the exact same action, otherwise "Hantera abonnemang" renders twice for every
      // active native subscription (discovered during App Store sandbox E2E testing).
      const ctaDuplicatesManageButton = iapPurchaseReady && copy.cta && copy.cta.href === '#manage-subscription';
      if (copy.cta && !ctaDuplicatesManageButton) {
        html +=
          '<a href="' + copy.cta.href + '" id="subscriptionPrimaryCta" ' +
          'class="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">' +
          copy.cta.label + '</a>';
      }

      if (iapPurchaseReady || iapRestoreReady) {
        html += '<div class="mt-4 flex flex-col gap-2">';
        if (iapRestoreReady) {
          html +=
            '<button type="button" id="restorePurchasesBtn" class="text-sm font-semibold text-navy underline text-left">' +
            spt('settings.subscription.restore') + '</button>';
        }
        if (iapPurchaseReady && premium.active) {
          html +=
            '<button type="button" id="manageSubscriptionBtn" class="text-sm font-semibold text-navy underline text-left">' +
            spt('settings.subscription.manage') + '</button>';
        }
        html += '</div>';
      } else if (!premium.active && billingUiEnabled && !isNative()) {
        html +=
          '<p class="text-sm text-text-soft mt-4">' + spt('settings.subscription.webActivateHint') + '</p>' +
          '<a href="/paywall" class="inline-flex mt-3 px-5 py-2.5 bg-navy text-white rounded-xl font-heading font-bold">' +
          spt('settings.subscription.howToActivate') + '</a>';
      }

      mount.innerHTML = html;

      document.getElementById('restorePurchasesBtn')?.addEventListener('click', async function () {
        await IAPManager.init();
        const result = await IAPManager.restorePurchases();
        if (result.ok && result.active) {
          await Auth.api('/api/iap/sync', { method: 'POST', body: JSON.stringify({}) }).catch(function () {});
          await renderSubscription(mount);
          // Restoring while Premium is already active leaves the card looking
          // unchanged — without this, the button appears to do nothing.
          notify(spt('settings.subscription.restoreSuccess'), false);
          return;
        }
        notify(result.ok && !result.active
          ? spt('settings.subscription.restoreNone')
          : spt('settings.subscription.restoreFailed'), true);
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

      return { visible: true, status: status };
    } catch (err) {
      mount.innerHTML =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">' + spt('settings.subscription.title') + '</h3>' +
        '<p class="text-sm text-text-soft">' + spt('settings.subscription.loadFailed') + '</p>';
      console.error('[settings-subscription]', err);
      return { visible: true, error: err };
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

  window.SettingsSubscription = {
    describePremium: describePremium,
    render: renderSubscription,
  };

  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        renderSubscription();
        scrollToHash();
      });
    } else {
      renderSubscription();
      scrollToHash();
    }
  }
})();
