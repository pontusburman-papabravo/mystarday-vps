/**
 * library-magic-schedules.js — Standardscheman mockup (list, filter, detail, delsteg).
 * Reuses renderStdScheduleItem, toggleStdSubSteps, openScheduleCopyDialog from library-schema.js.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  const FILTER_DEFS = [
    { id: 'all', labelKey: 'library.standard.filters.all' },
    { id: 'forskola', labelKey: 'library.standard.filters.preschool', test: /förskola|preschool|nursery/i },
    { id: 'skola', labelKey: 'library.standard.filters.school', test: /skola|school/i, exclude: /förskola|preschool|nursery/i },
    { id: 'helg', labelKey: 'library.standard.filters.weekend', test: /helg|lördag|söndag|weekend/i, exclude: /jullov|sommarlov/i },
    { id: 'lov', labelKey: 'library.standard.filters.break', test: /lov|sportlov|höstlov|påsklov/i, exclude: /förskola|preschool|nursery/i },
    { id: 'kvall', labelKey: 'library.standard.filters.evening', test: /kväll|kvall|night|evening/i },
  ];

  const STD_SEGMENT_DEFS = [
    { id: 'schedules', labelKey: 'library.standard.segments.schedules' },
    { id: 'activities', labelKey: 'library.standard.segments.activities' },
    { id: 'rewards', labelKey: 'library.standard.segments.rewards' },
  ];

  let _filter = 'all';
  let _detailId = null;
  let _stdSegment = 'schedules';

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scheduleLabel(s) {
    return s.display_name || s.name || '';
  }

  function scheduleDescription(s) {
    return s.display_description || s.description || '';
  }

  function itemLabel(item) {
    return item.display_name || item.name || '';
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
    const def = FILTER_DEFS.find(function (f) { return f.id === _filter; });
    if (!def || !def.test) return true;
    const text = scheduleText(s);
    if (def.exclude && def.exclude.test(text)) return false;
    return def.test.test(text);
  }

  function inferTags(s) {
    return FILTER_DEFS.filter(function (f) {
      return f.id !== 'all' && matchesFilterForTag(s, f);
    }).map(function (f) { return pt(f.labelKey); });
  }

  function matchesFilterForTag(s, def) {
    const text = scheduleText(s);
    if (def.exclude && def.exclude.test(text)) return false;
    return def.test && def.test.test(text);
  }

  function formatTime(t) {
    if (!t) return '';
    const str = String(t);
    if (str.length >= 5) return str.slice(0, 5);
    return str;
  }

  function renderScheduleItemHtml(item, scheduleId) {
    if (typeof window.renderStdScheduleItem === 'function') {
      return window.renderStdScheduleItem(item, 'magic-' + scheduleId);
    }
    const subSteps = item.sub_steps || [];
    const hasSubSteps = Array.isArray(subSteps) && subSteps.length > 0;
    const itemUid = 'magic-item-' + scheduleId + '-' + (item.id || item.name.replace(/\s/g, ''));
    const subHtml = hasSubSteps
      ? '<div id="' + itemUid + '-subs" class="substeps-panel library-magic-substeps ml-7 mt-1 mb-1 pl-3 border-l-2 border-lavender">'
        + subSteps.map(function (ss) {
          const stepLabel = ss.display_name || ss.name || '';
          return '<div class="flex items-center gap-1.5 text-xs py-0.5 text-text-soft">'
            + '<span>' + (ss.icon || '▸') + '</span><span>' + escHtml(stepLabel) + '</span></div>';
        }).join('')
        + '</div>'
      : '';
    return '<div><div class="library-magic-timeline-row' + (hasSubSteps ? ' is-expandable' : '') + '"'
      + (hasSubSteps ? ' data-std-subs="' + itemUid + '-subs"' : '') + '>'
      + '<span class="library-magic-timeline-icon">' + (item.icon || '📌') + '</span>'
      + '<span class="library-magic-timeline-name">' + escHtml(itemLabel(item)) + '</span>'
      + (hasSubSteps ? '<span class="library-magic-substep-badge">' + pt('library.standard.substepsCount', { count: subSteps.length }) + ' ▾</span>' : '')
      + '<span class="library-magic-timeline-stars">' + '⭐'.repeat(item.star_value || 1) + '</span>'
      + '</div>' + subHtml + '</div>';
  }

  function stdPaneClass(segmentId) {
    return 'library-magic-std-pane' + (_stdSegment === segmentId ? '' : ' hidden');
  }

  function renderSegmentBar() {
    return '<div class="library-magic-segments" role="tablist">'
      + STD_SEGMENT_DEFS.map(function (seg) {
        return '<button type="button" class="library-magic-segment' + (_stdSegment === seg.id ? ' is-active' : '') + '"'
          + ' data-std-segment="' + seg.id + '" role="tab" aria-selected="' + (_stdSegment === seg.id) + '">'
          + escHtml(pt(seg.labelKey)) + '</button>';
      }).join('')
      + '</div>';
  }

  function renderFilterChips() {
    return '<div class="library-magic-filters" role="tablist">'
      + FILTER_DEFS.map(function (f) {
        return '<button type="button" class="library-magic-filter' + (_filter === f.id ? ' is-active' : '') + '"'
          + ' data-schedule-filter="' + f.id + '">' + escHtml(pt(f.labelKey)) + '</button>';
      }).join('')
      + '</div>';
  }

  function renderListView() {
    const list = schedules().filter(matchesFilter);
    const cards = list.map(function (s) {
      const tags = inferTags(s);
      const tagHtml = tags.length
        ? '<div class="library-magic-schedule-tags">' + tags.map(function (t) {
          return '<span class="library-magic-tag">' + escHtml(t) + '</span>';
        }).join('') + '</div>'
        : '';
      return '<button type="button" class="library-magic-schedule-card" data-schedule-id="' + s.id + '">'
        + '<span class="library-magic-schedule-card-icon">' + (s.icon || '📋') + '</span>'
        + '<span class="library-magic-schedule-card-body">'
        + '<strong>' + escHtml(scheduleLabel(s)) + '</strong>'
        + '<span>' + escHtml(scheduleDescription(s)) + '</span>'
        + tagHtml
        + '<span class="library-magic-schedule-meta">' + pt('library.standard.activitiesCount', { count: (s.items || []).length }) + '</span>'
        + '</span>'
        + '<span class="library-magic-menu-arrow" aria-hidden="true">›</span>'
        + '</button>';
    }).join('');

    return renderSegmentBar()
      + '<div class="' + stdPaneClass('schedules') + '" data-std-pane="schedules">'
      + renderFilterChips()
      + (list.length
        ? '<div class="library-magic-schedule-list">' + cards + '</div>'
        : '<p class="library-magic-empty">' + escHtml(pt('library.standard.noSchedulesMatch')) + '</p>')
      + '</div>'
      + '<div class="' + stdPaneClass('activities') + '" data-std-pane="activities">'
      + '<p class="library-magic-std-hint">' + pt('library.standard.activitiesHint') + '</p>'
      + '<div id="libraryMagicStdActivitiesMount"></div>'
      + '</div>'
      + '<div class="' + stdPaneClass('rewards') + '" data-std-pane="rewards">'
      + '<p class="library-magic-std-hint">' + escHtml(pt('library.standard.rewardsHint')) + '</p>'
      + '<div id="libraryMagicStdRewardsMount"></div>'
      + '</div>';
  }

  function renderDetailView(schedule) {
    const items = (schedule.items || []).slice().sort(function (a, b) {
      const secOrder = { morgon: 0, dag: 1, kvall: 2 };
      const sa = secOrder[a.section] != null ? secOrder[a.section] : 1;
      const sb = secOrder[b.section] != null ? secOrder[b.section] : 1;
      if (sa !== sb) return sa - sb;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const timeline = items.map(function (item) {
      const time = formatTime(item.start_time);
      const end = formatTime(item.end_time);
      const timeLabel = time ? (end ? time + '–' + end : time) : '';
      return '<div class="library-magic-timeline-item">'
        + (timeLabel ? '<div class="library-magic-timeline-time">' + escHtml(timeLabel) + '</div>' : '')
        + '<div class="library-magic-timeline-content">' + renderScheduleItemHtml(item, schedule.id) + '</div>'
        + '</div>';
    }).join('');

    const tags = inferTags(schedule);
    const tagHtml = tags.length
      ? '<div class="library-magic-schedule-tags">' + tags.map(function (t) {
        return '<span class="library-magic-tag">' + escHtml(t) + '</span>';
      }).join('') + '</div>'
      : '';

    return '<div class="library-magic-detail">'
      + '<div class="library-magic-detail-head">'
      + '<span class="library-magic-detail-icon">' + (schedule.icon || '📋') + '</span>'
      + '<div><h3>' + escHtml(scheduleLabel(schedule)) + '</h3>'
      + '<p>' + escHtml(scheduleDescription(schedule)) + '</p>'
      + tagHtml + '</div></div>'
      + '<div class="library-magic-timeline">' + (timeline || '<p class="library-magic-empty">' + escHtml(pt('schedule.emptySection')) + '</p>') + '</div>'
      + '<div class="library-magic-detail-actions">'
      + '<button type="button" class="library-magic-btn-secondary" data-schedule-action="preview-back">' + escHtml(pt('library.standard.back')) + '</button>'
      + '<button type="button" class="library-magic-btn-primary" data-schedule-action="copy" data-schedule-id="' + schedule.id + '" data-schedule-name="' + escHtml(schedule.name) + '">' + escHtml(pt('library.standard.copySchedule')) + '</button>'
      + '</div></div>';
  }

  function restoreLegacyStdContent() {
    const actSrc = document.getElementById('standardLibraryContainer');
    const rewSrc = document.getElementById('standardRewardsContainer');
    const copyBtn = document.getElementById('copySelectedRewardsBtn');
    const actPane = document.getElementById('std-sub-activities');
    const rewPane = document.getElementById('std-sub-rewards');

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
    const actMount = document.getElementById('libraryMagicStdActivitiesMount');
    const rewMount = document.getElementById('libraryMagicStdRewardsMount');
    const actSrc = document.getElementById('standardLibraryContainer');
    const rewSrc = document.getElementById('standardRewardsContainer');
    const copyBtn = document.getElementById('copySelectedRewardsBtn');

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
      const filterBtn = e.target.closest('[data-schedule-filter]');
      if (filterBtn) {
        _filter = filterBtn.getAttribute('data-schedule-filter');
        _detailId = null;
        render();
        return;
      }

      const segBtn = e.target.closest('[data-std-segment]');
      if (segBtn) {
        _stdSegment = segBtn.getAttribute('data-std-segment');
        _detailId = null;
        if (typeof window.switchStdSubTab === 'function') {
          window.switchStdSubTab(_stdSegment);
        }
        render();
        return;
      }

      const card = e.target.closest('[data-schedule-id]');
      if (card && card.classList.contains('library-magic-schedule-card')) {
        _detailId = card.getAttribute('data-schedule-id');
        render();
        return;
      }

      const row = e.target.closest('[data-std-subs]');
      if (row && typeof window.toggleStdSubSteps === 'function') {
        window.toggleStdSubSteps(row.getAttribute('data-std-subs'));
        return;
      }

      const actionBtn = e.target.closest('[data-schedule-action]');
      if (!actionBtn) return;
      const action = actionBtn.getAttribute('data-schedule-action');
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
    if (typeof window.loadSchemaTab !== 'function') return Promise.resolve();
    return window.loadSchemaTab();
  }

  function render() {
    const mount = document.getElementById('libraryMagicSectionMount');
    if (!mount || !isActive()) return;

    mount.classList.remove('hidden');
    document.body.classList.add('library-magic-has-section-mount');

    if (_detailId && _stdSegment === 'schedules') {
      const schedule = schedules().find(function (s) { return String(s.id) === String(_detailId); });
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
      const mount = document.getElementById('libraryMagicSectionMount');
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
    const loads = [];
    if (typeof window.loadSchemaTab === 'function') loads.push(window.loadSchemaTab());
    if (typeof window.loadStandardLibrary === 'function') loads.push(window.loadStandardLibrary());
    return Promise.all(loads).then(function () {
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
