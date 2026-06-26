/**
 * child-avatar.js — Avatar builder room (V2).
 */
(function () {
  'use strict';

  const HAIR = [
    { id: 'short', emoji: '👦', label: 'Kort' },
    { id: 'curly', emoji: '🦱', label: 'Lockigt' },
    { id: 'long', emoji: '👧', label: 'Långt' },
    { id: 'spiky', emoji: '⚡', label: 'Spetsigt' },
  ];
  const OUTFITS = [
    { id: 'tee', emoji: '👕', label: 'Tröja' },
    { id: 'hoodie', emoji: '🧥', label: 'Hoodie' },
    { id: 'cape', emoji: '🦸', label: 'Cape' },
    { id: 'dress', emoji: '👗', label: 'Klänning' },
  ];
  const HATS = [
    { id: 'none', emoji: '—', label: 'Ingen' },
    { id: 'cap', emoji: '🧢', label: 'Keps' },
    { id: 'crown', emoji: '👑', label: 'Krona' },
    { id: 'star', emoji: '⭐', label: 'Stjärna' },
  ];
  const COLORS = ['#F5A623', '#6C5CE7', '#00B894', '#E17055', '#74B9FF', '#FD79A8'];

  function renderPreview(cfg, avatarUrl, emoji) {
    const color = cfg.color || '#F5A623';
    const hair = (HAIR.find(function (h) { return h.id === cfg.hair; }) || HAIR[0]).emoji;
    const outfit = (OUTFITS.find(function (o) { return o.id === cfg.outfit; }) || OUTFITS[0]).emoji;
    const hat = cfg.hat && cfg.hat !== 'none'
      ? (HATS.find(function (h) { return h.id === cfg.hat; }) || {}).emoji || ''
      : '';

    if (avatarUrl) {
      return '<div class="cu-avatar-preview has-photo" style="--cu-color:' + color + '">' +
        '<img src="' + avatarUrl + '" alt="" class="cu-avatar-photo">' +
        (hat ? '<span class="cu-avatar-hat">' + hat + '</span>' : '') +
        '</div>';
    }

    return '<div class="cu-avatar-preview" style="--cu-color:' + color + '">' +
      '<span class="cu-avatar-hat">' + hat + '</span>' +
      '<span class="cu-avatar-hair">' + hair + '</span>' +
      '<span class="cu-avatar-face">' + (emoji || '😊') + '</span>' +
      '<span class="cu-avatar-outfit">' + outfit + '</span>' +
      '</div>';
  }

  function pickerRow(label, items, field, current, onPick) {
    const btns = items.map(function (item) {
      const active = current === item.id ? ' is-active' : '';
      return '<button type="button" class="cu-pick-btn' + active + '" data-field="' + field + '" data-val="' + item.id + '">' +
        '<span>' + item.emoji + '</span><span>' + item.label + '</span></button>';
    }).join('');
    return '<div class="cu-pick-group"><div class="cu-pick-label">' + label + '</div><div class="cu-pick-row">' + btns + '</div></div>';
  }

  function renderRoom(universe, onChange) {
    const cfg = Object.assign({ hair: 'short', outfit: 'tee', color: '#F5A623', hat: 'none' }, universe.avatar.config || {});
    const colorBtns = COLORS.map(function (c) {
      const active = cfg.color === c ? ' is-active' : '';
      return '<button type="button" class="cu-color-btn' + active + '" data-field="color" data-val="' + c + '" style="background:' + c + '"></button>';
    }).join('');

    const html = '<div class="skatt-section cu-avatar-room">' +
      '<div class="skatt-section-header">' +
        '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#fd79a8,#e84393);">🧑</div>' +
        '<span class="skatt-section-title" style="color:#e84393;">Min avatar</span>' +
      '</div>' +
      '<div class="skatt-section-body">' +
        '<div class="cu-avatar-center" id="cuAvatarPreview">' +
          renderPreview(cfg, universe.avatar.avatar_url, universe.avatar.emoji) +
        '</div>' +
        pickerRow('Frisyr', HAIR, 'hair', cfg.hair) +
        pickerRow('Kläder', OUTFITS, 'outfit', cfg.outfit) +
        pickerRow('Hatt', HATS, 'hat', cfg.hat) +
        '<div class="cu-pick-group"><div class="cu-pick-label">Färg</div><div class="cu-pick-row cu-color-row">' + colorBtns + '</div></div>' +
        '<p class="cu-avatar-hint">Din avatar följer med i huset! ✨</p>' +
      '</div></div>';

    setTimeout(function () {
      const root = document.getElementById('cuAvatarPreview');
      if (!root) return;
      const section = root.closest('.cu-avatar-room');
      if (!section) return;
      section.querySelectorAll('[data-field]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const field = btn.getAttribute('data-field');
          const val = btn.getAttribute('data-val');
          cfg[field] = val;
          section.querySelectorAll('[data-field="' + field + '"]').forEach(function (b) {
            b.classList.toggle('is-active', b.getAttribute('data-val') === val);
          });
          root.innerHTML = renderPreview(cfg, universe.avatar.avatar_url, universe.avatar.emoji);
          if (window.ChildUniverse) {
            ChildUniverse.patchAvatar(cfg).then(function () {
              if (onChange) onChange(cfg);
            });
          }
        });
      });
    }, 0);

    return html;
  }

  function renderHubChip(universe) {
    const cfg = universe && universe.avatar ? universe.avatar.config : {};
    return renderPreview(
      Object.assign({ hair: 'short', outfit: 'tee', color: '#F5A623', hat: 'none' }, cfg),
      universe && universe.avatar ? universe.avatar.avatar_url : null,
      universe && universe.avatar ? universe.avatar.emoji : '😊'
    );
  }

  window.ChildAvatar = { renderRoom: renderRoom, renderHubChip: renderHubChip, renderPreview: renderPreview };
})();
