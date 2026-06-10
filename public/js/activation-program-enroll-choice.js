/**
 * Föräldraaktivering — val-skärm (Fas 4, väg A + B).
 * Copy: docs/foraldaraktivering-implementation-contract.md § Onboarding-val
 */
(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderBenefits(items) {
    return (items || []).map((item) => `
      <li class="flex items-start gap-2 text-sm text-text-soft">
        <span class="text-indigo-500 mt-0.5">✓</span>
        <span>${escapeHtml(item)}</span>
      </li>
    `).join('');
  }

  function renderChoiceUI(container, { copy, enrollSource, inviteToken, onDone }) {
    const c = copy || {};
    container.innerHTML = `
      <div class="py-4">
        <h2 class="text-2xl font-heading font-bold text-navy mb-3">${escapeHtml(c.intro_title || 'Hur vill ni börja?')}</h2>
        <p class="text-sm text-text-soft leading-relaxed mb-6">${escapeHtml(c.intro_body || '')}</p>

        <div class="space-y-4 mb-6">
          <div class="rounded-2xl border-2 border-indigo-400 bg-indigo-50 p-4">
            <p class="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Rekommenderas</p>
            <h3 class="font-heading font-bold text-navy text-lg mb-2">${escapeHtml(c.card_guided_title || '')}</h3>
            <p class="text-sm text-text-soft mb-3">${escapeHtml(c.card_guided_body || '')}</p>
            <ul class="space-y-1.5 mb-4">${renderBenefits(c.card_guided_benefits)}</ul>
            <button type="button" id="activationEnrollGuidedBtn"
              class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
              ${escapeHtml(c.card_guided_cta || 'Ja, hjälp oss första veckan')}
            </button>
          </div>

          <div class="rounded-2xl border border-lavender bg-white p-4">
            <h3 class="font-heading font-bold text-navy text-base mb-2">${escapeHtml(c.card_direct_title || '')}</h3>
            <p class="text-sm text-text-soft mb-3">${escapeHtml(c.card_direct_body || '')}</p>
            <ul class="space-y-1.5 mb-4">${renderBenefits(c.card_direct_benefits)}</ul>
            <button type="button" id="activationEnrollDirectBtn"
              class="w-full border-2 border-navy/20 text-navy font-semibold py-3 rounded-xl hover:bg-lavender/40 transition-colors">
              ${escapeHtml(c.card_direct_cta || 'Vi kör själva')}
            </button>
          </div>
        </div>

        <p class="text-xs text-text-soft text-center leading-relaxed">${escapeHtml(c.footnote || '')}</p>
        <div id="activationEnrollError" class="hidden error-box mt-4"></div>
      </div>
    `;

    async function submitChoice(choice) {
      const errEl = document.getElementById('activationEnrollError');
      if (errEl) errEl.classList.add('hidden');

      try {
        const res = await window.apiFetch('/api/me/activation-program/enroll-choice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            choice,
            enroll_source: enrollSource,
            invite_token: inviteToken || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Kunde inte spara valet');
        }
        if (typeof onDone === 'function') onDone();
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Något gick fel';
          errEl.classList.remove('hidden');
        }
      }
    }

    document.getElementById('activationEnrollGuidedBtn')
      ?.addEventListener('click', () => submitChoice('guided'));
    document.getElementById('activationEnrollDirectBtn')
      ?.addEventListener('click', () => submitChoice('direct'));
  }

  async function loadEnrollChoiceStatus(enrollSource, inviteToken) {
    const params = new URLSearchParams({ enroll_source: enrollSource });
    if (inviteToken) params.set('invite_token', inviteToken);
    const res = await window.apiFetch(`/api/me/activation-program/enroll-choice?${params}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function maybeShowAfterOnboarding({ onDone } = {}) {
    if (typeof window.apiFetch !== 'function') return false;

    const data = await loadEnrollChoiceStatus('onboarding_complete');
    if (!data?.show) return false;

    const step = document.getElementById('activationEnrollStep');
    if (!step) return false;

    document.querySelectorAll('.step-card').forEach((c) => c.classList.remove('active'));
    step.classList.add('active');
    document.getElementById('loadingStep')?.classList.add('hidden');

    const label = document.getElementById('stepLabel');
    if (label) label.textContent = 'Sista steget';

    renderChoiceUI(step, {
      copy: data.copy,
      enrollSource: 'onboarding_complete',
      onDone: onDone || (() => { window.location.href = '/dashboard'; }),
    });
    return true;
  }

  async function initStandalonePage() {
    const root = document.getElementById('activationEnrollRoot');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('token');
    const enrollSource = inviteToken ? 'email_reactivation' : 'onboarding_complete';

    try {
      await Auth.requireAuth('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
    } catch (_) {
      return;
    }

    const data = await loadEnrollChoiceStatus(enrollSource, inviteToken);
    if (!data?.show) {
      window.location.href = '/dashboard';
      return;
    }

    renderChoiceUI(root, {
      copy: data.copy,
      enrollSource,
      inviteToken,
      onDone: () => { window.location.href = '/dashboard'; },
    });
  }

  window.ActivationProgramEnrollChoice = {
    renderChoiceUI,
    maybeShowAfterOnboarding,
    initStandalonePage,
  };

  if (document.getElementById('activationEnrollRoot')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initStandalonePage);
    } else {
      initStandalonePage();
    }
  }
})();
