/**
 * Public follow-up form — posts onto an existing contact_message via signed token.
 */
(function () {
  'use strict';

  const form = document.getElementById('followUpForm');
  if (!form) return;

  const tokenInput = document.getElementById('followUpToken');
  const pathToken = (window.location.pathname || '').split('/').pop() || '';
  if (tokenInput && !tokenInput.value) tokenInput.value = pathToken;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const errorEl = document.getElementById('followUpError');
    const successEl = document.getElementById('followUpSuccess');
    const submitBtn = document.getElementById('followUpSubmit');
    const messageEl = document.getElementById('followUpMessage');
    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

    const message = ((messageEl && messageEl.value) || '').trim();
    const token = (tokenInput && tokenInput.value) || pathToken;
    if (message.length < 10) {
      if (errorEl) {
        errorEl.textContent = 'Skriv minst 10 tecken så vi förstår vad som händer.';
        errorEl.style.display = 'block';
      }
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
      form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Något gick fel.';
        errorEl.style.display = 'block';
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Skicka'; }
    }
  });
})();
