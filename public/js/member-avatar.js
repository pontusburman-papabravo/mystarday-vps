/**
 * member-avatar.js — shared family member avatar resolver + renderer (v1).
 * Priority: photo → child emoji → initials → default placeholder.
 */
(function (root) {
  'use strict';

  const DEFAULT_CHILD_IMG = '/img/avatar-child-default.svg';
  const DEFAULT_ADULT_IMG = '/img/avatar-child-default.svg';

  function escapeHtml(str) {
    if (root.escapeHtml) return root.escapeHtml(str);
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function computeInitials(name) {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function memberPhotoSrc(member) {
    if (!member) return null;
    if (member.avatar_src) return member.avatar_src;
    if (member.has_avatar && member.id && member.member_type) {
      return '/api/avatars/' + member.member_type + '/' + member.id;
    }
    if (member.has_avatar && member.id && member.type === 'child') {
      return '/api/avatars/child/' + member.id;
    }
    if (member.has_avatar && member.id && (member.type === 'parent' || member.member_type === 'parent')) {
      return '/api/avatars/parent/' + member.id;
    }
    return null;
  }

  function resolveMemberAvatar(member, options) {
    options = options || {};
    const memberType = options.memberType || member.member_type || (member.type === 'parent' ? 'parent' : 'child');
    const photo = memberPhotoSrc(member);
    if (photo) {
      return { kind: 'photo', src: photo, alt: member.name || '' };
    }
    const displayEmoji = options.displayEmoji || member.display_emoji;
    if (memberType === 'parent' && displayEmoji) {
      return { kind: 'emoji', value: displayEmoji };
    }
    if (memberType === 'child' && member.emoji) {
      return { kind: 'emoji', value: member.emoji };
    }
    const initials = computeInitials(member.name);
    if (initials) {
      return { kind: 'initials', value: initials };
    }
    return {
      kind: 'default',
      src: memberType === 'parent' ? DEFAULT_ADULT_IMG : DEFAULT_CHILD_IMG,
    };
  }

  function renderMemberAvatar(member, size, options) {
    size = size || 32;
    options = options || {};
    const resolved = resolveMemberAvatar(member, options);
    const alt = escapeHtml(resolved.alt || member.name || '');
    const baseStyle = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:inline-block;vertical-align:middle;flex-shrink:0;';

    if (resolved.kind === 'photo') {
      const fallbackEmoji = options.displayEmoji || member.display_emoji || member.emoji || '';
      const safeFallback = fallbackEmoji ? escapeHtml(fallbackEmoji) : '';
      const onerr = safeFallback
        ? ' onerror="this.outerHTML=\'<span class=\\\'cfh-person-emoji cfh-person-emoji--fallback\\\' aria-hidden=\\\'true\\\'>' + safeFallback + '</span>\'"'
        : '';
      return '<img src="' + escapeHtml(resolved.src) + '" alt="' + alt + '" ' +
        'style="' + baseStyle + 'object-fit:cover;" loading="lazy" decoding="async"' + onerr + ' />';
    }
    if (resolved.kind === 'emoji') {
      return '<span role="img" aria-label="' + alt + '" class="cfh-person-emoji cfh-person-emoji--face"' +
        ' style="display:inline-flex;align-items:center;justify-content:center;' +
        'font-size:' + Math.round(size * 0.72) + 'px;line-height:1;width:' + size + 'px;height:' + size + 'px;">' +
        escapeHtml(resolved.value) + '</span>';
    }
    if (resolved.kind === 'initials') {
      const fontSize = Math.max(10, Math.round(size * 0.38));
      return '<span role="img" aria-label="' + alt + '" style="display:inline-flex;align-items:center;justify-content:center;' +
        baseStyle + 'background:#E8E4F0;color:#1B2340;font-weight:700;font-size:' + fontSize + 'px;' +
        'font-family:system-ui,sans-serif;letter-spacing:0.02em;">' + escapeHtml(resolved.value) + '</span>';
    }
    return '<img src="' + escapeHtml(resolved.src) + '" alt="" ' +
      'style="' + baseStyle + 'object-fit:cover;background:#E8E4F0;" />';
  }

  function renderChildAvatar(child, size) {
    return renderMemberAvatar(child, size, { memberType: 'child' });
  }

  function renderParentAvatar(parent, size) {
    return renderMemberAvatar(parent, size, { memberType: 'parent' });
  }

  root.MemberAvatar = {
    computeInitials: computeInitials,
    resolveMemberAvatar: resolveMemberAvatar,
    renderMemberAvatar: renderMemberAvatar,
    renderChildAvatar: renderChildAvatar,
    renderParentAvatar: renderParentAvatar,
    memberPhotoSrc: memberPhotoSrc,
  };

  root.renderChildAvatar = renderChildAvatar;
  root.renderParentAvatar = renderParentAvatar;
})(typeof window !== 'undefined' ? window : globalThis);
