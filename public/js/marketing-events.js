/**
 * marketing-events.js — GA4 sign_up + Google Ads conversion (consent-gated).
 *
 * HOW TO FIND YOUR GOOGLE ADS CONVERSION ID (AW-…/…):
 * 1. Google Ads → Mål (Goals) → Konverteringar → Sammanfattning
 * 2. + Ny konverteringsåtgärd → Webbplats
 * 3. Välj "Lägg till en konvertering manuellt med kod"
 * 4. Namn t.ex. "Registrering", kategori Registrering, värde 0 SEK
 * 5. Efter skapande: klicka konverteringen → Tagginstallation → "Använd Google-tagg"
 * 6. Kopiera:
 *    - ADS_ACCOUNT_ID  = 'AW-123456789'        (bara kontodelen)
 *    - ADS_SIGNUP_LABEL = 'AW-123456789/AbCdEf' (hela send_to-strängen)
 *
 * Alternativ: Importera GA4 key event "sign_up" och hoppa över ADS_SIGNUP_LABEL
 * (då räcker det att länka GA4 ↔ Google Ads i Analytics Admin).
 */
(function () {
  'use strict';

  const GA4_ID = 'G-8PYNFJH1EQ';

  /** Google Ads account ID — loads the Ads tag (remarketing + enhanced conversions). */
  const ADS_ACCOUNT_ID = 'AW-7601142474';

  /**
   * Full send_to label for a *manually* created Ads conversion, e.g. 'AW-123456789/AbCdEfGh'.
   * Left empty on purpose: the signup conversion is imported from GA4 (key event 'sign_up'),
   * so Google Ads counts it via the GA4 ↔ Ads link — there is no separate Ads conversion label.
   */
  const ADS_SIGNUP_LABEL = '';

  function getCookieConsent() {
    try {
      const raw = localStorage.getItem('cookie_consent');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function hasAnalyticsConsent() {
    const cc = getCookieConsent();
    if (cc) return !!cc.analytics;
    const ac = window.AppConsent && AppConsent.get();
    if (ac) return ac.analytics_storage === 'granted';
    return false;
  }

  function hasMarketingConsent() {
    const cc = getCookieConsent();
    if (cc) return !!cc.marketing;
    const ac = window.AppConsent && AppConsent.get();
    if (ac) return ac.ad_storage === 'granted';
    return false;
  }

  function gtagFn() {
    return typeof window.gtag === 'function' ? window.gtag : null;
  }

  function configureGoogleAds() {
    const gtag = gtagFn();
    if (!gtag || !ADS_ACCOUNT_ID || !hasMarketingConsent()) return;
    gtag('config', ADS_ACCOUNT_ID);
  }

  function getAttribution() {
    if (window.UtmCapture && typeof UtmCapture.get === 'function') {
      return UtmCapture.get() || {};
    }
    return {};
  }

  function isNativeApp() {
    try {
      if (window.Platform && typeof Platform.isNative === 'function') return !!Platform.isNative();
      return !!(
        window.Capacitor &&
        typeof Capacitor.isNativePlatform === 'function' &&
        Capacitor.isNativePlatform()
      );
    } catch (_) {
      return false;
    }
  }

  function trackMetaSignup(method) {
    if (!hasMarketingConsent()) return;
    const signupMethod = method || 'email';

    // Native: Meta App Events only (avoid Pixel + App Events double-count).
    if (isNativeApp()) {
      if (window.MetaAppEvents && typeof MetaAppEvents.trackRegistrationCompleted === 'function') {
        MetaAppEvents.trackRegistrationCompleted({ method: signupMethod });
      }
      return;
    }

    if (typeof window.fbq !== 'function') return;
    const payload = { content_name: signupMethod };
    const utm = getAttribution();
    if (utm.utm_source) payload.source = utm.utm_source;
    if (utm.utm_campaign) payload.campaign = utm.utm_campaign;
    fbq('track', 'CompleteRegistration', payload);
    fbq('track', 'Lead');
    if (window.Pixel && typeof window.Pixel.lead === 'function') window.Pixel.lead();
  }

  /**
   * Fire GA4 sign_up (analytics consent) and Meta/Google Ads (marketing consent).
   * @param {string} [method] email | apple | google
   */
  function trackSignup(method) {
    const gtag = gtagFn();
    const utm = getAttribution();
    const signupMethod = method || 'email';

    if (gtag && hasAnalyticsConsent()) {
      gtag('event', 'sign_up', Object.assign({
        method: signupMethod,
        send_to: GA4_ID,
      }, utm));
    }

    if (hasMarketingConsent() && ADS_SIGNUP_LABEL && gtag) {
      gtag('event', 'conversion', {
        send_to: ADS_SIGNUP_LABEL,
        value: 0,
        currency: 'SEK',
      });
    }

    trackMetaSignup(signupMethod);

    if (window.UtmCapture && typeof UtmCapture.clear === 'function') {
      UtmCapture.clear();
    }
  }

  window.AdsConversion = {
    signup: trackSignup,
    onboarding: function () { /* reserved for onboarding_complete */ },
  };

  window.MarketingEvents = {
    GA4_ID: GA4_ID,
    ADS_ACCOUNT_ID: ADS_ACCOUNT_ID,
    ADS_SIGNUP_LABEL: ADS_SIGNUP_LABEL,
    configureGoogleAds: configureGoogleAds,
    trackSignup: trackSignup,
    hasAnalyticsConsent: hasAnalyticsConsent,
    hasMarketingConsent: hasMarketingConsent,
  };
})();
