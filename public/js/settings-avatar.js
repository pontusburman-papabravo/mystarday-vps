/**
 * settings-avatar.js — logged-in parent manages own profile photo (Family Avatar v1).
 */
(function () {
  'use strict';

  const SECTION_ID = 'settingsAvatarSection';
  let _cachedUser = null;

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

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
      '<h3 class="text-xl font-heading font-bold text-navy mb-2">' + pt('settings.avatar.title') + '</h3>' +
      '<p class="text-sm text-text-soft mb-4">' + pt('settings.avatar.description') + '</p>' +
      '<div class="flex items-center gap-4 mb-4" id="settingsAvatarPreview">' + renderPreview(user) + '</div>' +
      '<div class="flex flex-col sm:flex-row gap-2">' +
        '<button type="button" id="settingsAvatarChangeBtn" class="min-h-[44px] px-4 py-2 rounded-xl bg-gold text-navy font-bold">' +
          (hasPhoto ? pt('settings.avatar.changePhoto') : pt('settings.avatar.addPhoto')) + '</button>' +
        (hasPhoto
          ? '<button type="button" id="settingsAvatarRemoveBtn" class="min-h-[44px] px-4 py-2 rounded-xl border border-lavender text-red-600 font-semibold">' +
            pt('settings.avatar.removePhoto') + '</button>'
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
          _cachedUser = user;
          document.getElementById('settingsAvatarPreview').innerHTML = renderPreview(user);
          mountSection(user);
          if (typeof showToast === 'function') showToast(pt('settings.avatar.saved'));
        } catch (err) {
          msg.textContent = err.message || pt('settings.avatar.saveFailed');
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
          _cachedUser = user;
          mountSection(user);
          if (typeof showToast === 'function') showToast(pt('settings.avatar.removed'));
        } catch (err) {
          msg.textContent = err.message || pt('settings.avatar.removeFailed');
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
      _cachedUser = me;
      mountSection(me);
    } catch (err) {
      console.error('[settings-avatar]', err.message);
    }
  }

  function bootSettingsAvatar() {
    if (_cachedUser) {
      mountSection(_cachedUser);
      return;
    }
    initSettingsAvatar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsAvatar);
  } else {
    initSettingsAvatar();
  }
  document.addEventListener('parent-i18n-ready', bootSettingsAvatar);
  document.addEventListener('locale-changed', bootSettingsAvatar);
})();
