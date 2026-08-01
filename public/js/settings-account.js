/**
 * settings-account.js
 * "Konto & inloggning" section — renders based on accountAuth from GET /api/auth/me.
 * Handles: add-password (Apple-only), change-password, Apple status badges.
 */

/**
 * Platform helper — true only on iOS (not Android web, not desktop web).
 * Used to decide whether to show Apple linking UI.
 */
function showAppleAuthUI() {
  return !!(window.Platform && window.Platform.isIOS && window.Platform.isIOS());
}

function showGoogleAuthUI() {
  if (window.AuthLoginPlatform && typeof AuthLoginPlatform.getAuthMethods === 'function') {
    return AuthLoginPlatform.getAuthMethods().google;
  }
  return !!(window.Platform && window.Platform.isGoogleSignInAvailable && Platform.isGoogleSignInAvailable());
}

function pt(key, params) {
  return (typeof window.pt === 'function') ? window.pt(key, params) : key;
}

// ── Render the "Konto & inloggning" section ─────────────────────────────────
async function initAccountSection() {
  const sectionId = 'accountSection';

  try {
    const me = await Auth.api('/api/auth/me');
    const auth = me.accountAuth || {};
    const { hasPassword, hasAppleLinked, hasGoogleLinked } = auth;

    const section = document.getElementById(sectionId);
    if (!section) return;

    // ── Build inner HTML ────────────────────────────────────────────────────
    let html = `
      <h3 class="text-xl font-heading font-bold text-navy mb-4">${pt('settings.account.title')}</h3>
    `;

    // ── Apple status: iOS + linked ───────────────────────────────────────────
    if (hasAppleLinked && showAppleAuthUI()) {
      html += `
        <div class="mb-4 flex items-center gap-3 p-3 bg-mint border border-green-200 rounded-xl">
          <span class="text-green-600 text-lg">✓</span>
          <span class="text-sm font-semibold text-navy">${pt('settings.account.appleLinked')}</span>
        </div>
      `;
    }

    if (hasGoogleLinked && showGoogleAuthUI()) {
      html += `
        <div class="mb-4 flex items-center gap-3 p-3 bg-mint border border-green-200 rounded-xl">
          <span class="text-green-600 text-lg">✓</span>
          <span class="text-sm font-semibold text-navy">${pt('settings.account.googleLinked')}</span>
        </div>
      `;
    }

    // ── Add password form (no password yet) ────────────────────────────────
    if (!hasPassword) {
      // Android info when Apple-only
      if (hasAppleLinked && !showAppleAuthUI()) {
        html += `
          <div class="mb-4 p-3 bg-sky border border-lavender rounded-xl">
            <p class="text-sm text-navy">${pt('settings.account.appleLinkedOnIosHint')}</p>
          </div>
        `;
      }
      if (hasGoogleLinked && !showGoogleAuthUI()) {
        html += `
          <div class="mb-4 p-3 bg-sky border border-lavender rounded-xl">
            <p class="text-sm text-navy">${pt('settings.account.googleLinkedElsewhereHint')}</p>
          </div>
        `;
      }

      html += `
        <form id="addPasswordForm" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-navy mb-1">${pt('settings.account.newPassword')}</label>
            <input type="password" id="addNewPw" required minlength="8"
              placeholder="${pt('settings.account.minCharsPlaceholder')}"
              class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
          </div>
          <div>
            <label class="block text-sm font-semibold text-navy mb-1">${pt('settings.account.confirmPassword')}</label>
            <input type="password" id="addConfirmPw" required minlength="8"
              placeholder="${pt('settings.account.repeatPasswordPlaceholder')}"
              class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
          </div>
          <button type="submit" id="addPasswordBtn"
            class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
            ${pt('settings.account.savePassword')}
          </button>
          <p class="text-xs text-text-soft text-center">${pt('settings.account.passwordForNonApple')}</p>
          <div id="addPwMsg" class="text-sm min-h-[1.4em]"></div>
        </form>
      `;
    }

    // ── Change password (has password, or just added) ──────────────────────
    // Always show change-password section when user has a password.
    // This also handles the case where add-password just succeeded.
    if (hasPassword) {
      html += `
        <div id="changePasswordBlock">
          <p class="text-sm text-text-soft mb-3">${pt('settings.account.changePasswordHint')}</p>
          <form id="changePasswordForm" class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">${pt('settings.account.currentPassword')}</label>
              <input type="password" id="changeCurrentPw" required
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">${pt('settings.account.newPassword')}</label>
              <input type="password" id="changeNewPw" required minlength="8"
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">${pt('settings.account.confirmNewPassword')}</label>
              <input type="password" id="changeConfirmPw" required minlength="8"
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <button type="submit"
              class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
              ${pt('settings.account.changePassword')}
            </button>
            <div id="changePwMsg" class="text-sm min-h-[1.4em]"></div>
          </form>
        </div>
      `;

      // Apple link/unlink (wired for D)
      // "Koppla Apple-konto" — iOS only, no Apple linked yet
      if (!hasAppleLinked && showAppleAuthUI()) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <button type="button" id="linkAppleBtn"
              class="w-full px-4 py-3 bg-navy hover:bg-navy-soft text-white rounded-xl font-heading font-bold transition-colors flex items-center justify-center gap-2">
              <span>🍎</span> ${pt('settings.account.linkApple')}
            </button>
          </div>
        `;
      }
      // "Koppla bort Apple-konto" — any platform, Apple linked + has password
      if (hasAppleLinked && auth.canUnlinkApple) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <button type="button" id="unlinkAppleBtn"
              class="w-full px-4 py-3 border-2 border-red-300 hover:border-red-400 text-red-600 rounded-xl font-heading font-bold transition-colors">
              ${pt('settings.account.unlinkApple')}
            </button>
            <p id="unlinkAppleMsg" class="text-xs text-text-soft text-center mt-1"></p>
          </div>
        `;
      }

      if (!hasGoogleLinked && showGoogleAuthUI()) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <button type="button" id="linkGoogleBtn"
              class="w-full px-4 py-3 bg-white hover:bg-gray-50 text-navy border-2 border-lavender rounded-xl font-heading font-bold transition-colors flex items-center justify-center gap-2">
              <span>G</span> ${pt('settings.account.linkGoogle')}
            </button>
          </div>
        `;
      }
      if (hasGoogleLinked && auth.canUnlinkGoogle) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <button type="button" id="unlinkGoogleBtn"
              class="w-full px-4 py-3 border-2 border-red-300 hover:border-red-400 text-red-600 rounded-xl font-heading font-bold transition-colors">
              ${pt('settings.account.unlinkGoogle')}
            </button>
            <p id="unlinkGoogleMsg" class="text-xs text-text-soft text-center mt-1"></p>
          </div>
        `;
      }

      // Byt e-postadress (E) — only if hasPassword
      if (hasPassword) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <h4 class="text-sm font-semibold text-navy mb-2">${pt('settings.account.changeEmail')}</h4>
            <form id="changeEmailForm" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-navy mb-1">${pt('settings.account.newEmail')}</label>
                <input type="email" id="newEmail" required
                  placeholder="ny@example.com"
                  class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-navy mb-1">${pt('settings.account.yourPassword')}</label>
                <input type="password" id="emailChangePw" required
                  placeholder="${pt('settings.account.confirmWithPassword')}"
                  class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors text-sm">
              </div>
              <button type="submit" id="changeEmailBtn"
                class="w-full px-4 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors text-sm">
                ${pt('settings.account.sendConfirmLink')}
              </button>
              <div id="changeEmailMsg" class="text-sm min-h-[1.4em]"></div>
            </form>
          </div>
        `;
      }
    }

    section.innerHTML = html;

    // Show legacy section only if accountSection didn't render a hasPassword form
    // (i.e., when !hasPassword, accountSection shows add-password instead)
    const legacySection = document.getElementById('legacyPasswordSection');
    if (legacySection) {
      legacySection.classList.toggle('hidden', hasPassword);
    }

    // ── Wire up: Add password form ──────────────────────────────────────────
    const addForm = document.getElementById('addPasswordForm');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPw = document.getElementById('addNewPw').value;
        const confirmPw = document.getElementById('addConfirmPw').value;
        const msg = document.getElementById('addPwMsg');
        const btn = document.getElementById('addPasswordBtn');

        if (newPw !== confirmPw) {
          msg.textContent = pt('settings.account.passwordsMismatch');
          msg.className = 'text-sm text-red-500';
          return;
        }
        if (newPw.length < 8) {
          msg.textContent = pt('settings.account.passwordMinLength');
          msg.className = 'text-sm text-red-500';
          return;
        }

        btn.disabled = true;
        btn.textContent = pt('settings.account.saving');
        msg.textContent = '';
        msg.className = 'text-sm min-h-[1.4em]';

        try {
          await Auth.api('/api/account/set-password', {
            method: 'POST',
            body: JSON.stringify({ password: newPw }),
          });

          // Success: refresh section with password UI
          await initAccountSection();
        } catch (err) {
          msg.textContent = err.message || pt('settings.account.somethingWrong');
          msg.className = 'text-sm text-red-500';
          btn.disabled = false;
          btn.textContent = pt('settings.account.savePassword');
        }
      });
    }

    // ── Wire up: Change password form (initial load + post-add inject) ───────
    initChangePasswordForm();

    // ── Wire up: Link Apple (D) — iOS only ────────────────────────────────
    const linkAppleBtn = document.getElementById('linkAppleBtn');
    if (linkAppleBtn) {
      linkAppleBtn.addEventListener('click', async () => {
        if (!window.Platform || !window.Platform.appleSignIn) {
          alert(pt('settings.account.appleSignInUnavailable'));
          return;
        }
        try {
          const result = await window.Platform.appleSignIn.signIn();
          const idToken = result && (result.idToken || (result.response && result.response.identityToken));
          if (!idToken) {
            return;
          }
          linkAppleBtn.disabled = true;
          linkAppleBtn.textContent = pt('settings.account.linking');
          await Auth.api('/api/account/link-apple', {
            method: 'POST',
            body: JSON.stringify({ idToken: idToken }),
          });
          // Reload section to reflect new state
          initAccountSection();
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('409') || msg.toLowerCase().includes('already')) {
            alert(pt('settings.account.appleAlreadyLinked'));
          } else {
            alert(pt('settings.account.couldNotLinkApple') + ' ' + (err.message || pt('settings.account.tryAgain')));
          }
          linkAppleBtn.disabled = false;
          linkAppleBtn.textContent = pt('settings.account.linkAppleBtn');
        }
      });
    }

    // ── Wire up: Unlink Apple (D) — all platforms, requires password ──────
    const unlinkAppleBtn = document.getElementById('unlinkAppleBtn');
    if (unlinkAppleBtn) {
      unlinkAppleBtn.addEventListener('click', async () => {
        const pw = prompt(pt('settings.account.unlinkApplePrompt'));
        if (!pw) return;
        const msg = document.getElementById('unlinkAppleMsg');
        unlinkAppleBtn.disabled = true;
        unlinkAppleBtn.textContent = pt('settings.account.removing');
        try {
          await Auth.api('/api/account/unlink-apple', {
            method: 'DELETE',
            body: JSON.stringify({ password: pw }),
          });
          initAccountSection();
        } catch (err) {
          msg.textContent = err.message || pt('settings.account.couldNotUnlink');
          msg.className = 'text-xs text-red-500 text-center mt-1';
          unlinkAppleBtn.disabled = false;
          unlinkAppleBtn.textContent = pt('settings.account.unlinkApple');
        }
      });
    }

    const linkGoogleBtn = document.getElementById('linkGoogleBtn');
    if (linkGoogleBtn) {
      linkGoogleBtn.addEventListener('click', async () => {
        if (!window.Platform || !window.Platform.googleSignIn) {
          alert(pt('settings.account.googleSignInUnavailable'));
          return;
        }
        try {
          const result = await Platform.googleSignIn.signIn();
          if (!result || !result.idToken) return;
          linkGoogleBtn.disabled = true;
          linkGoogleBtn.textContent = pt('settings.account.linking');
          await Auth.api('/api/account/link-google', {
            method: 'POST',
            body: JSON.stringify({ idToken: result.idToken }),
          });
          initAccountSection();
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('409') || msg.toLowerCase().includes('already')) {
            alert(pt('settings.account.googleAlreadyLinked'));
          } else {
            alert(pt('settings.account.couldNotLinkGoogle') + ' ' + (err.message || pt('settings.account.tryAgain')));
          }
          linkGoogleBtn.disabled = false;
          linkGoogleBtn.textContent = pt('settings.account.linkGoogleBtn');
        }
      });
    }

    const unlinkGoogleBtn = document.getElementById('unlinkGoogleBtn');
    if (unlinkGoogleBtn) {
      unlinkGoogleBtn.addEventListener('click', async () => {
        const pw = prompt(pt('settings.account.unlinkGooglePrompt'));
        if (!pw) return;
        const msg = document.getElementById('unlinkGoogleMsg');
        unlinkGoogleBtn.disabled = true;
        unlinkGoogleBtn.textContent = pt('settings.account.removing');
        try {
          await Auth.api('/api/account/unlink-google', {
            method: 'DELETE',
            body: JSON.stringify({ password: pw }),
          });
          initAccountSection();
        } catch (err) {
          msg.textContent = err.message || pt('settings.account.couldNotUnlink');
          msg.className = 'text-xs text-red-500 text-center mt-1';
          unlinkGoogleBtn.disabled = false;
          unlinkGoogleBtn.textContent = pt('settings.account.unlinkGoogle');
        }
      });
    }

    // ── Wire up: Change email (E) ─────────────────────────────────────────
    const changeEmailForm = document.getElementById('changeEmailForm');
    if (changeEmailForm) {
      changeEmailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('newEmail').value.trim();
        const emailChangePw = document.getElementById('emailChangePw').value;
        const msg = document.getElementById('changeEmailMsg');
        const btn = document.getElementById('changeEmailBtn');
        if (!newEmail.includes('@')) {
          msg.textContent = pt('settings.account.invalidEmail');
          msg.className = 'text-sm text-red-500';
          return;
        }
        btn.disabled = true;
        btn.textContent = pt('settings.account.sending');
        msg.textContent = '';
        msg.className = 'text-sm min-h-[1.4em]';
        try {
          const res = await Auth.api('/api/account/change-email/request', {
            method: 'POST',
            body: JSON.stringify({ newEmail, password: emailChangePw }),
          });
          msg.textContent = res.message || pt('settings.account.linkSentTo', { email: newEmail });
          msg.className = 'text-sm text-green-600';
          changeEmailForm.reset();
        } catch (err) {
          msg.textContent = err.message || pt('settings.account.somethingWrongShort');
          msg.className = 'text-sm text-red-500';
          btn.disabled = false;
          btn.textContent = pt('settings.account.sendConfirmLink');
        }
      });
    }

  } catch (err) {
    console.error('[settings-account] init failed:', err);
  }
}

// ── Change password form handler (reusable after add-password success) ─────
function initChangePasswordForm() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById('changeCurrentPw').value;
    const newPw = document.getElementById('changeNewPw').value;
    const confirmPw = document.getElementById('changeConfirmPw').value;
    const msg = document.getElementById('changePwMsg');

    if (newPw !== confirmPw) {
      msg.textContent = pt('settings.account.passwordsMismatch');
      msg.className = 'text-sm text-red-500';
      return;
    }

    msg.textContent = pt('settings.account.saving');
    msg.className = 'text-sm text-text-soft';

    try {
      const result = await Auth.api('/api/account/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });

      msg.textContent = result.message || pt('settings.account.passwordChanged');
      msg.className = 'text-sm text-green-600';
      form.reset();
    } catch (err) {
      msg.textContent = err.message || pt('settings.account.somethingWrongShort');
      msg.className = 'text-sm text-red-500';
    }
  });
}

// ── Render the "Föräldralås" section ─────────────────────────────────────────
async function initParentPinSection() {
  const section = document.getElementById('parentPinSection');
  if (!section) return;

  try {
    const statusRes = await Auth.api('/api/family/parent-pin-status');
    const hasPin = statusRes.has_pin;

    const html = `
      <h3 class="text-xl font-heading font-bold text-navy mb-1">${pt('settings.parentPin.title')}</h3>
      <p class="text-sm text-text-soft mb-1 font-semibold">${pt('settings.parentPin.security')}</p>
      <p class="text-sm text-text-soft mb-4">
        ${hasPin
          ? pt('settings.parentPin.hasPinDescription')
          : pt('settings.parentPin.noPinDescription')}
      </p>
      <div id="parentPinFormWrap">
        ${hasPin ? buildParentPinChangeForm() : buildParentPinSetForm()}
      </div>
      <div id="parentPinMsg" class="text-sm min-h-[1.4em] mt-2"></div>
    `;

    section.innerHTML = html;
    ensureParentPinStyles();
    wireParentPinForm(hasPin);
  } catch (err) {
    console.error('[settings-account] parent-pin init failed:', err);
  }
}

function buildParentPinSetForm() {
  return `
    <div id="ppSetChooseStep">
      <p class="text-sm text-navy mb-3">${pt('settings.parentPin.choosePin')}</p>
      <div class="mb-3 text-center">
        <div id="ppSetDots" class="flex justify-center gap-3">
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
        </div>
      </div>
      <div id="ppSetMsg" class="text-sm text-red-500 text-center mb-2"></div>
      <div id="ppSetKeypad" class="pp-pin-keypad grid grid-cols-3 gap-2" role="group" aria-label="${pt('settings.parentPin.keypadAria')}"></div>
    </div>
    <div id="ppSetConfirmStep" class="hidden">
      <p class="text-sm text-navy mb-3">${pt('settings.parentPin.confirmPin')}</p>
      <div class="mb-3 text-center">
        <div id="ppConfirmDots" class="flex justify-center gap-3">
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
        </div>
      </div>
      <div id="ppConfirmKeypad" class="pp-pin-keypad grid grid-cols-3 gap-2 mb-3" role="group" aria-label="${pt('settings.parentPin.confirmKeypadAria')}"></div>
      <button type="button" id="ppSetBackBtn" class="text-xs text-text-soft underline block mx-auto">${pt('settings.parentPin.changePinBack')}</button>
    </div>
    <div id="ppSetResultMsg" class="text-sm text-center mt-2"></div>
  `;
}

function buildParentPinChangeForm() {
  return `
    <div id="parentPinChangeWrap">
      <div id="ppChangeStep1">
        <p class="text-sm text-navy mb-3">${pt('settings.parentPin.enterCurrentPin')}</p>
        <div class="mb-3 text-center">
          <div id="ppCurrentDots" class="flex justify-center gap-3">
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
          </div>
        </div>
        <div id="ppChangeKeypad" class="pp-pin-keypad grid grid-cols-3 gap-2 mb-3" role="group" aria-label="${pt('settings.parentPin.pinKeypadAria')}"></div>
        <button type="button" id="ppForgotPinBtn" class="text-xs text-text-soft underline mx-auto block mb-2">
          ${pt('settings.parentPin.forgotPin')}
        </button>
        <div id="ppChangeStep1Msg" class="text-sm text-red-500 text-center"></div>
      </div>

      <div id="ppChangeStep2" class="hidden">
        <div id="ppNewChooseStep">
          <p class="text-sm text-navy mb-3">${pt('settings.parentPin.chooseNewPin')}</p>
          <div class="mb-3 text-center">
            <div id="ppNewDots" class="flex justify-center gap-3">
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
            </div>
          </div>
          <div id="ppNewKeypad" class="pp-pin-keypad grid grid-cols-3 gap-2 mb-3" role="group" aria-label="${pt('settings.parentPin.newPinKeypadAria')}"></div>
        </div>
        <div id="ppNewConfirmStep" class="hidden">
          <p class="text-sm text-navy mb-3">${pt('settings.parentPin.confirmNewPin')}</p>
          <div class="mb-3 text-center">
            <div id="ppNewConfirmDots" class="flex justify-center gap-3">
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
            </div>
          </div>
          <div id="ppNewConfirmKeypad" class="pp-pin-keypad grid grid-cols-3 gap-2 mb-3" role="group" aria-label="${pt('settings.parentPin.confirmNewPinKeypadAria')}"></div>
          <button type="button" id="ppNewBackBtn" class="text-xs text-text-soft underline block mx-auto">${pt('settings.parentPin.changePinBack')}</button>
        </div>
        <div id="ppChangeResultMsg" class="text-sm text-center"></div>
      </div>

      <div id="ppForgotPinForm" class="hidden space-y-3">
        <p class="text-sm text-text-soft">${pt('settings.parentPin.forgotIntro')}</p>
        <input type="password" id="ppForgotPw" placeholder="${pt('settings.parentPin.yourPassword')}"
          class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
        <button type="button" id="ppForgotVerifyBtn"
          class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
          ${pt('settings.parentPin.verify')}
        </button>
        <div id="ppForgotMsg" class="text-sm text-red-500 text-center"></div>
      </div>
    </div>
  `;
}

function ensureParentPinStyles() {
  if (document.getElementById('parent-pin-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'parent-pin-ui-styles';
  style.textContent = [
    '.pp-pin-keypad { max-width: 280px; margin-left: auto; margin-right: auto; }',
    '#parentPinSection .pp-pin-keypad button { touch-action: manipulation; }',
  ].join('\n');
  document.head.appendChild(style);
}

function wireParentPinForm(hasPin) {
  if (hasPin) {
    initParentPinNumpad('ppChangeKeypad', 'ppCurrentDots', handleCurrentPinEntry);
    const forgotBtn = document.getElementById('ppForgotPinBtn');
    if (forgotBtn) forgotBtn.addEventListener('click', showForgotPinForm);
    const verifyBtn = document.getElementById('ppForgotVerifyBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', handleForgotPinVerify);
    const newBackBtn = document.getElementById('ppNewBackBtn');
    if (newBackBtn) newBackBtn.addEventListener('click', showNewPinChooseStep);
  } else {
    showSetPinChooseStep();
    const backBtn = document.getElementById('ppSetBackBtn');
    if (backBtn) backBtn.addEventListener('click', showSetPinChooseStep);
  }
}

let _ppSetPendingPin = null;

function showSetPinChooseStep() {
  _ppSetPendingPin = null;
  const choose = document.getElementById('ppSetChooseStep');
  const confirm = document.getElementById('ppSetConfirmStep');
  const result = document.getElementById('ppSetResultMsg');
  if (choose) choose.classList.remove('hidden');
  if (confirm) confirm.classList.add('hidden');
  if (result) result.textContent = '';
  initParentPinNumpad('ppSetKeypad', 'ppSetDots', handleSetPinChooseComplete);
}

function handleSetPinChooseComplete(pin) {
  _ppSetPendingPin = pin;
  document.getElementById('ppSetChooseStep')?.classList.add('hidden');
  document.getElementById('ppSetConfirmStep')?.classList.remove('hidden');
  initParentPinNumpad('ppConfirmKeypad', 'ppConfirmDots', handleSetPinConfirmComplete);
}

async function handleSetPinConfirmComplete(confirmPin) {
  if (confirmPin !== _ppSetPendingPin) {
    const msg = document.getElementById('ppSetResultMsg');
    if (msg) {
      msg.textContent = pt('settings.parentPin.pinsMismatch');
      msg.className = 'text-sm text-red-500 text-center mt-2';
    }
    showSetPinChooseStep();
    return;
  }
  await saveParentPin(confirmPin);
}

function showNewPinChooseStep() {
  _ppChangeNewPin = null;
  document.getElementById('ppNewChooseStep')?.classList.remove('hidden');
  document.getElementById('ppNewConfirmStep')?.classList.add('hidden');
  const msg = document.getElementById('ppChangeResultMsg');
  if (msg) msg.textContent = '';
  initParentPinNumpad('ppNewKeypad', 'ppNewDots', handleNewPinEntry);
}

function initParentPinNumpad(containerId, dotsId, onComplete) {
  const container = document.getElementById(containerId);
  const dotsEl = document.getElementById(dotsId);
  if (!container || !dotsEl) return;

  container.innerHTML = '';
  let entered = '';

  function updateDots() {
    const allDots = dotsEl.querySelectorAll('div');
    allDots.forEach((d, i) => {
      d.className = i < entered.length ? 'w-4 h-4 rounded-full bg-gold' : 'w-4 h-4 rounded-full bg-lavender';
    });
  }

  function buildKeypad() {
    container.innerHTML = '';
    const digits = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
    digits.forEach(d => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = d;
      btn.className = d === '⌫' || d === '✓'
        ? 'py-3 text-lg font-bold bg-lavender hover:bg-purple-200 rounded-xl transition-colors text-text-soft'
        : 'py-4 text-xl font-bold bg-lavender hover:bg-purple-200 rounded-xl transition-colors text-navy';
      btn.style.minHeight = '52px';
      btn.addEventListener('click', () => {
        if (d === '⌫') {
          entered = entered.slice(0, -1);
        } else if (d === '✓') {
          if (entered.length === 4) onComplete(entered, dotsEl, containerId);
          return;
        } else if (entered.length < 4) {
          entered += d;
        }
        updateDots();
        if (entered.length === 4 && d !== '⌫' && d !== '✓') {
          setTimeout(function () { onComplete(entered, dotsEl, containerId); }, 120);
        }
      });
      container.appendChild(btn);
    });
  }

  buildKeypad();
  updateDots();
}

async function saveParentPin(pin) {
  const msg = document.getElementById('ppSetResultMsg') || document.getElementById('parentPinMsg');
  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin: pin }),
    });
    if (msg) {
      msg.textContent = pt('settings.parentPin.pinNowActive');
      msg.className = 'text-sm text-green-600 text-center';
    }
    // Reload section to reflect new state
    setTimeout(initParentPinSection, 1500);
  } catch (err) {
    const m = document.getElementById('ppSetResultMsg') || document.getElementById('parentPinMsg');
    if (m) { m.textContent = err.message || pt('settings.account.somethingWrongShort'); m.className = 'text-sm text-red-500 text-center'; }
  }
}

let _ppChangeNewPin = null;
let _ppVerifiedCurrentPin = null;

async function handleCurrentPinEntry(pin) {
  _ppChangeNewPin = null;
  try {
    const res = await Auth.api('/api/family/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      _ppVerifiedCurrentPin = pin;
      document.getElementById('ppChangeStep1').classList.add('hidden');
      document.getElementById('ppChangeStep2').classList.remove('hidden');
      showNewPinChooseStep();
    }
  } catch (_err) {
    const msg = document.getElementById('ppChangeStep1Msg');
    if (msg) {
      msg.textContent = pt('settings.parentPin.wrongPin');
      initParentPinNumpad('ppChangeKeypad', 'ppCurrentDots', handleCurrentPinEntry);
    }
  }
}

async function handleNewPinEntry(pin) {
  if (_ppChangeNewPin === null) {
    _ppChangeNewPin = pin;
    document.getElementById('ppNewChooseStep')?.classList.add('hidden');
    document.getElementById('ppNewConfirmStep')?.classList.remove('hidden');
    initParentPinNumpad('ppNewConfirmKeypad', 'ppNewConfirmDots', handleNewPinConfirmEntry);
  }
}

async function handleNewPinConfirmEntry(confirmPin) {
  const pin = _ppChangeNewPin;
  if (confirmPin !== pin) {
    const msg = document.getElementById('ppChangeResultMsg');
    if (msg) {
      msg.textContent = pt('settings.parentPin.pinsMismatch');
      msg.className = 'text-sm text-red-500 text-center';
    }
    _ppChangeNewPin = null;
    showNewPinChooseStep();
    return;
  }

  const msg = document.getElementById('ppChangeResultMsg');

  if (_ppForgotVerifiedPassword) {
    // Password verified in handleForgotPinVerify — use it directly
    try {
      await Auth.api('/api/family/set-pin', {
        method: 'POST',
        body: JSON.stringify({ pin, confirmPin: pin, password: _ppForgotVerifiedPassword }),
      });
      if (msg) { msg.textContent = pt('settings.parentPin.pinChanged'); msg.className = 'text-sm text-green-600 text-center'; }
      _ppForgotVerifiedPassword = null;
      setTimeout(initParentPinSection, 1500);
    } catch (err) {
      if (msg) { msg.textContent = err.message || pt('settings.parentPin.couldNotChangePin'); msg.className = 'text-sm text-red-500 text-center'; }
      _ppChangeNewPin = null;
      _ppForgotVerifiedPassword = null;
      showNewPinChooseStep();
    }
    return;
  }

  // Normal change flow — current PIN already verified in step 1
  const currentPin = _ppVerifiedCurrentPin;
  if (!currentPin) {
    if (msg) {
      msg.textContent = pt('settings.parentPin.sessionExpired');
      msg.className = 'text-sm text-red-500 text-center';
    }
    _ppChangeNewPin = null;
    document.getElementById('ppChangeStep2')?.classList.add('hidden');
    document.getElementById('ppChangeStep1')?.classList.remove('hidden');
    initParentPinNumpad('ppChangeKeypad', 'ppCurrentDots', handleCurrentPinEntry);
    return;
  }

  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin: pin, currentPin }),
    });
    if (msg) {
      msg.textContent = pt('settings.parentPin.pinChanged');
      msg.className = 'text-sm text-green-600 text-center';
    }
    _ppVerifiedCurrentPin = null;
    setTimeout(initParentPinSection, 1500);
  } catch (err) {
    if (msg) { msg.textContent = err.message || pt('settings.parentPin.couldNotChangePin'); msg.className = 'text-sm text-red-500 text-center'; }
    _ppChangeNewPin = null;
    showNewPinChooseStep();
  }
}

function showForgotPinForm() {
  document.getElementById('ppChangeStep1').classList.add('hidden');
  document.getElementById('ppForgotPinForm').classList.remove('hidden');
}

async function handleForgotPinVerify() {
  const pw = document.getElementById('ppForgotPw').value;
  const msg = document.getElementById('ppForgotMsg');
  if (!pw) { msg.textContent = pt('settings.parentPin.enterPassword'); return; }

  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '0000', confirmPin: '0000', password: pw }),
    });
  } catch (err) {
    msg.textContent = err.message || pt('settings.parentPin.wrongPassword');
    return;
  }

  // Now show new PIN form — store the verified password so saveParentPinForForgot uses it
  document.getElementById('ppForgotPinForm').classList.add('hidden');
  document.getElementById('ppChangeStep2').classList.remove('hidden');
  _ppForgotVerifiedPassword = pw;
  showNewPinChooseStep();
}

// Store the verified password for the forgot-PIN flow (used by saveParentPin)
let _ppForgotVerifiedPassword = null;
function bootSettingsAccount() {
  if (document.getElementById('accountSection')) {
    setTimeout(initAccountSection, 0);
  }
  if (document.getElementById('parentPinSection')) {
    setTimeout(initParentPinSection, 0);
  }
}
document.addEventListener('DOMContentLoaded', bootSettingsAccount);
document.addEventListener('parent-i18n-ready', bootSettingsAccount);
document.addEventListener('locale-changed', bootSettingsAccount);