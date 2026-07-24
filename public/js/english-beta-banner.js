/**
 * Discrete English beta banner for en-GB parent app surfaces.
 */
(function englishBetaBannerModule() {
  'use strict';

  const BANNER_VIEWED_KEY = 'sd_english_beta_banner_viewed';

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function injectStyles() {
    if (document.getElementById('english-beta-banner-styles')) return;
    const style = document.createElement('style');
    style.id = 'english-beta-banner-styles';
    style.textContent = `
      .english-beta-banner {
        position: fixed; left: 0; right: 0; z-index: 35;
        bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
        margin: 0 0.75rem; padding: 0.65rem 0.75rem;
        background: #1C2340; color: #f4f4ff; border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25); font-size: 0.75rem; line-height: 1.4;
        display: none;
      }
      .english-beta-banner.is-visible { display: block; }
      .english-beta-banner__title { font-weight: 700; margin-bottom: 0.15rem; }
      .english-beta-banner__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.45rem; }
      .english-beta-banner__link {
        background: transparent; border: none; color: #F5A623; font-weight: 600;
        cursor: pointer; padding: 0; font-size: 0.75rem; min-height: 44px;
        display: inline-flex; align-items: center;
      }
      @media (min-width: 768px) {
        .english-beta-banner { max-width: 24rem; left: auto; right: 1rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildBanner() {
    const el = document.createElement('aside');
    el.className = 'english-beta-banner';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="english-beta-banner__title" data-i18n="language.betaBanner.title">English beta</div>
      <p data-i18n="language.betaBanner.body"></p>
      <div class="english-beta-banner__actions">
        <button type="button" class="english-beta-banner__link" data-beta-banner-report data-i18n="language.betaBanner.report">
          Report a language issue
        </button>
        <button type="button" class="english-beta-banner__link" data-beta-banner-switch data-i18n="language.betaBanner.switchBack">
          Switch back to Swedish
        </button>
      </div>`;
    return el;
  }

  async function switchToSwedish() {
    sessionStorage.setItem(I18n.STORAGE_KEY, 'sv-SE');
    await I18n.load('sv-SE');
    if (window.Auth && Auth.api) {
      await Auth.api('/api/family/settings', {
        method: 'PUT',
        body: JSON.stringify({ preferred_locale: 'sv-SE' }),
      });
    }
    track('language_changed', { locale: 'sv-SE', previous_locale: 'en-GB', selection_source: 'beta_banner' });
    window.location.reload();
  }

  function openLanguageFeedback() {
    track('language_issue_report_opened', { locale: 'en-GB', route: location.pathname });
    if (typeof window.openLanguageFeedbackModal === 'function') {
      window.openLanguageFeedbackModal();
      return;
    }
    if (typeof window.openFeedbackModal === 'function') {
      window.openFeedbackModal('language');
    }
  }

  async function syncVisibility(banner) {
    let locale = I18n.getCurrentLang ? I18n.getCurrentLang() : 'sv-SE';
    if (window.Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
      try {
        const ctx = await Auth.api('/api/family/locale-context');
        locale = ctx?.preferred_locale || locale;
      } catch (_) { /* keep current */ }
    }
    const show = locale === 'en-GB';
    banner.classList.toggle('is-visible', show);
    if (show && !sessionStorage.getItem(BANNER_VIEWED_KEY)) {
      track('english_beta_banner_viewed', { locale: 'en-GB', route: location.pathname });
      sessionStorage.setItem(BANNER_VIEWED_KEY, '1');
    }
  }

  async function init() {
    if (!window.I18n) return;
    await I18n.init();
    if (I18n.getCurrentLang() !== 'en-GB') {
      if (window.Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
        try {
          const me = await Auth.api('/api/auth/me');
          if (me?.preferred_locale !== 'en-GB') return;
        } catch (_) {
          return;
        }
      } else {
        return;
      }
    }

    injectStyles();
    const banner = buildBanner();
    document.body.appendChild(banner);
    I18n.apply(banner);

    banner.querySelector('[data-beta-banner-report]')?.addEventListener('click', openLanguageFeedback);
    banner.querySelector('[data-beta-banner-switch]')?.addEventListener('click', switchToSwedish);

    await syncVisibility(banner);
    document.addEventListener('locale-changed', () => syncVisibility(banner));
    document.addEventListener('parent-i18n-ready', () => syncVisibility(banner));
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((err) => console.warn('[english-beta-banner] init failed:', err));
  });

  window.EnglishBetaBanner = { init };
})();
