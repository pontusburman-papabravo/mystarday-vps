/**
 * Contextual intresse-triggers (E10 §9.5) — modal before gated actions.
 */
(function (global) {
  'use strict';

  const MESSAGES = {
    reporting: {
      titleKey: 'packageInterest.reporting.title',
      bodyKey: 'packageInterest.reporting.body',
      title: 'Rapportering',
      titleEn: 'Reports',
      body: 'Du har registrerat aktiviteter i två veckor — vill du få koll på utvecklingen över tid?',
      bodyEn: 'You have logged activities for two weeks — do you want a clearer view of how things change over time?',
    },
    pedagog: {
      titleKey: 'packageInterest.pedagog.title',
      bodyKey: 'packageInterest.pedagog.body',
      title: 'Pedagog',
      titleEn: 'Educator',
      body: 'Vill du samarbeta med pedagog eller terapeut kring barnets vardag?',
      bodyEn: 'Do you want to work with an educator or therapist on the child\'s everyday life?',
    },
    teacch: {
      titleKey: 'packageInterest.teacch.title',
      bodyKey: 'packageInterest.teacch.body',
      title: 'Extra stöd',
      titleEn: 'Extra support',
      body: 'Lägg till visuellt stöd med De sju frågorna — hjälper barnet förstå vad som händer.',
      bodyEn: 'Add visual support with The seven questions — it helps the child understand what is happening.',
    },
  };

  function localeBase() {
    const lang = global.I18n && typeof I18n.getCurrentLang === 'function' ? I18n.getCurrentLang() : '';
    return String(lang || '').split('-')[0];
  }

  function defaultBase() {
    const id = (global.I18n && I18n.DEFAULT_LOCALE) || 'sv-SE';
    return String(id).split('-')[0];
  }

  function chromeText(key, swedish, english) {
    if (global.I18n && typeof I18n.t === 'function') {
      const value = I18n.t(key);
      if (value && value !== key) return value;
    }
    const base = localeBase();
    if (!base || base === defaultBase()) return swedish;
    return english;
  }

  function messageFor(component) {
    const spec = MESSAGES[component];
    if (!spec) {
      return { title: chromeText('packageInterest.fallbackTitle', 'Paket', 'Package'), body: '' };
    }
    return {
      title: chromeText(spec.titleKey, spec.title, spec.titleEn),
      body: chromeText(spec.bodyKey, spec.body, spec.bodyEn),
    };
  }

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
    const msg = messageFor(component);
    document.getElementById('pkgInterestTitle').textContent = msg.title;
    document.getElementById('pkgInterestBody').textContent = msg.body;
    const dismiss = document.getElementById('pkgInterestDismiss');
    if (dismiss) dismiss.textContent = chromeText('packageInterest.dismiss', 'Inte nu', 'Not now');

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
