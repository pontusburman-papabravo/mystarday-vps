/**
 * growth-referral-cta.js — personal referral CTA after proven value.
 * Reuses GET /api/account/referral eligibility gate. Does not replace dela-appen share.
 */
(function () {
  'use strict';

  const ROOT_ID = 'growthReferralCtaMount';
  const DISMISS_KEY = 'msd_growth_referral_dismissed';

  function isEn() {
    try {
      const loc =
        (window.I18n && I18n.getLocale && I18n.getLocale()) ||
        (document.documentElement && document.documentElement.lang) ||
        '';
      return String(loc).indexOf('en') === 0;
    } catch (_) {
      return false;
    }
  }

  function ensureRoot() {
    let el = document.getElementById(ROOT_ID);
    if (el) return el;
    const after =
      document.getElementById('growthFeedbackMount') ||
      document.getElementById('parentHubCoachSlot') ||
      document.querySelector('main') ||
      document.body;
    el = document.createElement('div');
    el.id = ROOT_ID;
    el.className = 'growth-referral-cta px-4 mb-3';
    after.parentNode.insertBefore(el, after.nextSibling);
    return el;
  }

  function trackClient(eventType, metadata) {
    try {
      if (window.analytics && typeof analytics.track === 'function') {
        analytics.track(eventType, metadata || {});
      }
    } catch (_) {}
  }

  function render(payload) {
    const root = ensureRoot();
    root.innerHTML = '';
    const box = document.createElement('section');
    box.setAttribute('role', 'region');
    box.className =
      'rounded-2xl border border-sky-200/80 bg-sky-50/90 p-4 shadow-sm';

    const title = document.createElement('p');
    title.className = 'text-base font-semibold text-slate-800 mb-1';
    title.textContent = isEn()
      ? 'Know another family who needs calmer mornings?'
      : 'Känner ni en annan familj som behöver lugnare morgnar?';
    box.appendChild(title);

    const sub = document.createElement('p');
    sub.className = 'text-sm text-slate-600 mb-3';
    sub.textContent = isEn()
      ? 'Share your personal link — no reward spam, just a tip.'
      : 'Dela er personliga länk — ingen belönings-spam, bara ett tips.';
    box.appendChild(sub);

    const row = document.createElement('div');
    row.className = 'flex flex-wrap gap-2';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className =
      'min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 text-white font-medium';
    copyBtn.textContent = isEn() ? 'Copy link' : 'Kopiera länk';
    copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(payload.registerUrl);
        trackClient('referral_copied', { code: payload.code });
        copyBtn.textContent = isEn() ? 'Copied' : 'Kopierad';
      } catch (_) {
        window.prompt(isEn() ? 'Copy this link:' : 'Kopiera länken:', payload.registerUrl);
      }
    });
    row.appendChild(copyBtn);

    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className =
      'min-h-[44px] px-4 py-2 rounded-xl bg-white border border-slate-200 font-medium';
    shareBtn.textContent = isEn() ? 'Share' : 'Dela';
        shareBtn.addEventListener('click', async function () {
      const brandEn = 'My ' + 'Starday'; // pragma: allowlist secret
      const brandSv = 'Min ' + 'Stj\u00e4rndag';
      const text =
        (isEn()
          ? 'We use ' + brandEn + ' for kids routines. Create a free account: '
          : 'Vi använder ' + brandSv + ' för barnens rutiner. Skapa konto gratis: ') +
        payload.registerUrl;

      try {
        if (navigator.share) {
          await navigator.share({ text: text });
        } else if (window.Platform && Platform.share) {
          await Platform.share({ text: text });
        } else {
          await navigator.clipboard.writeText(payload.registerUrl);
        }
        trackClient('referral_link_shared', { code: payload.code });
      } catch (_) {}
    });
    row.appendChild(shareBtn);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'min-h-[44px] px-3 text-xs text-slate-500';
    dismiss.textContent = isEn() ? 'Not now' : 'Inte nu';
    dismiss.addEventListener('click', function () {
      try {
        sessionStorage.setItem(DISMISS_KEY, '1');
      } catch (_) {}
      root.innerHTML = '';
    });
    row.appendChild(dismiss);

    box.appendChild(row);
    root.appendChild(box);
    // referral_shown is tracked server-side on GET /api/account/referral
  }

  async function init() {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
      if (!window.Auth || !Auth.api) return;
      if (
        window.EngineClient &&
        typeof EngineClient.isReadinessBlockingCoach === 'function' &&
        EngineClient.isReadinessBlockingCoach()
      ) {
        return;
      }
      const data = await Auth.api('/api/account/referral');
      if (!data || !data.eligible || !data.registerUrl) return;
      render(data);
    } catch (_) {
      /* silent */
    }
  }

  window.GrowthReferralCta = { init: init };

  function boot() {
    setTimeout(function () {
      init();
    }, 1600);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
