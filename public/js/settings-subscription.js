/**
 * settings-subscription.js — Premium / prenumeration UI (legacy settings + Magic settings hub).
 * Copy follows the displayed family locale (settings.subscription.*). Swedish fallbacks
 * keep the card readable if I18n has not loaded yet.
 */
(function () {
  'use strict';

  function isNative() {
    return (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function currentLocale() {
    if (window.I18n) {
      if (typeof I18n.getCurrentLang === 'function') return I18n.getCurrentLang();
      if (typeof I18n.getLocale === 'function') return I18n.getLocale();
    }
    return 'sv-SE';
  }

  function t(key, fallback, params) {
    if (window.I18n && typeof I18n.t === 'function') {
      const translated = I18n.t(key, params || {});
      if (translated && translated !== key) return translated;
    }
    if (typeof fallback === 'string' && params) {
      return fallback.replace(/\{\{(\w+)\}\}/g, function (_, name) {
        return params[name] == null ? '' : String(params[name]);
      });
    }
    return fallback || key;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const locale = String(currentLocale()).toLowerCase().indexOf('en') === 0 ? 'en-GB' : 'sv-SE';
      return new Date(iso).toLocaleDateString(locale);
    } catch (_) {
      return iso;
    }
  }

  function describePremium(premium) {
    if (!premium || !premium.active) {
      return {
        title: t('settings.subscription.inactiveTitle', 'Ingen aktiv Premium'),
        body: t('settings.subscription.inactiveBody', 'Aktivera Premium för full tillgång till appen.'),
        cta: { href: '/paywall', label: t('settings.subscription.activateCta', 'Aktivera Premium') },
      };
    }
    if (premium.is_grandfathered) {
      return {
        title: t('settings.subscription.grandfatheredTitle', 'Premium ingår permanent'),
        body: t('settings.subscription.grandfatheredBody', 'Din familj har full tillgång utan kostnad.'),
        cta: null,
      };
    }
    if (premium.trial) {
      return {
        title: t('settings.subscription.trialTitle', 'Premium – gratis provperiod'),
        body: t('settings.subscription.trialEnds', 'Slutar {{date}}', { date: formatDate(premium.expires_at) }),
        cta: null,
      };
    }
    if (premium.source === 'gift') {
      return {
        title: t('settings.subscription.giftTitle', 'Premium – presentkort'),
        body: t('settings.subscription.validUntil', 'Gäller till {{date}}', { date: formatDate(premium.expires_at) }),
        cta: null,
      };
    }
    if (premium.status === 'grace_period') {
      const store = premium.store === 'google' ? 'Google Play' : 'App Store';
      return {
        title: t('settings.subscription.graceTitle', 'Premium – betalning behöver uppdateras'),
        body: t(
          'settings.subscription.graceBody',
          'Tillgången fungerar fortfarande, men betalningen behöver åtgärdas i {{store}}.',
          { store: store }
        ),
        cta: { href: '#manage-subscription', label: t('settings.subscription.manage', 'Hantera abonnemang') },
      };
    }
    const storeLabel = premium.store === 'google' ? 'Google Play' : 'Apple';
    const planLabel = premium.plan === 'yearly'
      ? t('settings.subscription.planYearly', 'årsabonnemang')
      : t('settings.subscription.planMonthly', 'månadsabonnemang');
    return {
      title: t('settings.subscription.planTitle', 'Premium – {{plan}} via {{store}}', {
        plan: planLabel,
        store: storeLabel,
      }),
      body: premium.expires_at
        ? t('settings.subscription.validUntil', 'Gäller till {{date}}', { date: formatDate(premium.expires_at) })
        : '',
      cta: { href: '#manage-subscription', label: t('settings.subscription.manage', 'Hantera abonnemang') },
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
      const copy = describePremium(premium);
      const nativePurchaseEligible = status.native_purchase_eligible === true;
      const billingUiEnabled = status.billing_ui_enabled === true;
      const nativeEligibleOnDevice = isNative() && nativePurchaseEligible
        && window.IAPManager && typeof IAPManager.init === 'function'
        && typeof IAPManager.canPurchase === 'function';
      let iapPurchaseReady = false;
      if (nativeEligibleOnDevice) {
        await IAPManager.init();
        iapPurchaseReady = IAPManager.canPurchase();
      }

      const heading = t('settings.subscription.heading', 'Prenumeration');
      let html =
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">' + heading + '</h3>' +
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

      if (iapPurchaseReady) {
        html +=
          '<div class="mt-4 flex flex-col gap-2">' +
          '<button type="button" id="restorePurchasesBtn" class="text-sm font-semibold text-navy underline text-left">' +
          t('settings.subscription.restore', 'Återställ köp') + '</button>' +
          '<button type="button" id="manageSubscriptionBtn" class="text-sm font-semibold text-navy underline text-left">' +
          t('settings.subscription.manage', 'Hantera abonnemang') + '</button>' +
          '</div>';
      } else if (!premium.active && billingUiEnabled && !isNative()) {
        html +=
          '<p class="text-sm text-text-soft mt-4">' +
          t('settings.subscription.webActivateHint', 'Premium aktiveras i iPhone- eller Android-appen.') + '</p>' +
          '<a href="/paywall" class="inline-flex mt-3 px-5 py-2.5 bg-navy text-white rounded-xl font-heading font-bold">' +
          t('settings.subscription.webActivateCta', 'Så här aktiverar du Premium') + '</a>';
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
          notify(t('settings.subscription.restoreSuccess', 'Köpet är återställt. Premium är aktivt.'), false);
          return;
        }
        notify(
          result.ok && !result.active
            ? t('settings.subscription.restoreNone', 'Inga köp hittades att återställa.')
            : t('settings.subscription.restoreFailed', 'Kunde inte återställa köp.'),
          true
        );
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
        '<h3 class="text-xl font-heading font-bold text-navy mb-2">' +
        t('settings.subscription.heading', 'Prenumeration') + '</h3>' +
        '<p class="text-sm text-text-soft">' +
        t('settings.subscription.loadError', 'Kunde inte ladda prenumerationsstatus.') + '</p>';
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
    document.addEventListener('parent-i18n-ready', function () {
      renderSubscription();
    });
    document.addEventListener('settings-parent-i18n-ready', function () {
      renderSubscription();
    });
    document.addEventListener('locale-changed', function () {
      renderSubscription();
    });
  }
})();
