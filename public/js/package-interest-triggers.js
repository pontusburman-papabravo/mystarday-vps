/**
 * Contextual intresse-triggers (E10 §9.5) — modal before gated actions.
 */
(function (global) {
  'use strict';

  const MESSAGES = {
    reporting: {
      title: 'Rapportering',
      body: 'Du har registrerat aktiviteter i två veckor — vill du få koll på utvecklingen över tid?',
    },
    pedagog: {
      title: 'Pedagog',
      body: 'Vill du samarbeta med pedagog eller terapeut kring barnets vardag?',
    },
    teacch: {
      title: 'Extra stöd',
      body: 'Lägg till visuellt stöd med De sju frågorna — hjälper barnet förstå vad som händer.',
    },
  };

  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.id = 'packageInterestModal';
    modalEl.className = 'hidden fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-4';
    modalEl.innerHTML = `
      <div class="bg-white rounded-2xl w-full max-w-md shadow-xl p-6" role="dialog" aria-modal="true">
        <h3 id="pkgInterestTitle" class="text-lg font-heading font-bold text-navy mb-2"></h3>
        <p id="pkgInterestBody" class="text-sm text-text-soft mb-4"></p>
        <div id="pkgInterestPreviewMount" class="mb-4 max-h-48 overflow-y-auto"></div>
        <p id="pkgInterestFeedback" class="text-sm text-green-700 mb-2 hidden"></p>
        <div class="flex flex-col gap-2">
          <button type="button" id="pkgInterestCta" class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-semibold">Jag är intresserad</button>
          <button type="button" id="pkgInterestDismiss" class="w-full px-4 py-2 text-text-soft text-sm">Inte nu</button>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) hideModal();
    });
    document.getElementById('pkgInterestDismiss').addEventListener('click', hideModal);
    return modalEl;
  }

  function hideModal() {
    if (modalEl) modalEl.classList.add('hidden');
  }

  /**
   * Returns true if action may proceed (has component or no preview needed).
   */
  async function guardAction(component, source) {
    if (!global.PreviewShell) return true;
    try {
      const access = await PreviewShell.loadAccess();
      if (access.components?.[component]?.has) return true;
      if (!access.preview?.[component] || access.rollout_mode === 'off') return true;
      await showModal({ component, source });
      return false;
    } catch (_) {
      return true;
    }
  }

  async function showModal({ component, source }) {
    if (!global.PreviewShell) return;
    ensureModal();
    const access = await PreviewShell.loadAccess();
    const msg = MESSAGES[component] || { title: 'Paket', body: '' };
    document.getElementById('pkgInterestTitle').textContent = msg.title;
    document.getElementById('pkgInterestBody').textContent = msg.body;
    const feedback = document.getElementById('pkgInterestFeedback');
    feedback.classList.add('hidden');
    feedback.textContent = '';

    const mount = document.getElementById('pkgInterestPreviewMount');
    mount.innerHTML = '';
    await PreviewShell.mountPreviewShell(mount, {
      component,
      source: source || 'contextual_trigger',
      fullPage: false,
    });

    const cta = PreviewShell.getCtaConfig(access);
    const btn = document.getElementById('pkgInterestCta');
    const interested = !!(access.interest && access.interest[component]);
    btn.textContent = interested ? 'Intresse registrerat ✓' : (cta?.label || 'Jag är intresserad');
    btn.disabled = interested;
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const headers = { 'Content-Type': 'application/json' };
        const csrf = localStorage.getItem('csrf_token');
        if (csrf) headers['X-CSRF-Token'] = csrf;
        const res = await fetch('/api/subscription/interest', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ component, source: source || 'contextual_trigger' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Fel');
        feedback.textContent = data.message || 'Tack! Vi har noterat ditt intresse.';
        feedback.classList.remove('hidden');
        btn.textContent = 'Intresse registrerat ✓';
        PreviewShell.clearCache();
      } catch (err) {
        btn.disabled = false;
        feedback.textContent = err.message || 'Något gick fel';
        feedback.classList.remove('hidden');
        feedback.classList.remove('text-green-700');
        feedback.classList.add('text-red-600');
      }
    };

    modalEl.classList.remove('hidden');
  }

  global.PackageInterestTriggers = { guardAction, showModal, hideModal };
})(window);
