/**
 * Min Stjärndag — Cookie-banner för utloggade sidor
 *
 * Implementerar:
 * - Google Consent Mode v2 (alla 7 parametrar)
 * - Meta Pixel med korrekt consent-hantering
 * - Granulära val (Nödvändiga, Analys, Marknadsföring, Personalisering)
 * - Persistens via localStorage + cc_consent cookie
 * - EU-kompatibel design (lika knappar, opt-in som standard)
 * - Footer-länk återöppnar bannern med sparade val
 *
 * Exporterar: window.CookieBanner.open()
 */
(function () {
  'use strict';

  // App Store Guideline 4.2: native apps must not show web-style elements.
  // Skip cookie banner entirely when running inside the native iOS/Android shell.
  if (typeof window !== 'undefined' && typeof Platform !== 'undefined' && Platform.isNative && Platform.isNative()) {
    return;
  }

  var GA4_ID   = 'G-8PYNFJH1EQ';
  var PIXEL_ID = '2130511090854218';
  var LS_KEY   = 'cookie_consent';      // localStorage-nyckel
  var CC_COOKIE = 'cc_consent';         // cookie-namn (1 år)

  // ─── Google Consent Mode v2 — default (allt nekat) ────────────────────────
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    'functionality_storage':  'granted',  // nödvändigt — alltid på
    'security_storage':       'granted',  // nödvändigt — alltid på
    'analytics_storage':      'denied',
    'ad_storage':             'denied',
    'ad_user_data':           'denied',
    'ad_personalization':     'denied',
    'personalization_storage':'denied',
    'wait_for_update':        500,
  });

  // Ladda gtag.js async
  (function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
  })();
  gtag('js', new Date());
  gtag('config', GA4_ID, { send_page_view: false });

  // ─── Meta Pixel stub (ingen tracking innan samtycke) ──────────────────────
  if (!window.fbq) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = [];
      t = b.createElement(e); t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('consent', 'revoke');
    fbq('init', PIXEL_ID);
  }

  // ─── Publikt Pixel-API (no-op tills samtycke ges) ─────────────────────────
  window.Pixel = {
    pageView:  function () {},
    lead:      function () {},
    purchase:  function () {},
  };

  // ─── localStorage-hjälpfunktioner ─────────────────────────────────────────

  /** @returns {{ analytics: boolean, marketing: boolean, personalization: boolean, timestamp: string } | null} */
  function loadConsent() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /** Sparar val + sätter cc_consent cookie (1 år) */
  function saveConsent(choices) {
    var data = {
      analytics:       choices.analytics,
      marketing:       choices.marketing,
      personalization: choices.personalization,
      timestamp:       new Date().toISOString(),
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
    // Sätt cookie 1 år
    var expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = CC_COOKIE + '=1; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
  }

  /** Kollar om cc_consent cookie finns */
  function hasCookie() {
    return document.cookie.split(';').some(function (c) {
      return c.trim().indexOf(CC_COOKIE + '=') === 0;
    });
  }

  // ─── Tillämpa samtycke på gtag + fbq ──────────────────────────────────────

  function applyConsent(choices) {
    var analyticsGranted      = !!choices.analytics;
    var marketingGranted      = !!choices.marketing;
    var personalizationGranted= !!choices.personalization;

    // Google Consent Mode v2 — alla 7 parametrar
    gtag('consent', 'update', {
      'functionality_storage':  'granted',
      'security_storage':       'granted',
      'analytics_storage':      analyticsGranted       ? 'granted' : 'denied',
      'ad_storage':             marketingGranted       ? 'granted' : 'denied',
      'ad_user_data':           marketingGranted       ? 'granted' : 'denied',
      'ad_personalization':     marketingGranted       ? 'granted' : 'denied',
      'personalization_storage':personalizationGranted ? 'granted' : 'denied',
    });

    // Skicka GA4 sidvisning om analytics tillåtet
    if (analyticsGranted) {
      gtag('event', 'page_view');
    }

    // Meta Pixel + Google Ads tag config
    if (marketingGranted) {
      fbq('consent', 'grant');
      fbq('track', 'PageView');
      // Aktivera Pixel-API
      window.Pixel = {
        pageView: function () { if (typeof fbq === 'function') fbq('track', 'PageView'); },
        lead:     function () { if (typeof fbq === 'function') fbq('track', 'Lead'); },
        purchase: function (amount, currency) {
          if (typeof fbq === 'function') fbq('track', 'Purchase', { value: amount, currency: currency || 'SEK' });
        },
      };
      if (window.MarketingEvents) MarketingEvents.configureGoogleAds();
    } else {
      fbq('consent', 'revoke');
      window.Pixel = { pageView: function(){}, lead: function(){}, purchase: function(){} };
    }
  }

  // ─── Banner-UI ────────────────────────────────────────────────────────────

  var BANNER_ID   = 'cb-banner';
  var SETTINGS_ID = 'cb-settings';

  function injectStyles() {
    if (document.getElementById('cb-styles')) return;
    var style = document.createElement('style');
    style.id = 'cb-styles';
    style.textContent = [
      // Banner (fast längst ner)
      '#cb-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(250,251,255,0.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(27,35,64,0.1);box-shadow:0 -4px 24px rgba(27,35,64,0.08);font-family:"Plus Jakarta Sans",sans-serif;animation:cb-slide-up 0.3s ease-out}',
      '@keyframes cb-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
      '#cb-banner.cb-hidden{display:none}',
      // Inner wrapper
      '.cb-inner{max-width:880px;margin:0 auto;padding:1.4rem 1.5rem}',
      // Text
      '.cb-text{font-size:0.95rem;color:#1B2340;line-height:1.55;margin-bottom:1rem}',
      // Rad med "Hantera" + primärknapparna
      '.cb-btn-row{display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center}',
      '.cb-btn-row-end{justify-content:flex-end}',
      // Knappar — ALLA tre identiska i form; "Hantera" är outline
      '.cb-btn{display:inline-flex;align-items:center;justify-content:center;padding:0.65rem 1.3rem;border-radius:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:0.9rem;font-weight:600;cursor:pointer;transition:opacity 0.15s,transform 0.1s;white-space:nowrap;text-decoration:none;border:none}',
      '.cb-btn:active{transform:scale(0.97)}',
      // Avvisa + Godkänn — identisk visuell vikt (navy bakgrund, vit text)
      '.cb-btn-deny{background:#1B2340;color:#fff}',
      '.cb-btn-deny:hover{opacity:0.85}',
      '.cb-btn-accept{background:#1B2340;color:#fff}',
      '.cb-btn-accept:hover{opacity:0.85}',
      // Hantera — outline-variant
      '.cb-btn-manage{background:transparent;color:#1B2340;border:1.5px solid rgba(27,35,64,0.25)}',
      '.cb-btn-manage:hover{background:rgba(27,35,64,0.06)}',
      // Expanderade inställningar
      '#cb-settings{margin-top:1rem;border-top:1px solid rgba(27,35,64,0.1);padding-top:1rem;display:none}',
      '#cb-settings.cb-open{display:block}',
      '.cb-category{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.8rem 0;border-bottom:1px solid rgba(27,35,64,0.07)}',
      '.cb-category:last-of-type{border-bottom:none}',
      '.cb-cat-left{display:flex;align-items:flex-start;gap:0.6rem;flex:1}',
      '.cb-cat-icon{font-size:1.1rem;flex-shrink:0;margin-top:1px}',
      '.cb-cat-body{}',
      '.cb-cat-label{display:block;font-weight:700;font-size:0.9rem;color:#1B2340;margin-bottom:2px}',
      '.cb-cat-desc{display:block;font-size:0.8rem;color:#5A6178;line-height:1.4}',
      // Toggle-switch
      '.cb-toggle-wrap{flex-shrink:0}',
      '.cb-toggle{position:relative;display:inline-block;width:44px;height:26px}',
      '.cb-toggle input{opacity:0;width:0;height:0;position:absolute}',
      '.cb-toggle-slider{position:absolute;inset:0;background:#d1d5db;border-radius:26px;cursor:pointer;transition:background 0.2s}',
      '.cb-toggle-slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.18)}',
      '.cb-toggle input:checked + .cb-toggle-slider{background:#1B2340}',
      '.cb-toggle input:checked + .cb-toggle-slider:before{transform:translateX(18px)}',
      '.cb-toggle input:disabled + .cb-toggle-slider{background:#6b7280;cursor:not-allowed;opacity:0.7}',
      // "Spara mina val"-knapp (efter expansion)
      '.cb-save-row{margin-top:1rem;display:flex;justify-content:center}',
      '.cb-btn-save{background:#1B2340;color:#fff;width:100%;max-width:280px;padding:0.75rem 1.5rem;border-radius:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:0.95rem;font-weight:700;cursor:pointer;border:none;transition:opacity 0.15s}',
      '.cb-btn-save:hover{opacity:0.85}',
      // Mobil — kompakt layout så bannern inte täcker halva skärmen
      '@media(max-width:600px){',
      '.cb-inner{padding:0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom,0px))}',
      '.cb-text{font-size:0.84rem;line-height:1.45;margin-bottom:0.7rem}',
      '.cb-btn-row{flex-direction:row;flex-wrap:wrap;gap:0.5rem;align-items:stretch}',
      '.cb-btn{padding:0.58rem 0.75rem;font-size:0.82rem;white-space:normal;text-align:center}',
      '.cb-btn-manage{order:3;flex:1 1 100%;padding:0.5rem 0.85rem}',
      '.cb-btn-deny,.cb-btn-accept{flex:1 1 calc(50% - 0.25rem);min-width:0}',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  // Returnerar nuvarande toggle-värden från bannern
  function getSettingsValues() {
    return {
      analytics:       !!document.getElementById('cb-toggle-analytics')?.checked,
      marketing:       !!document.getElementById('cb-toggle-marketing')?.checked,
      personalization: !!document.getElementById('cb-toggle-personalization')?.checked,
    };
  }

  function buildBanner(existingConsent) {
    injectStyles();

    var existing = existingConsent || {};

    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-inställningar');

    var inner = document.createElement('div');
    inner.className = 'cb-inner';

    // Text
    var text = document.createElement('p');
    text.className = 'cb-text';
    text.textContent = 'Vi använder cookies för analys, marknadsföring och personalisering på vår webbplats.';
    inner.appendChild(text);

    // Knapprad
    var btnRow = document.createElement('div');
    btnRow.className = 'cb-btn-row';

    var manageBtn = document.createElement('button');
    manageBtn.className = 'cb-btn cb-btn-manage';
    manageBtn.textContent = 'Hantera inställningar';
    manageBtn.type = 'button';

    var denyBtn = document.createElement('button');
    denyBtn.className = 'cb-btn cb-btn-deny';
    denyBtn.textContent = 'Avvisa alla';
    denyBtn.type = 'button';

    var acceptBtn = document.createElement('button');
    acceptBtn.className = 'cb-btn cb-btn-accept';
    acceptBtn.textContent = 'Godkänn alla';
    acceptBtn.type = 'button';

    btnRow.appendChild(manageBtn);
    btnRow.appendChild(denyBtn);
    btnRow.appendChild(acceptBtn);
    inner.appendChild(btnRow);

    // Expanderade inställningar
    var settings = document.createElement('div');
    settings.id = SETTINGS_ID;

    var categories = [
      {
        id:    'necessary',
        icon:  '🔒',
        label: 'Nödvändiga',
        desc:  'Krävs för att sidan ska fungera.',
        locked: true,
        checked: true,
      },
      {
        id:    'analytics',
        icon:  '📊',
        label: 'Analys & Statistik',
        desc:  'Hjälper oss förstå hur sidan används (GA4).',
        locked: false,
        checked: !!existing.analytics,
      },
      {
        id:    'marketing',
        icon:  '📢',
        label: 'Marknadsföring',
        desc:  'Visar relevanta annonser och mäter kampanjer.',
        locked: false,
        checked: !!existing.marketing,
      },
      {
        id:    'personalization',
        icon:  '🎯',
        label: 'Personalisering',
        desc:  'Anpassar innehåll och rekommendationer.',
        locked: false,
        checked: !!existing.personalization,
      },
    ];

    categories.forEach(function (cat) {
      var row = document.createElement('div');
      row.className = 'cb-category';

      var left = document.createElement('div');
      left.className = 'cb-cat-left';

      var icon = document.createElement('span');
      icon.className = 'cb-cat-icon';
      icon.textContent = cat.icon;

      var body = document.createElement('div');
      body.className = 'cb-cat-body';

      var label = document.createElement('span');
      label.className = 'cb-cat-label';
      label.textContent = cat.label;

      var desc = document.createElement('span');
      desc.className = 'cb-cat-desc';
      desc.textContent = cat.desc;

      body.appendChild(label);
      body.appendChild(desc);
      left.appendChild(icon);
      left.appendChild(body);

      var toggleWrap = document.createElement('div');
      toggleWrap.className = 'cb-toggle-wrap';

      var toggleLabel = document.createElement('label');
      toggleLabel.className = 'cb-toggle';
      toggleLabel.setAttribute('aria-label', cat.label);

      var input = document.createElement('input');
      input.type = 'checkbox';
      if (!cat.locked) input.id = 'cb-toggle-' + cat.id;
      input.checked = cat.checked;
      input.disabled = cat.locked;

      var slider = document.createElement('span');
      slider.className = 'cb-toggle-slider';

      toggleLabel.appendChild(input);
      toggleLabel.appendChild(slider);
      toggleWrap.appendChild(toggleLabel);

      row.appendChild(left);
      row.appendChild(toggleWrap);
      settings.appendChild(row);
    });

    // Spara mina val
    var saveRow = document.createElement('div');
    saveRow.className = 'cb-save-row';
    var saveBtn = document.createElement('button');
    saveBtn.className = 'cb-btn-save';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Spara mina val';
    saveRow.appendChild(saveBtn);
    settings.appendChild(saveRow);

    inner.appendChild(settings);
    banner.appendChild(inner);
    document.body.appendChild(banner);

    // ── Event handlers ──────────────────────────────────────────────────────

    manageBtn.addEventListener('click', function () {
      settings.classList.toggle('cb-open');
      manageBtn.textContent = settings.classList.contains('cb-open')
        ? 'Dölj inställningar'
        : 'Hantera inställningar';
    });

    denyBtn.addEventListener('click', function () {
      var choices = { analytics: false, marketing: false, personalization: false };
      saveConsent(choices);
      applyConsent(choices);
      removeBanner();
    });

    acceptBtn.addEventListener('click', function () {
      var choices = { analytics: true, marketing: true, personalization: true };
      saveConsent(choices);
      applyConsent(choices);
      removeBanner();
    });

    saveBtn.addEventListener('click', function () {
      var choices = getSettingsValues();
      saveConsent(choices);
      applyConsent(choices);
      removeBanner();
    });
  }

  function removeBanner() {
    var banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.25s';
    setTimeout(function () { banner.remove(); }, 260);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    var existing = loadConsent();

    if (existing && hasCookie()) {
      // Redan valt — tillämpa direkt utan banner
      applyConsent(existing);
      return;
    }

    // Visa banner på DOM-ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { buildBanner(null); });
    } else {
      buildBanner(null);
    }
  }

  // ─── Publikt API ──────────────────────────────────────────────────────────

  window.CookieBanner = {
    /**
     * Öppna bannern programmatiskt (t.ex. från footer-länk).
     * Förifylls med sparade val om de finns.
     */
    open: function () {
      removeBanner();
      var existing = loadConsent();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { buildBanner(existing); });
      } else {
        buildBanner(existing);
      }
    },
  };

  init();
})();
