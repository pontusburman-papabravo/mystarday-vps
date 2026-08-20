(function () {
  'use strict';

  function isNative() {
    return (typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) ||
      (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  }

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function setStatus(msg, isError) {
    var el = document.getElementById('paywallStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('text-red-600', !!isError);
    el.classList.toggle('text-navy', !isError);
    show(el);
  }

  async function syncBackendFromCustomerInfo(customerInfo) {
    if (!customerInfo || !window.Auth || !Auth.api) return;
    var entId = 'basic';
    var ent = customerInfo.entitlements && customerInfo.entitlements.active && customerInfo.entitlements.active[entId];
    if (!ent) {
      await Auth.api('/api/iap/sync', {
        method: 'POST',
        body: JSON.stringify({ expirationAtMs: Date.now() - 1000 }),
      }).catch(function () {});
      return;
    }
    await Auth.api('/api/iap/sync', {
      method: 'POST',
      body: JSON.stringify({
        productId: ent.productIdentifier,
        expirationAtMs: ent.expirationDateMillis || ent.expirationDate,
        periodType: ent.periodType,
        store: customerInfo.managementURL ? 'APP_STORE' : 'PLAY_STORE',
        environment: customerInfo.requestDate ? 'LIVE' : null,
      }),
    }).catch(function () {});
  }

  async function afterPurchaseSuccess(customerInfo) {
    await syncBackendFromCustomerInfo(customerInfo);
    setStatus('Premium är aktiverat! Välkommen in.', false);
    setTimeout(function () { window.location.href = '/dashboard'; }, 800);
  }

  async function purchaseTier(tier) {
    if (!window.IAPManager || !IAPManager.canPurchase()) {
      setStatus('Köp är inte tillgängligt här. Prova i appen.', true);
      return;
    }
    setStatus('Öppnar betalning…', false);
    var result = await IAPManager.purchasePackage(tier);
    if (!result.ok) {
      if (result.code === 'PURCHASE_CANCELLED' || result.code === 'userCancelled') {
        setStatus('Köpet avbröts.', false);
        return;
      }
      setStatus('Köpet misslyckades. Försök igen.', true);
      return;
    }
    await afterPurchaseSuccess(result.customerInfo);
  }

  async function initPaywall() {
    if (!window.Auth || !Auth.requireAuth) {
      window.location.href = '/login?next=' + encodeURIComponent('/paywall');
      return;
    }
    await Auth.requireAuth();

    try {
      var status = await Auth.api('/api/subscription/status');
      if (status.premium && status.premium.active) {
        window.location.href = '/dashboard';
        return;
      }
    } catch (_) { /* continue */ }

    if (!isNative()) {
      show(document.getElementById('paywallWebNotice'));
      hide(document.getElementById('paywallPlans'));
    }

    document.getElementById('planYearlyBtn')?.addEventListener('click', function () {
      purchaseTier('yearly');
    });
    document.getElementById('planMonthlyBtn')?.addEventListener('click', function () {
      purchaseTier('monthly');
    });
    document.getElementById('paywallCloseBtn')?.addEventListener('click', function () {
      window.location.href = '/limited-account';
    });
    document.getElementById('giftCardBtn')?.addEventListener('click', function () {
      show(document.getElementById('giftRedeemPanel'));
    });
    document.getElementById('giftRedeemBtn')?.addEventListener('click', async function () {
      var input = document.getElementById('giftCodeInput');
      var msg = document.getElementById('giftRedeemMsg');
      if (!input || !input.value.trim()) return;
      try {
        var res = await Auth.api('/api/gifts/redeem', {
          method: 'POST',
          body: JSON.stringify({ code: input.value.trim() }),
        });
        if (msg) {
          msg.textContent = res.message || 'Presentkortet är inlöst!';
          msg.classList.remove('hidden');
          msg.classList.remove('text-red-600');
        }
        setTimeout(function () { window.location.href = '/dashboard'; }, 900);
      } catch (err) {
        if (msg) {
          msg.textContent = (err && err.message) || 'Kunde inte lösa in koden.';
          msg.classList.remove('hidden');
          msg.classList.add('text-red-600');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaywall);
  } else {
    initPaywall();
  }
})();
