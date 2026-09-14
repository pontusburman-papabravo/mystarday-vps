'use strict';

(function () {
  const BLOCKER_SV = {
    not_armed: 'Go-live är avarmad.',
    billing_ui_disabled: 'BILLING_UI_DISABLED är fortfarande PÅ i serverns miljö. Ta bort den före 1 oktober — den blockerar köp även när datumet infaller.',
    iap_paid_rollout_env_forced_off: 'IAP_PAID_ROLLOUT_READY är tvångsavstängd i miljön.',
    webhook_auth_not_configured: 'RevenueCat webhook-hemlighet saknas.',
    app_allowlist_not_configured: 'REVENUECAT_ALLOWED_APP_IDS saknas.',
    product_allowlist_not_configured: 'Produkt-allowlist saknas.',
    product_allowlist_mismatch: 'Produkt-allowlist matchar inte kontraktet.',
    entitlement_not_configured: 'RevenueCat entitlement är felkonfigurerad.',
    ios_public_sdk_missing: 'iOS public SDK-nyckel saknas.',
    android_public_sdk_missing: 'Android public SDK-nyckel saknas.',
    revenuecat_secret_api_key_missing: 'REVENUECAT_SECRET_API_KEY saknas (behövs för /api/iap/sync).',
    invalid_clock: 'Ogiltig klocka eller cutoff-datum.',
    snapshot_error: 'Kunde inte läsa go-live-status.',
  };

  const ACTION_SV = {
    wait: 'Väntar på 1 oktober',
    apply: 'Redo att slås på nu',
    already_applied: 'Betalning är på (go-live genomförd)',
    already_live: 'Betalning är redan på',
    blocked: 'Blockerad — kan inte slå på',
  };

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function formatCutoff(iso) {
    if (!iso) return 'Cutoff: 1 oktober 2026 00:00 (Stockholm)';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Cutoff: ' + iso;
      return 'Cutoff: ' + d.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }) + ' (Stockholm)';
    } catch {
      return 'Cutoff: ' + iso;
    }
  }

  function renderPaymentGoLivePanel(snap) {
    const statusEl = document.getElementById('paymentGoLiveStatus');
    const cutoffEl = document.getElementById('paymentGoLiveCutoff');
    const listEl = document.getElementById('paymentGoLiveBlockers');
    const toggle = document.getElementById('paymentGoLiveArmedToggle');
    const label = document.getElementById('paymentGoLiveArmedLabel');
    if (!statusEl || !listEl) return;

    const data = snap || {};
    const action = data.action || 'blocked';
    statusEl.textContent = ACTION_SV[action] || action;
    statusEl.className = action === 'blocked'
      ? 'text-sm font-semibold text-red-700 mb-2'
      : 'text-sm font-semibold text-navy mb-2';

    if (cutoffEl) cutoffEl.textContent = formatCutoff(data.cutoff_at);

    const blockers = Array.isArray(data.blockers) ? data.blockers : [];
    listEl.innerHTML = blockers.length
      ? blockers.map((b) => '<li>' + esc(BLOCKER_SV[b] || b) + '</li>').join('')
      : '<li class="text-text-soft">Inga blockerare just nu.</li>';

    if (toggle) toggle.checked = data.armed !== false;
    if (label) label.textContent = data.armed !== false ? 'Armerad' : 'Avarmad';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('paymentGoLiveArmedToggle');
    if (!toggle) return;
    toggle.addEventListener('change', async (e) => {
      const armed = e.target.checked;
      const msg = document.getElementById('paymentGoLiveMsg');
      const label = document.getElementById('paymentGoLiveArmedLabel');
      if (label) label.textContent = armed ? 'Armerad' : 'Avarmad';
      try {
        const res = await Auth.api('/api/admin/subscription-settings/payment-go-live-armed', {
          method: 'PATCH',
          body: JSON.stringify({ armed }),
        });
        renderPaymentGoLivePanel(res && res.payment_go_live);
        if (msg) {
          msg.textContent = armed ? '✓ Go-live armerad' : '✓ Go-live avarmad';
          msg.className = 'text-sm text-green-600 mt-2';
        }
      } catch (err) {
        if (msg) {
          msg.textContent = 'Fel: ' + (err.message || err);
          msg.className = 'text-sm text-red-500 mt-2';
        }
        e.target.checked = !armed;
        if (label) label.textContent = !armed ? 'Armerad' : 'Avarmad';
      }
    });
  });

  window.renderPaymentGoLivePanel = renderPaymentGoLivePanel;
})();
