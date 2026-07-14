/**
 * parent-share-flow.js — Shared "Tipsa en familj" flow for header + mobile-nav + dashboard CTA.
 * Optional recipient capture → share → email notify founder.
 */
(function () {
  'use strict';

  const RECIPIENT_KEY = 'stjarndag_share_recipient_draft';

  function isMobileDevice() {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768;
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

  function getSharePayload(ref) {
    if (window.ReferralShare && window.ReferralShare.buildPayload) {
      return window.ReferralShare.buildPayload(ref);
    }
    return {
      url: window.ReferralShare && window.ReferralShare.DEFAULT_URL ? window.ReferralShare.DEFAULT_URL : '/',
      text: 'Tipsa om appen — visuella rutiner och stjärnor för barn.',
      withReferral: false,
      code: null,
    };
  }

  function loadReferral() {
    if (window.ReferralShare && window.ReferralShare.load) {
      return window.ReferralShare.load();
    }
    return Promise.resolve(null);
  }

  function trackReferralShared(ref, trackFn) {
    if (!ref || !ref.code) return;
    if (typeof trackFn === 'function') {
      trackFn('referral_link_shared', { code: ref.code });
      return;
    }
    if (window.ReferralShare && window.ReferralShare.trackShared) {
      window.ReferralShare.trackShared(ref, trackFn);
    }
  }

  function notifyShareBackend(meta) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const csrf = typeof Auth !== 'undefined' && Auth.getCsrfToken ? Auth.getCsrfToken() : null;
      if (csrf) headers['X-CSRF-Token'] = csrf;
      const body = {
        recipient: meta && meta.recipient ? String(meta.recipient).trim().slice(0, 200) : undefined,
        channel: meta && meta.channel ? String(meta.channel).trim().slice(0, 40) : undefined,
      };
      fetch('/api/account/share-notify', {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(body),
      }).catch(function () { /* silent */ });
    } catch { /* silent */ }
  }

  function rememberRecipient(value) {
    try {
      if (value) localStorage.setItem(RECIPIENT_KEY, value);
    } catch { /* ignore */ }
  }

  function readRememberedRecipient() {
    try {
      return localStorage.getItem(RECIPIENT_KEY) || '';
    } catch {
      return '';
    }
  }

  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function promptRecipient(onContinue) {
    const existing = document.getElementById('parentShareRecipientOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'parentShareRecipientOverlay';
    overlay.className = 'share-popup-overlay';
    overlay.innerHTML =
      '<div class="share-popup-card" role="dialog" aria-labelledby="parentShareRecipientTitle">' +
        '<div class="share-popup-header">' +
          '<strong id="parentShareRecipientTitle">Tipsa en familj</strong>' +
          '<button type="button" class="share-popup-close" aria-label="Stäng">&times;</button>' +
        '</div>' +
        '<p class="share-popup-text" style="margin-bottom:12px;">Vem tipsar du om? (valfritt — hjälper oss följa upp)</p>' +
        '<label class="share-popup-field-label" for="parentShareRecipientInput">Till vem</label>' +
        '<input id="parentShareRecipientInput" type="text" maxlength="200" placeholder="Namn, e-post eller &quot;kollega på förskolan&quot;" ' +
          'class="share-popup-field-input" />' +
        '<div class="share-popup-actions" style="justify-content:flex-end;">' +
          '<button type="button" class="share-popup-btn share-popup-copy" id="parentShareRecipientCancel">Avbryt</button>' +
          '<button type="button" class="share-popup-btn share-popup-email" id="parentShareRecipientGo">Dela vidare</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#parentShareRecipientInput');
    if (input) input.value = readRememberedRecipient();

    function finish() {
      const recipient = input ? input.value.trim() : '';
      rememberRecipient(recipient);
      closeOverlay('parentShareRecipientOverlay');
      onContinue(recipient);
    }

    overlay.querySelector('.share-popup-close').addEventListener('click', function () {
      closeOverlay('parentShareRecipientOverlay');
    });
    overlay.querySelector('#parentShareRecipientCancel').addEventListener('click', function () {
      closeOverlay('parentShareRecipientOverlay');
    });
    overlay.querySelector('#parentShareRecipientGo').addEventListener('click', finish);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay('parentShareRecipientOverlay');
    });
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') finish();
      });
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  function showSharePopup(payload, recipient, ref, trackFn) {
    closeOverlay('sharePopup');

    const shareUrl = payload.url;
    const shareMessage = payload.message || payload.text;
    const shareText = payload.text || shareMessage + ' ' + shareUrl;
    const overlay = document.createElement('div');
    overlay.id = 'sharePopup';
    overlay.className = 'share-popup-overlay';

    const mailSubject = encodeURIComponent('Tipsa: appen');
    const mailBody = encodeURIComponent(shareText);
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);

    overlay.innerHTML =
      '<div class="share-popup-card">' +
        '<div class="share-popup-header">' +
          '<strong>Tipsa en familj om appen!</strong>' +
          '<button class="share-popup-close" aria-label="Stäng">&times;</button>' +
        '</div>' +
        (payload.code
          ? '<p class="share-popup-code" style="font-size:0.85rem;font-weight:700;margin:0 0 8px;">Din kod: ' + payload.code + '</p>'
          : '') +
        (recipient
          ? '<p class="share-popup-text" style="font-size:0.85rem;margin:0 0 8px;"><strong>Till:</strong> ' + recipient.replace(/</g, '&lt;') + '</p>'
          : '') +
        '<p class="share-popup-text">' +
          shareMessage.replace(/</g, '&lt;') +
          ' <a href="' + shareUrl + '" target="_blank" rel="noopener">' + shareUrl + '</a>' +
        '</p>' +
        '<div class="share-popup-actions">' +
          '<button class="share-popup-btn share-popup-copy" type="button">' +
            '<span>📋</span> Kopiera länk' +
          '</button>' +
          '<a href="mailto:?subject=' + mailSubject + '&body=' + mailBody + '" class="share-popup-btn share-popup-email">' +
            '<span>✉️</span> E-post' +
          '</a>' +
          '<a href="' + fbUrl + '" target="_blank" rel="noopener noreferrer" class="share-popup-btn share-popup-facebook">' +
            '<span>📘</span> Facebook' +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closePopup() {
      closeOverlay('sharePopup');
    }

    overlay.querySelector('.share-popup-close').addEventListener('click', closePopup);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    overlay.querySelector('.share-popup-copy').addEventListener('click', function () {
      const btn = this;
      copyToClipboard(shareUrl, function () {
        btn.innerHTML = '<span>✅</span> Kopierad!';
        notifyShareBackend({ recipient: recipient, channel: 'copy' });
        if (payload.withReferral) trackReferralShared(ref, trackFn);
        setTimeout(function () { btn.innerHTML = '<span>📋</span> Kopiera länk'; }, 2000);
      });
    });

    const emailLink = overlay.querySelector('.share-popup-email');
    if (emailLink) {
      emailLink.addEventListener('click', function () {
        notifyShareBackend({ recipient: recipient, channel: 'email' });
        if (payload.withReferral) trackReferralShared(ref, trackFn);
      });
    }
    const fbLink = overlay.querySelector('.share-popup-facebook');
    if (fbLink) {
      fbLink.addEventListener('click', function () {
        notifyShareBackend({ recipient: recipient, channel: 'facebook' });
        if (payload.withReferral) trackReferralShared(ref, trackFn);
      });
    }
  }

  function executeShare(recipient, options) {
    const trackFn = options && options.trackFn;
    loadReferral().then(function (ref) {
      const payload = getSharePayload(ref);
      if (ref && ref.registerUrl) {
        payload.withReferral = true;
        payload.code = ref.code;
      }

      if (navigator.share && isMobileDevice()) {
        navigator.share({
          title: 'Min ' + 'Stj\u00e4rndag',
          text: payload.message || payload.text,
          url: payload.url,
        }).then(function () {
          notifyShareBackend({ recipient: recipient, channel: 'native_share' });
          if (payload.withReferral) trackReferralShared(ref, trackFn);
          if (options && options.onShared) options.onShared();
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          notifyShareBackend({ recipient: recipient, channel: 'native_share' });
          if (payload.withReferral) trackReferralShared(ref, trackFn);
        });
        return;
      }

      showSharePopup(payload, recipient, ref, trackFn);
    });
  }

  function openShareFlow(options) {
    promptRecipient(function (recipient) {
      executeShare(recipient, options || {});
    });
  }

  window.ParentShareFlow = {
    open: openShareFlow,
    notify: notifyShareBackend,
    isMobileDevice: isMobileDevice,
  };
})();
