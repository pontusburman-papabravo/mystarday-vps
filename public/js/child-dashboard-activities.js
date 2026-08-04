/**
 * Child dashboard activity rendering (Fas 8 F3d).
 * classifyActivities, day-section / NU-NÄSTA-SEDAN layout, activity cards.
 * Reads host state from child-dashboard.js (currentDate, viewType, subStepCache, …).
 */
(function () {
  'use strict';

function cda(key, params) {
  if (typeof window.cpt === 'function') {
    const value = cpt(key, params);
    if (value && value !== 'child.' + key) return value;
  }
  return '';
}

function sectionLabel(key) {
  return cda('sections.' + key) || key;
}

function substepsBtnLabel() {
  return '📋 ' + cda('steps.substepsLabel');
}

function activityCanToggle(isToday, isDone, timeStatus) {
  if (!isToday || isDone) return false;
  if (typeof requireSequentialCompletion !== 'undefined' && !requireSequentialCompletion) return true;
  const isNextOrLater = timeStatus === 'next' || timeStatus === 'later';
  return !isNextOrLater;
}

function forDigGoalBadgeHtml(item) {
  return (window.ForDigGoalBadge && item && item.for_dig_goal)
    ? ForDigGoalBadge.render(item.for_dig_goal)
    : '';
}

const DAG_DEL_CONFIG = {
  morgon:      { emoji: '🌅', bg: '#FFFBEA', border: '#FCD34D', headerBg: '#FEF9C3', headerText: '#92400E' },
  formiddag:   { emoji: '☀️',  bg: '#FFF7ED', border: '#FDBA74', headerBg: '#FFEDD5', headerText: '#9A3412' },
  eftermiddag: { emoji: '🌤️',  bg: '#EFF6FF', border: '#93C5FD', headerBg: '#DBEAFE', headerText: '#1E40AF' },
  kvall:       { emoji: '🌙', bg: '#FAF5FF', border: '#C084FC', headerBg: '#EDE9FE', headerText: '#6B21A8' },
  natt:        { emoji: '🌑', bg: '#EFF6FF', border: '#60A5FA', headerBg: '#1E3A5F', headerText: '#BFDBFE' },
};

// Color coding: keyword→CSS class mapping
const COLOR_RULES_CHILD = [
  { cls: 'cc-hygien',  keywords: ['tänder','borsta','tvätta','duscha','dusch','bad','badrum','toalett','blöja','klä','kläder','hygien','hår','kamm','nagel'] },
  { cls: 'cc-mat',     keywords: ['frukost','lunch','middag','mellanmål','mat','äta','dricka','frukt','snack','kvällsmat'] },
  { cls: 'cc-skola',   keywords: ['skola','förskola','läxor','läxa','läsa','räkna','aktivitet','inlämning','lektion','pedagog','lärare'] },
  { cls: 'cc-lek',     keywords: ['lek','leka','spel','spela','pussel','rita','måla','musik','sjunga','bygga','lego','docklek','utomhus'] },
  { cls: 'cc-rorelse', keywords: ['träna','träning','sport','gym','simning','simma','cykel','cykla','promenad','gå','springa','dans','dansa','yoga','fotboll','idrott'] },
  { cls: 'cc-vila',    keywords: ['sova','sovstund','vila','tupplur','natt','pyjamas','läggdags','kvällsrutin'] },
  { cls: 'cc-social',  keywords: ['kompi','kompis','besök','samling','träffa','möte','telefon','video','ring'] },
];
function getChildColorClass(name) {
  if (!colorCoding || !name) return '';
  const lower = name.toLowerCase();
  for (const rule of COLOR_RULES_CHILD) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.cls;
  }
  return '';
}

function getCurrentTimeHHMM() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getTimeMinutes(timeStr) {
  // Convert "HH:MM" or "HH:MM–HH:MM" to minutes since midnight
  if (!timeStr) return null;
  const clean = timeStr.split('–')[0].trim();
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Classify activities into NOW / NEXT / LATER based on current time
// completed items are excluded from remaining-activities classification
function classifyActivities(items, currentTimeStr) {
  const currentMins = getTimeMinutes(currentTimeStr);
  const now = [];
  const next = [];
  const laterFuture = []; // future uncompleted → normal LATER
  const laterPast = [];   // past uncompleted → "Redan" chip

  for (const item of items) {
    // Skip completed — they are handled separately
    if (item.completed) continue;

    const startMins = getTimeMinutes(item.start_time);
    const endMins = getTimeMinutes(item.end_time);

    // Activity with no time → goes to future LATER (no time-based ordering)
    if (startMins === null) {
      laterFuture.push({ ...item, _view: 'later', _past: false });
      continue;
    }

    // Check if currently happening
    if (currentMins !== null) {
      if (endMins !== null) {
        if (currentMins >= startMins && currentMins <= endMins) {
          now.push({ ...item, _view: 'now', _past: false });
          continue;
        }
      } else {
        if (currentMins >= startMins && currentMins <= startMins + 30) {
          now.push({ ...item, _view: 'now', _past: false });
          continue;
        }
      }
    }

    // Future activity (start time is in the future)
    if (currentMins !== null && startMins > currentMins) {
      if (!next.length) {
        next.push({ ...item, _view: 'next', _past: false });
      } else {
        laterFuture.push({ ...item, _view: 'later', _past: false });
      }
      continue;
    }

    // Past uncompleted (start was before current time, not currently happening)
    laterPast.push({ ...item, _view: 'later', _past: true });
  }

  return { now, next, laterFuture, laterPast };
}

function renderActivities(data, trueStarBalance) {
  const container = document.getElementById('scheduleView');
  const items = data.items || [];
  const isToday = currentDate === todayStr;

  if (window.ChildFirstStarMode) {
    ChildFirstStarMode.applyFromDailyLog(data);
  }

  // Use server-provided totals (covers full list even when items are pre-filtered)
  const total = data.total != null ? data.total : items.length;
  const completed = data.completed != null ? data.completed : items.filter(i => i.completed).length;
  const todayStars = items.filter(i => i.completed).reduce((s, i) => s + (i.star_value || 1), 0);
  const totalStarCount = total > 0 ? items.reduce((s, i) => s + (i.star_value || 1), 0) : 0;

  if (window.ChildFirstStarMode && ChildFirstStarMode.isActive()) {
    if (isToday) {
      checkMilestones(total, completed);
    }

    const backendFiltered = !!data.now_next_filtered;
    if (items.length === 0 && backendFiltered && total > 0 && completed === total) {
      // Celebration path — fall through to shared empty-state handler below
    } else if (items.length === 0) {
      container.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl mt-2">
        <p class="text-6xl mb-4">${isToday ? '🌟' : '📅'}</p>
        <p class="text-xl font-heading font-bold text-navy mb-2">${isToday ? cda('today.noActivitiesToday') : cda('today.noScheduleThisDay')}</p>
        <p class="text-text-soft text-sm">${isToday ? cda('today.enjoyFreeDay') + ' ⭐' : cda('today.pickAnotherDay')}</p>
      </div>`;
      return;
    } else {
      const item = items[0];
      let html = '<div class="first-star-mission-wrap">';
      html += renderNowCard(item, isToday);
      html += '</div>';
      container.innerHTML = html;
      initTimeTimers();
      if (window.ChildActivityTimer) ChildActivityTimer.initForItems([item]);
      const allCards = container.querySelectorAll('[data-sub-step-count]');
      for (const card of allCards) {
        const count = parseInt(card.dataset.subStepCount || '0', 10);
        const itemId = card.dataset.itemId;
        if (count > 0 && itemId && !subStepExpanded[itemId]) {
          const btn = document.getElementById('expand-btn-' + itemId);
          if (btn) expandSubSteps(new Event('click'), itemId);
          break;
        }
      }
      if (window.ChildTodayTasks) ChildTodayTasks.hideSkattCta();
      return;
    }
  }

  if (isTodayFocusLayer()) {
    if (window.ChildTodayFocus) {
      ChildTodayFocus.updateFromDailyLog(data, isToday);
    }
  } else {
    // Legacy dashboard chrome (hidden in today-focus-mode)
    if (document.getElementById('progressLabel')) {
      document.getElementById('progressLabel').textContent = cda('today.progressDone', { completed, total });
    }
    if (document.getElementById('starCount')) {
      document.getElementById('starCount').textContent = `${todayStars} / ${totalStarCount} ⭐`;
    }
    if (window.ChildDashboardWarmth) window.ChildDashboardWarmth.updateTodayStars(todayStars);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (document.getElementById('progressBar')) {
      document.getElementById('progressBar').style.width = `${pct}%`;
    }
    const ringEl = document.getElementById('emojiProgressRing');
    if (ringEl) {
      const circ = 2 * Math.PI * 18;
      const filled = total > 0 ? (completed / total) * circ : 0;
      const remaining = circ - filled;
      ringEl.setAttribute('stroke-dasharray', `${filled.toFixed(1)} ${remaining.toFixed(1)}`);
      if (total === 0 || completed === 0) {
        ringEl.setAttribute('stroke', 'rgba(255,255,255,0.18)');
      } else if (completed === total) {
        ringEl.setAttribute('stroke', '#22C55E');
      } else {
        ringEl.setAttribute('stroke', '#F5A623');
      }
    }
    const ringBadge = document.getElementById('ringActivityBadge');
    if (ringBadge) {
      ringBadge.textContent = `${completed}/${total}`;
      if (total === 0 || completed === 0) {
        ringBadge.style.background = '#6B7280';
      } else if (completed === total) {
        ringBadge.style.background = '#22C55E';
      } else {
        ringBadge.style.background = '#F5A623';
      }
    }
    const totalBalanceEl = document.getElementById('totalStarBalance');
    if (totalBalanceEl) {
      totalBalanceEl.textContent = `⭐ ${trueStarBalance !== undefined ? trueStarBalance : todayStars}`;
    }
  }
  if (isToday) {
    checkMilestones(total, completed);
  }

  // When backend has pre-filtered for NOW/NEXT/LATER and returned 0 items,
  // it means all activities are completed — show celebration
  const backendFiltered = !!data.now_next_filtered;
  if (items.length === 0 && backendFiltered && total > 0 && completed === total) {
    // All done — show celebration (handled below after the rendering block)
  } else if (items.length === 0) {
    if (isTodayFocusLayer() && window.ChildTodayFocus && typeof ChildTodayFocus.renderScheduleEmpty === 'function') {
      container.innerHTML = ChildTodayFocus.renderScheduleEmpty(isToday);
    } else {
      container.innerHTML = `
      <div class="text-center py-16 bg-white rounded-2xl mt-2">
        <p class="text-6xl mb-4">${isToday ? '🌟' : '📅'}</p>
        <p class="text-xl font-heading font-bold text-navy mb-2">${isToday ? cda('today.noActivitiesToday') : cda('today.noScheduleThisDay')}</p>
        <p class="text-text-soft text-sm">${isToday ? cda('today.enjoyFreeDay') + ' ⭐' : cda('today.pickAnotherDay')}</p>
      </div>`;
    }
    return;
  }

  let html = '';

  // ── Group items by section (MORGON/DAG/KVÄLL/NATT) ───────
  const sectionOrder = ['morgon', 'dag', 'kvall', 'natt'];
  const sections = {};
  for (const item of items) {
    const s = item.section || 'dag';
    if (!sections[s]) sections[s] = [];
    sections[s].push(item);
  }

  if (viewType === 'day_sections' && !(isTodayFocusLayer() && isToday)) {
    // ── Dagsvy: Färgkodade dagdelssektioner ──────────────────
    // 'dag' items are split visually: <12:00 → förmiddag, ≥12:00 or no time → eftermiddag
    // Section rendering order: morgon → förmiddag → eftermiddag → kvall → natt

    const dagItems = sections['dag'] || [];
    const formiddagItems = [];
    const eftermiddagItems = [];
    for (const item of dagItems) {
      const startMins = getTimeMinutes(item.start_time);
      // No time or before noon → förmiddag; noon onwards → eftermiddag
      if (startMins !== null && startMins >= 12 * 60) {
        eftermiddagItems.push(item);
      } else {
        formiddagItems.push(item);
      }
    }

    // Preserve order from GET /api/me/daily-log (parent sort_order / child override).
    const dagdelGroups = [
      { key: 'morgon',      items: sections['morgon'] || [] },
      { key: 'formiddag',   items: formiddagItems },
      { key: 'eftermiddag', items: eftermiddagItems },
      { key: 'kvall',       items: sections['kvall'] || [] },
      { key: 'natt',        items: sections['natt'] || [] },
    ];

    for (const group of dagdelGroups) {
      if (group.items.length === 0) continue; // hide empty sections
      const cfg = DAG_DEL_CONFIG[group.key];
      const doneCount = group.items.filter(i => i.completed).length;
      const totalCount = group.items.length;

      const progress = doneCount === 0 ? 'none' : doneCount === totalCount ? 'done' : 'partial';
      const currentKey = window.ChildTodayFun && ChildTodayFun.currentDagdelKey
        ? ChildTodayFun.currentDagdelKey()
        : null;
      const isCurrent = isToday && currentKey === group.key
        && window.ChildTodayFun && ChildTodayFun.isSamlingGateOn && ChildTodayFun.isSamlingGateOn();
      const isComplete = isToday && doneCount === totalCount && totalCount > 0
        && window.ChildTodayWarmth && ChildTodayWarmth.isSamlingGateOn && ChildTodayWarmth.isSamlingGateOn();
      const currentCls = isCurrent ? ' dagdel-section--current' : '';
      const completeCls = isComplete ? ' dagdel-section--complete' : '';
      const nowBadge = isCurrent
        ? '<span class="dagdel-now-badge" aria-hidden="true">' + cda('todayWarmth.nowBadge') + '</span>'
        : '';
      const completeFoot = isComplete
        ? '<div class="dagdel-complete-foot">' + ChildTodayWarmth.sectionCompleteLabel(group.key) + '</div>'
        : '';
      html += `<div class="dagdel-section${currentCls}${completeCls}" data-section="${group.key}" style="background:${cfg.bg};border:2px solid ${cfg.border};">
        <div class="dagdel-header" style="background:${cfg.headerBg};">
          <span class="dagdel-emoji">${cfg.emoji}</span>
          <span class="dagdel-label" style="color:${cfg.headerText};">${sectionLabel(group.key)}</span>
          ${nowBadge}
          <span class="dagdel-count" data-progress="${progress}" onclick="toggleNextInSection('${group.key}', event)" title="${cda('scheduleChrome.checkOffNextTitle')}">${doneCount}/${totalCount}</span>
        </div>
        <div class="dagdel-body">
          <div class="sortable-section space-y-3" data-sortable-section="${group.key}">`;

      for (const item of group.items) {
        html += renderActivityCard(item, isToday, null);
      }
      html += `</div>
        </div>
        ${completeFoot}
      </div>`;
    }

  } else {
    // ── NOW/NEXT/LATER timeline layout ────────────────────────

    const focusQuestMode = isTodayFocusLayer() && isToday && showNowNext &&
      !(window.ChildFirstStarMode && ChildFirstStarMode.isActive());

    // Determine NOW/NEXT/LATER status for each item.
    // If backend already filtered (now_next_filtered=true), use _nnl_status from API.
    // Otherwise, fall back to client-side classification.
    const timeStatusMap = {};
    if (backendFiltered) {
      // Backend tagged all items: done/now/next/later
      for (const item of items) {
        timeStatusMap[item.id] = item._nnl_status || 'now';
      }
    } else if (isToday && (showNowNext || focusQuestMode)) {
      // Client-side fallback: tag ALL items (done/now/next/later)
      let globalUnchecked = 0;
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        for (const item of sections[section]) {
          if (item.completed) {
            timeStatusMap[item.id] = 'done';
          } else {
            globalUnchecked++;
            if (globalUnchecked === 1) {
              timeStatusMap[item.id] = 'now';
            } else if (globalUnchecked === 2) {
              timeStatusMap[item.id] = 'next';
            } else {
              timeStatusMap[item.id] = 'later';
            }
          }
        }
      }
    }

    const filterActive = backendFiltered || (isToday && showNowNext) || focusQuestMode;

    if (filterActive) {
      // Timeline layout: completed history → NU → NÄSTA → SENARE
      const doneItems = [];
      const nowItems = [];
      const nextItems = [];
      const laterItems = [];
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        for (const item of sections[section]) {
          const status = timeStatusMap[item.id];
          if (status === 'done') doneItems.push(item);
          else if (status === 'now') nowItems.push(item);
          else if (status === 'next') nextItems.push(item);
          else if (status === 'later') laterItems.push(item);
        }
      }

      if (typeof window.renderNowNextLaterZones === 'function') {
        html += window.renderNowNextLaterZones({
          doneItems,
          nowItems,
          nextItems,
          laterItems,
          isToday,
        });
      }
    } else {
      // Normal section-grouped layout (non-filtered view for now_next_later on non-today)
      for (const section of sectionOrder) {
        if (!sections[section]) continue;
        html += `<div class="mb-6" data-section="${section}">
          <h3 class="text-sm font-heading font-bold text-text-soft uppercase tracking-wider mb-3">${getSectionLabel(section)}</h3>
          <div class="sortable-section space-y-3" data-sortable-section="${section}">`;
        for (const item of sections[section]) {
          html += renderActivityCard(item, isToday, null);
        }
        html += '</div></div>';
      }
    }
  }

  // Initialize SortableJS on section containers (if reorder is allowed)
  setTimeout(() => initChildSortable(), 50);

  // Celebration (today only — when all activities are completed)
  if (isToday && completed === total && total > 0) {
    const celebEmojis = ['🌟', '🎉', '⭐', '🏆', '🎈', '🌈', '🥳'];
    const mainEmoji = celebEmojis[Math.floor(Math.random() * celebEmojis.length)];
    const messages = Array.from({ length: 7 }, function (_, i) {
      return (typeof window.childCelebrationAllDoneMsg === 'function')
        ? childCelebrationAllDoneMsg(i)
        : cda('celebration.allDoneMsg' + (i + 1), null, '');
    });
    const msg = messages[Math.floor(Math.random() * messages.length)];
    html += `<div class="text-center py-10 bg-gradient-to-br from-gold-light to-mint rounded-2xl mt-4 celeb-slide" id="celebCard">
      <div class="text-7xl mb-4 celeb-emoji">${mainEmoji}</div>
      <h3 class="text-2xl font-heading font-bold text-navy mb-2">${cda('today.allDoneTitle', null, '')}</h3>
      <p class="text-text-soft text-base mb-3">${msg}</p>
      <div class="inline-flex items-center gap-2 bg-white/70 rounded-full px-5 py-2 font-heading font-bold text-navy">
        ⭐ ${completed > 1
          ? cda('today.activitiesDoneToday', { count: completed }, '')
          : cda('today.oneActivityDoneToday', null, '')}
      </div>
    </div>`;
    setTimeout(() => launchConfetti(), 200);
  }

  container.innerHTML = html;
  if (window.ChildTodayWarmth && ChildTodayWarmth.mountThemeDecal) {
    ChildTodayWarmth.mountThemeDecal();
  }
  // Start Time Timer ticks after DOM is updated
  initTimeTimers();
  if (window.ChildActivityTimer) {
    let nuItems = items.filter(function (i) { return i._nnl_status === 'now'; });
    if (!nuItems.length && data.now_next_filtered !== true) {
      const firstOpen = items.find(function (i) { return !i.completed; });
      if (firstOpen) nuItems = [firstOpen];
    }
    ChildActivityTimer.initForItems(nuItems);
  }

  // Auto-expand sub-steps for the NOW activity (first incomplete item with sub-steps)
  // so the child immediately sees what to do without extra taps.
  const allCards = container.querySelectorAll('[data-sub-step-count]');
  for (const card of allCards) {
    const count = parseInt(card.dataset.subStepCount || '0', 10);
    const itemId = card.dataset.itemId;
    if (count > 0 && itemId && !subStepExpanded[itemId]) {
      // Auto-expand: simulate the expand click
      const btn = document.getElementById('expand-btn-' + itemId);
      if (btn) {
        expandSubSteps(new Event('click'), itemId);
      }
      break; // Only auto-expand the first one (the NOW item)
    }
  }
  if (window.ChildTodayTasks) ChildTodayTasks.afterRender(data, isToday);
}

// ── NOW card (large, featured) ──────────────────────────

function renderNowCard(item, canToggle) {
  if (window.ChildSevenQuestions && typeof ChildSevenQuestions.tryRender === 'function') {
    const teacchHtml = ChildSevenQuestions.tryRender(item, canToggle);
    if (teacchHtml) {
      if (window.ChildPackageNav) ChildPackageNav.setNavHidden(true);
      return teacchHtml;
    }
  }
  if (window.ChildPhotoCards && ChildPhotoCards.hasPhoto(item)) {
    return ChildPhotoCards.renderNowCard(item, canToggle);
  }
  if (window.ChildPackageNav) ChildPackageNav.setNavHidden(false);

  const isDone = item.completed;
  const timeStr = item.start_time ? (item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time) : '';
  const checkAttr = canToggle && !isDone ? `onclick="toggleItem('${item.id}', false)"` : '';
  const hasSubSteps = (item.sub_step_count || 0) > 0;
  const subStepCount = item.sub_step_count || 0;
  const cachedSteps = subStepCache[item.id];
  const subDone = cachedSteps ? cachedSteps.filter(s => s.completed).length : 0;
  const isExpanded = !!subStepExpanded[item.id];

  // Time Timer: show only if visualTimer is on, item is not done, and has start+end
  const showTimer = visualTimer && !isDone && item.start_time && item.end_time;

  let transitionHtml = '';
  if (transitionSupportEnabled && !isDone && item.start_time && window.TransitionSupport) {
    const tr = TransitionSupport.getTransitionFromStartTime(item.start_time, {
      leadMinutes: transitionLeadMinutes,
    });
    transitionHtml = `<div class="transition-inline" id="transition-${item.id}" data-start="${item.start_time}" aria-live="polite">${escHtml(tr.label)}</div>`;
  }

  const timerHtml = showTimer ? `
    <div class="time-timer-wrap" id="timer-${item.id}" aria-hidden="true">
      <svg class="time-timer-svg" width="52" height="52" viewBox="0 0 36 36">
        <circle class="time-timer-track" cx="18" cy="18" r="15.9"/>
        <circle class="time-timer-fill" id="timer-fill-${item.id}"
          cx="18" cy="18" r="15.9"
          stroke-dasharray="100 0"
          data-start="${item.start_time}"
          data-end="${item.end_time}"/>
      </svg>
    </div>` : '';

  const activityTimerHtml = (window.ChildActivityTimer && ChildActivityTimer.renderBlock)
    ? ChildActivityTimer.renderBlock(item)
    : '';

  const nowColorCls = getChildColorClass(item.name);
  return `
    <div class="now-card ${isDone ? 'done' : ''} ${nowColorCls}" id="card-${item.id}"
         data-feedback-for="${item.feedback_for || 'both'}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         data-sub-step-count="${subStepCount}">
      <div class="now-badge"><div class="pulse-dot"></div> ${cda('today.zoneNow')}</div>
      ${transitionHtml}
      <div class="now-activity">
        <div class="now-emoji">${window.ActivityVisual ? ActivityVisual.inline(item) : (item.icon || '⭐')}</div>
        <div class="now-details">
          <div class="now-title ${isDone ? 'line-through text-text-soft' : ''}">${forDigGoalBadgeHtml(item)} ${escHtml(item.display_name || item.name)}</div>
          <div class="flex items-center gap-2 mt-0.5">
            ${timeStr && !hideClock ? `<span class="now-time"><span>🕐</span> ${timeStr}</span>` : ''}
            ${item.star_value > 0 ? `<span class="inline-flex items-center gap-0.5 text-sm font-bold" style="color:#F5A623;">${'⭐'.repeat(Math.min(item.star_value, 5))}</span>` : ''}
            ${hasSubSteps ? `<span class="substep-progress ${subDone === subStepCount ? 'all-done' : ''}" id="substep-badge-${item.id}">${subDone}/${subStepCount}</span>` : ''}
          </div>
        </div>
        ${activityTimerHtml}
        ${timerHtml}
        ${isDone
          ? `<div class="now-check" style="background:#22C55E; border-color:#22C55E;"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>`
          : `<button class="now-check" ${checkAttr}></button>`
        }
      </div>
      ${hasSubSteps ? `
      <div class="mt-3 pt-2 border-t" style="border-color:rgba(245,166,35,0.25)" onclick="event.stopPropagation()">
        <div style="position:relative;display:inline-block;">
          <button class="expand-btn ${isExpanded ? 'open' : ''} ${!isExpanded && !substepIntroState.seen ? 'intro-hint' : ''}" id="expand-btn-${item.id}"
                  onclick="expandSubSteps(event, '${item.id}')">
            ${substepsBtnLabel()} <span class="chevron">▾</span>
          </button>
          ${!isExpanded && !substepIntroState.seen ? `<div class="intro-tooltip" id="intro-tooltip-${item.id}">${cda('scheduleChrome.substepIntro')}</div>` : ''}
        </div>
        <div class="substep-container ${isExpanded ? 'expanded' : ''}" id="substeps-${item.id}">
          ${isExpanded && cachedSteps ? renderSubStepListHtml(item.id, cachedSteps) : ''}
        </div>
      </div>` : ''}
    </div>`;
}

// ── DONE history card (compact, dimmed, non-interactive) ───

function renderDoneHistoryCard(item) {
  if (window.ChildPhotoCards && ChildPhotoCards.hasPhoto(item)) {
    return ChildPhotoCards.renderDoneHistoryCard(item);
  }
  const timeStr = item.start_time || '';
  return `
    <div class="nl-card done" style="opacity:0.55; background:#F0FDF4; border-color:#BBF7D0; pointer-events:none;" id="card-${item.id}"
         data-item-id="${item.id}">
      <div style="width:32px;height:32px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
      </div>
      <div class="nl-emoji" style="background:#E0F5EC;">${window.ActivityVisual ? ActivityVisual.inline(item) : (item.icon || '⭐')}</div>
      <div class="nl-info">
        <div class="nl-title" style="text-decoration:line-through; color:#6B7280;">${escHtml(item.display_name || item.name)}</div>
        ${timeStr && !hideClock ? `<div class="nl-time"><span>🕐</span> ${timeStr}</div>` : ''}
      </div>
    </div>`;
}

// ── NEXT / LATER / PAST cards (compact row) ──────────────

function renderNLCard(item, view, canToggle) {
  const isDone = item.completed;
  const timeStr = item.start_time || '';
  const isPast = view === 'past';
  const chipClass = isPast ? 'chip-redan' : view === 'next' ? 'chip-next' : 'chip-later';
  const chipLabel = isPast
    ? cda('today.chipPast')
    : view === 'next'
      ? cda('today.zoneNext')
      : cda('today.zoneLater');
  const cardClass = view === 'next' ? 'next-card' : view === 'past' ? 'past-card' : 'later-card';
  const clickAttr = canToggle && !isDone ? `onclick="toggleItem('${item.id}', ${isDone})"` : '';

  const nlColorCls = getChildColorClass(item.name);
  return `
    <div class="nl-card ${cardClass} ${isDone ? 'done' : ''} ${nlColorCls}" id="card-${item.id}"
         data-feedback-for="${item.feedback_for || 'both'}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         ${clickAttr}>
      ${isPast ? '' : `<div class="nl-chip ${chipClass}">${chipLabel}</div>`}
      ${isPast ? `<div class="nl-chip chip-redan">Redan</div>` : ''}
      <div class="nl-emoji">${window.ActivityVisual ? ActivityVisual.inline(item) : (item.icon || '⭐')}</div>
      <div class="nl-info">
        <div class="nl-title ${isDone ? 'line-through' : ''}">${escHtml(item.display_name || item.name)}</div>
        ${timeStr && !hideClock ? `<div class="nl-time"><span>🕐</span> ${timeStr}</div>` : ''}
      </div>
      ${isDone
        ? `<div style="width:32px;height:32px;background:#22C55E;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>`
        : ''
      }
    </div>`;
}

function renderActivityCard(item, isToday, timeStatus) {
  if (window.ChildPhotoCards && ChildPhotoCards.hasPhoto(item)) {
    return ChildPhotoCards.renderActivityCard(item, isToday, timeStatus);
  }
  const isDone = item.completed;
  // In filtered NOW/NEXT/LATER view, only NOW cards are toggleable when sequential mode is on.
  const canToggle = activityCanToggle(isToday, isDone, timeStatus);
  const timeStr = item.start_time ? (item.end_time ? `${item.start_time}–${item.end_time}` : item.start_time) : '';
  const rating = itemRatings[item.id];
  const feedbackFor = item.feedback_for || 'both';
  const isNext = timeStatus === 'next';
  const isLater = timeStatus === 'later';
  const isNextOrLater = timeStatus === 'next' || timeStatus === 'later';
  let ratingHtml = '';
  if (rating && rating.child_score) {
    ratingHtml = `<span class="text-xs ml-1 font-semibold" title="${cda('today.ratingYour')}" style="color:#F5A623">${rating.child_score}/10</span>`;
    if (rating.parent_score) {
      ratingHtml += `<span class="text-xs text-text-soft ml-1" title="${cda('today.ratingParent')}">👨‍👩‍👧 ${'⭐'.repeat(rating.parent_score)}</span>`;
    }
  } else if (rating && rating.parent_score) {
    ratingHtml = `<span class="text-xs ml-1 text-text-soft" title="${cda('today.ratingParent')}">👨‍👩‍👧 ${'⭐'.repeat(rating.parent_score)}</span>`;
  }

  // NU/NÄSTA/SEDAN badge (only for today's view when feature is enabled)
  let badgeHtml = '';
  if (isNext) {
    badgeHtml = '<span class="inline-block text-[0.62rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE9FF] text-[#6B50F5] mb-1">▶ ' + cda('scheduleChrome.nextBadge') + '</span>';
  } else if (isLater && !isDone) {
    badgeHtml = '<span class="inline-block text-[0.62rem] font-bold font-heading uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] mb-1">' + cda('today.zoneLater') + '</span>';
  }

  const hasSubSteps = (item.sub_step_count || 0) > 0;
  const subStepCount = item.sub_step_count || 0;
  // Pre-compute completed sub-steps from cache (updated optimistically)
  const cachedSteps = subStepCache[item.id];
  const subDone = cachedSteps ? cachedSteps.filter(s => s.completed).length : 0;
  const isExpanded = !!subStepExpanded[item.id];

  const activityTimerHtml = (window.ChildActivityTimer && ChildActivityTimer.renderBlock)
    ? ChildActivityTimer.renderBlock(item)
    : '';

  const actColorCls = getChildColorClass(item.name);
  return `
    <div class="activity-card ${isDone ? 'done' : ''} ${isLater && !isDone ? 'opacity-60' : ''} ${actColorCls} bg-white rounded-xl p-4 shadow-sm border-2 ${isDone ? 'border-green-200' : isNext ? 'border-[#6B50F5]/30' : 'border-transparent'} ${canToggle ? 'cursor-pointer' : ''} group"
         id="card-${item.id}"
         data-feedback-for="${feedbackFor}"
         data-item-icon="${item.icon || '⭐'}"
         data-item-name="${escHtml(item.name)}"
         data-item-id="${item.id}"
         data-sub-step-count="${subStepCount}"
         ${canToggle ? `onclick="toggleItem('${item.id}', ${isDone})"` : ''}>
      ${badgeHtml ? `<div class="mb-1">${badgeHtml}</div>` : ''}
      <div class="flex items-center gap-3">
        ${allowChildReorder ? `<div class="drag-handle shrink-0 flex items-center justify-center w-11 h-11 cursor-grab active:cursor-grabbing text-text-soft hover:text-navy active:text-navy transition-colors select-none touch-none" title="${cda('scheduleChrome.dragReorderTitle')}" aria-label="${cda('scheduleChrome.dragReorderAria')}">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="7" cy="4" r="1.5"/><circle cx="13" cy="4" r="1.5"/>
            <circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
            <circle cx="7" cy="16" r="1.5"/><circle cx="13" cy="16" r="1.5"/>
          </svg>
        </div>` : ''}
        ${!isNextOrLater || isDone ? `<div class="card-check w-12 h-12 rounded-full border-2 ${isDone ? 'bg-green-500 border-green-500' : 'border-lavender'} flex items-center justify-center flex-shrink-0">
          ${isDone ? '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' : ''}
        </div>` : ''}
        <div class="text-3xl flex-shrink-0">${window.ActivityVisual ? ActivityVisual.inline(item) : (item.icon || '⭐')}</div>
        <div class="flex-1 min-w-0">
          <h4 class="font-heading font-bold text-base ${isDone ? 'line-through text-text-soft' : 'text-navy'} truncate">${forDigGoalBadgeHtml(item)} ${escHtml(item.display_name || item.name)}</h4>
          <div class="flex items-center flex-wrap gap-1 mt-0.5">
            ${timeStr && !hideClock ? `<span class="text-xs text-text-soft">${timeStr}</span>` : ''}
            ${item.star_value > 0 ? `<span class="inline-flex items-center gap-0.5 text-xs font-bold" style="color:#F5A623;">${'⭐'.repeat(Math.min(item.star_value, 5))}</span>` : ''}
            ${ratingHtml}
            ${hasSubSteps ? `<span class="substep-progress ${subDone === subStepCount ? 'all-done' : ''}" id="substep-badge-${item.id}">${subDone}/${subStepCount}</span>` : ''}
          </div>
        </div>
        ${activityTimerHtml}
      </div>
      ${hasSubSteps ? `
      <div class="mt-3 pt-2 border-t border-lavender/50" onclick="event.stopPropagation()">
        <div style="position:relative;display:inline-block;">
          <button class="expand-btn ${isExpanded ? 'open' : ''} ${!isExpanded && !substepIntroState.seen ? 'intro-hint' : ''}" id="expand-btn-${item.id}"
                  onclick="expandSubSteps(event, '${item.id}')">
            ${substepsBtnLabel()} <span class="chevron">▾</span>
          </button>
          ${!isExpanded && !substepIntroState.seen ? `<div class="intro-tooltip" id="intro-tooltip-${item.id}">${cda('scheduleChrome.substepIntro')}</div>` : ''}
        </div>
        <div class="substep-container ${isExpanded ? 'expanded' : ''}" id="substeps-${item.id}">
          ${isExpanded && cachedSteps ? renderSubStepListHtml(item.id, cachedSteps) : ''}
        </div>
      </div>` : ''}
    </div>`;
}

  window.forDigGoalBadgeHtml = forDigGoalBadgeHtml;
  window.getTimeMinutes = getTimeMinutes;
  window.getCurrentTimeHHMM = getCurrentTimeHHMM;
  window.classifyActivities = classifyActivities;
  window.renderActivities = renderActivities;
  window.renderNowCard = renderNowCard;
  window.renderDoneHistoryCard = renderDoneHistoryCard;
  window.renderNLCard = renderNLCard;
  window.renderActivityCard = renderActivityCard;
  window.activityCanToggle = activityCanToggle;
})();
