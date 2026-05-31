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

// ── Render the "Konto & inloggning" section ─────────────────────────────────
async function initAccountSection() {
  const sectionId = 'accountSection';
  const msgId = 'accountMsg';

  try {
    const me = await Auth.api('/api/auth/me');
    const auth = me.accountAuth || {};
    const { hasPassword, hasAppleLinked } = auth;

    const section = document.getElementById(sectionId);
    if (!section) return;

    // Helper: get CSRF token for POST
    function csrf() { return Auth.getCsrfToken() || ''; }

    // ── Build inner HTML ────────────────────────────────────────────────────
    let html = `
      <h3 class="text-xl font-heading font-bold text-navy mb-4">Konto & inloggning</h3>
    `;

    // ── Apple status: iOS + linked ───────────────────────────────────────────
    if (hasAppleLinked && showAppleAuthUI()) {
      html += `
        <div class="mb-4 flex items-center gap-3 p-3 bg-mint border border-green-200 rounded-xl">
          <span class="text-green-600 text-lg">✓</span>
          <span class="text-sm font-semibold text-navy">Apple-konto kopplat</span>
        </div>
      `;
    }

    // ── Add password form (no password yet) ────────────────────────────────
    if (!hasPassword) {
      // Android info when Apple-only
      if (hasAppleLinked && !showAppleAuthUI()) {
        html += `
          <div class="mb-4 p-3 bg-sky border border-lavender rounded-xl">
            <p class="text-sm text-navy">Du kopplade Apple-kontot på en iPhone. För att logga in här, lägg till ett lösenord nedan.</p>
          </div>
        `;
      }

      html += `
        <form id="addPasswordForm" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-navy mb-1">Nytt lösenord</label>
            <input type="password" id="addNewPw" required minlength="8"
              placeholder="Minst 8 tecken"
              class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
          </div>
          <div>
            <label class="block text-sm font-semibold text-navy mb-1">Bekräfta lösenord</label>
            <input type="password" id="addConfirmPw" required minlength="8"
              placeholder="Skriv lösenordet igen"
              class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
          </div>
          <button type="submit" id="addPasswordBtn"
            class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
            Spara lösenord
          </button>
          <p class="text-xs text-text-soft text-center">För inloggning utan Apple</p>
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
          <p class="text-sm text-text-soft mb-3">Byt lösenord för att behålla tillgång till kontot.</p>
          <form id="changePasswordForm" class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">Nuvarande lösenord</label>
              <input type="password" id="changeCurrentPw" required
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">Nytt lösenord</label>
              <input type="password" id="changeNewPw" required minlength="8"
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <div>
              <label class="block text-sm font-semibold text-navy mb-1">Bekräfta nytt lösenord</label>
              <input type="password" id="changeConfirmPw" required minlength="8"
                class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
            </div>
            <button type="submit"
              class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
              Byt lösenord
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
              <span>🍎</span> Koppla Apple-konto
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
              Koppla bort Apple-konto
            </button>
            <p id="unlinkAppleMsg" class="text-xs text-text-soft text-center mt-1"></p>
          </div>
        `;
      }

      // Byt e-postadress (E) — only if hasPassword
      if (hasPassword) {
        html += `
          <div class="mt-4 pt-4 border-t border-lavender">
            <h4 class="text-sm font-semibold text-navy mb-2">Byt e-postadress</h4>
            <form id="changeEmailForm" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-navy mb-1">Ny e-postadress</label>
                <input type="email" id="newEmail" required
                  placeholder="ny@example.com"
                  class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-navy mb-1">Ditt lösenord</label>
                <input type="password" id="emailChangePw" required
                  placeholder="Bekräfta med lösenord"
                  class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors text-sm">
              </div>
              <button type="submit" id="changeEmailBtn"
                class="w-full px-4 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors text-sm">
                Skicka bekräftelselänk
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
          msg.textContent = 'Lösenorden matchar inte';
          msg.className = 'text-sm text-red-500';
          return;
        }
        if (newPw.length < 8) {
          msg.textContent = 'Lösenordet måste vara minst 8 tecken';
          msg.className = 'text-sm text-red-500';
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Sparar…';
        msg.textContent = '';
        msg.className = 'text-sm min-h-[1.4em]';

        try {
          const result = await Auth.api('/api/account/set-password', {
            method: 'POST',
            body: JSON.stringify({ password: newPw }),
          });

          // Success: update UI to "change password" mode
          const sectionEl = document.getElementById(sectionId);
          const auth = result.accountAuth || {};
          const { hasPassword: hp } = auth;

          if (sectionEl) {
            // Replace section content with the hasPassword version
            sectionEl.innerHTML = `
              <h3 class="text-xl font-heading font-bold text-navy mb-4">Konto & inloggning</h3>
              <div id="changePasswordBlock">
                <div class="mb-3 p-3 bg-mint border border-green-200 rounded-xl">
                  <p class="text-sm text-green-700 font-semibold">✓ Lösenordet är nu aktivt</p>
                </div>
                <p class="text-sm text-text-soft mb-3">Byt lösenord för att behålla tillgång till kontot.</p>
                <form id="changePasswordForm" class="space-y-4">
                  <div>
                    <label class="block text-sm font-semibold text-navy mb-1">Nuvarande lösenord</label>
                    <input type="password" id="changeCurrentPw" required
                      class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-navy mb-1">Nytt lösenord</label>
                    <input type="password" id="changeNewPw" required minlength="8"
                      class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-navy mb-1">Bekräfta nytt lösenord</label>
                    <input type="password" id="changeConfirmPw" required minlength="8"
                      class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
                  </div>
                  <button type="submit"
                    class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
                    Byt lösenord
                  </button>
                  <div id="changePwMsg" class="text-sm min-h-[1.4em]"></div>
                </form>
              </div>
            `;
            // Wire up change form after inject
            initChangePasswordForm();
          }
        } catch (err) {
          msg.textContent = err.message || 'Något gick fel. Försök igen.';
          msg.className = 'text-sm text-red-500';
          btn.disabled = false;
          btn.textContent = 'Spara lösenord';
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
          alert('Apple-inloggning är inte tillgänglig på denna enhet.');
          return;
        }
        try {
          const result = await window.Platform.appleSignIn.signIn();
          if (!result.response || !result.response.identityToken) {
            return; // cancelled
          }
          linkAppleBtn.disabled = true;
          linkAppleBtn.textContent = 'Länkar…';
          const res = await Auth.api('/api/account/link-apple', {
            method: 'POST',
            body: JSON.stringify({ idToken: result.response.identityToken }),
          });
          // Reload section to reflect new state
          initAccountSection();
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('409') || msg.toLowerCase().includes('already')) {
            alert('Detta Apple-konto är redan kopplat till ett annat konto.');
          } else {
            alert('Kunde inte länka Apple: ' + (err.message || 'Försök igen.'));
          }
          linkAppleBtn.disabled = false;
          linkAppleBtn.textContent = '🍎 Koppla Apple-konto';
        }
      });
    }

    // ── Wire up: Unlink Apple (D) — all platforms, requires password ──────
    const unlinkAppleBtn = document.getElementById('unlinkAppleBtn');
    if (unlinkAppleBtn) {
      unlinkAppleBtn.addEventListener('click', async () => {
        const pw = prompt('Ange ditt lösenord för att koppla bort Apple:');
        if (!pw) return;
        const msg = document.getElementById('unlinkAppleMsg');
        unlinkAppleBtn.disabled = true;
        unlinkAppleBtn.textContent = 'Tar bort…';
        try {
          await Auth.api('/api/account/unlink-apple', {
            method: 'DELETE',
            body: JSON.stringify({ password: pw }),
          });
          initAccountSection();
        } catch (err) {
          msg.textContent = err.message || 'Kunde inte koppla bort';
          msg.className = 'text-xs text-red-500 text-center mt-1';
          unlinkAppleBtn.disabled = false;
          unlinkAppleBtn.textContent = 'Koppla bort Apple-konto';
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
          msg.textContent = 'Ange en giltig e-postadress';
          msg.className = 'text-sm text-red-500';
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Sänder…';
        msg.textContent = '';
        msg.className = 'text-sm min-h-[1.4em]';
        try {
          const res = await Auth.api('/api/account/change-email/request', {
            method: 'POST',
            body: JSON.stringify({ newEmail, password: emailChangePw }),
          });
          msg.textContent = res.message || `Länk skickad till ${newEmail}`;
          msg.className = 'text-sm text-green-600';
          changeEmailForm.reset();
        } catch (err) {
          msg.textContent = err.message || 'Något gick fel';
          msg.className = 'text-sm text-red-500';
          btn.disabled = false;
          btn.textContent = 'Skicka bekräftelselänk';
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
      msg.textContent = 'Lösenorden matchar inte';
      msg.className = 'text-sm text-red-500';
      return;
    }

    msg.textContent = 'Sparar…';
    msg.className = 'text-sm text-text-soft';

    try {
      const result = await Auth.api('/api/account/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });

      msg.textContent = result.message || 'Lösenordet har ändrats!';
      msg.className = 'text-sm text-green-600';
      form.reset();
    } catch (err) {
      msg.textContent = err.message || 'Något gick fel';
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
      <h3 class="text-xl font-heading font-bold text-navy mb-1">Föräldralås</h3>
      <p class="text-sm text-text-soft mb-4">
        ${hasPin
          ? 'En PIN-kod skyddar föräldraläget så att barn inte kan lämna barnläget utan din PIN.'
          : 'Sätt en PIN-kod för att skydda föräldraläget — barn kan inte lämna barnläget utan din PIN.'}
      </p>
      <div id="parentPinFormWrap">
        ${hasPin ? buildParentPinChangeForm() : buildParentPinSetForm()}
      </div>
      <div id="parentPinMsg" class="text-sm min-h-[1.4em] mt-2"></div>
    `;

    section.innerHTML = html;
    wireParentPinForm(hasPin);
  } catch (err) {
    console.error('[settings-account] parent-pin init failed:', err);
  }
}

function buildParentPinSetForm() {
  return `
    <div id="parentPinStep1">
      <p class="text-sm text-navy mb-3">Välj en 4-siffrig PIN-kod</p>
      <div class="mb-3 text-center">
        <div id="ppSetDots" class="flex justify-center gap-3">
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
          <div class="w-4 h-4 rounded-full bg-lavender"></div>
        </div>
      </div>
      <div id="ppSetMsg" class="text-sm text-red-500 text-center mb-2"></div>
      <div id="ppSetKeypad" class="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="Siffertavla"></div>
      <div id="ppSetConfirmWrap" class="hidden space-y-3">
        <p class="text-sm text-navy mb-2">Bekräfta PIN-koden</p>
        <div class="mb-3 text-center">
          <div id="ppConfirmDots" class="flex justify-center gap-3">
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
          </div>
        </div>
        <div id="ppConfirmKeypad" class="grid grid-cols-3 gap-2" role="group" aria-label="Bekräfta PIN-tavla"></div>
      </div>
      <div id="ppSetResultMsg" class="text-sm text-center"></div>
    </div>
  `;
}

function buildParentPinChangeForm() {
  return `
    <div id="parentPinChangeWrap">
      <div id="ppChangeStep1">
        <p class="text-sm text-navy mb-3">Ange nuvarande PIN-kod</p>
        <div class="mb-3 text-center">
          <div id="ppCurrentDots" class="flex justify-center gap-3">
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
          </div>
        </div>
        <div id="ppChangeKeypad" class="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="PIN-tavla"></div>
        <button type="button" id="ppForgotPinBtn" class="text-xs text-text-soft underline mx-auto block mb-2">
          Glömt PIN-koden?
        </button>
        <div id="ppChangeStep1Msg" class="text-sm text-red-500 text-center"></div>
      </div>

      <div id="ppChangeStep2" class="hidden">
        <p class="text-sm text-navy mb-3">Välj ny PIN-kod</p>
        <div class="mb-3 text-center">
          <div id="ppNewDots" class="flex justify-center gap-3">
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
            <div class="w-4 h-4 rounded-full bg-lavender"></div>
          </div>
        </div>
        <div id="ppNewKeypad" class="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="Ny PIN-tavla"></div>
        <div id="ppNewConfirmWrap" class="hidden space-y-3">
          <p class="text-sm text-navy mb-2">Bekräfta ny PIN-kod</p>
          <div class="mb-3 text-center">
            <div id="ppNewConfirmDots" class="flex justify-center gap-3">
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
              <div class="w-4 h-4 rounded-full bg-lavender"></div>
            </div>
          </div>
          <div id="ppNewConfirmKeypad" class="grid grid-cols-3 gap-2" role="group" aria-label="Bekräfta ny PIN-tavla"></div>
        </div>
        <div id="ppChangeResultMsg" class="text-sm text-center"></div>
      </div>

      <div id="ppForgotPinForm" class="hidden space-y-3">
        <p class="text-sm text-text-soft">Ange ditt lösenord för att sätta en ny PIN-kod.</p>
        <input type="password" id="ppForgotPw" placeholder="Ditt lösenord"
          class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">
        <button type="button" id="ppForgotVerifyBtn"
          class="w-full px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold transition-colors">
          Verifiera
        </button>
        <div id="ppForgotMsg" class="text-sm text-red-500 text-center"></div>
      </div>
    </div>
  `;
}

function wireParentPinForm(hasPin) {
  if (hasPin) {
    initParentPinNumpad('ppChangeKeypad', 'ppCurrentDots', handleCurrentPinEntry);
    const forgotBtn = document.getElementById('ppForgotPinBtn');
    if (forgotBtn) forgotBtn.addEventListener('click', showForgotPinForm);
    const verifyBtn = document.getElementById('ppForgotVerifyBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', handleForgotPinVerify);
  } else {
    initParentPinNumpad('ppSetKeypad', 'ppSetDots', handleSetPinEntry);
  }
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
      });
      container.appendChild(btn);
    });
  }

  buildKeypad();
  updateDots();
}

async function handleSetPinEntry(pin, dotsEl, containerId) {
  const wrap = document.getElementById('ppSetConfirmWrap');
  const keypad = document.getElementById('ppSetKeypad');
  const msg = document.getElementById('ppSetMsg');

  if (!wrap.classList.contains('visible') && !wrap.classList.contains('shown')) {
    // First entry — show confirm step
    wrap.classList.remove('hidden');
    // Swap to confirm keypad
    initParentPinNumpad('ppConfirmKeypad', 'ppConfirmDots', (confirmPin) => {
      if (confirmPin !== pin) {
        document.getElementById('ppSetResultMsg').textContent = 'PIN-koderna matchar inte — försök igen';
        document.getElementById('ppSetResultMsg').className = 'text-sm text-red-500 text-center';
        // Reset confirm dots
        initParentPinNumpad('ppConfirmKeypad', 'ppConfirmDots', handleSetPinEntry);
        return;
      }
      saveParentPin(pin);
    });
  }
}

async function saveParentPin(pin) {
  const msg = document.getElementById('ppSetResultMsg') || document.getElementById('parentPinMsg');
  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin: pin }),
    });
    if (msg) {
      msg.textContent = '✓ PIN-koden är nu aktiv';
      msg.className = 'text-sm text-green-600 text-center';
    }
    // Reload section to reflect new state
    setTimeout(initParentPinSection, 1500);
  } catch (err) {
    const m = document.getElementById('ppSetResultMsg') || document.getElementById('parentPinMsg');
    if (m) { m.textContent = err.message || 'Något gick fel'; m.className = 'text-sm text-red-500 text-center'; }
  }
}

let _ppChangeNewPin = null;

async function handleCurrentPinEntry(pin) {
  _ppChangeNewPin = null;
  try {
    const res = await Auth.api('/api/family/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      // Correct PIN — proceed to new PIN entry
      document.getElementById('ppChangeStep1').classList.add('hidden');
      document.getElementById('ppChangeStep2').classList.remove('hidden');
      initParentPinNumpad('ppNewKeypad', 'ppNewDots', handleNewPinEntry);
    }
  } catch (err) {
    const msg = document.getElementById('ppChangeStep1Msg');
    if (msg) {
      msg.textContent = 'Felaktig PIN-kod — försök igen';
      initParentPinNumpad('ppChangeKeypad', 'ppCurrentDots', handleCurrentPinEntry);
    }
  }
}

async function handleNewPinEntry(pin) {
  if (_ppChangeNewPin === null) {
    _ppChangeNewPin = pin;
    document.getElementById('ppNewConfirmWrap').classList.remove('hidden');
    initParentPinNumpad('ppNewConfirmKeypad', 'ppNewConfirmDots', handleNewPinConfirmEntry);
  }
}

async function handleNewPinConfirmEntry(confirmPin) {
  const pin = _ppChangeNewPin;
  if (confirmPin !== pin) {
    const msg = document.getElementById('ppChangeResultMsg');
    if (msg) {
      msg.textContent = 'PIN-koderna matchar inte — försök igen';
      msg.className = 'text-sm text-red-500 text-center';
    }
    _ppChangeNewPin = null;
    document.getElementById('ppNewConfirmWrap').classList.add('hidden');
    initParentPinNumpad('ppNewKeypad', 'ppNewDots', handleNewPinEntry);
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
      if (msg) { msg.textContent = '✓ PIN-koden har ändrats!'; msg.className = 'text-sm text-green-600 text-center'; }
      _ppForgotVerifiedPassword = null;
      setTimeout(initParentPinSection, 1500);
    } catch (err) {
      if (msg) { msg.textContent = err.message || 'Kunde inte ändra PIN-kod'; msg.className = 'text-sm text-red-500 text-center'; }
      _ppChangeNewPin = null;
      _ppForgotVerifiedPassword = null;
      document.getElementById('ppNewConfirmWrap').classList.add('hidden');
    }
    return;
  }

  // Normal change flow (verify current PIN, then save with currentPin)
  const currentPin = await promptCurrentPinForChange();
  if (!currentPin) {
    _ppChangeNewPin = null;
    return;
  }

  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin: pin, currentPin }),
    });
    if (msg) {
      msg.textContent = '✓ PIN-koden har ändrats!';
      msg.className = 'text-sm text-green-600 text-center';
    }
    setTimeout(initParentPinSection, 1500);
  } catch (err) {
    if (msg) { msg.textContent = err.message || 'Kunde inte ändra PIN-kod'; msg.className = 'text-sm text-red-500 text-center'; }
    _ppChangeNewPin = null;
    document.getElementById('ppNewConfirmWrap').classList.add('hidden');
  }
}

function promptCurrentPinForChange() {
  return new Promise((resolve) => {
    const pin = prompt('Ange nuvarande PIN-kod för att bekräfta:');
    resolve(pin || null);
  });
}

function showForgotPinForm() {
  document.getElementById('ppChangeStep1').classList.add('hidden');
  document.getElementById('ppForgotPinForm').classList.remove('hidden');
}

async function handleForgotPinVerify() {
  const pw = document.getElementById('ppForgotPw').value;
  const msg = document.getElementById('ppForgotMsg');
  if (!pw) { msg.textContent = 'Ange ditt lösenord'; return; }

  try {
    await Auth.api('/api/family/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '0000', confirmPin: '0000', password: pw }),
    });
  } catch (err) {
    msg.textContent = err.message || 'Felaktigt lösenord';
    return;
  }

  // Now show new PIN form — store the verified password so saveParentPinForForgot uses it
  document.getElementById('ppForgotPinForm').classList.add('hidden');
  document.getElementById('ppChangeStep2').classList.remove('hidden');
  _ppForgotVerifiedPassword = pw;
  initParentPinNumpad('ppNewKeypad', 'ppNewDots', handleNewPinEntry);
}

// Store the verified password for the forgot-PIN flow (used by saveParentPin)
let _ppForgotVerifiedPassword = null;
document.addEventListener('DOMContentLoaded', () => {
  // Defer to ensure Auth is available and /api/auth/me is called by settings.html
  if (document.getElementById('accountSection')) {
    setTimeout(initAccountSection, 0);
  }
  if (document.getElementById('parentPinSection')) {
    setTimeout(initParentPinSection, 0);
  }
});