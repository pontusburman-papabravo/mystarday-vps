/**
 * Public support thread — load conversation + post follow-up via signed token.
 */
(function () {
  'use strict';

  const form = document.getElementById('followUpForm');
  const tokenInput = document.getElementById('followUpToken');
  const threadEl = document.getElementById('supportThread');
  const errorEl = document.getElementById('followUpError');
  const successEl = document.getElementById('followUpSuccess');
  const submitBtn = document.getElementById('followUpSubmit');
  const messageEl = document.getElementById('followUpMessage');
  const composerEl = document.getElementById('supportComposer');
  const pathToken = (window.location.pathname || '').split('/').pop() || '';
  const token = (tokenInput && tokenInput.value) || pathToken;

  if (tokenInput && !tokenInput.value) tokenInput.value = pathToken;

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
    return date.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  }

  function renderThread(turns) {
    if (!threadEl) return;
    if (!turns || !turns.length) {
      threadEl.innerHTML = '<p class="thread-empty">Inga meddelanden ännu.</p>';
      return;
    }
    threadEl.innerHTML = turns.map(function (turn) {
      const mine = turn.role === 'user';
      const who = mine ? 'Du' : 'Vi';
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
      showError('Länken är ogiltig. Be oss skicka ett nytt svar.');
      if (composerEl) composerEl.hidden = true;
      return;
    }
    try {
      const res = await fetch('/api/support/thread?token=' + encodeURIComponent(token));
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Kunde inte öppna ärendet.');
      renderThread(data.thread || []);
      if (composerEl) composerEl.hidden = false;
    } catch (err) {
      showError(err.message || 'Kunde inte öppna ärendet.');
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
        showError('Skriv minst 10 tecken så vi förstår vad som händer.');
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Skickar…'; }

      try {
        const res = await fetch('/api/support/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, message: message }),
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Kunde inte skicka. Försök igen.');
        if (messageEl) messageEl.value = '';
        renderThread(data.thread || []);
        if (successEl) successEl.style.display = 'block';
      } catch (err) {
        showError(err.message || 'Något gick fel.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Skicka'; }
      }
    });
  }

  loadThread();
})();
