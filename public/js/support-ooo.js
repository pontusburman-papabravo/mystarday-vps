/**
 * Date-gated support OOO copy (1–10 September 2026, Europe/Stockholm).
 * Keep FROM/THROUGH in sync with config/support-ooo.js.
 */
(function () {
  'use strict';

  var FROM_DATE = '2026-09-01';
  var THROUGH_DATE = '2026-09-11';
  var TIMEZONE = 'Europe/Stockholm';

  var COPY = {
    sv: {
      intro:
        'Vi är bortresta 1–10 september. Vi läser alla meddelanden. Kan vi hjälpa direkt gör vi det; annars återkommer vi så snart vi kan, senast 11 september.',
      success:
        'Tack! Vi har tagit emot ditt meddelande. Vi är bortresta 1–10 september och återkommer så snart vi kan, senast 11 september.',
      subtitle: 'Vi är bortresta 1–10 september',
    },
    en: {
      intro:
        'We are away 1–10 September. We read every message. If we can help straight away we will; otherwise we will get back as soon as we can, by 11 September at the latest.',
      success:
        'Thanks! We received your message. We are away 1–10 September and will get back as soon as we can, by 11 September at the latest.',
      subtitle: 'We are away 1–10 September',
    },
  };

  function stockholmDateStamp(now) {
    var date = now instanceof Date ? now : new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  function previewForced() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('support_ooo') === 'preview';
    } catch (_) {
      return false;
    }
  }

  function isActive(now) {
    if (previewForced()) return true;
    var stamp = stockholmDateStamp(now);
    return stamp >= FROM_DATE && stamp <= THROUGH_DATE;
  }

  function isEnglish() {
    var lang = (document.documentElement.lang || '').toLowerCase();
    if (lang.indexOf('en') === 0) return true;
    var path = (window.location.pathname || '').replace(/\/$/, '');
    return path === '/en-contact' || path === '/en/contact';
  }

  function copy() {
    return isEnglish() ? COPY.en : COPY.sv;
  }

  function applyContactPage() {
    if (!isActive()) return;
    var c = copy();
    var intro = document.querySelector('.kontakt-page .intro');
    if (intro) intro.textContent = c.intro;
    var successP = document.querySelector('#contactSuccess p');
    if (successP) successP.textContent = c.success;
  }

  window.SupportOoo = {
    FROM_DATE: FROM_DATE,
    THROUGH_DATE: THROUGH_DATE,
    TIMEZONE: TIMEZONE,
    isActive: isActive,
    copy: copy,
    applyContactPage: applyContactPage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyContactPage);
  } else {
    applyContactPage();
  }
})();
