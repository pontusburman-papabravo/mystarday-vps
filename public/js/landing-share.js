/**
 * landing-share.js — "Tipsa en familj" on public landing page (logged-out visitors).
 */
(function () {
  'use strict';

  const SITE_URL = (window.ReferralShare && window.ReferralShare.DEFAULT_URL) || 'https://mystarday.se/'; // pragma: allowlist secret

  function isMobileDevice() {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768;
  }

  function sharePayload() {
    if (window.ReferralShare && window.ReferralShare.buildPayload) {
      return window.ReferralShare.buildPayload(null);
    }
    return {
      url: SITE_URL,
      text:
        'Hej! Kolla in appen för barns rutiner och stjärnor. ' + // pragma: allowlist secret
        'Gratis för grundarmedlemmar: ' +
        SITE_URL,
      withReferral: false,
      code: null,
    };
  }

  function tipsaIconHtml() {
    if (window.IconSystem && IconSystem.has('tipsa')) {
      return IconSystem.header('tipsa');
    }
    return '<span aria-hidden="true">💡</span>';
  }

  function trackShare(channel) {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'landing_share_click',
          metadata: { page: 'landing', channel: channel || 'unknown' },
        }),
        credentials: 'include',
        keepalive: true,
      }).catch(function () {});
    } catch { /* silent */ }
  }

  function notifyLandingShare(channel) {
    try {
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Besökare (landningssidan)',
          email: 'landing-share@mystarday.se', // pragma: allowlist secret
          message:
            'Tipsa-knappen på landningssidan användes' +
            (channel ? ' via ' + channel : '') +
            '.',
        }),
      }).catch(function () {});
    } catch { /* silent */ }
  }

  function copyToClipboard(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (callback) callback();
      }).catch(function () {
        if (callback) callback();
      });
      return;
    }
    const tempEl = document.createElement('textarea');
    tempEl.value = text;
    tempEl.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(tempEl);
    tempEl.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(tempEl);
    if (callback) callback();
  }

  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function showSharePopup(payload) {
    closeOverlay('landingSharePopup');

    const shareUrl = payload.url;
    const shareText = payload.text;
    const overlay = document.createElement('div');
    overlay.id = 'landingSharePopup';
    overlay.className = 'share-popup-overlay';
    const mailSubject = encodeURIComponent('Tipsa om appen'); // pragma: allowlist secret
    const mailBody = encodeURIComponent(shareText);
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);

    overlay.innerHTML =
      '<div class="share-popup-card" role="dialog" aria-labelledby="landingShareTitle">' +
        '<div class="share-popup-header">' +
          tipsaIconHtml() +
          '<strong id="landingShareTitle">Tipsa en familj</strong>' +
          '<button type="button" class="share-popup-close" aria-label="Stäng">&times;</button>' +
        '</div>' +
        '<p class="share-popup-text">' +
          shareText.replace(shareUrl, '<a href="' + shareUrl + '" target="_blank" rel="noopener">' + shareUrl + '</a>') +
        '</p>' +
        '<div class="share-popup-actions">' +
          '<button class="share-popup-btn share-popup-copy" type="button">' +
            '<span aria-hidden="true">📋</span> Kopiera länk' +
          '</button>' +
          '<a href="mailto:?subject=' + mailSubject + '&body=' + mailBody + '" class="share-popup-btn share-popup-email">' +
            '<span aria-hidden="true">✉️</span> Skicka via mejl' +
          '</a>' +
          '<a href="' + fbUrl + '" target="_blank" rel="noopener noreferrer" class="share-popup-btn share-popup-facebook">' +
            '<span style="color:#1877F2;font-weight:800;" aria-hidden="true">f</span> Dela på Facebook' +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closePopup() {
      closeOverlay('landingSharePopup');
    }

    overlay.querySelector('.share-popup-close').addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    overlay.querySelector('.share-popup-copy').addEventListener('click', function () {
      const btn = this;
      copyToClipboard(shareUrl, function () {
        btn.innerHTML = '<span aria-hidden="true">✅</span> Kopierad!';
        trackShare('copy');
        notifyLandingShare('copy');
        setTimeout(function () {
          btn.innerHTML = '<span aria-hidden="true">📋</span> Kopiera länk';
        }, 2000);
      });
    });

    const emailLink = overlay.querySelector('.share-popup-email');
    if (emailLink) {
      emailLink.addEventListener('click', function () {
        trackShare('email');
        notifyLandingShare('email');
      });
    }

    const fbLink = overlay.querySelector('.share-popup-facebook');
    if (fbLink) {
      fbLink.addEventListener('click', function () {
        trackShare('facebook');
        notifyLandingShare('facebook');
      });
    }
  }

  function open() {
    const payload = sharePayload();
    trackShare('open');
    notifyLandingShare('open');

    if (navigator.share && isMobileDevice()) {
      navigator.share({ title: 'Tipsa om appen', text: payload.text, url: payload.url }) // pragma: allowlist secret
        .then(function () {
          trackShare('native_share');
          notifyLandingShare('native_share');
        })
        .catch(function () {
          showSharePopup(payload);
        });
      return;
    }

    showSharePopup(payload);
  }

  function bindTriggers() {
    document.querySelectorAll('.landing-nav__tipsa-icon, .landing-tipsa-fixed__icon').forEach(function (el) {
      el.innerHTML = tipsaIconHtml();
    });

    document.querySelectorAll('[data-landing-share]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.closeLandingMobileMenu === 'function') {
          window.closeLandingMobileMenu();
        }
        open();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTriggers);
  } else {
    bindTriggers();
  }

  window.LandingShare = { open: open };
})();
