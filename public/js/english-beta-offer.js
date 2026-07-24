/**
 * One-time English beta offer for existing sv-SE families.
 */
(function englishBetaOfferModule() {
  'use strict';

  const SESSION_DISMISS_KEY = 'sd_english_beta_offer_dismissed_session';
  let viewedThisSession = false;

  function track(eventType, metadata) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, eventType, metadata || {});
    }
  }

  function injectStyles() {
    if (document.getElementById('english-beta-offer-styles')) return;
    const style = document.createElement('style');
    style.id = 'english-beta-offer-styles';
    style.textContent = `
      .english-beta-offer {
        position: fixed; inset: 0; z-index: 9998; display: flex; align-items: flex-end;
        justify-content: center; padding: 1rem; background: rgba(7,7,26,0.45);
      }
      .english-beta-offer__panel {
        width: 100%; max-width: 28rem; background: #fff; border-radius: 16px;
        padding: 1.25rem; box-shadow: 0 12px 40px rgba(0,0,0,0.2);
      }
      .english-beta-offer__title { font-size: 1.05rem; font-weight: 700; color: #1B2340; margin-bottom: 0.5rem; }
      .english-beta-offer__body { font-size: 0.875rem; color: #5A6178; line-height: 1.5; margin-bottom: 0.75rem; }
      .english-beta-offer__question { font-size: 0.875rem; font-weight: 600; color: #1B2340; margin-bottom: 0.75rem; }
      .english-beta-offer__actions { display: flex; flex-direction: column; gap: 0.5rem; }
      .english-beta-offer__btn {
        min-height: 44px; border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer; border: none;
      }
      .english-beta-offer__btn--primary { background: #F5A623; color: #1B2340; }
      .english-beta-offer__btn--secondary { background: #EDE7F6; color: #1B2340; }
      .english-beta-offer__btn--ghost { background: transparent; color: #5A6178; text-decoration: underline; }
      @media (min-width: 640px) {
        .english-beta-offer { align-items: center; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'english-beta-offer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="english-beta-offer__panel">
        <h2 class="english-beta-offer__title" data-i18n="language.offer.title">My Starday finns nu på engelska</h2>
        <p class="english-beta-offer__body" data-i18n="language.offer.body"></p>
        <p class="english-beta-offer__child-note" data-i18n="language.choice.childNote" style="font-size:0.8125rem;color:#5A6178;margin-bottom:0.75rem;line-height:1.45"></p>
        <p class="english-beta-offer__question" data-i18n="language.offer.question"></p>
        <div class="english-beta-offer__actions">
          <button type="button" class="english-beta-offer__btn english-beta-offer__btn--secondary" data-offer-action="decline">
            <span data-i18n="language.offer.staySwedish">Fortsätt på svenska</span>
          </button>
          <button type="button" class="english-beta-offer__btn english-beta-offer__btn--primary" data-offer-action="accept_english">
            <span data-i18n="language.offer.tryEnglish">Prova engelska beta</span>
          </button>
          <button type="button" class="english-beta-offer__btn english-beta-offer__btn--ghost" data-offer-action="remind_later">
            <span data-i18n="language.offer.remindLater">Påminn mig senare</span>
          </button>
        </div>
      </div>`;
    return overlay;
  }

  async function applyLocaleSwitch(locale) {
    sessionStorage.setItem(I18n.STORAGE_KEY, locale);
    await I18n.load(locale);
    if (window.Auth && Auth.api) {
      await Auth.api('/api/family/settings', {
        method: 'PUT',
        body: JSON.stringify({ preferred_locale: locale }),
      });
    }
    document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
    document.dispatchEvent(new CustomEvent('parent-i18n-ready', { detail: { locale } }));
  }

  async function handleAction(action, overlay) {
    try {
      const res = await Auth.api('/api/family/english-beta-offer', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (action === 'accept_english') {
        track('existing_family_language_offer_accepted', { locale: 'en-GB' });
        await applyLocaleSwitch('en-GB');
        track('language_changed', { locale: 'en-GB', previous_locale: 'sv-SE', selection_source: 'existing_user_offer' });
        window.location.reload();
        return;
      }
      if (action === 'decline') {
        track('existing_family_language_offer_declined', { locale: 'sv-SE' });
      }
      if (action === 'remind_later') {
        track('existing_family_language_offer_remind_later', { locale: 'sv-SE' });
        sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
      }
      overlay.remove();
    } catch (err) {
      console.warn('[english-beta-offer]', err.message);
      overlay.remove();
    }
  }

  async function maybeShow() {
    if (!window.Auth || !Auth.isLoggedIn || !Auth.isLoggedIn()) return;
    const user = Auth.getUser();
    if (!user || user.type !== 'parent') return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') return;

    let context;
    try {
      context = await Auth.api('/api/family/locale-context');
    } catch (_) {
      return;
    }
    if (!context?.show_english_beta_offer) return;

    await I18n.init(context.preferred_locale || 'sv-SE');
    injectStyles();
    const overlay = buildPanel();
    I18n.apply(overlay);
    document.body.appendChild(overlay);

    if (!viewedThisSession) {
      track('existing_family_language_offer_viewed', { locale: context.preferred_locale });
      viewedThisSession = true;
    }

    overlay.querySelectorAll('[data-offer-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        handleAction(btn.getAttribute('data-offer-action'), overlay);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    maybeShow().catch((err) => console.warn('[english-beta-offer] init failed:', err));
  });

  window.EnglishBetaOffer = { maybeShow };
})();
