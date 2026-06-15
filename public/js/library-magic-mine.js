/**
 * library-magic-mine.js — Mina bibliotek segmented view (Scheman / Aktiviteter / Belöningar).
 * Preserves all classic functionality including activity delsteg panels.
 */
(function () {
  'use strict';

  var SEGMENTS = [
    { id: 'scheman', label: '📅 Scheman', tab: 'schema' },
    { id: 'aktiviteter', label: '📋 Aktiviteter', tab: 'activities' },
    { id: 'beloningar', label: '🏆 Belöningar', tab: 'rewards' },
  ];

  var _segment = 'scheman';

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isActive() {
    return window.LibraryMagicHub
      && LibraryMagicHub.isMagic()
      && LibraryMagicHub.getSection() === 'mine';
  }

  function renderSegmentBar() {
    return '<div class="library-magic-segments library-magic-mine-segments" role="tablist">'
      + SEGMENTS.map(function (seg) {
        return '<button type="button" class="library-magic-segment' + (_segment === seg.id ? ' is-active' : '') + '"'
          + ' data-mine-segment="' + seg.id + '" role="tab" aria-selected="' + (_segment === seg.id) + '">'
          + escHtml(seg.label) + '</button>';
      }).join('')
      + '</div>';
  }

  function applySegmentVisibility() {
    document.body.classList.remove(
      'library-magic-mine-scheman',
      'library-magic-mine-aktiviteter',
      'library-magic-mine-beloningar'
    );
    document.body.classList.add('library-magic-mine-' + _segment);

    var stdBlock = document.getElementById('libraryMineStdSection');
    if (stdBlock) {
      stdBlock.classList.toggle('hidden', _segment !== 'scheman');
    }
  }

  function switchSegment(segmentId) {
    var seg = SEGMENTS.find(function (s) { return s.id === segmentId; });
    if (!seg) return;

    _segment = segmentId;
    if (typeof window.switchTab === 'function') {
      window.switchTab(seg.tab);
    }
    applySegmentVisibility();
    render();
  }

  function bindEvents(mount) {
    mount.onclick = function (e) {
      var btn = e.target.closest('[data-mine-segment]');
      if (!btn) return;
      switchSegment(btn.getAttribute('data-mine-segment'));
    };
  }

  function render() {
    var mount = document.getElementById('libraryMagicMineSegments');
    if (!mount) return;
    if (!isActive()) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }
    mount.classList.remove('hidden');
    mount.innerHTML = renderSegmentBar();
    bindEvents(mount);
    applySegmentVisibility();
  }

  function refresh() {
    if (!isActive()) {
      var mount = document.getElementById('libraryMagicMineSegments');
      if (mount) mount.innerHTML = '';
      document.body.classList.remove(
        'library-magic-mine-scheman',
        'library-magic-mine-aktiviteter',
        'library-magic-mine-beloningar'
      );
      return;
    }
    render();
  }

  function reset() {
    _segment = 'scheman';
  }

  function show() {
    applySegmentVisibility();
    return refresh();
  }

  function getSegment() {
    return _segment;
  }

  window.LibraryMagicMine = {
    refresh: refresh,
    show: show,
    reset: reset,
    switchSegment: switchSegment,
    getSegment: getSegment,
    isActive: isActive,
  };
})();
