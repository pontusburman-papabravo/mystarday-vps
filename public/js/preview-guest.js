/**
 * Guest newsletter signup from marketing previews.
 */
(function (global) {
  'use strict';

  function isValidEmail(email) {
    return typeof email === 'string' && email.includes('@') && email.includes('.');
  }

  async function subscribe(email, options) {
    var opts = options || {};
    var res = await fetch('/api/public/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: opts.name || null,
        component: opts.component || null,
        source: opts.source || 'landing_preview',
      }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      throw new Error(data.error || 'Kunde inte spara din e-post.');
    }
    return data;
  }

  global.PreviewGuest = {
    isValidEmail: isValidEmail,
    subscribe: subscribe,
  };
})(window);
