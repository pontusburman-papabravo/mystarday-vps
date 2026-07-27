/**
 * One-time legacy-language notice for families that switched sv → en-GB.
 * Relevance is a pure server signal (GET /api/family/locale-context →
 * show_legacy_language_notice); dismissal persists per family via
 * POST /api/family/legacy-language-notice/dismiss. No user data is touched.
 */
(function legacyLanguageNoticeModule() {
  'use strict';

  const MOUNT_BEFORE_ID = 'parentHomeHubMount';

  function t(key) {
    return window.pt ? window.pt(key) : key;
  }

  function injectStyles() {
    if (document.getElementById('legacy-language-notice-styles')) return;
    const style = document.createElement('style');
    style.id = 'legacy-language-notice-styles';
    style.textContent = `
      .legacy-language-notice {
        display: flex; align-items: flex-start; gap: 0.6rem;
        margin: 0 0 1rem 0; padding: 0.7rem 0.85rem;
        background: #F0F4FF; border: 1px solid #D6E0FF; border-radius: 12px;
        color: #1B2340; font-size: 0.8rem; line-height: 1.45;
      }
      .parent-magic-dashboard .legacy-language-notice,
      .dark .legacy-language-notice {
        background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); color: #f4f4ff;
      }
      .legacy-language-notice__icon { flex-shrink: 0; font-size: 1rem; line-height: 1.45; }
      .legacy-language-notice__body { flex: 1; min-width: 0; }
      .legacy-language-notice__dismiss {
        flex-shrink: 0; background: transparent; border: none; cursor: pointer;
        color: inherit; opacity: 0.8; font-weight: 600; font-size: 0.8rem;
        min-height: 44px; min-width: 44px; margin: -0.7rem -0.5rem;
        display: inline-flex; align-items: center; justify-content: center; padding: 0 0.5rem;
      }
      .legacy-language-notice__dismiss:hover { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function buildNotice() {
    const el = document.createElement('div');
    el.className = 'legacy-language-notice';
    el.setAttribute('role', 'note');
    el.innerHTML = `
      <span class="legacy-language-notice__icon" aria-hidden="true">🌐</span>
      <span class="legacy-language-notice__body">${t('language.legacyNotice.body')}</span>
      <button type="button" class="legacy-language-notice__dismiss"
        aria-label="${t('language.legacyNotice.dismissAria')}">${t('language.legacyNotice.dismiss')}</button>`;
    return el;
  }

  async function dismiss(el) {
    el.remove();
    try {
      await Auth.api('/api/family/legacy-language-notice/dismiss', { method: 'POST' });
    } catch (_) { /* non-blocking — worst case it reappears next visit */ }
  }

  async function init() {
    if (!window.Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) return;
    const anchor = document.getElementById(MOUNT_BEFORE_ID);
    if (!anchor || document.querySelector('.legacy-language-notice')) return;

    let ctx = null;
    try {
      ctx = await Auth.api('/api/family/locale-context');
    } catch (_) {
      return;
    }
    if (!ctx || ctx.show_legacy_language_notice !== true) return;

    // Wait for a loaded locale bundle — never render raw keys
    if (t('language.legacyNotice.body') === 'language.legacyNotice.body') return;

    injectStyles();
    const el = buildNotice();
    anchor.parentNode.insertBefore(el, anchor);
    el.querySelector('.legacy-language-notice__dismiss')
      .addEventListener('click', () => dismiss(el));
  }

  function boot() {
    init().catch((err) => console.warn('[legacy-language-notice] init failed:', err));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.addEventListener('parent-i18n-ready', boot, { once: true });
      // Fallback if i18n-ready already fired or never fires
      setTimeout(boot, 4000);
    });
  } else {
    document.addEventListener('parent-i18n-ready', boot, { once: true });
    setTimeout(boot, 4000);
  }

  window.LegacyLanguageNotice = { init };
})();
