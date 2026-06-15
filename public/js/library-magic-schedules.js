/**
 * library-magic-schedules.js — Standardscheman mockup (list, filter, detail, delsteg).
 * Reuses renderStdScheduleItem, toggleStdSubSteps, openScheduleCopyDialog from library-schema.js.
 */
(function () {
  'use strict';

  var FILTERS = [
    { id: 'all', label: 'Alla' },
    { id: 'forskola', label: 'Förskola', test: /förskola/i },
    { id: 'skola', label: 'Skola', test: /skola/i, exclude: /förskola/i },
    { id: 'helg', label: 'Helg', test: /helg|lördag|söndag|weekend/i },
    { id: 'kvall', label: 'Kväll', test: /kväll|kvall|night/i },
  ];

  var STD_SEGMENTS = [
    { id: 'schedules', label: '📅 Scheman' },
    { id: 'activities', label: '📋 Aktiviteter' },
    { id: 'rewards', label: '🏆 Belöningar' },
  ];

  var _filter = 'all';
  var _detailId = null;
  var _stdSegment = 'schedules';

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
      && LibraryMagicHub.getSection() === 'standard';
  }

  function schedules() {
    return typeof standardSchedules !== 'undefined' && Array.isArray(standardSchedules)
      ? standardSchedules
      : [];
  }

  function scheduleText(s) {
    return (s.name || '') + ' ' + (s.description || '');
  }

  function matchesFilter(s) {
    if (_filter === 'all') return true;
    var def = FILTERS.find(function (f) { return f.id === _filter; });
    if (!def || !def.test) return true;
    var text = scheduleText(s);
    if (def.exclude && def.exclude.test(text)) return false;
    return def.test.test(text);
  }

  function inferTags(s) {
    return FILTERS.filter(function (f) {
      return f.id !== 'all' && matchesFilterForTag(s, f);
    }).map(function (f) { return f.label; });
  }

  function matchesFilterForTag(s, def) {
    var text = scheduleText(s);
    if (def.exclude && def.exclude.test(text)) return false;
    return def.test && def.test.test(text);
  }

  function formatTime(t) {
    if (!t) return '';
    var str = String(t);
    if (str.length >= 5) return str.slice(0, 5);
    return str;
  }

  function renderScheduleItemHtml(item, scheduleId) {
    if (typeof window.renderStdScheduleItem === 'function') {
      return window.renderStdScheduleItem(item, 'magic-' + scheduleId);
    }
    var subSteps = item.sub_steps || [];
    var hasSubSteps = Array.isArray(subSteps) && subSteps.length > 0;
    var itemUid = 'magic-item-' + scheduleId + '-' + (item.id || item.name.replace(/\s/g, ''));
    var subHtml = hasSubSteps
      ? '<div id="' + itemUid + '-subs" class="substeps-panel library-magic-substeps ml-7 mt-1 mb-1 pl-3 border-l-2 border-lavender">'
        + subSteps.map(function (ss) {
          return '<div class="flex items-center gap-1.5 text-xs py-0.5 text-text-soft">'
            + '<span>' + (ss.icon || '▸') + '</span><span>' + escHtml(ss.name) + '</span></div>';
        }).join('')
        + '</div>'
      : '';
    return '<div><div class="library-magic-timeline-row' + (hasSubSteps ? ' is-expandable' : '') + '"'
      + (hasSubSteps ? ' data-std-subs="' + itemUid + '-subs"' : '') + '>'
      + '<span class="library-magic-timeline-icon">' + (item.icon || '📌') + '</span>'
      + '<span class="library-magic-timeline-name">' + escHtml(item.name) + '</span>'
      + (hasSubSteps ? '<span class="library-magic-substep-badge">' + subSteps.length + ' delsteg ▾</span>' : '')
      + '<span class="library-magic-timeline-stars">' + '⭐'.repeat(item.star_value || 1) + '</span>'
      + '</div>' + subHtml + '</div>';
  }

  function renderSegmentBar() {
    return '<div class="library-magic-segments" role="tablist">'
      + STD_SEGMENTS.map(function (seg) {
        return '<button type="button" class="library-magic-segment' + (_stdSegment === seg.id ? ' is-active' : '') + '"'
          + ' data-std-segment="' + seg.id + '" role="tab" aria-selected="' + (_stdSegment === seg.id) + '">'
          + escHtml(seg.label) + '</button>';
      }).join('')
      + '</div>';
  }

  function renderFilterChips() {
    return '<div class="library-magic-filters" role="tablist">'
      + FILTERS.map(function (f) {
        return '<button type="button" class="library-magic-filter' + (_filter === f.id ? ' is-active' : '') + '"'
          + ' data-schedule-filter="' + f.id + '">' + escHtml(f.label) + '</button>';
      }).join('')
      + '</div>';
  }

  function renderListView() {
    var list = schedules().filter(matchesFilter);
    var cards = list.map(function (s) {
      var tags = inferTags(s);
      var tagHtml = tags.length
        ? '<div class="library-magic-schedule-tags">' + tags.map(function (t) {
          return '<span class="library-magic-tag">' + escHtml(t) + '</span>';
        }).join('') + '</div>'
        : '';
      return '<button type="button" class="library-magic-schedule-card" data-schedule-id="' + s.id + '">'
        + '<span class="library-magic-schedule-card-icon">' + (s.icon || '📋') + '</span>'
        + '<span class="library-magic-schedule-card-body">'
        + '<strong>' + escHtml(s.name) + '</strong>'
        + '<span>' + escHtml(s.description || '') + '</span>'
        + tagHtml
        + '<span class="library-magic-schedule-meta">' + (s.items || []).length + ' aktiviteter</span>'
        + '</span>'
        + '<span class="library-magic-menu-arrow" aria-hidden="true">›</span>'
        + '</button>';
    }).join('');

    return renderSegmentBar()
      + '<div class="library-magic-std-pane" data-std-pane="schedules">'
      + renderFilterChips()
      + (list.length
        ? '<div class="library-magic-schedule-list">' + cards + '</div>'
        : '<p class="library-magic-empty">Inga scheman matchar filtret.</p>')
      + '</div>'
      + '<div class="library-magic-std-pane hidden" data-std-pane="activities">'
      + '<p class="library-magic-std-hint">Kopiera standardaktiviteter — inklusive delsteg — till ert bibliotek.</p>'
      + '<div id="libraryMagicStdActivitiesMount"></div>'
      + '</div>'
      + '<div class="library-magic-std-pane hidden" data-std-pane="rewards">'
      + '<p class="library-magic-std-hint">Välj och kopiera standardbelöningar till er familj.</p>'
      + '<div id="libraryMagicStdRewardsMount"></div>'
      + '</div>';
  }

  function renderDetailView(schedule) {
    var items = (schedule.items || []).slice().sort(function (a, b) {
      var secOrder = { morgon: 0, dag: 1, kvall: 2 };
      var sa = secOrder[a.section] != null ? secOrder[a.section] : 1;
      var sb = secOrder[b.section] != null ? secOrder[b.section] : 1;
      if (sa !== sb) return sa - sb;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    var timeline = items.map(function (item) {
      var time = formatTime(item.start_time);
      var end = formatTime(item.end_time);
      var timeLabel = time ? (end ? time + '–' + end : time) : '';
      return '<div class="library-magic-timeline-item">'
        + (timeLabel ? '<div class="library-magic-timeline-time">' + escHtml(timeLabel) + '</div>' : '')
        + '<div class="library-magic-timeline-content">' + renderScheduleItemHtml(item, schedule.id) + '</div>'
        + '</div>';
    }).join('');

    var tags = inferTags(schedule);
    var tagHtml = tags.length
      ? '<div class="library-magic-schedule-tags">' + tags.map(function (t) {
        return '<span class="library-magic-tag">' + escHtml(t) + '</span>';
      }).join('') + '</div>'
      : '';

    return '<div class="library-magic-detail">'
      + '<div class="library-magic-detail-head">'
      + '<span class="library-magic-detail-icon">' + (schedule.icon || '📋') + '</span>'
      + '<div><h3>' + escHtml(schedule.name) + '</h3>'
      + '<p>' + escHtml(schedule.description || '') + '</p>'
      + tagHtml + '</div></div>'
      + '<div class="library-magic-timeline">' + (timeline || '<p class="library-magic-empty">Inga aktiviteter i schemat.</p>') + '</div>'
      + '<div class="library-magic-detail-actions">'
      + '<button type="button" class="library-magic-btn-secondary" data-schedule-action="preview-back">← Tillbaka</button>'
      + '<button type="button" class="library-magic-btn-primary" data-schedule-action="copy" data-schedule-id="' + schedule.id + '" data-schedule-name="' + escHtml(schedule.name) + '">📥 Kopiera schema</button>'
      + '</div></div>';
  }

  function restoreLegacyStdContent() {
    var actSrc = document.getElementById('standardLibraryContainer');
    var rewSrc = document.getElementById('standardRewardsContainer');
    var copyBtn = document.getElementById('copySelectedRewardsBtn');
    var actPane = document.getElementById('std-sub-activities');
    var rewPane = document.getElementById('std-sub-rewards');

    if (actSrc && actPane && actSrc.parentElement !== actPane) {
      actPane.appendChild(actSrc);
    }
    if (rewSrc && rewPane && rewSrc.parentElement !== rewPane) {
      if (copyBtn && copyBtn.parentElement !== rewPane) {
        rewPane.insertBefore(copyBtn, rewPane.firstChild);
      }
      rewPane.appendChild(rewSrc);
    }
  }

  function mountLegacyStdContent() {
    var actMount = document.getElementById('libraryMagicStdActivitiesMount');
    var rewMount = document.getElementById('libraryMagicStdRewardsMount');
    var actSrc = document.getElementById('standardLibraryContainer');
    var rewSrc = document.getElementById('standardRewardsContainer');
    var copyBtn = document.getElementById('copySelectedRewardsBtn');

    if (actMount && actSrc && _stdSegment === 'activities') {
      actMount.innerHTML = '';
      actMount.appendChild(actSrc);
      actSrc.classList.remove('hidden');
    }
    if (rewMount && rewSrc && _stdSegment === 'rewards') {
      rewMount.innerHTML = '';
      if (copyBtn) rewMount.appendChild(copyBtn);
      rewMount.appendChild(rewSrc);
      rewSrc.classList.remove('hidden');
    }
  }

  function bindEvents(mount) {
    mount.onclick = function (e) {
      var filterBtn = e.target.closest('[data-schedule-filter]');
      if (filterBtn) {
        _filter = filterBtn.getAttribute('data-schedule-filter');
        _detailId = null;
        render();
        return;
      }

      var segBtn = e.target.closest('[data-std-segment]');
      if (segBtn) {
        _stdSegment = segBtn.getAttribute('data-std-segment');
        _detailId = null;
        if (typeof window.switchStdSubTab === 'function') {
          window.switchStdSubTab(_stdSegment);
        }
        render();
        return;
      }

      var card = e.target.closest('[data-schedule-id]');
      if (card && card.classList.contains('library-magic-schedule-card')) {
        _detailId = card.getAttribute('data-schedule-id');
        render();
        return;
      }

      var row = e.target.closest('[data-std-subs]');
      if (row && typeof window.toggleStdSubSteps === 'function') {
        window.toggleStdSubSteps(row.getAttribute('data-std-subs'));
        return;
      }

      var actionBtn = e.target.closest('[data-schedule-action]');
      if (!actionBtn) return;
      var action = actionBtn.getAttribute('data-schedule-action');
      if (action === 'preview-back') {
        _detailId = null;
        render();
      } else if (action === 'copy' && typeof window.openScheduleCopyDialog === 'function') {
        window.openScheduleCopyDialog(
          actionBtn.getAttribute('data-schedule-id'),
          actionBtn.getAttribute('data-schedule-name')
        );
      }
    };
  }

  function ensureData() {
    if (typeof window.loadSchemaTab === 'function'
      && (typeof schemaChildren === 'undefined' || schemaChildren.length === 0)) {
      return window.loadSchemaTab();
    }
    return Promise.resolve();
  }

  function render() {
    var mount = document.getElementById('libraryMagicSectionMount');
    if (!mount || !isActive()) return;

    mount.classList.remove('hidden');
    document.body.classList.add('library-magic-has-section-mount');

    if (_detailId && _stdSegment === 'schedules') {
      var schedule = schedules().find(function (s) { return String(s.id) === String(_detailId); });
      mount.innerHTML = schedule ? renderDetailView(schedule) : renderListView();
    } else {
      mount.innerHTML = renderListView();
      mountLegacyStdContent();
    }

    bindEvents(mount);
  }

  function refresh() {
    if (!isActive()) {
      restoreLegacyStdContent();
      var mount = document.getElementById('libraryMagicSectionMount');
      if (mount) {
        mount.classList.add('hidden');
        mount.innerHTML = '';
      }
      document.body.classList.remove('library-magic-has-section-mount');
      return;
    }
    render();
  }

  function reset() {
    _filter = 'all';
    _detailId = null;
    _stdSegment = 'schedules';
  }

  function show() {
    return ensureData().then(function () {
      if (typeof window.switchStdSubTab === 'function') {
        window.switchStdSubTab(_stdSegment);
      }
      refresh();
    });
  }

  window.LibraryMagicSchedules = {
    refresh: refresh,
    show: show,
    reset: reset,
    isActive: isActive,
  };
})();
