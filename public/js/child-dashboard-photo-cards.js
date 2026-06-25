/**
 * child-dashboard-photo-cards.js — Variant C: bildschema-kort för aktiviteter med eget foto.
 * Emoji-aktiviteter renderas fortfarande i child-dashboard.js (kompakt rad).
 */
(function () {
  'use strict';

  function hasPhoto(item) {
    return !!(window.ActivityVisual && ActivityVisual.pick(item).url);
  }

  function photoUrl(item) {
    return ActivityVisual.pick(item).url;
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return escHtml(s);
    return String(s || '');
  }

  function renderSubstepsBlock(item, subStepCount, cachedSteps, isExpanded) {
    if (!subStepCount) return '';
    var subDone = cachedSteps ? cachedSteps.filter(function (s) { return s.completed; }).length : 0;
    var intro = typeof _substepIntroSeen !== 'undefined' ? _substepIntroSeen : true;
    return (
      '<div class="mt-3 pt-2 border-t border-lavender/50 px-3 pb-1" onclick="event.stopPropagation()">' +
        '<div style="position:relative;display:inline-block;">' +
          '<button class="expand-btn ' + (isExpanded ? 'open' : '') + ' ' + (!isExpanded && !intro ? 'intro-hint' : '') + '" id="expand-btn-' + item.id + '"' +
                  ' onclick="expandSubSteps(event, \'' + item.id + '\')">' +
            '📋 Delsteg <span class="chevron">▾</span>' +
          '</button>' +
          (!isExpanded && !intro
            ? '<div class="intro-tooltip" id="intro-tooltip-' + item.id + '">Tryck för att se stegen! 👆</div>'
            : '') +
        '</div>' +
        '<div class="substep-container ' + (isExpanded ? 'expanded' : '') + '" id="substeps-' + item.id + '">' +
          (isExpanded && cachedSteps && typeof renderSubStepListHtml === 'function'
            ? renderSubStepListHtml(item.id, cachedSteps)
            : '') +
        '</div>' +
      '</div>'
    );
  }

  function metaRow(item, timeStr, extraHtml) {
    var parts = [];
    if (timeStr && typeof hideClock !== 'undefined' && !hideClock) {
      parts.push('<span class="photo-activity-card__time">🕐 ' + esc(timeStr) + '</span>');
    }
    if (item.star_value > 0) {
      parts.push('<span class="photo-activity-card__stars">' + '⭐'.repeat(Math.min(item.star_value, 5)) + '</span>');
    }
    if (extraHtml) parts.push(extraHtml);
    if (!parts.length) return '';
    return '<div class="photo-activity-card__meta">' + parts.join('') + '</div>';
  }

  function checkButton(item, isDone, canToggle, checkAttr) {
    if (isDone) {
      return (
        '<div class="photo-activity-card__check photo-activity-card__check--done">' +
          '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>' +
          '</svg>' +
        '</div>'
      );
    }
    if (canToggle) {
      return '<button type="button" class="photo-activity-card__check" ' + checkAttr + ' aria-label="Markera klar"></button>';
    }
    return '';
  }

  function renderNowCard(item, canToggle) {
    if (window.ChildPackageNav) ChildPackageNav.setNavHidden(false);

    var isDone = item.completed;
    var timeStr = item.start_time
      ? (item.end_time ? item.start_time + '–' + item.end_time : item.start_time)
      : '';
    var checkAttr = canToggle && !isDone ? 'onclick="toggleItem(\'' + item.id + '\', false)"' : '';
    var subStepCount = item.sub_step_count || 0;
    var cachedSteps = typeof subStepCache !== 'undefined' ? subStepCache[item.id] : null;
    var isExpanded = typeof subStepExpanded !== 'undefined' ? !!subStepExpanded[item.id] : false;
    var subDone = cachedSteps ? cachedSteps.filter(function (s) { return s.completed; }).length : 0;
    var subBadge = subStepCount
      ? '<span class="substep-progress ' + (subDone === subStepCount ? 'all-done' : '') + '" id="substep-badge-' + item.id + '">' + subDone + '/' + subStepCount + '</span>'
      : '';
    var colorCls = typeof getChildColorClass === 'function' ? getChildColorClass(item.name) : '';

    var showTimer = typeof visualTimer !== 'undefined' && visualTimer && !isDone && item.start_time && item.end_time;
    var timerHtml = showTimer
      ? '<div class="time-timer-wrap" id="timer-' + item.id + '" aria-hidden="true">' +
          '<svg class="time-timer-svg" width="44" height="44" viewBox="0 0 36 36">' +
            '<circle class="time-timer-track" cx="18" cy="18" r="15.9"/>' +
            '<circle class="time-timer-fill" id="timer-fill-' + item.id + '" cx="18" cy="18" r="15.9"' +
              ' stroke-dasharray="100 0" data-start="' + esc(item.start_time) + '" data-end="' + esc(item.end_time) + '"/>' +
          '</svg>' +
        '</div>'
      : '';

    return (
      '<div class="activity-card photo-activity-card photo-activity-card--now ' + (isDone ? 'done' : '') + ' ' + colorCls + '" id="card-' + item.id + '"' +
           ' data-feedback-for="' + esc(item.feedback_for || 'both') + '"' +
           ' data-item-icon="' + esc(item.icon || '⭐') + '"' +
           ' data-item-name="' + esc(item.name) + '"' +
           ' data-item-id="' + item.id + '"' +
           ' data-sub-step-count="' + subStepCount + '">' +
        '<div class="photo-activity-card__badge-wrap">' +
          '<div class="now-badge"><div class="pulse-dot"></div> NU</div>' +
        '</div>' +
        '<img src="' + esc(photoUrl(item)) + '" alt="" class="photo-activity-card__img" loading="lazy">' +
        '<div class="photo-activity-card__foot">' +
          '<div class="photo-activity-card__title ' + (isDone ? 'line-through text-text-soft' : '') + '">' + esc(item.name) + '</div>' +
          timerHtml +
          checkButton(item, isDone, canToggle, checkAttr) +
        '</div>' +
        metaRow(item, timeStr, subBadge) +
        renderSubstepsBlock(item, subStepCount, cachedSteps, isExpanded) +
      '</div>'
    );
  }

  function renderActivityCard(item, isToday, timeStatus) {
    var isDone = item.completed;
    var isNextOrLater = timeStatus === 'next' || timeStatus === 'later';
    var canToggle = isToday && !isNextOrLater;
    var timeStr = item.start_time
      ? (item.end_time ? item.start_time + '–' + item.end_time : item.start_time)
      : '';
    var isNext = timeStatus === 'next';
    var isLater = timeStatus === 'later';
    var subStepCount = item.sub_step_count || 0;
    var cachedSteps = typeof subStepCache !== 'undefined' ? subStepCache[item.id] : null;
    var isExpanded = typeof subStepExpanded !== 'undefined' ? !!subStepExpanded[item.id] : false;
    var subDone = cachedSteps ? cachedSteps.filter(function (s) { return s.completed; }).length : 0;
    var subBadge = subStepCount
      ? '<span class="substep-progress ' + (subDone === subStepCount ? 'all-done' : '') + '" id="substep-badge-' + item.id + '">' + subDone + '/' + subStepCount + '</span>'
      : '';
    var colorCls = typeof getChildColorClass === 'function' ? getChildColorClass(item.name) : '';
    var feedbackFor = item.feedback_for || 'both';

    var badgeHtml = '';
    if (isNext) {
      badgeHtml = '<span class="nl-chip chip-next">Nästa</span>';
    } else if (isLater && !isDone) {
      badgeHtml = '<span class="nl-chip chip-later">Sedan</span>';
    }

    var ratingHtml = '';
    if (typeof itemRatings !== 'undefined' && itemRatings[item.id]) {
      var rating = itemRatings[item.id];
      if (rating.child_score) {
        ratingHtml = '<span class="text-xs font-semibold" style="color:#F5A623">' + rating.child_score + '/10</span>';
      }
    }

    var dragHtml = (typeof allowChildReorder !== 'undefined' && allowChildReorder)
      ? '<div class="drag-handle shrink-0 flex items-center justify-center w-10 h-10 cursor-grab" title="Dra för att ändra ordning" onclick="event.stopPropagation()">' +
          '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">' +
            '<circle cx="7" cy="4" r="1.5"/><circle cx="13" cy="4" r="1.5"/>' +
            '<circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>' +
            '<circle cx="7" cy="16" r="1.5"/><circle cx="13" cy="16" r="1.5"/>' +
          '</svg>' +
        '</div>'
      : '';

    var cardCheck = '';
    if (!isNextOrLater || isDone) {
      if (isDone) {
        cardCheck = checkButton(item, true, false, '');
      } else if (canToggle) {
        cardCheck = '<div class="photo-activity-card__check" aria-hidden="true"></div>';
      }
    }

    var outerClick = canToggle && !isDone ? ' onclick="toggleItem(\'' + item.id + '\', false)"' : '';
    var cursorCls = canToggle && !isDone ? ' cursor-pointer' : '';

    return (
      '<div class="activity-card photo-activity-card' + cursorCls + ' ' + (isDone ? 'done' : '') + ' ' + (isLater && !isDone ? 'opacity-60' : '') + ' ' + colorCls + '"' +
           ' id="card-' + item.id + '"' +
           ' data-feedback-for="' + esc(feedbackFor) + '"' +
           ' data-item-icon="' + esc(item.icon || '⭐') + '"' +
           ' data-item-name="' + esc(item.name) + '"' +
           ' data-item-id="' + item.id + '"' +
           ' data-sub-step-count="' + subStepCount + '"' +
           outerClick + '>' +
        (badgeHtml ? '<div class="photo-activity-card__badge-wrap">' + badgeHtml + '</div>' : '') +
        '<img src="' + esc(photoUrl(item)) + '" alt="" class="photo-activity-card__img" loading="lazy">' +
        '<div class="photo-activity-card__foot">' +
          dragHtml +
          '<div class="photo-activity-card__title ' + (isDone ? 'line-through text-text-soft' : '') + '">' + esc(item.name) + '</div>' +
          cardCheck +
        '</div>' +
        metaRow(item, timeStr, subBadge + ratingHtml) +
        renderSubstepsBlock(item, subStepCount, cachedSteps, isExpanded) +
      '</div>'
    );
  }

  function renderDoneHistoryCard(item) {
    var timeStr = item.start_time || '';
    return (
      '<div class="activity-card photo-activity-card photo-activity-card--done-history done" id="card-' + item.id + '"' +
           ' data-item-id="' + item.id + '" style="pointer-events:none;opacity:0.65;">' +
        '<img src="' + esc(photoUrl(item)) + '" alt="" class="photo-activity-card__img" loading="lazy">' +
        '<div class="photo-activity-card__foot">' +
          '<div class="photo-activity-card__title" style="text-decoration:line-through;color:#6B7280;">' + esc(item.name) + '</div>' +
          '<div class="photo-activity-card__check photo-activity-card__check--done">' +
            '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>' +
            '</svg>' +
          '</div>' +
        '</div>' +
        metaRow(item, timeStr, '') +
      '</div>'
    );
  }

  window.ChildPhotoCards = {
    hasPhoto: hasPhoto,
    renderNowCard: renderNowCard,
    renderActivityCard: renderActivityCard,
    renderDoneHistoryCard: renderDoneHistoryCard,
  };
})();
