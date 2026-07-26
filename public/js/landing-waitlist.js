/**
 * English landing waitlist / interest signup — posts to /api/waitlist.
 */
(function landingWaitlistModule() {
  'use strict';

  const form = document.getElementById('waitlistForm');
  if (!form) return;

  const submitBtn = document.getElementById('waitlistSubmitBtn');
  const formError = document.getElementById('waitlistFormError');
  const STORAGE_KEY = 'en_waitlist_email_v1';

  form.addEventListener('submit', async function onSubmit(e) {
    e.preventDefault();
    if (formError) formError.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const nameEl = document.getElementById('waitlistName');
    const emailEl = document.getElementById('waitlistEmail');
    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';

    if (!name || !email) {
      showError('Please fill in all fields.');
      resetBtn('Join waitlist');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
      showError('Please enter a valid email address.');
      resetBtn('Join waitlist');
      return;
    }

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        showError(data.error || 'Something went wrong. Please try again.');
        resetBtn('Join waitlist');
        return;
      }

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'waitlist_signup', { event_category: 'conversion' });
      }
      try { localStorage.setItem(STORAGE_KEY, email); } catch (_) { /* ignore */ }
      window.location.href = '/en/thank-you';
    } catch (_err) {
      showError('Connection error. Please try again.');
      resetBtn('Join waitlist');
    }
  });

  function showError(msg) {
    if (!formError) return;
    formError.textContent = msg;
    formError.style.display = 'block';
  }

  function resetBtn(label) {
    if (!submitBtn) return;
    submitBtn.disabled = false;
    submitBtn.textContent = label;
  }
})();
