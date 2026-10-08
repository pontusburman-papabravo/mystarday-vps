/**
 * Public support thread — load conversation + post follow-up via opaque token.
 */
(function () {
  'use strict';

  const STRINGS = {
    'sv-SE': {
      title: 'Ditt ärende',
      intro: 'Här är hela konversationen. Skriv under om du vill fortsätta. Ett vanligt mejlsvar syns inte här.',
      you: 'Du',
      us: 'Vi',
      empty: 'Inga meddelanden ännu.',
      label: 'Skriv till oss',
      placeholder: 'Skriv vad som händer…',
      submit: 'Skicka',
      submitting: 'Skickar…',
      needHuman: 'Jag behöver mer hjälp från en person',
      escalating: 'Skickar…',
      caseRef: 'Ärende {{ref}}',
      success: 'Tack! Vi har tagit emot svaret.',
      escalated: 'Tack. En person tittar på ärendet.',
      invalid: 'Länken är ogiltig. Be oss skicka ett nytt svar.',
      archived: 'Ärendet är avslutat. Kontakta oss på nytt om du behöver mer hjälp.',
      tooShort: 'Skriv minst 10 tecken så vi förstår vad som händer.',
      generic: 'Kunde inte öppna ärendet.',
      sendFailed: 'Kunde inte skicka. Försök igen.',
      status: {
        new: 'Mottaget',
        read: 'Läst',
        in_progress: 'Pågår',
        answered: 'Besvarat',
        archived: 'Avslutat',
      },
    },
    'en-GB': {
      title: 'Your conversation',
      intro: 'This is the full conversation. Write below if you want to continue. A normal email reply is not visible here.',
      you: 'You',
      us: 'Us',
      empty: 'No messages yet.',
      label: 'Write to us',
      placeholder: 'Tell us what is happening…',
      submit: 'Send',
      submitting: 'Sending…',
      needHuman: 'I need more help from a person',
      escalating: 'Sending…',
      caseRef: 'Case {{ref}}',
      success: 'Thanks! We have received your reply.',
      escalated: 'Thanks. A person will look at this case.',
      invalid: 'This link is invalid. Ask us to send a new reply.',
      archived: 'This case is closed. Contact us again if you need more help.',
      tooShort: 'Write at least 10 characters so we understand what is happening.',
      generic: 'Could not open the case.',
      sendFailed: 'Could not send. Try again.',
      status: {
        new: 'Received',
        read: 'Read',
        in_progress: 'In progress',
        answered: 'Replied',
        archived: 'Closed',
      },
    },
  };

  const form = document.getElementById('followUpForm');
  const tokenInput = document.getElementById('followUpToken');
  const threadEl = document.getElementById('supportThread');
  const errorEl = document.getElementById('followUpError');
  const successEl = document.getElementById('followUpSuccess');
  const submitBtn = document.getElementById('followUpSubmit');
  const messageEl = document.getElementById('followUpMessage');
  const composerEl = document.getElementById('supportComposer');
  const escalateBtn = document.getElementById('supportEscalateBtn');
  const metaEl = document.getElementById('supportMeta');
  const titleEl = document.querySelector('.kontakt-page h1');
  const introEl = document.querySelector('.kontakt-page .intro');
  const labelEl = document.querySelector('label[for="followUpMessage"]');
  const pathToken = (window.location.pathname || '').split('/').pop() || '';
  const token = (tokenInput && tokenInput.value) || pathToken;
  let locale = 'sv-SE';

  if (tokenInput && !tokenInput.value) tokenInput.value = pathToken;

  function rawBundle(key) {
    if (!window.I18n || !I18n.locale) return null;
    let value = I18n.locale;
    for (const part of key.split('.')) value = value && value[part];
    return typeof value === 'string' ? value : null;
  }

  function bundleCopy() {
    const title = rawBundle('support.page.title');
    const sendFailed = rawBundle('support.errors.sendFailed');
    if (!title || !sendFailed) return null;
    const status = {
      new: rawBundle('support.page.status.new'),
      read: rawBundle('support.page.status.read'),
      in_progress: rawBundle('support.page.status.in_progress'),
      answered: rawBundle('support.page.status.answered'),
      archived: rawBundle('support.page.status.archived'),
    };
    if (Object.values(status).some((value) => !value)) return null;
    return {
      title: title,
      intro: rawBundle('support.page.intro'),
      you: rawBundle('support.page.you'),
      us: rawBundle('support.page.us'),
      empty: rawBundle('support.page.empty'),
      label: rawBundle('support.page.label'),
      placeholder: rawBundle('support.page.placeholder'),
      submit: rawBundle('support.page.submit'),
      submitting: rawBundle('support.page.submitting'),
      needHuman: rawBundle('support.page.needHuman'),
      escalating: rawBundle('support.page.escalating'),
      caseRef: rawBundle('support.page.caseRef'),
      success: rawBundle('support.success.submitted'),
      escalated: rawBundle('support.success.escalated'),
      invalid: rawBundle('support.errors.invalid'),
      archived: rawBundle('support.errors.archived'),
      tooShort: rawBundle('support.errors.tooShort'),
      generic: rawBundle('support.errors.generic'),
      sendFailed: sendFailed,
      status: status,
    };
  }

  function copy() {
    const bundled = bundleCopy();
    if (bundled && bundled.intro && bundled.caseRef) return bundled;
    if (STRINGS[locale]) return STRINGS[locale];
    if (locale && locale !== 'sv-SE') return STRINGS['en-GB'];
    return STRINGS['sv-SE'];
  }

  async function ensureBundle() {
    if (!window.I18n || typeof I18n.init !== 'function') return;
    try {
      await I18n.init(locale);
    } catch (_) {
      /* sv/en table remains the degraded path */
    }
  }

  function applyChrome() {
    const c = copy();
    document.documentElement.lang = String(locale || 'sv-SE').toLowerCase();
    document.title = c.title;
    if (titleEl) titleEl.textContent = c.title;
    if (introEl) introEl.textContent = c.intro;
    if (labelEl) labelEl.textContent = c.label;
    if (messageEl) messageEl.placeholder = c.placeholder;
    if (submitBtn) submitBtn.textContent = c.submit;
    if (escalateBtn) escalateBtn.textContent = c.needHuman;
    if (successEl) successEl.textContent = c.success;
  }

  function showError(text) {
    if (!errorEl) return;
    errorEl.textContent = text || '';
    errorEl.style.display = text ? 'block' : 'none';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatWhen(at) {
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(locale || 'sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function renderMeta(data) {
    if (!metaEl) return;
    const c = copy();
    const statusLabel = (c.status && c.status[data.status]) || data.status || '';
    const ref = data.caseRef ? c.caseRef.replace('{{ref}}', data.caseRef) : '';
    metaEl.textContent = [ref, statusLabel].filter(Boolean).join(' · ');
    metaEl.hidden = !metaEl.textContent;
  }

  function renderThread(turns) {
    if (!threadEl) return;
    const c = copy();
    if (!turns || !turns.length) {
      threadEl.innerHTML = '<p class="thread-empty">' + escapeHtml(c.empty) + '</p>';
      return;
    }
    threadEl.innerHTML = turns.map(function (turn) {
      const mine = turn.role === 'user';
      const who = mine ? c.you : c.us;
      const when = formatWhen(turn.at);
      return (
        '<article class="thread-msg' + (mine ? ' thread-msg--you' : ' thread-msg--us') + '">' +
          '<p class="thread-meta">' + escapeHtml(who) + (when ? ' · ' + escapeHtml(when) : '') + '</p>' +
          '<div class="thread-body">' + escapeHtml(turn.body) + '</div>' +
        '</article>'
      );
    }).join('');
    threadEl.hidden = false;
  }

  async function loadThread() {
    if (!token) {
      showError(copy().invalid);
      if (composerEl) composerEl.hidden = true;
      return;
    }
    try {
      const res = await fetch('/api/support/thread?token=' + encodeURIComponent(token), {
        cache: 'no-store',
      });
      const data = await res.json().catch(function () { return {}; });
      if (typeof data.locale === 'string' && data.locale) locale = data.locale;
      await ensureBundle();
      applyChrome();
      if (!res.ok) throw new Error(data.error || copy().generic);
      renderMeta(data);
      renderThread(data.thread || []);
      const canReply = data.canReply !== false;
      if (composerEl) composerEl.hidden = !canReply;
      if (escalateBtn) {
        escalateBtn.hidden = !canReply || data.humanEscalationRequested === true;
      }
    } catch (err) {
      showError(err.message || copy().generic);
      if (composerEl) composerEl.hidden = true;
    }
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      showError('');
      if (successEl) successEl.style.display = 'none';

      const message = ((messageEl && messageEl.value) || '').trim();
      if (message.length < 10) {
        showError(copy().tooShort);
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = copy().submitting; }

      try {
        const res = await fetch('/api/support/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ token: token, message: message }),
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || copy().sendFailed);
        if (messageEl) messageEl.value = '';
        if (typeof data.locale === 'string' && data.locale) locale = data.locale;
        await ensureBundle();
        applyChrome();
        renderMeta(data);
        renderThread(data.thread || []);
        if (successEl) {
          successEl.textContent = data.message || copy().success;
          successEl.style.display = 'block';
        }
      } catch (err) {
        showError(err.message || copy().sendFailed);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = copy().submit; }
      }
    });
  }

  if (escalateBtn) {
    escalateBtn.addEventListener('click', async function () {
      showError('');
      escalateBtn.disabled = true;
      escalateBtn.textContent = copy().escalating;
      try {
        const res = await fetch('/api/support/escalate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ token: token }),
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || copy().sendFailed);
        if (successEl) {
          successEl.textContent = data.message || copy().escalated;
          successEl.style.display = 'block';
        }
        escalateBtn.hidden = true;
        renderMeta(data);
        renderThread(data.thread || []);
      } catch (err) {
        showError(err.message || copy().sendFailed);
        escalateBtn.disabled = false;
        escalateBtn.textContent = copy().needHuman;
      }
    });
  }

  applyChrome();
  loadThread();
})();
