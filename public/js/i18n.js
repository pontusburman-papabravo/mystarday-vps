/**
 * Client i18n — loads locale bundles from /api/i18n/:lang and applies data-i18n attributes.
 * Locale persistence: sessionStorage pre-auth; family.preferred_locale after login (via I18n.init).
 */
const I18n = {
  locale: {},
  lang: 'sv-SE',
  _ready: null,
  _englishAppEnabled: false,
  DEFAULT_LOCALE: 'sv-SE',
  CANONICAL_FALLBACK_LOCALE: 'en-GB',
  // BEGIN LOCALE_CATALOG
  CATALOG: {
    "defaultLocale": "sv-SE",
    "fallbackLocale": "en-GB",
    "locales": [
      {
        "id": "sv-SE",
        "nativeName": "Svenska",
        "base": "sv",
        "aliases": [
          "sv",
          "sv-se"
        ],
        "inputAliases": [
          "sv"
        ],
        "legacyJourneyTags": [
          "sv"
        ],
        "experiencePack": "child_se",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "canonical-db"
      },
      {
        "id": "en-GB",
        "nativeName": "English",
        "base": "en",
        "aliases": [
          "en",
          "en-gb",
          "en-us"
        ],
        "inputAliases": [
          "en"
        ],
        "legacyJourneyTags": [
          "en"
        ],
        "experiencePack": "child_en",
        "availability": "public",
        "showOnFirstRun": true,
        "selectRequiresFeature": "english_app",
        "grantFeatureOnRegister": "english_app",
        "contentSource": "locale-files",
        "contentMap": "sv-to-en.json"
      },
      {
        "id": "de-DE",
        "nativeName": "Deutsch",
        "base": "de",
        "aliases": [
          "de",
          "de-de"
        ],
        "inputAliases": [
          "de"
        ],
        "legacyJourneyTags": [
          "de"
        ],
        "experiencePack": "child_de",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "de-DE.json"
      },
      {
        "id": "fr-FR",
        "nativeName": "Français",
        "base": "fr",
        "aliases": [
          "fr",
          "fr-fr"
        ],
        "inputAliases": [
          "fr"
        ],
        "legacyJourneyTags": [
          "fr"
        ],
        "experiencePack": "child_fr",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "fr-FR.json"
      },
      {
        "id": "nl-NL",
        "nativeName": "Nederlands",
        "base": "nl",
        "aliases": [
          "nl",
          "nl-nl"
        ],
        "inputAliases": [
          "nl"
        ],
        "legacyJourneyTags": [
          "nl"
        ],
        "experiencePack": "child_nl",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "nl-NL.json"
      },
      {
        "id": "da-DK",
        "nativeName": "Dansk",
        "base": "da",
        "aliases": [
          "da",
          "da-dk"
        ],
        "inputAliases": [
          "da"
        ],
        "legacyJourneyTags": [
          "da"
        ],
        "experiencePack": "child_da",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "da-DK.json"
      },
      {
        "id": "fi-FI",
        "nativeName": "Suomi",
        "base": "fi",
        "aliases": [
          "fi",
          "fi-fi"
        ],
        "inputAliases": [
          "fi"
        ],
        "legacyJourneyTags": [
          "fi"
        ],
        "experiencePack": "child_fi",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "fi-FI.json"
      },
      {
        "id": "nb-NO",
        "nativeName": "Norsk bokmål",
        "base": "nb",
        "aliases": [
          "nb",
          "nb-no",
          "no"
        ],
        "inputAliases": [
          "nb",
          "no"
        ],
        "legacyJourneyTags": [
          "nb",
          "no"
        ],
        "experiencePack": "child_nb",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "nb-NO.json"
      },
      {
        "id": "es-ES",
        "nativeName": "Español",
        "base": "es",
        "aliases": [
          "es",
          "es-es"
        ],
        "inputAliases": [
          "es"
        ],
        "legacyJourneyTags": [
          "es"
        ],
        "experiencePack": "child_es",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "es-ES.json"
      },
      {
        "id": "it-IT",
        "nativeName": "Italiano",
        "base": "it",
        "aliases": [
          "it",
          "it-it"
        ],
        "inputAliases": [
          "it"
        ],
        "legacyJourneyTags": [
          "it"
        ],
        "experiencePack": "child_it",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "it-IT.json"
      },
      {
        "id": "pt-PT",
        "nativeName": "Português",
        "base": "pt",
        "aliases": [
          "pt",
          "pt-pt"
        ],
        "inputAliases": [
          "pt"
        ],
        "legacyJourneyTags": [
          "pt"
        ],
        "experiencePack": "child_pt",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "pt-PT.json"
      },
      {
        "id": "pl-PL",
        "nativeName": "Polski",
        "base": "pl",
        "aliases": [
          "pl",
          "pl-pl"
        ],
        "inputAliases": [
          "pl"
        ],
        "legacyJourneyTags": [
          "pl"
        ],
        "experiencePack": "child_pl",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "pl-PL.json"
      },
      {
        "id": "cs-CZ",
        "nativeName": "Čeština",
        "base": "cs",
        "aliases": [
          "cs",
          "cs-cz"
        ],
        "inputAliases": [
          "cs"
        ],
        "legacyJourneyTags": [
          "cs"
        ],
        "experiencePack": "child_cs",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "cs-CZ.json"
      },
      {
        "id": "sk-SK",
        "nativeName": "Slovenčina",
        "base": "sk",
        "aliases": [
          "sk",
          "sk-sk"
        ],
        "inputAliases": [
          "sk"
        ],
        "legacyJourneyTags": [
          "sk"
        ],
        "experiencePack": "child_sk",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "sk-SK.json"
      },
      {
        "id": "sl-SI",
        "nativeName": "Slovenščina",
        "base": "sl",
        "aliases": [
          "sl",
          "sl-si"
        ],
        "inputAliases": [
          "sl"
        ],
        "legacyJourneyTags": [
          "sl"
        ],
        "experiencePack": "child_sl",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "sl-SI.json"
      },
      {
        "id": "hr-HR",
        "nativeName": "Hrvatski",
        "base": "hr",
        "aliases": [
          "hr",
          "hr-hr"
        ],
        "inputAliases": [
          "hr"
        ],
        "legacyJourneyTags": [
          "hr"
        ],
        "experiencePack": "child_hr",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "hr-HR.json"
      },
      {
        "id": "hu-HU",
        "nativeName": "Magyar",
        "base": "hu",
        "aliases": [
          "hu",
          "hu-hu"
        ],
        "inputAliases": [
          "hu"
        ],
        "legacyJourneyTags": [
          "hu"
        ],
        "experiencePack": "child_hu",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "hu-HU.json"
      },
      {
        "id": "ro-RO",
        "nativeName": "Română",
        "base": "ro",
        "aliases": [
          "ro",
          "ro-ro"
        ],
        "inputAliases": [
          "ro"
        ],
        "legacyJourneyTags": [
          "ro"
        ],
        "experiencePack": "child_ro",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "ro-RO.json"
      },
      {
        "id": "bg-BG",
        "nativeName": "Български",
        "base": "bg",
        "aliases": [
          "bg",
          "bg-bg"
        ],
        "inputAliases": [
          "bg"
        ],
        "legacyJourneyTags": [
          "bg"
        ],
        "experiencePack": "child_bg",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "bg-BG.json"
      },
      {
        "id": "el-GR",
        "nativeName": "Ελληνικά",
        "base": "el",
        "aliases": [
          "el",
          "el-gr"
        ],
        "inputAliases": [
          "el"
        ],
        "legacyJourneyTags": [
          "el"
        ],
        "experiencePack": "child_el",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "el-GR.json"
      },
      {
        "id": "et-EE",
        "nativeName": "Eesti",
        "base": "et",
        "aliases": [
          "et",
          "et-ee"
        ],
        "inputAliases": [
          "et"
        ],
        "legacyJourneyTags": [
          "et"
        ],
        "experiencePack": "child_et",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "et-EE.json"
      },
      {
        "id": "lt-LT",
        "nativeName": "Lietuvių",
        "base": "lt",
        "aliases": [
          "lt",
          "lt-lt"
        ],
        "inputAliases": [
          "lt"
        ],
        "legacyJourneyTags": [
          "lt"
        ],
        "experiencePack": "child_lt",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "lt-LT.json"
      },
      {
        "id": "lv-LV",
        "nativeName": "Latviešu",
        "base": "lv",
        "aliases": [
          "lv",
          "lv-lv"
        ],
        "inputAliases": [
          "lv"
        ],
        "legacyJourneyTags": [
          "lv"
        ],
        "experiencePack": "child_lv",
        "availability": "public",
        "showOnFirstRun": true,
        "contentSource": "locale-files",
        "contentMap": "lv-LV.json"
      },
      {
        "id": "is-IS",
        "nativeName": "Íslenska",
        "base": "is",
        "aliases": [
          "is",
          "is-is"
        ],
        "inputAliases": [
          "is"
        ],
        "legacyJourneyTags": [
          "is"
        ],
        "experiencePack": "child_is",
        "availability": "registered",
        "showOnFirstRun": false,
        "contentSource": "locale-files",
        "contentMap": "is-IS.json"
      },
      {
        "id": "ga-IE",
        "nativeName": "Gaeilge",
        "base": "ga",
        "aliases": [
          "ga",
          "ga-ie"
        ],
        "inputAliases": [
          "ga"
        ],
        "legacyJourneyTags": [
          "ga"
        ],
        "experiencePack": "child_ga",
        "availability": "registered",
        "showOnFirstRun": false,
        "contentSource": "locale-files",
        "contentMap": "ga-IE.json"
      },
      {
        "id": "mt-MT",
        "nativeName": "Malti",
        "base": "mt",
        "aliases": [
          "mt",
          "mt-mt"
        ],
        "inputAliases": [
          "mt"
        ],
        "legacyJourneyTags": [
          "mt"
        ],
        "experiencePack": "child_mt",
        "availability": "registered",
        "showOnFirstRun": false,
        "contentSource": "locale-files",
        "contentMap": "mt-MT.json"
      }
    ]
  },
    // END LOCALE_CATALOG

  STORAGE_KEY: 'sd_preferred_locale',

  _readStoredLocale() {
    try {
      return sessionStorage.getItem(this.STORAGE_KEY)
        || localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Initialise locale: explicit > sessionStorage > /api/auth/me > Accept-Language > sv-SE
   * @param {string} [explicitLang]
   */
  async init(explicitLang) {
    const requested = this._normalize(explicitLang);

    // Explicit family locale must win even if an earlier init() already loaded sv-SE.
    if (requested && this.lang !== requested) {
      await this.load(requested);
      this._ready = Promise.resolve();
      return;
    }

    if (this._ready) return this._ready;

    this._ready = (async () => {
      let lang = requested
        || this._normalize(this._readStoredLocale());

      if (!lang && window.Auth && typeof Auth.getUser === 'function') {
        const user = Auth.getUser();
        if (user?.preferred_locale) lang = this._normalize(user.preferred_locale);
      }

      if (
        !lang &&
        window.Auth &&
        typeof Auth.api === 'function' &&
        typeof Auth.isLoggedIn === 'function' &&
        Auth.isLoggedIn()
      ) {
        try {
          const me = await Auth.api('/api/auth/me');
          if (me?.preferred_locale) lang = this._normalize(me.preferred_locale);
        } catch (_) {
          /* not logged in */
        }
      }

      if (!lang) {
        lang = this._fromNavigator() || this.DEFAULT_LOCALE;
      }

      await this.load(lang);
    })();

    return this._ready;
  },

  _catalogLocales() {
    return (this.CATALOG && this.CATALOG.locales) || [];
  },

  _listedAvailability(locale) {
    const value = locale && locale.availability;
    if (value === 'public' || value === 'always' || value === 'english_app') return 'public';
    if (value === 'enabled') return 'enabled';
    return 'registered';
  },

  _selectFeature(locale) {
    if (!locale) return null;
    if (locale.selectRequiresFeature) return locale.selectRequiresFeature;
    if (locale.availability === 'english_app') return 'english_app';
    return null;
  },

  _shownOnFirstRun(locale) {
    if (!locale) return false;
    const availability = this._listedAvailability(locale);
    if (availability === 'registered') return false;
    if (locale.showOnFirstRun === false) return false;
    if (locale.showOnFirstRun === true) return true;
    return availability === 'public';
  },

  _localeRow(locale) {
    return {
      id: locale.id,
      nativeName: locale.nativeName,
      base: locale.base,
      availability: this._listedAvailability(locale),
      showOnFirstRun: this._shownOnFirstRun(locale),
      selectRequiresFeature: this._selectFeature(locale),
      experiencePackRequiresFlag: locale.experiencePackRequiresFlag || null,
    };
  },

  selectorLocales() {
    return this._catalogLocales()
      .filter((locale) => this._listedAvailability(locale) !== 'registered')
      .filter((locale) => this._listedAvailability(locale) === 'public' || locale.showOnFirstRun === true)
      .map((locale) => this._localeRow(locale));
  },

  firstRunLocales() {
    return this.selectorLocales().filter((locale) => locale.showOnFirstRun);
  },

  _normalize(raw) {
    // A tag resolves only when the catalog has one matching bundle. It never aliases to sv-SE.
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const locales = this._catalogLocales();
    for (let i = 0; i < locales.length; i++) {
      if (locales[i].id === s) return locales[i].id;
    }
    const lower = s.toLowerCase();
    for (let i = 0; i < locales.length; i++) {
      const aliases = locales[i].aliases || [];
      for (let a = 0; a < aliases.length; a++) {
        if (String(aliases[a]).toLowerCase() === lower) return locales[i].id;
      }
    }
    const base = lower.split(/[-_]/)[0];
    const baseHits = [];
    for (let i = 0; i < locales.length; i++) {
      if (locales[i].base === base) baseHits.push(locales[i].id);
    }
    if (baseHits.length === 1) return baseHits[0];
    return null;
  },

  isSwedishLocale(raw) {
    const canonical = this._normalize(raw != null && raw !== '' ? raw : this.lang);
    return canonical === this.DEFAULT_LOCALE;
  },

  allowsSwedishLiteralFallback() {
    return this.isSwedishLocale();
  },

  literalFallback(key, fallback) {
    if (fallback == null || fallback === '') return key;
    if (this.allowsSwedishLiteralFallback()) return String(fallback);
    return key;
  },

  tOrLiteral(key, fallback, params) {
    const val = this.t(key, params || {});
    if (val !== key) return val;
    return this.literalFallback(key, fallback);
  },

  _setPending(on) {
    const html = document.documentElement;
    if (!html || typeof html.setAttribute !== 'function' || typeof html.removeAttribute !== 'function') {
      return;
    }
    if (on) html.setAttribute('data-i18n-pending', '1');
    else html.removeAttribute('data-i18n-pending');
  },

  _clearPending() {
    this._setPending(false);
  },

  _applyBootHint() {
    try {
      const stored = this._normalize(this._readStoredLocale());
      const hinted = stored || this._fromNavigator();
      if (hinted) this.lang = hinted;
      if (hinted && hinted !== this.DEFAULT_LOCALE) this._setPending(true);
    } catch {
      /* incomplete globals (tests) */
    }
  },

  _catalogEntry(id) {
    const locales = this._catalogLocales();
    for (let i = 0; i < locales.length; i++) {
      if (locales[i].id === id) return locales[i];
    }
    return null;
  },

  _fromNavigator() {
    try {
      const langs = navigator.languages || [navigator.language || ''];
      for (const l of langs) {
        const n = this._normalize(l);
        const entry = n && this._catalogEntry(n);
        // Registered locales are known but not chosen from the browser.
        if (entry && this._listedAvailability(entry) === 'public') return n;
      }
    } catch {
      return null;
    }
    return null;
  },

  async _fetchLocale(locale) {
    try {
      const res = await fetch(`/api/i18n/${encodeURIComponent(locale)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async load(lang = this.DEFAULT_LOCALE) {
    const canonical = this._normalize(lang) || this.DEFAULT_LOCALE;
    try {
      const fetched = await this._fetchLocale(canonical);
      if (fetched) {
        this.locale = fetched;
        this.lang = canonical;
      } else if (canonical !== this.CANONICAL_FALLBACK_LOCALE) {
        const fallback = await this._fetchLocale(this.CANONICAL_FALLBACK_LOCALE);
        this.locale = fallback || {};
        this.lang = fallback ? this.CANONICAL_FALLBACK_LOCALE : canonical;
      } else {
        this.locale = {};
        this.lang = canonical;
      }
      sessionStorage.setItem(this.STORAGE_KEY, this.lang);
      try { localStorage.setItem(this.STORAGE_KEY, this.lang); } catch { /* ignore */ }
      this._setHtmlLang();
    } catch (err) {
      console.warn('[i18n] Failed to load locale:', err);
    } finally {
      this.apply();
    }
  },

  _setHtmlLang() {
    document.documentElement.lang = this.lang.toLowerCase();
  },

  /**
   * Get a translation by dot-notation key. Safe — returns key if missing.
   * @param {string} key
   * @param {Record<string, string|number>} [params]
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.locale;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value !== 'string') {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing client key: ${key}`);
      }
      return key;
    }
    const merged = Object.assign({}, params);
    if (merged.brand == null || merged.brand === '') {
      const appName = this.locale && this.locale.app && this.locale.app.name;
      if (typeof appName === 'string' && appName.indexOf('{{') === -1) merged.brand = appName;
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(merged[k] ?? ''));
  },

  /**
   * Plural helper. The category comes from Intl.PluralRules.
   * one/other is only the fallback when Intl.PluralRules is unavailable.
   * @param {string} baseKey dot path without a plural suffix
   * @param {number} count
   * @param {Record<string, string|number>} [params]
   */
  plural(baseKey, count, params = {}) {
    const n = Number(count);
    let category;
    try {
      category = new Intl.PluralRules(this.lang || this.DEFAULT_LOCALE).select(Number.isFinite(n) ? n : 0);
    } catch (_) {
      category = n === 1 ? 'one' : 'other';
    }
    const merged = Object.assign({ count: n }, params || {});
    const exactKey = `${baseKey}.${category}`;
    const exact = this.t(exactKey, merged);
    if (exact !== exactKey) return exact;
    if (category !== 'other') {
      const otherKey = `${baseKey}.other`;
      const other = this.t(otherKey, merged);
      if (other !== otherKey) return other;
    }
    return exact;
  },

  /**
   * Apply translations to DOM elements with data-i18n* attributes.
   * Non-Swedish locales always overwrite Swedish HTML placeholders (even with the key).
   */
  apply(root = document) {
    const writeMissing = !this.allowsSwedishLiteralFallback();
    const maybeWrite = (text, key) => writeMissing || text !== key;
    const query = (root && typeof root.querySelectorAll === 'function')
      ? root
      : (typeof document.querySelectorAll === 'function' ? document : null);
    if (!query) {
      this._clearPending();
      return;
    }

    query.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (maybeWrite(text, key)) el.textContent = text;
    });
    query.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (maybeWrite(text, key)) el.placeholder = text;
    });
    query.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (maybeWrite(text, key)) el.title = text;
    });
    query.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      const text = this.t(key);
      if (maybeWrite(text, key)) el.setAttribute('aria-label', text);
    });
    query.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const text = this.t(key);
      // Trusted static locale JSON only — never user input
      if (maybeWrite(text, key)) el.innerHTML = text;
    });
    if (!root || root === document || root === document.documentElement) {
      this._clearPending();
    }
  },

  getCurrentLang() {
    return this.lang;
  },

  /** Alias used by settings, growth, and paywall surfaces. */
  getLocale() {
    return this.getCurrentLang();
  },

  /**
   * Raw lookup — strings, arrays, or nested objects (for coach tips, etc.).
   * @param {string} key
   * @returns {unknown}
   */
  get(key) {
    const keys = key.split('.');
    let value = this.locale;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  },
};

window.I18n = I18n;

I18n._applyBootHint();

document.addEventListener('DOMContentLoaded', () => {
  if (document.body?.dataset?.i18nManualInit === 'true') return;
  I18n.init().catch((err) => {
    console.warn('[i18n] init failed:', err);
    I18n.apply();
  });
});
