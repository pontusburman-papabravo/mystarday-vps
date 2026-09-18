/**
 * family-invite-scan.js — parse QR / pasted text for adding an adult.
 * Native system dialogs are not a scanner and leak Swedish on iOS.
 */
(function () {
  'use strict';

  const MODAL_ID = 'familyScanInviteModal';

  function scanT(key, fallback) {
    if (typeof window.pt === 'function') {
      const value = pt(key);
      if (value && value !== key) return value;
    }
    if (window.I18n && typeof window.I18n.t === 'function') {
      const value = window.I18n.t(key);
      if (value && value !== key) return value;
    }
    return fallback;
  }

  function parseQrPayload(raw) {
    const s = String(raw || '').trim();
    if (!s) return {};

    if (s.toLowerCase().startsWith('mailto:')) {
      const email = s.slice(7).split('?')[0].trim();
      return email ? { email } : {};
    }

    const base = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'https://invalid.local';
    try {
      const u = new URL(s, base);
      const inviteToken =
        u.searchParams.get('invite') ||
        (u.pathname.match(/\/invite\/([^/]+)/i) || [])[1];
      if (inviteToken) return { inviteToken };
    } catch {
      /* not a URL */
    }

    const emailMatch = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) return { email: emailMatch[0] };

    return {};
  }

  function applyModalCopy(root) {
    const title = scanT('family.scanQr.title', 'Paste invite');
    const close = scanT('family.form.close', 'Close');
    root.querySelector('#familyScanInviteTitle').textContent = title;
    root.setAttribute('aria-label', title);
    const closeBtn = root.querySelector('#familyScanInviteClose');
    closeBtn.setAttribute('aria-label', close);
    root.querySelector('#familyScanInviteLead').textContent = scanT(
      'family.scanQr.lead',
      'Paste an email, invite link, or mailto from the QR code.'
    );
    root.querySelector('#familyScanInviteLabel').textContent = scanT(
      'family.scanQr.label',
      'Email or invite link'
    );
    root.querySelector('#familyScanInviteInput').setAttribute(
      'placeholder',
      scanT('family.scanQr.placeholder', 'name@example.com or invite link')
    );
    root.querySelector('#familyScanInviteCancel').textContent = scanT('family.giveStars.cancel', 'Cancel');
    root.querySelector('#familyScanInviteContinue').textContent = scanT('family.scanQr.continue', 'Continue');
  }

  function ensureModal() {
    let root = document.getElementById(MODAL_ID);
    if (root) return root;

    root = document.createElement('div');
    root.id = MODAL_ID;
    root.className = 'hidden fixed inset-0 bg-black/50 flex items-center justify-center z-[9200] p-4';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = ''
      + '<div class="bg-white dark:bg-navy rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-[9201]">'
      + '<div class="flex justify-between items-center mb-3">'
      + '<h3 id="familyScanInviteTitle" class="text-xl font-heading font-bold text-navy dark:text-white"></h3>'
      + '<button type="button" id="familyScanInviteClose" class="text-text-soft hover:text-navy text-2xl leading-none min-w-[44px] min-h-[44px]">×</button>'
      + '</div>'
      + '<p id="familyScanInviteLead" class="text-sm text-text-soft mb-4"></p>'
      + '<label id="familyScanInviteLabel" for="familyScanInviteInput" class="block text-sm font-medium text-text-soft mb-1"></label>'
      + '<input id="familyScanInviteInput" type="text" inputmode="email" autocomplete="off" class="w-full px-4 py-3 min-h-[44px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-navy dark:text-white font-body" />'
      + '<p id="familyScanInviteError" class="text-sm text-red-500 font-medium min-h-[1.2em] mt-2"></p>'
      + '<div class="flex gap-3 pt-4">'
      + '<button type="button" id="familyScanInviteCancel" class="flex-1 px-4 py-3 min-h-[44px] border border-gray-200 dark:border-gray-600 text-text-soft rounded-xl font-semibold"></button>'
      + '<button type="button" id="familyScanInviteContinue" class="flex-1 px-4 py-3 min-h-[44px] bg-navy hover:bg-navy-soft text-white rounded-xl font-heading font-bold dark:bg-gold dark:hover:bg-yellow-500"></button>'
      + '</div></div>';
    document.body.appendChild(root);
    return root;
  }

  let _activeResolve = null;

  function hideModal() {
    const root = document.getElementById(MODAL_ID);
    if (root) root.classList.add('hidden');
    document.removeEventListener('keydown', onEscape, true);
  }

  function finish(value) {
    const resolve = _activeResolve;
    _activeResolve = null;
    hideModal();
    if (typeof resolve === 'function') resolve(value);
  }

  function onEscape(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      finish(null);
    }
  }

  function submitModal() {
    const input = document.getElementById('familyScanInviteInput');
    const err = document.getElementById('familyScanInviteError');
    const raw = input ? String(input.value || '').trim() : '';
    if (!raw) {
      finish(null);
      return;
    }
    const parsed = parseQrPayload(raw);
    if (!parsed.email && !parsed.inviteToken) {
      if (err) err.textContent = scanT('family.scanQr.invalid', 'Could not read an email or invite link.');
      if (input) input.focus();
      return;
    }
    finish(raw);
  }

  function scanAdultQrInteractive() {
    return new Promise(function (resolve) {
      bindModalOnce();
      if (_activeResolve) finish(null);
      _activeResolve = resolve;
      const root = ensureModal();
      applyModalCopy(root);
      const input = root.querySelector('#familyScanInviteInput');
      const err = root.querySelector('#familyScanInviteError');
      if (err) err.textContent = '';
      if (input) input.value = '';
      root.classList.remove('hidden');
      document.addEventListener('keydown', onEscape, true);
      if (input) {
        setTimeout(function () { input.focus(); }, 0);
      }
    });
  }

  function bindModalOnce() {
    const root = ensureModal();
    if (root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');
    root.addEventListener('click', function (ev) {
      if (ev.target === root) finish(null);
    });
    root.querySelector('#familyScanInviteClose').addEventListener('click', function () { finish(null); });
    root.querySelector('#familyScanInviteCancel').addEventListener('click', function () { finish(null); });
    root.querySelector('#familyScanInviteContinue').addEventListener('click', submitModal);
    root.querySelector('#familyScanInviteInput').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitModal();
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindModalOnce);
    } else {
      bindModalOnce();
    }
  }

  window.FamilyInviteScan = {
    parseQrPayload: parseQrPayload,
    scanAdultQrInteractive: scanAdultQrInteractive,
  };
})();
