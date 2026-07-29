/**
 * Child dashboard sub-steps + drag reorder (Fas 8 F3f).
 * expandSubSteps, toggleSubStep, renderSubStepListHtml, initChildSortable.
 * Reads host state: subStepCache, subStepExpanded, allowChildReorder, currentDate.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  let _childSortables = [];
  const _expandLoading = {}; // itemId -> true while a fetch is in-flight

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function initChildSortable() {
    if (!allowChildReorder) {
      _childSortables.forEach(s => s.destroy());
      _childSortables = [];
      document.querySelectorAll('.activity-card[draggable]').forEach(el => el.removeAttribute('draggable'));
      return;
    }

    _childSortables.forEach(s => s.destroy());
    _childSortables = [];

    document.querySelectorAll('.drag-handle').forEach(handle => {
      handle.addEventListener('click', e => e.stopPropagation());
    });

    document.querySelectorAll('.sortable-section').forEach(el => {
      const s = new Sortable(el, {
        animation: 200,
        handle: '.drag-handle',
        draggable: '.activity-card',
        forceFallback: true,
        fallbackDelay: 0,
        fallbackTolerance: 3,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: async function (evt) {
          if (evt.from !== evt.to) return;
          const cards = Array.from(evt.from.querySelectorAll('.activity-card'));
          const ordered_ids = cards.map(c => c.dataset.itemId).filter(Boolean);
          if (ordered_ids.length === 0) return;
          try {
            await Auth.api('/api/me/daily-log/reorder', {
              method: 'PUT',
              body: JSON.stringify({ ordered_item_ids: ordered_ids }),
            });
            await loadDay(currentDate, false);
          } catch (err) {
            showToast(t('today.saveFailed'), true);
            await loadDay(currentDate, false);
          }
        },
      });
      _childSortables.push(s);
    });
  }

  async function expandSubSteps(event, itemId) {
    event.stopPropagation();
    event.preventDefault();

    if (_expandLoading[itemId]) return;

    const container = document.getElementById('substeps-' + itemId);
    const btn = document.getElementById('expand-btn-' + itemId);
    if (!container || !btn) return;

    const isExpanded = subStepExpanded[itemId];

    if (!isExpanded) {
      if (!_substepIntroSeen) {
        _substepIntroSeen = true;
        localStorage.setItem('substepIntroSeen', '1');
        document.querySelectorAll('.intro-tooltip').forEach(el => el.remove());
        document.querySelectorAll('.expand-btn.intro-hint').forEach(el => el.classList.remove('intro-hint'));
      }

      if (!subStepCache[itemId]) {
        _expandLoading[itemId] = true;
        btn.classList.add('loading');
        btn.textContent = '⏳';
        try {
          const data = await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps`);
          subStepCache[itemId] = data.sub_steps || [];
        } catch (err) {
          console.error('Sub-steps load error:', err);
          showToast(t('today.saveFailed'), true);
          btn.innerHTML = `📋 ${t('steps.substepsLabel')} <span class="chevron">▾</span>`;
          btn.classList.remove('loading');
          _expandLoading[itemId] = false;
          return;
        }
        btn.classList.remove('loading');
        _expandLoading[itemId] = false;
      }
      renderSubStepList(itemId);
      subStepExpanded[itemId] = true;
      container.classList.add('expanded');
      btn.classList.add('open');
      btn.innerHTML = `📋 ${t('steps.substepsLabel')} <span class="chevron">▾</span>`;
    } else {
      subStepExpanded[itemId] = false;
      container.classList.remove('expanded');
      btn.classList.remove('open');
    }
  }

  function substepsProgress(done, total, allDone) {
    return (allDone ? '✅' : '📋') + ' ' + t('steps.substepsDone', { done: done, total: total });
  }

  function renderSubStepListHtml(itemId, steps) {
    const done = steps.filter(s => s.completed).length;
    const total = steps.length;
    const allDone = done === total && total > 0;

    let html = `<div style="padding: 6px 8px 2px 8px;">`;
    if (total > 0) {
      html += `<div class="substep-progress ${allDone ? 'all-done' : ''}" style="display:inline-block;margin-bottom:6px;">
      ${substepsProgress(done, total, allDone)}
    </div>`;
    }
    for (const step of steps) {
      const isChecked = !!step.completed;
      html += `
      <div class="substep-row" onclick="toggleSubStep(event, '${itemId}', '${step.id}', ${isChecked})" id="substep-row-${step.id}">
        <div class="substep-check ${isChecked ? 'checked' : ''}" id="substep-check-${step.id}">
          ${isChecked ? `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` : ''}
        </div>
        ${step.icon ? `<span style="font-size:1.3rem;flex-shrink:0;">${step.icon}</span>` : ''}
        <span class="substep-name ${isChecked ? 'checked' : ''}" id="substep-name-${step.id}">${escHtml(step.display_name || step.name)}</span>
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  function renderSubStepList(itemId) {
    const steps = subStepCache[itemId] || [];
    const container = document.getElementById('substeps-' + itemId);
    if (!container) return;
    if (window.ChildSupportLayer && typeof ChildSupportLayer.renderInteractiveSubsteps === 'function') {
      ChildSupportLayer.renderInteractiveSubsteps(container, itemId, steps);
      return;
    }
    container.innerHTML = renderSubStepListHtml(itemId, steps);
  }

  async function toggleSubStep(event, itemId, subStepId, isCurrentlyDone) {
    event.stopPropagation();
    const action = isCurrentlyDone ? 'uncomplete' : 'complete';

    if (subStepCache[itemId]) {
      const step = subStepCache[itemId].find(s => s.id === subStepId);
      if (step) {
        step.completed = !isCurrentlyDone;
        step.completed_at = !isCurrentlyDone ? new Date().toISOString() : null;
      }
    }
    renderSubStepList(itemId);

    try {
      await Auth.api(`/api/me/daily-log-items/${itemId}/sub-steps/${subStepId}/${action}`, { method: 'PUT' });
      updateSubStepProgressBadge(itemId);

      const steps = subStepCache[itemId] || [];
      const allDone = steps.length > 0 && steps.every(s => s.completed);
      const card = document.getElementById('card-' + itemId);
      const mainIsDone = card && card.classList.contains('done');

      if (allDone && !mainIsDone) {
        const completeData = await Auth.api(`/api/me/daily-log-items/${itemId}/complete`, { method: 'PUT' });
        if (window.MetaAppEvents && typeof MetaAppEvents.handleServerMilestones === 'function') {
          MetaAppEvents.handleServerMilestones(completeData && completeData.meta_milestones);
        }
        if (window.Platform && window.Platform.haptics) window.Platform.haptics.medium();
        await loadDay(currentDate, false);
      } else if (!allDone && mainIsDone) {
        await Auth.api(`/api/me/daily-log-items/${itemId}/uncomplete`, { method: 'PUT' });
        await loadDay(currentDate, false);
      }
    } catch (err) {
      console.error('Sub-step toggle error:', err);
      if (subStepCache[itemId]) {
        const step = subStepCache[itemId].find(s => s.id === subStepId);
        if (step) { step.completed = isCurrentlyDone; }
      }
      renderSubStepList(itemId);
      showToast(t('today.saveFailed'), true);
    }
  }

  function updateSubStepProgressBadge(itemId) {
    const steps = subStepCache[itemId] || [];
    const done = steps.filter(s => s.completed).length;
    const total = steps.length;
    const el = document.getElementById('substep-badge-' + itemId);
    if (el) {
      const allDone = done === total && total > 0;
      el.textContent = `${done}/${total}`;
      el.className = `substep-progress ${allDone ? 'all-done' : ''}`;
    }
  }

  window.initChildSortable = initChildSortable;
  window.expandSubSteps = expandSubSteps;
  window.renderSubStepListHtml = renderSubStepListHtml;
  window.renderSubStepList = renderSubStepList;
  window.toggleSubStep = toggleSubStep;
  window.updateSubStepProgressBadge = updateSubStepProgressBadge;
})();
