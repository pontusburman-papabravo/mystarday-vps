/**
 * Client i18n — loads locale bundles from /api/i18n/:lang and applies data-i18n attributes.
 * Locale persistence: sessionStorage pre-auth; family.preferred_locale after login (via I18n.init).
 */
const I18n = {
  locale: {},
  lang: 'sv-SE',
  _ready: null,
  _englishAppEnabled: false,

  STORAGE_KEY: 'sd_preferred_locale',

  /**
   * Initialise locale: explicit > sessionStorage > /api/auth/me > Accept-Language > sv-SE
   * @param {string} [explicitLang]
   */
  async init(explicitLang) {
    if (this._ready) return this._ready;

    this._ready = (async () => {
      let lang = this._normalize(explicitLang)
        || this._normalize(sessionStorage.getItem(this.STORAGE_KEY));

      if (!lang && window.Auth && typeof Auth.getUser === 'function') {
        const user = Auth.getUser();
        if (user?.preferred_locale) lang = this._normalize(user.preferred_locale);
      }

      if (!lang && window.Auth && typeof Auth.api === 'function') {
        try {
          const me = await Auth.api('/api/auth/me');
          if (me?.preferred_locale) lang = this._normalize(me.preferred_locale);
        } catch (_) {
          /* not logged in */
        }
      }

      if (!lang) {
        lang = this._fromNavigator() || 'sv-SE';
      }

      await this.load(lang);
    })();

    return this._ready;
  },

  _normalize(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (s === 'sv-SE' || s === 'en-GB') return s;
    if (s === 'sv') return 'sv-SE';
    if (s === 'en') return 'en-GB';
    const base = s.split(/[-_]/)[0].toLowerCase();
    if (base === 'sv') return 'sv-SE';
    if (base === 'en') return 'en-GB';
    return null;
  },

  _fromNavigator() {
    const langs = navigator.languages || [navigator.language || ''];
    for (const l of langs) {
      const n = this._normalize(l);
      if (n) return n;
    }
    return null;
  },

  async load(lang = 'sv-SE') {
    const canonical = this._normalize(lang) || 'sv-SE';
    try {
      const res = await fetch(`/api/i18n/${encodeURIComponent(canonical)}`);
      if (!res.ok) {
        const fallback = await fetch('/api/i18n/sv-SE');
        this.locale = await fallback.json();
        this.lang = 'sv-SE';
      } else {
        this.locale = await res.json();
        this.lang = canonical;
      }
      sessionStorage.setItem(this.STORAGE_KEY, this.lang);
      this._setHtmlLang();
      this.apply();
    } catch (err) {
      console.warn('[i18n] Failed to load locale:', err);
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
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''));
  },

  /**
   * Plural helper — keys at baseKey.one / baseKey.other
   * @param {string} baseKey dot path without .one/.other
   * @param {number} count
   * @param {Record<string, string|number>} [params]
   */
  plural(baseKey, count, params = {}) {
    const suffix = Number(count) === 1 ? 'one' : 'other';
    return this.t(`${baseKey}.${suffix}`, { ...params, count });
  },

  /**
   * Apply translations to DOM elements with data-i18n* attributes.
   */
  apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text !== key) el.textContent = text;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text !== key) el.placeholder = text;
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text !== key) el.title = text;
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      const text = this.t(key);
      if (text !== key) el.setAttribute('aria-label', text);
    });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const text = this.t(key);
      if (text !== key) el.textContent = text;
    });
  },

  getCurrentLang() {
    return this.lang;
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.body?.dataset?.i18nManualInit === 'true') return;
  I18n.init().catch((err) => console.warn('[i18n] init failed:', err));
});
