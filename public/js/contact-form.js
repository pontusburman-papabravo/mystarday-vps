/**
 * Shared contact form handler — used on /kontakt (and legacy embeds).
 */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

  function isEnglishPage() {
    const lang = (document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('en')) return true;
    const path = (window.location.pathname || '').replace(/\/$/, '');
    return path === '/en-contact' || path === '/en/contact';
  }

  function ct(key) {
    const i18nKey = 'auth.contactForm.' + key;
    if (window.I18n && typeof I18n.t === 'function') {
      const translated = I18n.t(i18nKey);
      if (translated && translated !== i18nKey) return translated;
    }
    const en = isEnglishPage();
    const strings = {
      fillRequired: en ? 'All fields are required.' : 'Alla fält är obligatoriska.',
      emailInvalid: en ? 'Enter a valid email address.' : 'Ange en giltig e-postadress.',
      messageTooShort: en
        ? 'Message is too short (at least 5 characters).'
        : 'Meddelandet är för kort (minst 5 tecken).',
      submitting: en ? 'Sending…' : 'Skickar…',
      submit: en ? 'Send' : 'Skicka',
      genericError: en ? 'Something went wrong. Try again.' : 'Något gick fel. Försök igen.',
      openThread: en ? 'Open your conversation' : 'Öppna ditt ärende',
    };
    return strings[key] || key;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorEl = document.getElementById('contactError');
    const submitBtn = document.getElementById('contactSubmitBtn');
    const successEl = document.getElementById('contactSuccess');

    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

    let name = (document.getElementById('contactName') || {}).value || '';
    let email = (document.getElementById('contactEmail') || {}).value || '';
    let message = (document.getElementById('contactMessage') || {}).value || '';
    name = name.trim();
    email = email.trim();
    message = message.trim();

    if (!name || !email || !message) {
      if (errorEl) { errorEl.textContent = ct('fillRequired'); errorEl.style.display = 'block'; }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errorEl) { errorEl.textContent = ct('emailInvalid'); errorEl.style.display = 'block'; }
      return;
    }
    if (message.length < 5) {
      if (errorEl) { errorEl.textContent = ct('messageTooShort'); errorEl.style.display = 'block'; }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = ct('submitting'); }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          locale: isEnglishPage() ? 'en' : 'sv',
        }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || ct('genericError'));
      form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
      const threadPath = typeof data.threadUrl === 'string' && data.threadUrl.indexOf('/support/svar/sf1.') === 0
        ? data.threadUrl
        : '';
      const threadLink = document.getElementById('contactThreadLink');
      const threadWrap = document.getElementById('contactThreadWrap');
      if (threadPath && threadLink) {
        threadLink.href = threadPath;
        threadLink.textContent = ct('openThread');
        if (threadWrap) threadWrap.style.display = 'block';
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || ct('genericError');
        errorEl.style.display = 'block';
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = ct('submit'); }
    }
  });
})();
