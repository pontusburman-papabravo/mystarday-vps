/**
 * avatar-upload-flow.js — pick, crop, upload profile photos to authenticated endpoints.
 */
(function () {
  'use strict';

  async function ensureCsrf() {
    const authObj = window.Auth;
    if (!authObj || typeof authObj.ensureCsrfToken !== 'function') {
      throw new Error('Ej inloggad');
    }
    await authObj.ensureCsrfToken();
    const csrf = authObj.getCsrfToken();
    if (!csrf) throw new Error('Kunde inte hämta CSRF-token — ladda om sidan');
    return csrf;
  }

  async function putAvatarFile(endpoint, file) {
    const csrf = await ensureCsrf();
    const fd = new FormData();
    fd.append('image', file, file.name || 'avatar.jpg');
    const res = await fetch(endpoint, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrf },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || ('Uppladdning misslyckades (' + res.status + ')'));
    }
    return res.json();
  }

  async function deleteAvatar(endpoint) {
    const csrf = await ensureCsrf();
    const res = await fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrf },
    });
    if (!res.ok) {
      const err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || ('Kunde inte ta bort (' + res.status + ')'));
    }
    return res.json();
  }

  async function pickCropAndUpload(endpoint) {
    if (!window.Platform || !Platform.camera || typeof Platform.camera.pick !== 'function') {
      throw new Error('Kamera är inte tillgänglig');
    }
    const picked = await Platform.camera.pick({ quality: 'medium' });
    if (!picked) return null;
    if (picked.error) throw new Error(picked.error);

    let file = picked.file;
    if (!file && picked.dataUrl && typeof Platform.camera.dataUrlToBlob === 'function') {
      const blob = Platform.camera.dataUrlToBlob(picked.dataUrl);
      file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    }
    if (!file && !window.AvatarImageCrop) {
      throw new Error('Kunde inte läsa bilden');
    }
    if (!file && picked.dataUrl) {
      const res = await fetch(picked.dataUrl);
      const blob = await res.blob();
      file = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' });
    }
    if (!file) throw new Error('Kunde inte läsa bilden');

    if (!window.AvatarImageCrop) throw new Error('Beskärning saknas');
    const cropped = await AvatarImageCrop.openFromFile(file);
    if (!cropped) return null;

    return putAvatarFile(endpoint, cropped);
  }

  window.AvatarUploadFlow = {
    putAvatarFile: putAvatarFile,
    deleteAvatar: deleteAvatar,
    pickCropAndUpload: pickCropAndUpload,
  };
})();
