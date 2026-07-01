/**
 * family-hub.js — Familj hub 10/10 (pedagog-sektion, magic chrome).
 * POS: P-04, C-01 — människor först, barnprofil canonical.
 */
(function () {
  'use strict';

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function applyMagicChrome() {
    if (!(window.ParentMagicShell && ParentMagicShell.isMagic())) return;
    const tips = document.querySelector('.warm-tips');
    if (tips) tips.classList.add('hidden');
  }

  async function renderPedagogSection() {
    const mount = document.getElementById('familyPedagogSection');
    if (!mount) return;
    if (!window.NavConfig || !window.fetchPackageAccess) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }
    try {
      const access = await window.fetchPackageAccess();
      const caps = NavConfig.capabilitiesForPlacement(access, null, 'family_pedagog_interest');
      if (!caps.length) {
        mount.classList.add('hidden');
        mount.innerHTML = '';
        return;
      }
      mount.classList.remove('hidden');
      mount.innerHTML =
        '<section class="magic-hub-section">' +
        '<h2 class="magic-hub-section-label">Pedagoger</h2>' +
        '<a href="/samarbete" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px] no-underline" data-family-hub-link="Pedagogsamarbete">' +
        '<span class="text-2xl" aria-hidden="true">🤝</span>' +
        '<span><span class="font-heading font-bold text-navy block">Pedagogsamarbete</span>' +
        '<span class="text-sm text-text-soft">Samarbeta med skola eller behandlare</span></span></a>' +
        '</section>';
    } catch (_) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
    }
  }

  async function afterRender() {
    applyMagicChrome();
    await renderPedagogSection();
  }

  window.FamilyHub = {
    afterRender: afterRender,
    renderPedagogSection: renderPedagogSection,
  };
})();
