/**
 * child-skatt-house.js — Fas 1: Skattkammaren som hus med rum (hub + navigation).
 * Wrappar befintliga sektioner från renderSkattkammaren utan backend-ändringar.
 */
(function () {
  'use strict';

  var ROOMS = [
    { id: 'chest', emoji: '⭐', label: 'Stjärnkistan', hint: 'Dina stjärnor', wide: true },
    { id: 'dreams', emoji: '🎯', label: 'Drömrummet', hint: 'Mina mål' },
    { id: 'trophy', emoji: '🏆', label: 'Troférummet', hint: 'Prestationer' },
    { id: 'shelf', emoji: '🎁', label: 'Belöningshyllan', hint: 'Vunna belöningar' },
    { id: 'story', emoji: '📖', label: 'Min berättelse', hint: 'Ditt äventyr' },
    { id: 'shop', emoji: '🛍️', label: 'Butiken', hint: 'Välj belöning' },
  ];

  var _view = null;
  var _sections = {};
  var _meta = {};

  function chestTier(balance) {
    if (balance >= 100) return 3;
    if (balance >= 50) return 2;
    if (balance >= 15) return 1;
    return 0;
  }

  function chestEmoji(tier) {
    return ['📦', '🪙', '💰', '👑'][tier] || '📦';
  }

  function retitleSection(html, from, to) {
    if (!html || !from || !to) return html || '';
    return html.replace(from, to);
  }

  function buildStoryAlbum(storyHtml) {
    if (!storyHtml) return '';
    var temp = document.createElement('div');
    temp.innerHTML = storyHtml;
    var items = temp.querySelectorAll('.skatt-history-item');
    if (!items.length) return storyHtml;

    var stories = '';
    items.forEach(function (el) {
      var nameEl = el.querySelector('[style*="font-weight:700"]') || el.querySelector('.skatt-history-story');
      var dateEl = el.querySelector('[style*="color:#9AA0B8"]');
      var approved = !el.textContent.includes('❌');
      var name = nameEl ? nameEl.textContent.trim() : '';
      var dateStr = dateEl ? dateEl.textContent.trim() : '';
      var line = approved
        ? 'Du låste upp <strong>' + name + '</strong>!'
        : 'Du frågade om <strong>' + name + '</strong> — väntar på svar.';
      stories += '<div class="skatt-story-card">' +
        '<div class="skatt-story-date">📅 ' + dateStr + '</div>' +
        '<div class="skatt-story-text">' + line + '</div></div>';
    });

    return '<div class="skatt-section"><div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#74b9ff,#0984e3);">📖</div>' +
      '<span class="skatt-section-title" style="color:#0652c5;">Min berättelse</span></div>' +
      '<div class="skatt-section-body skatt-story-album">' + stories + '</div></div>';
  }

  function parseSections(container) {
    var map = {};
    var banner = container.querySelector('.skatt-banner');
    if (banner) {
      banner.setAttribute('data-skatt-room', 'chest');
      map.chest = banner.outerHTML;
    }
    container.querySelectorAll('[data-skatt-room]').forEach(function (el) {
      var id = el.getAttribute('data-skatt-room');
      if (id && id !== 'chest') map[id] = el.outerHTML;
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
      return '<div class="skatt-trophy-item" title="' + (r.reward_name || '') + '">' +
        '<span class="skatt-trophy-emoji">' + (r.reward_icon || '🎁') + '</span>' +
        '<span class="skatt-trophy-name">' + (r.reward_name || '') + '</span>' +
        '<span style="font-size:0.6rem;color:#9AA0B8;">' + dateStr + '</span></div>';
    }).join('');
    return '<div class="skatt-section"><div class="skatt-section-header">' +
      '<div class="skatt-section-icon" style="background:linear-gradient(135deg,#a29bfe,#6c5ce7);">🎁</div>' +
      '<span class="skatt-section-title" style="color:#6c5ce7;">Belöningshyllan</span></div>' +
      '<div class="skatt-section-body"><p style="font-size:0.75rem;color:#5A6178;margin:0 0 12px;">Det här har du faktiskt tjänat!</p>' +
      '<div class="skatt-trophy-grid">' + items + '</div></div></div>';
  }

  function renderHub() {
    var trophyCount = _meta.trophyCount || 0;
    var storyCount = _meta.storyCount || 0;
    var doors = ROOMS.map(function (room) {
      var badge = '';
      if (room.id === 'chest' && _meta.starBalance > 0) {
        badge = '<span class="skatt-room-badge">⭐ ' + _meta.starBalance + '</span>';
      } else if (room.id === 'trophy' && trophyCount > 0) {
        badge = '<span class="skatt-room-badge">' + trophyCount + ' st</span>';
      } else if (room.id === 'shelf' && trophyCount > 0) {
        badge = '<span class="skatt-room-badge">' + trophyCount + ' st</span>';
      } else if (room.id === 'story' && storyCount > 0) {
        badge = '<span class="skatt-room-badge">' + storyCount + '</span>';
      }
      var wide = room.wide ? ' is-wide' : '';
      return '<button type="button" class="skatt-room-door' + wide + '" data-room="' + room.id + '" aria-label="' + room.label + '">' +
        '<span class="skatt-room-emoji">' + room.emoji + '</span>' +
        '<div><div class="skatt-room-label">' + room.label + '</div>' +
        '<div class="skatt-room-hint">' + room.hint + '</div>' + badge + '</div></button>';
    }).join('');

    return '<div class="skatt-house">' +
      '<div class="skatt-house-header">' +
        '<h2 class="skatt-house-title">🏰 Mitt skattkammarhus</h2>' +
        '<p class="skatt-house-sub">Tryck på ett rum för att utforska</p>' +
      '</div>' +
      '<div class="skatt-house-scene">' +
        '<div class="skatt-house-roof" aria-hidden="true"></div>' +
        '<div class="skatt-house-body">' + doors + '</div>' +
      '</div></div>';
  }

  function renderChestRoom() {
    var tier = chestTier(_meta.starBalance || 0);
    var economy = _meta.economyHtml || '';
    return '<div class="skatt-room-view">' +
      '<button type="button" class="skatt-room-back" data-back="1">← Tillbaka till huset</button>' +
      '<div class="skatt-chest-room">' +
        '<div class="skatt-chest-sparkles"></div>' +
        '<div class="skatt-chest-tier tier-' + tier + '" id="skattChestIcon" role="button" tabindex="0" aria-label="Öppna skattkistan">' + chestEmoji(tier) + '</div>' +
        '<div class="skatt-chest-balance">⭐ ' + (_meta.starBalance || 0) + '</div>' +
        '<div class="skatt-chest-label">Dina sparade stjärnor</div>' +
        economy +
      '</div></div>';
  }

  function roomSectionHtml(roomId) {
    if (roomId === 'dreams') {
      return retitleSection(_sections.dreams, 'Önskelistan', 'Drömrummet');
    }
    if (roomId === 'trophy') {
      return retitleSection(_sections.trophy, 'Troféhyllan', 'Troférummet');
    }
    if (roomId === 'shop') {
      return retitleSection(_sections.shop, 'Belöningshyllan', 'Butiken');
    }
    if (roomId === 'story') {
      return buildStoryAlbum(_sections.story);
    }
    return _sections[roomId] || '';
  }

  function showRoom(roomId) {
    if (!_view) return;
    var content = '';
    if (roomId === 'chest') {
      content = renderChestRoom();
    } else if (roomId === 'shelf') {
      content = '<div class="skatt-room-view"><button type="button" class="skatt-room-back" data-back="1">← Tillbaka till huset</button>' +
        (_sections.shelf || '') + '</div>';
    } else if (_sections[roomId] || roomId === 'story') {
      content = '<div class="skatt-room-view"><button type="button" class="skatt-room-back" data-back="1">← Tillbaka till huset</button>' +
        roomSectionHtml(roomId) + '</div>';
    } else {
      content = '<div class="skatt-room-view"><button type="button" class="skatt-room-back" data-back="1">← Tillbaka till huset</button>' +
        '<p style="text-align:center;padding:32px;color:#9AA0B8;">Rummet är tomt ännu — fortsätt samla stjärnor! ⭐</p></div>';
    }
    _view.innerHTML = content;
    bindRoomEvents();
    if (roomId === 'chest') bindChestTap();
    // Re-run trophy animations if in room
    var trophyItems = _view.querySelectorAll('.skatt-trophy-item');
    trophyItems.forEach(function (el, i) {
      el.style.animationDelay = (i * 70) + 'ms';
    });
  }

  function showHub() {
    if (!_view) return;
    _view.innerHTML = renderHub();
    _view.querySelectorAll('.skatt-room-door').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showRoom(btn.getAttribute('data-room'));
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

  /**
   * Present house hub instead of linear scroll.
   * @param {HTMLElement} view
   * @param {string} legacyHtml — full HTML from renderSkattkammaren
   * @param {object} meta — { starBalance, trophies, economyHtml, storyCount }
   */
  function present(view, legacyHtml, meta) {
    _view = view;
    _meta = meta || {};

    var temp = document.createElement('div');
    temp.innerHTML = legacyHtml;
    _sections = parseSections(temp);

    // Map sections to rooms
    var sections = temp.querySelectorAll('.skatt-section');
    sections.forEach(function (el, idx) {
      var header = el.querySelector('.skatt-section-title');
      if (!header) return;
      var title = (header.textContent || '').toLowerCase();
      if (title.indexOf('önskelistan') >= 0 || title.indexOf('dröm') >= 0) {
        el.setAttribute('data-skatt-room', 'dreams');
        _sections.dreams = el.outerHTML;
      } else if (title.indexOf('trofé') >= 0) {
        el.setAttribute('data-skatt-room', 'trophy');
        _sections.trophy = el.outerHTML;
      } else if (title.indexOf('belöningshyllan') >= 0) {
        el.setAttribute('data-skatt-room', 'shop');
        _sections.shop = el.outerHTML;
      } else if (title.indexOf('bonus') >= 0) {
        el.setAttribute('data-skatt-room', 'bonus');
        _sections.bonus = el.outerHTML;
      } else if (title.indexOf('historik') >= 0 || title.indexOf('berättelse') >= 0) {
        el.setAttribute('data-skatt-room', 'story');
        _sections.story = el.outerHTML;
      }
    });

    // Combine story + bonus
    if (_sections.bonus) {
      _sections.story = (_sections.story || '') + _sections.bonus;
    }

    // Shelf = redeemed rewards display
    _sections.shelf = buildShelfFromTrophies(_meta.trophies || []);

    _meta.trophyCount = (_meta.trophies || []).length;
    _meta.storyCount = temp.querySelectorAll('.skatt-history-story, .skatt-history-item').length;

    showHub();
  }

  window.ChildSkattHouse = { present: present, showHub: showHub, showRoom: showRoom };
})();
