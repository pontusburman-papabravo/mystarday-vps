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
      <div class="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <h3 id="pkgInterestTitle" class="text-lg font-heading font-bold text-navy mb-2"></h3>
        <p id="pkgInterestBody" class="text-sm text-text-soft mb-4"></p>
        <div id="pkgInterestPreviewMount" class="mb-4"></div>
        <button type="button" id="pkgInterestDismiss" class="w-full px-4 py-2 text-text-soft text-sm">Inte nu</button>
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
    const msg = MESSAGES[component] || { title: 'Paket', body: '' };
    document.getElementById('pkgInterestTitle').textContent = msg.title;
    document.getElementById('pkgInterestBody').textContent = msg.body;

    // The mounted preview-shell renders its own CTA (interest/purchase) and
    // handles the POST + feedback — no duplicate button needed here.
    const mount = document.getElementById('pkgInterestPreviewMount');
    mount.innerHTML = '';
    const ok = await PreviewShell.mountPreviewShell(mount, {
      component,
      source: source || 'contextual_trigger',
      fullPage: false,
      showCta: true,
    });
    if (!ok) return; // no preview to show (e.g. already owns component)

    modalEl.classList.remove('hidden');
  }

  global.PackageInterestTriggers = { guardAction, showModal, hideModal };
})(window);
