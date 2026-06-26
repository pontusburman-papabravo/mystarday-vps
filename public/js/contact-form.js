/**
 * Shared contact form handler — used on /kontakt (and legacy embeds).
 */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

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
      if (errorEl) { errorEl.textContent = 'Alla fält är obligatoriska.'; errorEl.style.display = 'block'; }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errorEl) { errorEl.textContent = 'Ange en giltig e-postadress.'; errorEl.style.display = 'block'; }
      return;
    }
    if (message.length < 5) {
      if (errorEl) { errorEl.textContent = 'Meddelandet är för kort (minst 5 tecken).'; errorEl.style.display = 'block'; }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Skickar…'; }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, message: message }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Något gick fel.');
      form.style.display = 'none';
      if (successEl) successEl.style.display = 'block';
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Något gick fel. Försök igen.';
        errorEl.style.display = 'block';
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Skicka'; }
    }
  });
})();
