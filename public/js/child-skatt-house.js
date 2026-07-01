/**
 * child-skatt-house.js — Skattkammaren som universum (V1–V4).
 */
(function () {
  'use strict';

  const BASE_ROOMS = [
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

  const THEME_LABELS = { castle: '🏰 Slott', treehouse: '🌳 Trädkoja', space: '🚀 Rymden' };

  /** Themed art emoji per room (mockup-style cards) */
  const THEME_ROOM_ART = {
    castle: {
      chest: '💰', dreams: '🎯', trophy: '🏆', shelf: '🎁', collections: '🗂️',
      story: '📖', avatar: '👧', pet: '🐕', shop: '🛍️', museum: '🏛️',
    },
    treehouse: {
      chest: '🪵', dreams: '🎯', trophy: '🏆', shelf: '🎁', collections: '🍃',
      story: '📗', avatar: '🧒', pet: '🐹', shop: '🧺', museum: '🖼️',
    },
    space: {
      chest: '🛸', dreams: '🎯', trophy: '🏆', shelf: '💎', collections: '🔮',
      story: '📘', avatar: '👩‍🚀', pet: '🤖', shop: '🛒', museum: '🪐',
    },
  };

  const FOOT_ICONS = {
    chest: '💰', dreams: '🎯', trophy: '🏆', shelf: '🎁', collections: '🗂️',
    story: '📖', avatar: '🧑', pet: '🐾', shop: '🛍️', museum: '🏛️',
  };

  /** Illustrated room art — public/images/child/world/rooms/ */
  const ROOM_ART = {
    chest: '/images/child/world/rooms/chest@2x.webp',
    dreams: '/images/child/world/rooms/dreams@2x.webp',
    trophy: '/images/child/world/rooms/trophy@2x.webp',
    shelf: '/images/child/world/rooms/shelf@2x.webp',
    collections: '/images/child/world/rooms/collections@2x.webp',
    story: '/images/child/world/rooms/story@2x.webp',
    avatar: '/images/child/world/rooms/avatar@2x.webp',
    pet: '/images/child/world/rooms/pet@2x.webp',
    museum: '/images/child/world/rooms/museum@2x.webp',
    shop: '/images/child/world/rooms/shop@2x.webp',
  };

  let _view = null;
  let _sections = {};
  let _meta = {};
  let _universe = null;
  const _entered = false;

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
    const t = (_universe && _universe.house && _universe.house.theme) || 'castle';
    return 'skatt-theme-' + t;
  }

  function buildStoryAlbum(storyHtml) {
    if (!storyHtml) return '';
    const temp = document.createElement('div');
    temp.innerHTML = storyHtml;
    const items = temp.querySelectorAll('.skatt-history-item');
    if (!items.length) return storyHtml;

    let stories = '';
    items.forEach(function (el) {
      const nameEl = el.querySelector('[style*="font-weight:700"]');
      const dateEl = el.querySelector('[style*="color:#9AA0B8"]');
      const approved = !el.textContent.includes('❌');
      const name = nameEl ? nameEl.textContent.trim() : '';
      const dateStr = dateEl ? dateEl.textContent.trim() : '';
      const line = approved
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
    const map = {};
    container.querySelectorAll('.skatt-section').forEach(function (el) {
      const header = el.querySelector('.skatt-section-title');
      if (!header) return;
      const title = (header.textContent || '').toLowerCase();
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
    const items = trophies.map(function (r) {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
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

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function currentTheme() {
    return (_universe && _universe.house && _universe.house.theme) || 'castle';
  }

  function roomArtEmoji(roomId) {
    const theme = currentTheme();
    const map = THEME_ROOM_ART[theme] || THEME_ROOM_ART.castle;
    return map[roomId] || FOOT_ICONS[roomId] || '⭐';
  }

  function wrapImmersiveRoom(roomId, innerHtml) {
    return '<div class="skatt-room-view skatt-room-immersive skatt-room-' + roomId + ' ' + themeClass() + '">' +
      '<div class="skatt-room-bg" aria-hidden="true"></div>' +
      '<div class="skatt-room-content">' + innerHtml + '</div>' +
      '</div>';
  }

  function renderHubAvatar() {
    if (_meta.avatarUrl) {
      return '<img src="' + esc(_meta.avatarUrl) + '" alt="" class="skatt-hub-avatar-img" />';
    }
    const emoji = _meta.childEmoji || (_universe && _universe.avatar && _universe.avatar.emoji) || '⭐';
    return '<span class="skatt-hub-avatar-emoji">' + emoji + '</span>';
  }

  function renderThemePicker() {
    if (!_universe || !_universe.house) return '';
    const themes = _universe.house.unlocked_themes || ['castle'];
    const current = _universe.house.theme || 'castle';
    const btns = themes.map(function (t) {
      const active = t === current ? ' is-active' : '';
      return '<button type="button" class="skatt-theme-btn' + active + '" data-theme="' + t + '">' +
        (THEME_LABELS[t] || t) + '</button>';
    }).join('');
    return '<div class="skatt-theme-picker">' + btns + '</div>';
  }

  function renderHub() {
    const theme = currentTheme();
    const rooms = unlockedRooms();
    const name = _meta.childName || (_universe && _universe.avatar && _universe.avatar.name) || 'du';
    const balance = _meta.starBalance || 0;

    const cards = BASE_ROOMS.map(function (room) {
      const unlocked = rooms.indexOf(room.id) >= 0;
      let badge = '';
      if (unlocked && room.id === 'chest' && balance > 0) {
        badge = '<span class="skatt-hub-card-badge">' + balance + '</span>';
      } else if (unlocked && room.id === 'trophy' && _universe && _universe.achievements && _universe.achievements.length) {
        badge = '<span class="skatt-hub-card-badge">' + _universe.achievements.length + '</span>';
      } else if (unlocked && room.id === 'collections' && _universe && _universe.collectibles && _universe.collectibles.length) {
        badge = '<span class="skatt-hub-card-badge">' + _universe.collectibles.length + '</span>';
      }

      const lockCls = unlocked ? '' : ' is-locked';
      const hint = unlocked ? room.hint : '🔒 Samla stjärnor';
      const artEmoji = roomArtEmoji(room.id);

      return '<button type="button" class="skatt-hub-card' + lockCls + '" data-room="' + room.id + '" aria-label="' + esc(room.label) + '"' +
        (unlocked ? '' : ' disabled') + '>' +
        '<div class="skatt-hub-card-art skatt-art-' + room.id + '" aria-hidden="true">' +
          (ROOM_ART[room.id]
            ? '<img class="skatt-hub-card-art-img" src="' + esc(ROOM_ART[room.id]) + '" alt="" loading="lazy" decoding="async" />'
            : '<span class="skatt-hub-card-art-emoji">' + artEmoji + '</span>') +
        '</div>' +
        '<div class="skatt-hub-card-foot">' +
          '<span class="skatt-hub-card-icon">' + (FOOT_ICONS[room.id] || '⭐') + '</span>' +
          '<div class="skatt-hub-card-text">' +
            '<div class="skatt-hub-card-title">' + esc(room.label) + '</div>' +
            '<div class="skatt-hub-card-hint">' + esc(hint) + '</div>' +
          '</div>' +
          badge +
        '</div></button>';
    }).join('');

    return '<div class="skatt-hub ' + themeClass() + '">' +
      '<div class="skatt-hub-bg" aria-hidden="true"></div>' +
      '<div class="skatt-hub-scene-deco" aria-hidden="true"></div>' +
      '<div class="skatt-hub-content">' +
        '<header class="skatt-hub-topbar">' +
          '<div class="skatt-hub-avatar">' + renderHubAvatar() + '</div>' +
          '<button type="button" class="skatt-hub-switch" onclick="typeof switchChildMember===\'function\'&&switchChildMember()">Byt barn</button>' +
          '<button type="button" class="skatt-hub-menu" onclick="typeof showTab===\'function\'&&showTab(\'more\')" aria-label="Mer">☰</button>' +
        '</header>' +
        '<div class="skatt-hub-greeting">' +
          '<h1 class="skatt-hub-hello">Hej ' + esc(name) + '!</h1>' +
          '<p class="skatt-hub-sub">Vad vill du göra idag?</p>' +
        '</div>' +
        '<div class="skatt-hub-stars-pill">' +
          '<span class="skatt-hub-stars-num">⭐ ' + balance + '</span>' +
          '<span class="skatt-hub-stars-label">Dina stjärnor</span>' +
        '</div>' +
        renderThemePicker() +
        '<div class="skatt-hub-grid">' + cards + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderChestRoom() {
    const tier = chestTier(_meta.starBalance || 0);
    return wrapImmersiveRoom('chest',
      '<button type="button" class="skatt-room-back" data-back="1">← Ut till huset</button>' +
      '<div class="skatt-room-title">💰 Stjärnkistan</div>' +
      '<div class="skatt-chest-room">' +
        '<div class="skatt-chest-sparkles"></div>' +
        '<div class="skatt-chest-tier tier-' + tier + '" id="skattChestIcon" role="button" tabindex="0">' + chestEmoji(tier) + '</div>' +
        '<div class="skatt-chest-balance">⭐ ' + (_meta.starBalance || 0) + '</div>' +
        '<div class="skatt-chest-label">Dina sparade stjärnor</div>' +
        (_meta.economyHtml || '') +
      '</div>'
    );
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

    const inner = roomId === 'chest' ? renderChestRoom() :
      wrapImmersiveRoom(roomId,
        '<button type="button" class="skatt-room-back" data-back="1">← Ut till huset</button>' +
        roomContent(roomId)
      );

    _view.innerHTML = inner;
    _view.classList.add('skatt-in-room');
    document.body.classList.remove('child-home-active');
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
    document.body.classList.add('child-home-active');
  }

  function bindHubEvents() {
    if (!_view) return;
    _view.querySelectorAll('.skatt-hub-card:not(.is-locked)').forEach(function (btn) {
      btn.addEventListener('click', function () { showRoom(btn.getAttribute('data-room')); });
    });
    _view.querySelectorAll('.skatt-theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const theme = btn.getAttribute('data-theme');
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
    const back = _view.querySelector('[data-back]');
    if (back) back.addEventListener('click', showHub);
  }

  function bindChestTap() {
    const chest = document.getElementById('skattChestIcon');
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

  function prepareLegacy(legacyHtml, meta) {
    _meta = meta || {};
    _sections = { shelf: buildShelfFromTrophies(_meta.trophies || []) };

    const temp = document.createElement('div');
    temp.innerHTML = legacyHtml;
    parseSections(temp);
    if (_sections.bonus) _sections.story = (_sections.story || '') + _sections.bonus;
    _meta.trophyCount = (_meta.trophies || []).length;
  }

  function loadUniverseAndShowHub() {
    const loadPromise = (window.ChildUniverse)
      ? ChildUniverse.load(true)
      : Promise.resolve(null);

    return loadPromise.then(function (u) {
      _universe = u;
      if (_view) showHub();
    });
  }

  function present(view, legacyHtml, meta) {
    _view = view;
    prepareLegacy(legacyHtml, meta);
    return loadUniverseAndShowHub();
  }

  function mountHome(homeViewEl, legacyHtml, meta) {
    const mount = homeViewEl.querySelector('#homeHubMount') || homeViewEl;
    _view = mount;
    prepareLegacy(legacyHtml, meta);
    return loadUniverseAndShowHub();
  }

  window.ChildSkattHouse = {
    present: present,
    mountHome: mountHome,
    showHub: showHub,
    showRoom: showRoom,
    refreshMeta: function (meta) {
      _meta = Object.assign(_meta || {}, meta || {});
      if (_view && !_view.classList.contains('skatt-in-room')) showHub();
    },
  };
})();
