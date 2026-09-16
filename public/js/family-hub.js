/**
 * family-hub.js — Familj hub 10/10 (pedagog-sektion, magic chrome).
 * POS: P-04, C-01 — människor först, barnprofil canonical.
 */
(function () {
  'use strict';

  function fpt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

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
        mount.removeAttribute('data-pedagog-interest-state');
        return;
      }
      mount.classList.remove('hidden');
      mount.setAttribute('data-pedagog-interest-state', 'ok');
      mount.innerHTML =
        '<section class="magic-hub-section">' +
        '<h2 class="magic-hub-section-label">' + escHtml(fpt('family.pedagog.title')) + '</h2>' +
        '<a href="/samarbete" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-lavender hover:border-gold transition-colors min-h-[72px] no-underline" data-family-hub-link="Pedagogsamarbete">' +
        '<span class="text-2xl" aria-hidden="true">🤝</span>' +
        '<span><span class="font-heading font-bold text-navy block">' + escHtml(fpt('family.pedagog.collaboration')) + '</span>' +
        '<span class="text-sm text-text-soft">' + escHtml(fpt('family.pedagog.lead')) + '</span></span></a>' +
        '</section>';
    } catch (_) {
      mount.classList.remove('hidden');
      mount.setAttribute('data-pedagog-interest-state', 'error');
      mount.innerHTML =
        '<p class="text-sm text-navy dark:text-white" role="alert">' + escHtml(fpt('family.pedagog.loadError')) + '</p>';
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
