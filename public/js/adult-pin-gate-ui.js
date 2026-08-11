/**
 * adult-pin-gate-ui.js — vuxenverifiering (parent PIN), not child PIN. No plaintext storage.
 */
(function () {
  'use strict';

  function tx(key, fallback) {
    if (window.I18n && typeof I18n.t === 'function') {
      const v = I18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  /**
   * @returns {Promise<{ok:boolean, pin?:string, code?:string}>}
   */
  function collectAdultPin(options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      const hint = opts.hint || tx('parentGate.hint', 'Ange din vuxen-PIN');
      const old = document.getElementById('adult-pin-gate-overlay');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      const overlay = document.createElement('div');
      overlay.id = 'adult-pin-gate-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'adult-pin-gate-title');
      overlay.className = 'adult-pin-gate-overlay';
      overlay.style.cssText = [
        'position:fixed;inset:0;z-index:10000;background:rgba(27,35,64,0.88);',
        'display:flex;align-items:center;justify-content:center;padding:16px;',
      ].join('');

      const card = document.createElement('div');
      card.className = 'adult-pin-gate-card';
      card.style.cssText = [
        'background:#fff;border-radius:24px;padding:28px 20px;max-width:360px;width:100%;',
        'box-shadow:0 20px 60px rgba(0,0,0,0.35);text-align:center;border:2px solid #1B2340;',
      ].join('');

      const title = document.createElement('h2');
      title.id = 'adult-pin-gate-title';
      title.textContent = tx('parentGate.title', 'Vuxenläge');
      title.style.cssText = 'font-size:1.25rem;font-weight:700;color:#1B2340;margin:0 0 8px;';

      const subtitle = document.createElement('p');
      subtitle.textContent = hint;
      subtitle.style.cssText = 'font-size:0.95rem;color:#1B2340;margin:0 0 16px;line-height:1.4;';

      const status = document.createElement('p');
      status.id = 'adult-pin-gate-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'min-height:1.25rem;font-size:0.875rem;color:#B45309;margin:0 0 12px;font-weight:600;';

      const dotsWrap = document.createElement('div');
      dotsWrap.setAttribute('aria-hidden', 'true');
      dotsWrap.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-bottom:16px;';
      const dots = [];
      for (let i = 0; i < 4; i += 1) {
        const d = document.createElement('span');
        d.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#EDE7F6;border:2px solid #1B2340;';
        dots.push(d);
        dotsWrap.appendChild(d);
      }

      const keypad = document.createElement('div');
      keypad.setAttribute('role', 'group');
      keypad.setAttribute('aria-label', tx('parentGate.keypadAria', 'PIN-knappsats'));
      keypad.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = tx('parentGate.cancel', 'Avbryt');
      cancelBtn.setAttribute('aria-label', tx('parentGate.cancel', 'Avbryt'));
      cancelBtn.style.cssText = [
        'min-height:44px;min-width:44px;padding:10px 16px;font-size:1rem;',
        'color:#1B2340;background:#F3F4F6;border:2px solid #1B2340;border-radius:12px;cursor:pointer;',
      ].join('');

      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(status);
      card.appendChild(dotsWrap);
      card.appendChild(keypad);
      card.appendChild(cancelBtn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      let entered = '';

      function updateDots() {
        dots.forEach(function (dot, idx) {
          dot.style.background = idx < entered.length ? '#F5A623' : '#EDE7F6';
        });
        status.textContent = entered.length === 0
          ? ''
          : entered.length + ' ' + tx('parentGate.digitsEntered', 'av 4 siffror');
      }

      function finish(ok, payload) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(payload || { ok: ok });
      }

      function pressDigit(d) {
        status.textContent = '';
        if (d === 'back') {
          entered = entered.slice(0, -1);
        } else if (entered.length < 4) {
          entered += d;
        }
        updateDots();
        if (entered.length === 4) {
          finish(true, { ok: true, pin: entered });
        }
      }

      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
      keys.forEach(function (k) {
        const btn = document.createElement('button');
        btn.type = 'button';
        const label = k === 'back' ? tx('parentGate.backspace', 'Radera') : k === 'ok' ? tx('parentGate.confirm', 'Bekräfta') : k;
        btn.textContent = k === 'back' ? '⌫' : k === 'ok' ? '✓' : k;
        btn.setAttribute('aria-label', label);
        btn.style.cssText = [
          'min-height:52px;min-width:44px;font-size:1.25rem;font-weight:700;',
          'background:#EDE7F6;color:#1B2340;border:2px solid #1B2340;border-radius:14px;',
          'cursor:pointer;touch-action:manipulation;',
        ].join('');
        btn.addEventListener('click', function () {
          if (k === 'ok') {
            if (entered.length === 4) finish(true, { ok: true, pin: entered });
            else status.textContent = tx('errors.parentPinInvalid', 'Ange fyra siffror');
            return;
          }
          if (k === 'back') pressDigit('back');
          else pressDigit(k);
        });
        keypad.appendChild(btn);
      });

      cancelBtn.addEventListener('click', function () {
        finish(false, { ok: false, code: 'PIN_CANCEL' });
      });

      if (opts.allowBackupLogin !== false) {
        const forgotBtn = document.createElement('button');
        forgotBtn.type = 'button';
        forgotBtn.textContent = tx(
          'parentGate.forgotPinBackup',
          'Glömt PIN? Logga in med e-post eller Apple/Google'
        );
        forgotBtn.setAttribute(
          'aria-label',
          tx('parentGate.forgotPinBackup', 'Glömt PIN? Logga in med e-post eller Apple/Google')
        );
        forgotBtn.style.cssText = [
          'display:block;margin:12px auto 0;min-height:44px;padding:8px 12px;',
          'font-size:0.8rem;font-weight:600;color:#5A6178;background:none;border:none;',
          'text-decoration:underline;cursor:pointer;',
        ].join('');
        forgotBtn.addEventListener('click', function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          const backupNext = opts.backupNext || '/home';
          if (window.Auth && typeof Auth.redirectToParentBackupLogin === 'function') {
            Auth.redirectToParentBackupLogin(backupNext);
            return;
          }
          window.location.href = '/login?parent=1&next=' + encodeURIComponent(backupNext);
        });
        card.appendChild(forgotBtn);
      }

      updateDots();
    });
  }

  window.AdultPinGateUI = {
    collectAdultPin: collectAdultPin,
  };
})();
