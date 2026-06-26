/**
 * coparent-invite-ui.js — Shared “Lägg till vuxen / Bjud in medförälder” modal (body portal).
 * Works after soft navigation (modals outside <main> are not swapped in).
 */
(function (global) {
  'use strict';

  const MODAL_ID = 'coParentInviteModal';
  let _modalBound = false;
  let _settingsBound = false;

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function ensureModal() {
    if (global.document.getElementById(MODAL_ID)) return;

    const wrap = global.document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.className = 'hidden fixed inset-0 bg-black/60 flex items-center justify-center z-[10050] p-4';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'coParentInviteModalTitle');
    wrap.innerHTML =
      '<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 magic-modal-panel">' +
      '<div class="flex justify-between items-center mb-3">' +
      '<h2 id="coParentInviteModalTitle" class="text-xl font-heading font-bold text-navy">Lägg till vuxen</h2>' +
      '<button type="button" class="co-parent-invite-close text-text-soft hover:text-navy text-2xl leading-none" aria-label="Stäng">×</button>' +
      '</div>' +
      '<p class="text-sm text-text-soft mb-4">Vi skickar en inbjudan via e-post. Personen skapar själv sitt lösenord.</p>' +
      '<form id="coParentInviteModalForm" class="space-y-3">' +
      '<div><label class="block text-sm font-semibold text-navy mb-1" for="coParentInviteModalName">Namn</label>' +
      '<input type="text" id="coParentInviteModalName" required placeholder="T.ex. Anna Svensson" ' +
      'class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors"></div>' +
      '<div><label class="block text-sm font-semibold text-navy mb-1" for="coParentInviteModalEmail">E-postadress</label>' +
      '<input type="email" id="coParentInviteModalEmail" required placeholder="namn@exempel.se" ' +
      'class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors"></div>' +
      '<div><label class="block text-sm font-semibold text-navy mb-1" for="coParentInviteModalRole">Roll i familjen (valfritt)</label>' +
      '<select id="coParentInviteModalRole" class="w-full px-4 py-3 rounded-xl border-2 border-lavender focus:border-gold outline-none transition-colors">' +
      '<option value="">— Välj —</option><option value="mamma">Mamma</option><option value="pappa">Pappa</option>' +
      '<option value="bonusförälder">Bonusförälder</option><option value="annan">Annan</option></select></div>' +
      '<p id="coParentInviteModalMsg" class="text-sm min-h-[1.4em]"></p>' +
      '<div class="flex gap-3 pt-1">' +
      '<button type="button" class="co-parent-invite-close flex-1 px-4 py-3 border-2 border-lavender text-navy rounded-xl font-semibold">Avbryt</button>' +
      '<button type="submit" id="coParentInviteModalSubmit" class="flex-1 px-4 py-3 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold">Skicka inbjudan</button>' +
      '</div></form></div>';

    global.document.body.appendChild(wrap);
    bindModal(wrap);
  }

  async function sendInvite(name, email, familyRole, msgEl, btn) {
    if (!global.Auth || !global.Auth.api) {
      if (msgEl) {
        msgEl.textContent = 'Kunde inte skicka — logga in igen.';
        msgEl.className = 'text-sm text-red-500 font-medium';
      }
      return false;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Skickar…';
    }
    if (msgEl) msgEl.textContent = '';

    try {
      const check = await global.Auth.api('/api/family/check-member', {
        method: 'POST',
        body: JSON.stringify({ email: email }),
      });
      if (check.adult && check.adult.status !== 'available') {
        if (msgEl) {
          msgEl.textContent = check.adult.error || 'Personen finns redan i familjen eller har en väntande inbjudan.';
          msgEl.className = 'text-sm text-red-500 font-medium';
        }
        return false;
      }
      await global.Auth.api('/api/family/invite', {
        method: 'POST',
        body: JSON.stringify({ name: name, email: email, family_role: familyRole }),
      });
      if (msgEl) {
        msgEl.textContent = '✓ Inbjudan skickad till ' + escHtml(email) + '!';
        msgEl.className = 'text-sm text-green-600 font-medium';
      }
      return true;
    } catch (err) {
      if (msgEl) {
        msgEl.textContent = (err && err.message) || 'Något gick fel. Försök igen.';
        msgEl.className = 'text-sm text-red-500 font-medium';
      }
      return false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Skicka inbjudan';
      }
    }
  }

  function bindModal(wrap) {
    if (_modalBound) return;
    _modalBound = true;

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('.co-parent-invite-close')) {
        closeCoParentInviteModal();
      }
    });

    const form = global.document.getElementById('coParentInviteModalForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = global.document.getElementById('coParentInviteModalName').value.trim();
      const email = global.document.getElementById('coParentInviteModalEmail').value.trim();
      const roleEl = global.document.getElementById('coParentInviteModalRole');
      const familyRole = roleEl && roleEl.value ? roleEl.value : null;
      const msg = global.document.getElementById('coParentInviteModalMsg');
      const btn = global.document.getElementById('coParentInviteModalSubmit');
      const ok = await sendInvite(name, email, familyRole, msg, btn);
      if (ok) {
        global.document.getElementById('coParentInviteModalName').value = '';
        global.document.getElementById('coParentInviteModalEmail').value = '';
        if (roleEl) roleEl.value = '';
        setTimeout(function () { closeCoParentInviteModal(); }, 1800);
        if (typeof global.dismissMedforalderCtaBanner === 'function') {
          global.dismissMedforalderCtaBanner();
        }
      }
    });
  }

  function openCoParentInviteModal(prefillEmail) {
    ensureModal();
    const modal = global.document.getElementById(MODAL_ID);
    if (!modal) return;

    const drawer = global.document.getElementById('childDrawer');
    if (drawer && !drawer.classList.contains('hidden') && typeof global.closeChildDrawer === 'function') {
      global.closeChildDrawer();
    }

    const msg = global.document.getElementById('coParentInviteModalMsg');
    if (msg) {
      msg.textContent = '';
      msg.className = 'text-sm min-h-[1.4em]';
    }
    const emailInput = global.document.getElementById('coParentInviteModalEmail');
    if (emailInput) emailInput.value = prefillEmail || '';

    modal.classList.remove('hidden');
    if (emailInput) emailInput.focus();
  }

  function closeCoParentInviteModal() {
    const modal = global.document.getElementById(MODAL_ID);
    if (modal) modal.classList.add('hidden');
  }

  function shouldShowInvite(me, fam) {
    if (!me || me.account_type === 'educator') return false;
    const parentCount = (fam && fam.parents) ? fam.parents.length : 0;
    return parentCount < 2;
  }

  function initSettingsSection(me, fam) {
    const section = global.document.getElementById('coParentInviteSection');
    const hr = global.document.getElementById('coParentInviteHr');
    const openBtn = global.document.getElementById('coParentInviteOpenBtn');
    if (!section) return;

    if (!shouldShowInvite(me, fam)) return;

    section.classList.remove('hidden');
    if (hr) hr.classList.remove('hidden');

    const pending = (fam && fam.pendingInvites) ? fam.pendingInvites.length : 0;
    const hint = global.document.getElementById('coParentInvitePendingHint');
    if (hint && pending > 0) {
      hint.textContent = pending === 1
        ? '1 väntande inbjudan är redan skickad.'
        : pending + ' väntande inbjudningar är redan skickade.';
      hint.classList.remove('hidden');
    }

    if (openBtn && !_settingsBound) {
      _settingsBound = true;
      openBtn.addEventListener('click', function () {
        openCoParentInviteModal();
      });
    }
  }

  async function bootSettingsCoParent() {
    if (!global.Auth || !global.Auth.api) return;
    try {
      const me = await global.Auth.api('/api/auth/me');
      const fam = await global.Auth.api('/api/family');
      initSettingsSection(me, fam);
      if (global.ParentMagicPageHub && global.ParentMagicPageHub.tagSettingsSections) {
        global.ParentMagicPageHub.tagSettingsSections();
      }
    } catch (err) {
      console.warn('[CO-PARENT] settings boot failed:', err);
    }
  }

  function openMedforalderCtaInvite() {
    if (typeof global.trackEvent === 'function') {
      global.trackEvent('cta_invite_co_parent_clicked');
    }
    openCoParentInviteModal();
  }

  function patchFamilyModal() {
    const previous = global.openFamilyModal;
    global.openFamilyModal = function (id) {
      if (id === 'addAdultModal') {
        openCoParentInviteModal();
        return;
      }
      if (typeof previous === 'function') return previous(id);
      const el = global.document.getElementById(id);
      if (el) el.classList.remove('hidden');
    };
  }

  global.openCoParentInviteModal = openCoParentInviteModal;
  global.closeCoParentInviteModal = closeCoParentInviteModal;
  global.openMedforalderCtaInvite = openMedforalderCtaInvite;
  global.bootSettingsCoParent = bootSettingsCoParent;

  if (global.ParentMagicPageBoot) {
    global.ParentMagicPageBoot.register('settings', bootSettingsCoParent);
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', function () {
      ensureModal();
      patchFamilyModal();
    });
  } else {
    ensureModal();
    patchFamilyModal();
  }

  global.CoParentInviteUI = {
    open: openCoParentInviteModal,
    close: closeCoParentInviteModal,
    bootSettings: bootSettingsCoParent,
  };
})(window);
