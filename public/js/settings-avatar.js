/**
 * settings-avatar.js — logged-in parent manages own profile photo (Family Avatar v1).
 */
(function () {
  'use strict';

  const SECTION_ID = 'settingsAvatarSection';

  function renderPreview(user) {
    if (!window.MemberAvatar) return '';
    return MemberAvatar.renderParentAvatar(user, 64);
  }

  async function loadMe() {
    return Auth.api('/api/auth/me');
  }

  function mountSection(user) {
    const mount = document.getElementById(SECTION_ID);
    if (!mount) return;

    const hasPhoto = !!user.has_avatar;
    mount.innerHTML =
      '<h3 class="text-xl font-heading font-bold text-navy mb-2">Profilbild</h3>' +
      '<p class="text-sm text-text-soft mb-4">Din bild syns för barnet under Mina personer och på Familj-sidan.</p>' +
      '<div class="flex items-center gap-4 mb-4" id="settingsAvatarPreview">' + renderPreview(user) + '</div>' +
      '<div class="flex flex-col sm:flex-row gap-2">' +
        '<button type="button" id="settingsAvatarChangeBtn" class="min-h-[44px] px-4 py-2 rounded-xl bg-gold text-navy font-bold">' +
          (hasPhoto ? 'Byt bild' : 'Lägg till foto') + '</button>' +
        (hasPhoto
          ? '<button type="button" id="settingsAvatarRemoveBtn" class="min-h-[44px] px-4 py-2 rounded-xl border border-lavender text-red-600 font-semibold">Ta bort bild</button>'
          : '') +
      '</div>' +
      '<p id="settingsAvatarMsg" class="text-sm min-h-[1.4em] mt-2" aria-live="polite"></p>';

    const changeBtn = document.getElementById('settingsAvatarChangeBtn');
    const removeBtn = document.getElementById('settingsAvatarRemoveBtn');
    const msg = document.getElementById('settingsAvatarMsg');

    if (changeBtn) {
      changeBtn.addEventListener('click', async function () {
        changeBtn.disabled = true;
        msg.textContent = '';
        try {
          const updated = await AvatarUploadFlow.pickCropAndUpload('/api/account/avatar');
          if (!updated) return;
          Object.assign(user, updated);
          document.getElementById('settingsAvatarPreview').innerHTML = renderPreview(user);
          mountSection(user);
          if (typeof showToast === 'function') showToast('Profilbild sparad!');
        } catch (err) {
          msg.textContent = err.message || 'Kunde inte spara';
          if (typeof showToast === 'function') showToast(msg.textContent, true);
        } finally {
          changeBtn.disabled = false;
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', async function () {
        removeBtn.disabled = true;
        msg.textContent = '';
        try {
          const updated = await AvatarUploadFlow.deleteAvatar('/api/account/avatar');
          Object.assign(user, updated);
          mountSection(user);
          if (typeof showToast === 'function') showToast('Profilbilden togs bort');
        } catch (err) {
          msg.textContent = err.message || 'Kunde inte ta bort';
          if (typeof showToast === 'function') showToast(msg.textContent, true);
        } finally {
          removeBtn.disabled = false;
        }
      });
    }
  }

  async function initSettingsAvatar() {
    if (!document.getElementById(SECTION_ID)) return;
    try {
      const me = await loadMe();
      if (!me || me.type !== 'parent') return;
      mountSection(me);
    } catch (err) {
      console.error('[settings-avatar]', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsAvatar);
  } else {
    initSettingsAvatar();
  }
})();
