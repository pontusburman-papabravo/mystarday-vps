'use strict';

/**
 * Serialize avatar fields for API responses (no storage keys or public URLs).
 */

function avatarVersion(updatedAt) {
  if (!updatedAt) return 0;
  const t = new Date(updatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * @param {{ id: string, avatar_storage_key?: string|null, avatar_updated_at?: Date|string|null, name?: string|null, emoji?: string|null }} row
 * @param {'child'|'parent'} memberType
 */
function avatarApiFields(row, memberType) {
  const hasAvatar = !!(row && row.avatar_storage_key);
  const base = { has_avatar: hasAvatar };
  if (!hasAvatar || !row.id) return base;
  const v = avatarVersion(row.avatar_updated_at);
  base.avatar_src = `/api/avatars/${memberType}/${row.id}${v ? `?v=${v}` : ''}`;
  return base;
}

/**
 * Strip legacy avatar_url from objects returned to clients.
 */
function stripLegacyAvatarUrl(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const next = { ...obj };
  delete next.avatar_url;
  delete next.avatar_storage_key;
  delete next.avatar_updated_at;
  return next;
}

function mapChildForFamilyApi(row, extra = {}) {
  const base = stripLegacyAvatarUrl(row);
  delete base.pin;
  delete base.pin_fingerprint;
  return {
    ...base,
    ...avatarApiFields(row, 'child'),
    ...extra,
  };
}

function mapParentForFamilyApi(row, extra = {}) {
  const base = stripLegacyAvatarUrl(row);
  return {
    ...base,
    ...avatarApiFields(row, 'parent'),
    ...extra,
  };
}

module.exports = {
  avatarApiFields,
  avatarVersion,
  stripLegacyAvatarUrl,
  mapChildForFamilyApi,
  mapParentForFamilyApi,
};
