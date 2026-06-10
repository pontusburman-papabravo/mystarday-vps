/**
 * child-skatt-house.js — Skattkammaren som universum (V1–V4).
 */
(function () {
  'use strict';

  var BASE_ROOMS = [
    { id: 'chest', emoji: '💰', label: 'Stjärnkistan', hint: 'Dina stjärnor', wide: true },
    { id: 'dreams', emoji: '🎯', label: 'Drömvägg', hint: 'Mina mål' },
    { id: 'trophy', emoji: '🏆', label: 'Troférum', hint: 'Prestationer' },
    { id: 'shelf', emoji: '🎁', label: 'Belöningshylla', hint: 'Vunna belöningar' },
    { id: 'collections', emoji: '🗂️', label: 'Samlingar', hint: 'Samlarföremål' },
    { id: 'story', emoji: '📖', label: 'Historiebok', hint: 'Ditt äventyr' },
    { id: 'avatar', emoji: '🧑', label: 'Min avatar', hint: 'Din karaktär' },
    { id: 'pet', emoji: '🐾', label: 'Husdjur', hint: 'Din kompis' },
    { id: 'museum', emoji: '🏛️', label: 'Museum', hint: 'Familjens minnen' },
    { id: 'shop', emoji: '🛍️', label: 'Butiken', hint: 'Välj belöning' },
  ];

  var THEME_LABELS = { castle: '🏰 Slott', treehouse: '🌳 Trädkoja', space: '🚀 Rymden' };

  var _view = null;
  var _sections = {};
  var _meta = {};
  var _universe = null;
  var _entered = false;

  function chestTier(balance) {
    if (balance >= 100) return 3;
    if (balance >= 50) return 2;
    if (balance >= 15) return 1;
    return 0;
  }

  function chestEmoji(tier) {
    return ['📦', '🪙', '💰', '👑'][tier] || '📦';
  }

  function unlockedRooms() {
    if (_universe && _universe.house) return _universe.house.unlocked_rooms || ['chest', 'dreams', 'shop'];
    return ['chest', 'dreams', 'shop', 'trophy', 'shelf', 'story', 'shop'];
  }

  function themeClass() {
    var t = (_universe && _universe.house && _universe.house.theme) || 'castle';
    return 'skatt-theme-' + t;
  }

  function buildStoryAlbum(storyHtml) {
    if (!storyHtml) return '';
    var temp = document.createElement('div');
    temp.innerHTML = storyHtml;
    var items = temp.querySelectorAll('.skatt-history-item');
    if (!items.length) return storyHtml;

    var stories = '';
    items.forEach(function (el) {
      var nameEl = el.querySelector('[style*="font-weight:700"]');
      var dateEl = el.querySelector('[style*="color:#9AA0B8"]');
      var approved = !el.textContent.includes('❌');
      var name = nameEl ? nameEl.textContent.trim() : '';
      var dateStr = dateEl ? dateEl.textContent.trim() : '';
      var line = approved
        ? 'Du låste upp <strong>' + name + '</strong>!'
        : 'Du frågade om <strong>' + name + '</strong>.';
      stories += '<div class="skatt-story-card"><div class="skatt-story-date">📅 ' + dateStr + '</div>' +
        '<div class="skatt-story-text">' + line + '</div></div>';
    });

    return '<div class="skatt-section"><div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3);">📖</div>' +
      '<span class="skatt-section-title" style="color:#0652c5;">Historiebok</span></div>' +
      '<div class="skatt-section-body skatt-story-album">' + stories + '</div></div>';
  }

  function parseSections(container) {
    var map = {};
    container.querySelectorAll('.skatt-section').forEach(function (el) {
      var header = el.querySelector('.skatt-section-title');
      if (!header) return;
      var title = (header.textContent || '').toLowerCase();
      if (title.indexOf('önskelistan') >= 0 || title.indexOf('dröm') >= 0) {
        _sections.dreams = el.outerHTML;
      } else if (title.indexOf('trofé') >= 0) {
        _sections.legacy_trophy = el.outerHTML;
      } else if (title.indexOf('belöningshyllan') >= 0) {
        _sections.shop = el.outerHTML;
      } else if (title.indexOf('bonus') >= 0) {
        _sections.bonus = el.outerHTML;
      } else if (title.indexOf('historik') >= 0) {
        _sections.story = el.outerHTML;
      }
    });
    return map;
  }

  function buildShelfFromTrophies(trophies) {
    if (!trophies || !trophies.length) {
      return '<div class="skatt-section"><div class="skatt-section-body" style="text-align:center;padding:24px;">' +
        '<div style="font-size:2.5rem;margin-bottom:8px;opacity:0.5;">🎁</div>' +
        '<p style="font-size:0.85rem;color:#9AA0B8;">Här hamnar belöningar du låst upp!</p></div></div>';
    }
    var items = trophies.map(function (r) {
      var d = new Date(r.created_at);
      var dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      return '<div class="skatt-trophy-item"><span class="skatt-trophy-emoji">' + (r.reward_icon || '🎁') + '</span>' +
        '<span class="skatt-trophy-name">' + (r.reward_name || '') + '</span>' +
        '<span style="font-size:0.6rem;color:#9AA0B8;">' + dateStr + '</span></div>';
    }).join('');
    return '<div class="skatt-section"><div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#a29bfe,#6c5ce7);">🎁</div>' +
      '<span class="skatt-section-title" style="color:#6c5ce7;">Belöningshylla</span></div>' +
      '<div class="skatt-section-body"><p style="font-size:0.75rem;color:#5A6178;margin:0 0 12px;">Det här har du faktiskt tjänat!</p>' +
      '<div class="skatt-trophy-grid">' + items + '</div></div></div>';
  }

  function renderThemePicker() {
    if (!_universe || !_universe.house) return '';
    var themes = _universe.house.unlocked_themes || ['castle'];
    var current = _universe.house.theme || 'castle';
    var btns = themes.map(function (t) {
      var active = t === current ? ' is-active' : '';
      return '<button type="button" class="skatt-theme-btn' + active + '" data-theme="' + t + '">' +
        (THEME_LABELS[t] || t) + '</button>';
    }).join('');
    return '<div class="skatt-theme-picker">' + btns + '</div>';
  }

  function renderEntrance() {
    if (_entered) return '';
    var name = (_universe && _universe.avatar && _universe.avatar.name) || 'du';
    return '<div class="skatt-entrance ' + themeClass() + '" id="skattEntrance">' +
      '<div class="skatt-entrance-inner">' +
        '<div class="skatt-entrance-door">🚪</div>' +
        '<p class="skatt-entrance-text">Du går in i ditt rum…</p>' +
        '<p class="skatt-entrance-sub">Hej ' + name + '! ✨</p>' +
      '</div></div>';
  }

  function renderHub() {
    var rooms = unlockedRooms();
    var doors = BASE_ROOMS.filter(function (r) { return rooms.indexOf(r.id) >= 0; }).map(function (room) {
      var badge = '';
      if (room.id === 'chest' && _meta.starBalance > 0) badge = '<span class="skatt-room-badge">⭐ ' + _meta.starBalance + '</span>';
      else if (room.id === 'trophy' && _universe && _universe.achievements) badge = '<span class="skatt-room-badge">' + _universe.achievements.length + '</span>';
      else if (room.id === 'collections' && _universe && _universe.collectibles) badge = '<span class="skatt-room-badge">' + _universe.collectibles.length + '</span>';

      var locked = rooms.indexOf(room.id) < 0;
      var wide = room.wide ? ' is-wide' : '';
      var lockCls = locked ? ' is-locked' : '';
      return '<button type="button" class="skatt-room-door' + wide + lockCls + '" data-room="' + room.id + '" aria-label="' + room.label + '">' +
        '<span class="skatt-room-emoji">' + room.emoji + '</span>' +
        '<div><div class="skatt-room-label">' + room.label + '</div>' +
        '<div class="skatt-room-hint">' + (locked ? '🔒 Samla fler stjärnor' : room.hint) + '</div>' + badge + '</div></button>';
    }).join('');

    var avatarChip = (window.ChildAvatar && _universe) ? ChildAvatar.renderHubChip(_universe) : '';
    var petChip = (window.ChildPet && _universe) ? ChildPet.renderHubPet(_universe.pet) : '';

    return '<div class="skatt-house ' + themeClass() + ' is-immersive">' +
      renderEntrance() +
      '<div class="skatt-house-topbar">' +
        '<div class="skatt-house-avatar-chip">' + avatarChip + '</div>' +
        petChip +
      '</div>' +
      '<div class="skatt-house-header">' +
        '<h2 class="skatt-house-title">' + (THEME_LABELS[(_universe && _universe.house && _universe.house.theme) || 'castle'] || '🏰 Mitt hus') + '</h2>' +
        '<p class="skatt-house-sub">Du är hemma — tryck på ett rum</p>' +
        renderThemePicker() +
      '</div>' +
      '<div class="skatt-house-scene">' +
        '<div class="skatt-house-roof" aria-hidden="true"></div>' +
        '<div class="skatt-house-body">' + doors + '</div>' +
      '</div></div>';
  }

  function renderChestRoom() {
    var tier = chestTier(_meta.starBalance || 0);
    return '<div class="skatt-room-view skatt-room-immersive ' + themeClass() + '">' +
      '<button type="button" class="skatt-room-back" data-back="1">← Ut till huset</button>' +
      '<div class="skatt-room-title">💰 Stjärnkistan</div>' +
      '<div class="skatt-chest-room">' +
        '<div class="skatt-chest-sparkles"></div>' +
        '<div class="skatt-chest-tier tier-' + tier + '" id="skattChestIcon" role="button" tabindex="0">' + chestEmoji(tier) + '</div>' +
        '<div class="skatt-chest-balance">⭐ ' + (_meta.starBalance || 0) + '</div>' +
        '<div class="skatt-chest-label">Dina sparade stjärnor</div>' +
        (_meta.economyHtml || '') +
      '</div></div>';
  }

  function roomContent(roomId) {
    if (roomId === 'trophy' && window.ChildAchievements && _universe) {
      return ChildAchievements.renderRoom(_universe);
    }
    if (roomId === 'collections' && window.ChildCollections && _universe) {
      return ChildCollections.renderRoom(_universe);
    }
    if (roomId === 'avatar' && window.ChildAvatar && _universe) {
      return ChildAvatar.renderRoom(_universe, function () { showHub(); });
    }
    if (roomId === 'pet' && window.ChildPet && _universe) {
      return ChildPet.renderRoom(_universe);
    }
    if (roomId === 'museum' && window.ChildMuseum && _universe) {
      return ChildMuseum.renderRoom(_universe);
    }
    if (roomId === 'dreams' && _sections.dreams) {
      return _sections.dreams.replace('Önskelistan', 'Drömvägg');
    }
    if (roomId === 'shop' && _sections.shop) {
      return _sections.shop.replace('Belöningshyllan', 'Butiken');
    }
    if (roomId === 'story') {
      return buildStoryAlbum(_sections.story || '');
    }
    if (roomId === 'shelf') {
      return _sections.shelf || '';
    }
    return '<p style="text-align:center;padding:32px;color:#9AA0B8;">Rummet är tomt ännu — fortsätt samla stjärnor! ⭐</p>';
  }

  function showRoom(roomId) {
    if (!_view) return;
    if (unlockedRooms().indexOf(roomId) < 0) return;

    var inner = roomId === 'chest' ? renderChestRoom() :
      '<div class="skatt-room-view skatt-room-immersive ' + themeClass() + '">' +
        '<button type="button" class="skatt-room-back" data-back="1">← Ut till huset</button>' +
        roomContent(roomId) +
      '</div>';

    _view.innerHTML = inner;
    _view.classList.add('skatt-in-room');
    bindRoomEvents();
    if (roomId === 'chest') bindChestTap();
    if (roomId === 'pet' && window.ChildPet && _universe) {
      ChildPet.bindRoom(_universe, function () {
        ChildUniverse.load(true).then(function (u) { _universe = u; showRoom('pet'); });
      });
    }
    _view.querySelectorAll('.skatt-trophy-item').forEach(function (el, i) {
      el.style.animationDelay = (i * 70) + 'ms';
    });
  }

  function showHub() {
    if (!_view) return;
    _view.classList.remove('skatt-in-room');
    _view.innerHTML = renderHub();
    bindHubEvents();
    runEntranceAnimation();
  }

  function runEntranceAnimation() {
    var el = document.getElementById('skattEntrance');
    if (!el) return;
    setTimeout(function () {
      el.classList.add('is-done');
      _entered = true;
      setTimeout(function () { if (el.parentNode) el.remove(); }, 700);
    }, 1200);
  }

  function bindHubEvents() {
    if (!_view) return;
    _view.querySelectorAll('.skatt-room-door:not(.is-locked)').forEach(function (btn) {
      btn.addEventListener('click', function () { showRoom(btn.getAttribute('data-room')); });
    });
    _view.querySelectorAll('.skatt-theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-theme');
        if (!window.ChildUniverse) return;
        ChildUniverse.patchHouse({ theme: theme }).then(function () {
          return ChildUniverse.load(true);
        }).then(function (u) {
          _universe = u;
          showHub();
        });
      });
    });
  }

  function bindRoomEvents() {
    if (!_view) return;
    var back = _view.querySelector('[data-back]');
    if (back) back.addEventListener('click', showHub);
  }

  function bindChestTap() {
    var chest = document.getElementById('skattChestIcon');
    if (!chest) return;
    function pop() {
      chest.classList.add('is-open');
      if (typeof playCoinSound === 'function') playCoinSound();
      setTimeout(function () { chest.classList.remove('is-open'); }, 600);
    }
    chest.addEventListener('click', pop);
    chest.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pop(); }
    });
  }

  function present(view, legacyHtml, meta) {
    _view = view;
    _meta = meta || {};
    _sections = { shelf: buildShelfFromTrophies(_meta.trophies || []) };

    var temp = document.createElement('div');
    temp.innerHTML = legacyHtml;
    parseSections(temp);
    if (_sections.bonus) _sections.story = (_sections.story || '') + _sections.bonus;
    _meta.trophyCount = (_meta.trophies || []).length;

    var loadPromise = (window.ChildUniverse)
      ? ChildUniverse.load(true)
      : Promise.resolve(null);

    loadPromise.then(function (u) {
      _universe = u;
      showHub();
    });
  }

  window.ChildSkattHouse = { present: present, showHub: showHub, showRoom: showRoom };
})();
