/**
 * Min Stjärndag — App Consent Manager (inloggade användare)
 *
 * GDPR + Google Consent Mode v2 + Meta Pixel
 *
 * Flöde:
 * 1. Vid sidladdning: hämtar samtycken från backend (kräver inloggning).
 * 2. Om inga samtycken finns i DB → visar modal.
 * 3. Tillämpar samtycken på gtag + fbq.
 * 4. Exponerar AppConsent.open() så inställningssidan kan öppna modalen igen.
 *
 * Beroenden: Auth (auth.js) måste vara laddad innan detta skript.
 */
(function () {
  'use strict';

  const GA4_ID = 'G-8PYNFJH1EQ';
  const PIXEL_ID = '2130511090854218';

  // ─── GA4 Setup ──────────────────────────────────────────────────────────────
  // Default consent: denied for EVERYTHING before we know the user's choices.
  // gtag.js is loaded async below; it queues commands until ready.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    'ad_storage':         'denied',
    'analytics_storage':  'denied',
    'ad_user_data':       'denied',
    'ad_personalization': 'denied',
    'wait_for_update':    500,   // ms — gives us time to call update before first hit
  });

  // Load gtag.js async
  (function loadGtag() {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
  })();

  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: false }); // we send after consent update

  // ─── Native detection ───────────────────────────────────────────────────────
  // Meta Pixel is a WEB-only tracking mechanism. Inside the Capacitor native
  // iOS/Android WebView it must never load or initialize — native Meta App
  // Events (see meta-app-events.js, itself gated on marketing consent + the
  // native FacebookEvents plugin) is the only Meta integration point on native,
  // and that plugin is currently excluded from the release build entirely
  // (Meta App Events is paused — see capacitor.config.ts).
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

  // ─── Meta Pixel stub (pre-consent) ──────────────────────────────────────────
  if (isNativeApp()) {
    // Never load fbevents.js and never initialize the real Pixel on native.
    // `fbq` stays a permanently inert no-op so any bare `fbq(...)` call
    // elsewhere in the app (e.g. applyConsent() below) never throws.
    if (!window.fbq) window.fbq = function () {};
  } else if (!window.fbq) {
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];
      t=b.createElement(e);t.async=!0;
      t.src=v;
      s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('consent', 'revoke'); // start revoked — update later
    fbq('init', PIXEL_ID);
  }

  // ─── Internal state ─────────────────────────────────────────────────────────
  let _consent = null; // null = not loaded yet

  /**
   * Apply consent choices to gtag + fbq.
   * @param {object} c — consent object from DB
   */
  function applyConsent(c) {
    _consent = c;

    // Google Consent Mode v2
    const analyticsGranted = c.analytics_storage === 'granted';
    const adGranted        = c.ad_storage        === 'granted';
    const dataGranted      = c.ad_user_data      === 'granted';
    const personGranted    = c.ad_personalization=== 'granted';

    gtag('consent', 'update', {
      'analytics_storage':  analyticsGranted ? 'granted' : 'denied',
      'ad_storage':         adGranted        ? 'granted' : 'denied',
      'ad_user_data':       dataGranted      ? 'granted' : 'denied',
      'ad_personalization': personGranted    ? 'granted' : 'denied',
    });

    // Send GA4 page view now that consent is set
    if (analyticsGranted) {
      gtag('event', 'page_view');
    }

    // Meta Pixel + native Meta App Events (consent-gated; no AutoLog before grant)
    if (adGranted) {
      fbq('consent', 'grant');
      fbq('track', 'PageView');
      if (window.MarketingEvents) MarketingEvents.configureGoogleAds();
      if (window.MetaAppEvents && typeof MetaAppEvents.onConsentGranted === 'function') {
        MetaAppEvents.onConsentGranted();
      }
    } else {
      fbq('consent', 'revoke');
      if (window.MetaAppEvents && typeof MetaAppEvents.onConsentRevoked === 'function') {
        MetaAppEvents.onConsentRevoked();
      }
    }

    // Expose Pixel API
    window.Pixel = {
      pageView: function () { if (adGranted && typeof fbq === 'function') fbq('track', 'PageView'); },
      lead:     function () { if (adGranted && typeof fbq === 'function') fbq('track', 'Lead'); },
      purchase: function (amount, currency) {
        if (adGranted && typeof fbq === 'function') {
          fbq('track', 'Purchase', { value: amount, currency: currency || 'SEK' });
        }
      },
    };
  }

  /**
   * Save consent to backend and apply.
   * @param {object} choices — { analytics_storage, ad_storage, ... } all 'granted'|'denied'|'pending'
   */
  async function saveConsent(choices) {
    try {
      await Auth.api('/api/consent', {
        method: 'POST',
        body: JSON.stringify(choices),
      });
      applyConsent(choices);
    } catch (err) {
      console.warn('[AppConsent] Save failed:', err);
    }
  }

  // ─── Modal ──────────────────────────────────────────────────────────────────

  /**
   * Render toggle UI element.
   * state: 'pending' | 'granted' | 'denied'
   */
  function createToggle(id, label, description, state) {
    const stateData = {
      pending: { icon: '—', cls: 'msj-toggle--neutral', next: 'granted' },
      granted: { icon: '✓', cls: 'msj-toggle--granted', next: 'denied' },
      denied:  { icon: '✗', cls: 'msj-toggle--denied',  next: 'pending' },
    };
    const cur = stateData[state] || stateData.pending;

    const wrap = document.createElement('div');
    wrap.className = 'msj-consent-row';
    wrap.innerHTML =
      '<div class="msj-consent-row-text">' +
        '<span class="msj-consent-row-label">' + label + '</span>' +
        '<span class="msj-consent-row-desc">' + description + '</span>' +
      '</div>' +
      '<button type="button" class="msj-toggle ' + cur.cls + '" data-state="' + state + '" data-id="' + id + '" aria-label="' + label + '">' +
        cur.icon +
      '</button>';

    const btn = wrap.querySelector('.msj-toggle');
    btn.addEventListener('click', function () {
      const curState = btn.dataset.state;
      const next = stateData[curState].next;
      btn.dataset.state = next;
      btn.className = 'msj-toggle ' + stateData[next].cls;
      btn.textContent = stateData[next].icon;
      checkSaveEnabled();
    });

    return wrap;
  }

  function checkSaveEnabled() {
    const modal = document.getElementById('msj-consent-modal');
    if (!modal) return;
    const btns = modal.querySelectorAll('.msj-toggle');
    let anyActive = false;
    btns.forEach(function (b) {
      if (b.dataset.state === 'granted' || b.dataset.state === 'denied') anyActive = true;
    });
    const saveBtn = document.getElementById('msj-consent-save');
    if (saveBtn) saveBtn.disabled = !anyActive;
  }

  function getToggleValues(modal) {
    const result = {};
    modal.querySelectorAll('.msj-toggle').forEach(function (b) {
      result[b.dataset.id] = b.dataset.state;
    });
    return result;
  }

  const TOGGLES = [
    {
      id: 'analytics_storage',
      label: 'Analys & Förbättring',
      desc: 'Hjälper oss förstå hur appen används så vi kan göra den bättre.',
    },
    {
      id: 'ad_storage',
      label: 'Marknadsföring',
      desc: 'Visar annonser anpassade till dig på Meta (Facebook/Instagram) och Google.',
    },
    {
      id: 'ad_user_data',
      label: 'Data till plattformar',
      desc: 'Delar din data med annonsplattformar för bättre matchning.',
    },
    {
      id: 'ad_personalization',
      label: 'Personalisering',
      desc: 'Anpassar annonser baserade på dina intressen och beteende.',
    },
    {
      id: 'email_communication',
      label: 'E-post & Tips',
      desc: 'Utskick med tips, nyheter och erbjudanden från Min Stjärndag.',
    },
  ];

  function buildModal(currentConsent) {
    const existing = currentConsent || {};

    // Inject styles
    if (!document.getElementById('msj-consent-styles')) {
      const style = document.createElement('style');
      style.id = 'msj-consent-styles';
      style.textContent = [
        '#msj-consent-overlay{position:fixed;inset:0;z-index:9999;background:rgba(27,35,64,0.6);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px)}',
        '#msj-consent-modal{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(27,35,64,0.25);width:100%;max-width:480px;overflow:hidden;font-family:"Plus Jakarta Sans",sans-serif}',
        '.msj-consent-header{background:#1B2340;padding:20px 24px;display:flex;align-items:center;gap:12px}',
        '.msj-consent-header h2{color:#fff;font-family:"Outfit",sans-serif;font-size:20px;font-weight:700;margin:0}',
        '.msj-consent-body{padding:20px 24px}',
        '.msj-consent-intro{color:#5A6178;font-size:14px;line-height:1.6;margin-bottom:20px}',
        '.msj-consent-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #EDE7F6}',
        '.msj-consent-row:last-child{border-bottom:none}',
        '.msj-consent-row-text{flex:1}',
        '.msj-consent-row-label{display:block;font-weight:600;color:#1B2340;font-size:14px;margin-bottom:2px}',
        '.msj-consent-row-desc{display:block;color:#5A6178;font-size:12px;line-height:1.4}',
        '.msj-toggle{width:44px;height:44px;border-radius:12px;border:none;cursor:pointer;font-size:18px;font-weight:700;flex-shrink:0;transition:background 0.15s,color 0.15s;display:flex;align-items:center;justify-content:center}',
        '.msj-toggle--neutral{background:#E8F0FE;color:#5A6178}',
        '.msj-toggle--granted{background:#E0F5EC;color:#16a34a}',
        '.msj-toggle--denied{background:#FDEAE7;color:#dc2626}',
        '.msj-consent-footer{padding:16px 24px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #EDE7F6}',
        '.msj-consent-save{width:100%;padding:13px;background:#F5A623;color:#1B2340;border:none;border-radius:12px;font-family:"Outfit",sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:background 0.15s}',
        '.msj-consent-save:disabled{background:#d1d5db;color:#6b7280;cursor:not-allowed}',
        '.msj-consent-save:not(:disabled):hover{background:#e09400}',
        '.msj-consent-skip{width:100%;padding:10px;background:transparent;color:#5A6178;border:1px solid #EDE7F6;border-radius:12px;font-size:14px;cursor:pointer;transition:background 0.15s}',
        '.msj-consent-skip:hover{background:#f9fafb}',
      ].join('');
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'msj-consent-overlay';

    const modal = document.createElement('div');
    modal.id = 'msj-consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Samtyckesinställningar');

    // Header
    const header = document.createElement('div');
    header.className = 'msj-consent-header';
    header.innerHTML = '<span style="font-size:24px">⭐</span><h2>Samtycke & Integritet</h2>';

    // Body
    const body = document.createElement('div');
    body.className = 'msj-consent-body';

    const intro = document.createElement('p');
    intro.className = 'msj-consent-intro';
    intro.textContent = 'Hjälp oss att göra Min Stjärndag ännu bättre. Vi använder cookies för att förstå hur appen används och för att nå ut till fler familjer. Klicka på varje kategori för att växla ✓ Ja / ✗ Nej / — Neutral.';
    body.appendChild(intro);

    // Toggles
    TOGGLES.forEach(function (t) {
      const curState = existing[t.id] || 'pending';
      body.appendChild(createToggle(t.id, t.label, t.desc, curState));
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'msj-consent-footer';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'msj-consent-save';
    saveBtn.className = 'msj-consent-save';
    saveBtn.textContent = 'Spara val';
    saveBtn.disabled = true; // enabled when user makes at least one active choice
    saveBtn.addEventListener('click', async function () {
      const values = getToggleValues(modal);
      saveBtn.disabled = true;
      saveBtn.textContent = 'Sparar…';
      await saveConsent(values);
      removeModal();
    });

    const skipBtn = document.createElement('button');
    skipBtn.className = 'msj-consent-skip';
    skipBtn.textContent = 'Hoppa över';
    skipBtn.addEventListener('click', async function () {
      // Save all as 'pending' — neutral, modal won't show again
      const allPending = {};
      TOGGLES.forEach(function (t) { allPending[t.id] = 'pending'; });
      skipBtn.disabled = true;
      skipBtn.textContent = 'Stänger…';
      await saveConsent(allPending);
      removeModal();
    });

    footer.appendChild(saveBtn);
    footer.appendChild(skipBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Initial save button state (for pre-filled values)
    checkSaveEnabled();
  }

  function removeModal() {
    const overlay = document.getElementById('msj-consent-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s';
      setTimeout(function () { overlay.remove(); }, 260);
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    // Only runs when user is a logged-in parent
    if (!Auth.isLoggedIn()) return;
    const user = Auth.getUser();
    if (!user || user.type === 'child') return;

    try {
      const data = await Auth.api('/api/consent');
      if (data.consent === null) {
        // No record in DB — show modal
        buildModal(null);
      } else {
        // Apply existing consent choices
        applyConsent(data.consent);
      }
    } catch (err) {
      // If consent API fails (e.g. table not migrated yet), fail open — don't block the app
      console.warn('[AppConsent] Failed to load consent:', err);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  window.AppConsent = {
    /**
     * Open the consent modal programmatically (e.g. from Settings page).
     */
    open: function () {
      const existing = document.getElementById('msj-consent-overlay');
      if (existing) return; // already open
      buildModal(_consent || {});
      checkSaveEnabled();
    },

    /**
     * Get current consent state.
     */
    get: function () { return _consent; },
  };

  // Kick off on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
