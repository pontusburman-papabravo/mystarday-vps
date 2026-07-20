/**
 * activity-visual.js — render activity icon (emoji) or custom photo.
 * Priority: image_url > Design Kit pictogram > barnets_samling pack > emoji.
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function packImageUrl(item) {
    if (!item || item.image_url) return null;
    if (!window.ChildPictogramPacks || !ChildPictogramPacks.isEnabled()) return null;
    const packId = ChildPictogramPacks.getActivePackId
      ? ChildPictogramPacks.getActivePackId()
      : ChildPictogramPacks.DEFAULT_PACK;
    return ChildPictogramPacks.resolveActivityAsset(item, packId);
  }

  function pictogramEmoji(item) {
    if (!item || item.image_url) return null;
    if (item.pictogram_emoji) return item.pictogram_emoji;
    if (item.icon_key && window.PictogramRegistry && window.PictogramRegistry.getEmoji) {
      const fromRegistry = window.PictogramRegistry.getEmoji(item.icon_key);
      if (fromRegistry) return fromRegistry;
    }
    if (window.ChildPictogramPacks && ChildPictogramPacks.isEnabled()) {
      const fromPack = ChildPictogramPacks.activityEmoji(item);
      if (fromPack) return fromPack;
    }
    return null;
  }

  function pictogramImageUrl(item) {
    if (!item || item.image_url) return null;
    if (item.pictogram_url) return item.pictogram_url;
    if (item.icon_key && window.PictogramRegistry && window.PictogramRegistry.getUrl) {
      const fromRegistry = window.PictogramRegistry.getUrl(item.icon_key);
      if (fromRegistry) return fromRegistry;
    }
    const packUrl = packImageUrl(item);
    if (packUrl) return packUrl;
    return null;
  }

  function pick(item) {
    if (!item) return { url: null, icon: '⭐' };
    const customUrl = item.image_url || null;
    if (customUrl) {
      return { url: customUrl, icon: item.icon || '⭐' };
    }
    const pictogramUrl = pictogramImageUrl(item);
    if (pictogramUrl) {
      return { url: pictogramUrl, icon: pictogramEmoji(item) || item.icon || '⭐' };
    }
    const fromKey = pictogramEmoji(item);
    const icon = fromKey || item.icon || '⭐';
    return { url: null, icon: icon };
  }

  /** Inline HTML for list/card slots (emoji text or img). */
  function inline(item, imgClass) {
    const p = pick(item);
    if (p.url) {
      const cls = 'activity-visual-img' + (imgClass ? ' ' + imgClass : '');
      return '<img src="' + esc(p.url) + '" alt="" class="' + cls + '" loading="lazy" decoding="async">';
    }
    return p.icon;
  }

  /** Thumb HTML for library lists (~40px). */
  function thumb(item) {
    return inline(item, 'activity-visual-img--thumb');
  }

  window.ActivityVisual = {
    pick: pick,
    inline: inline,
    thumb: thumb,
    pictogramEmoji: pictogramEmoji,
    packImageUrl: packImageUrl,
  };
})();
