/**
 * Dashboard engagement CTAs (Fas 8 F2b).
 * Co-parent invite banner + "dela appen" share banner, extracted from dashboard.js.
 * Reads dashboard.js globals (dashboardStats, trackEvent, loadDashboardCards) and
 * window._stjarndagFeatures / window.apiFetch / Auth at call time.
 * Entry points exposed on window for inline onclick + dashboard.js init calls.
 */
(function () {
  // ── Medförälder CTA ─────────────────────────────────────────
  // Shows an invite banner for families with only 1 parent.
  // Gate: medforalder_cta feature flag + parent_count === 1 in dashboardStats.
  // Dismiss persisted in localStorage for 7 days.

  const MEDFORALDER_CTA_KEY = 'medforalder_cta_dismissed';
  const MEDFORALDER_CTA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  function showMedforalderCtaIfEligible() {
    const banner = document.getElementById('medforalderCtaBanner');
    if (!banner) return;

    if (window.DashboardHomeHub && typeof DashboardHomeHub.shouldUse === 'function' && DashboardHomeHub.shouldUse()) {
      banner.style.display = 'none';
      return;
    }

    // 1. Feature gate — element is hidden by default via data-feature + feature-check.js
    //    We double-check here using the cached feature list.
    if (!window._stjarndagFeatures || !window._stjarndagFeatures['medforalder_cta']) {
      banner.style.display = 'none';
      return;
    }

    // 2. Check parent_count from dashboard-stats
    if (!dashboardStats || dashboardStats.parent_count === undefined) {
      return; // Stats not loaded yet — wait for retry on next cycle
    }
    if (dashboardStats.parent_count >= 2) {
      // Already has 2+ parents — never show
      banner.style.display = 'none';
      return;
    }

    // 3. Check localStorage dismiss
    try {
      const raw = localStorage.getItem(MEDFORALDER_CTA_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < MEDFORALDER_CTA_TTL) {
          banner.style.display = 'none';
          return;
        }
      }
    } catch (_) {}

    // 4. Show banner + fire event
    banner.style.display = '';
    trackEvent('cta_invite_co_parent_shown');
  }

  function dismissMedforalderCtaBanner() {
    const banner = document.getElementById('medforalderCtaBanner');
    if (!banner) return;
    banner.style.display = 'none';
    try {
      localStorage.setItem(MEDFORALDER_CTA_KEY, JSON.stringify({ ts: Date.now() }));
    } catch (_) {}
  }

  function openMedforalderCtaInvite() {
    trackEvent('cta_invite_co_parent_clicked');
    const modal = document.getElementById('medforalderCtaModal');
    const form = document.getElementById('medforalderCtaForm');
    const success = document.getElementById('medforalderCtaSuccess');
    const errorEl = document.getElementById('medforalderCtaError');
    if (!modal) return;
    errorEl.classList.add('hidden');
    form.classList.remove('hidden');
    success.classList.add('hidden');
    document.getElementById('medforalderCtaEmail').value = '';
    modal.classList.remove('hidden');
  }

  function closeMedforalderCtaModal() {
    const modal = document.getElementById('medforalderCtaModal');
    if (modal) modal.classList.add('hidden');
  }

  async function submitMedforalderCtaInvite() {
    const emailInput = document.getElementById('medforalderCtaEmail');
    const errorEl = document.getElementById('medforalderCtaError');
    const submitBtn = document.getElementById('medforalderCtaSubmit');
    const email = (emailInput.value || '').trim();

    if (!email) {
      errorEl.textContent = 'Ange en e-postadress';
      errorEl.classList.remove('hidden');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^@\u0020]+@[^\u0020]+\u002E[a-z]{2,}$/i;
    if (!emailRegex.test(email)) {
      errorEl.textContent = 'Ange en giltig e-postadress';
      errorEl.classList.remove('hidden');
      return;
    }

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Skickar…';

    try {
      const res = await window.apiFetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Något gick fel. Försök igen.';
        errorEl.classList.remove('hidden');
      } else {
        // Success
        document.getElementById('medforalderCtaForm').classList.add('hidden');
        document.getElementById('medforalderCtaSuccess').classList.remove('hidden');
        // Dismiss banner so it doesn't keep showing
        dismissMedforalderCtaBanner();
        // Refresh parent count after invite is sent
        setTimeout(function () {
          loadDashboardCards();
        }, 1500);
      }
    } catch (e) {
      errorEl.textContent = 'Något gick fel. Kontrollera din uppkoppling.';
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Skicka inbjudan';
    }
  }

  // ── Dela appen CTA (R5-T3) ─────────────────────────────────
  // Share button on dashboard for all families (feature-gated: dela_appen)
  // Reuses POST /api/account/share-notify from mobile-nav.js.
  // Dismiss persisted in localStorage for 30 days.

  const DELA_APPEN_KEY = 'dela_appen_cta_dismissed';
  const DELA_APPEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  function loadReferralShare() {
    if (window.ReferralShare && window.ReferralShare.load) {
      return window.ReferralShare.load();
    }
    return Promise.resolve(null);
  }

  function getSharePayload(ref) {
    if (window.ReferralShare && window.ReferralShare.buildPayload) {
      return window.ReferralShare.buildPayload(ref);
    }
    return {
      url: 'https://mystarday.se',
      text: 'Min Stjärndag — Hjälp ditt barn med vardagsrutiner och stjärnor!',
      withReferral: false,
    };
  }

  function trackReferralShare(ref) {
    if (window.ReferralShare && window.ReferralShare.trackShared) {
      window.ReferralShare.trackShared(ref, trackEvent);
    }
  }

  function showShareToast(message) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-navy text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2500);
  }

  function showDelaAppenCtaIfEligible() {
    const banner = document.getElementById('delaAppenCtaBanner');
    if (!banner) return;

    // Feature gate
    if (!window._stjarndagFeatures || !window._stjarndagFeatures['dela_appen']) {
      banner.style.display = 'none';
      return;
    }

    // Check localStorage dismissal
    try {
      const stored = localStorage.getItem(DELA_APPEN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.ts < DELA_APPEN_TTL) {
          banner.style.display = 'none';
          return;
        }
      }
    } catch (_) {}

    // Show banner + fire shown event
    banner.style.display = '';
    trackEvent('cta_share_app_shown');
  }

  function dismissDelaAppenCtaBanner() {
    const banner = document.getElementById('delaAppenCtaBanner');
    if (!banner) return;
    banner.style.display = 'none';
    try {
      localStorage.setItem(DELA_APPEN_KEY, JSON.stringify({ ts: Date.now() }));
    } catch (_) {}
  }

  function openDelaAppenShare() {
    trackEvent('cta_share_app_clicked');
    if (window.ParentShareFlow && ParentShareFlow.open) {
      ParentShareFlow.open({
        trackFn: trackEvent,
        onShared: dismissDelaAppenCtaBanner,
      });
      return;
    }
    dismissDelaAppenCtaBanner();
  }

  function initDelaAppenCta() {
    showDelaAppenCtaIfEligible();
    loadReferralShare().then(function (ref) {
      if (!ref || !ref.code) return;
      const sub = document.querySelector('#delaAppenCtaBanner .text-xs.text-text-soft');
      if (sub) {
        sub.textContent = 'Din kod: ' + ref.code + ' — dela länken så vi kan följa värvningar';
      }
    });
  }

  // Exposed for inline onclick (dashboard.html) + dashboard.js init calls
  window.showMedforalderCtaIfEligible = showMedforalderCtaIfEligible;
  window.dismissMedforalderCtaBanner = dismissMedforalderCtaBanner;
  window.openMedforalderCtaInvite = openMedforalderCtaInvite;
  window.closeMedforalderCtaModal = closeMedforalderCtaModal;
  window.submitMedforalderCtaInvite = submitMedforalderCtaInvite;
  window.showDelaAppenCtaIfEligible = showDelaAppenCtaIfEligible;
  window.dismissDelaAppenCtaBanner = dismissDelaAppenCtaBanner;
  window.openDelaAppenShare = openDelaAppenShare;
  window.initDelaAppenCta = initDelaAppenCta;
})();
