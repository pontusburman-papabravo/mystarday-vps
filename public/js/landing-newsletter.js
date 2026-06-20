/**
 * Landing page — guest newsletter signup (no account required).
 */
(function () {
  'use strict';

  function wireForm(form, feedbackEl, options) {
    if (!form || !window.PreviewGuest) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var btn = form.querySelector('button[type="submit"]');
      var email = input ? input.value.trim() : '';

      if (!PreviewGuest.isValidEmail(email)) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Ange en giltig e-postadress.';
          feedbackEl.hidden = false;
        }
        return;
      }

      if (btn) btn.disabled = true;
      try {
        var result = await PreviewGuest.subscribe(email, {
          component: options.component || null,
          source: options.source || 'landing',
        });
        if (feedbackEl) {
          feedbackEl.textContent = result.message || 'Tack!';
          feedbackEl.hidden = false;
        }
        if (btn) btn.textContent = 'Tack! ✓';
      } catch (err) {
        if (btn) btn.disabled = false;
        if (feedbackEl) {
          feedbackEl.textContent = err.message || 'Något gick fel.';
          feedbackEl.hidden = false;
        }
      }
    });
  }

  var mainForm = document.getElementById('landingNewsletterForm');
  var mainFeedback = document.getElementById('landingNewsletterFeedback');
  wireForm(mainForm, mainFeedback, { source: 'landing' });

  function wireInterestForms(root) {
    var scope = root || document;
    scope.querySelectorAll('.program-interest-form').forEach(function (form) {
      if (form.dataset.wired === '1') return;
      form.dataset.wired = '1';
      var feedback = form.querySelector('.program-interest-feedback');
      var component = form.getAttribute('data-component');
      wireForm(form, feedback, { component: component, source: 'pricing_info' });
    });
  }

  wireInterestForms(document);

  window.LandingNewsletter = {
    wireInterestForms: wireInterestForms,
  };
})();
