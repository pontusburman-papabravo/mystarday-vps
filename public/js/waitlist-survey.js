/**
 * English waitlist thank-you survey — posts to /api/waitlist/survey or /api/waitlist/skip.
 * Email comes from landing-waitlist.js (en_waitlist_email_v1).
 */
(function waitlistSurveyModule() {
  'use strict';

  const STORAGE_KEY = 'en_waitlist_email_v1';

  function toggleOtherInput() {
    const otherCb = document.getElementById('q1_other');
    const otherInput = document.getElementById('q1OtherText');
    if (!otherCb || !otherInput) return;
    otherInput.style.display = otherCb.checked ? 'block' : 'none';
    if (otherCb.checked) otherInput.focus();
  }

  function showError(msg) {
    const el = document.getElementById('surveyError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function hideError() {
    const el = document.getElementById('surveyError');
    if (el) el.style.display = 'none';
  }

  function showSuccessView() {
    const surveyView = document.getElementById('surveyView');
    const successView = document.getElementById('successView');
    if (surveyView) surveyView.style.display = 'none';
    if (successView) successView.style.display = 'block';
  }

  async function submitSurvey() {
    hideError();
    const email = localStorage.getItem(STORAGE_KEY);
    const painPoints = [];
    document.querySelectorAll('input[name="pain_points"]:checked').forEach(function (cb) {
      painPoints.push(cb.value);
    });

    let currentMethod = null;
    const selectedRadio = document.querySelector('input[name="current_method"]:checked');
    if (selectedRadio) currentMethod = selectedRadio.value;

    if (!email || !email.includes('@')) {
      showError('Please enable cookies/localStorage to submit. Your signup was already recorded.');
      return;
    }
    if (!painPoints.length) {
      showError('Please select at least one option for Q1.');
      return;
    }
    if (!currentMethod) {
      showError('Please select an option for Q2.');
      return;
    }

    let painPointsOther = null;
    const otherCb = document.getElementById('q1_other');
    if (otherCb && otherCb.checked) {
      const otherText = document.getElementById('q1OtherText');
      painPointsOther = otherText && otherText.value.trim() ? otherText.value.trim() : null;
    }

    const btn = document.getElementById('submitBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    try {
      const resp = await fetch('/api/waitlist/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          pain_points: painPoints,
          pain_points_other: painPointsOther,
          current_method: currentMethod,
        }),
      });
      const data = await resp.json().catch(function () { return {}; });
      if (resp.ok && data.ok) {
        showSuccessView();
      } else {
        showError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (_err) {
      showError('Network error. Please check your connection and try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    }
  }

  async function skipSurvey() {
    const email = localStorage.getItem(STORAGE_KEY);
    if (email && email.includes('@')) {
      try {
        await fetch('/api/waitlist/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email }),
        });
      } catch (_err) { /* ignore */ }
    }
    window.location.href = '/en';
  }

  const otherCb = document.getElementById('q1_other');
  if (otherCb) {
    otherCb.addEventListener('change', toggleOtherInput);
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitSurvey);
  }

  const skipBtn = document.getElementById('skipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', skipSurvey);
  }

  window.waitlistSurvey = {
    toggleOtherInput: toggleOtherInput,
    submitSurvey: submitSurvey,
    skipSurvey: skipSurvey,
  };
})();
