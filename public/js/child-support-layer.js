/**
 * child-support-layer.js — Adaptive substep rendering skeleton (barnmeny v2 Sprint 2/4).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function renderSubsteps(container, substeps, mode) {
    if (!container || !substeps || !substeps.length) return;
    const renderMode = mode || 'compact';
    container.setAttribute('data-support-mode', renderMode);
    container.innerHTML = substeps
      .map(function (step, idx) {
        return (
          '<div class="child-support-step p-3 bg-white rounded-xl border border-lavender mb-2" data-step-index="' +
          idx +
          '">' +
          '<p class="text-xs text-text-soft mb-1">' +
          (typeof window.cpt === 'function'
            ? cpt('steps.progress', { current: idx + 1, total: substeps.length })
            : '') +
          '</p>' +
          '<p class="font-semibold text-navy">' +
          esc(step.label || step.title || '') +
          '</p></div>'
        );
      })
      .join('');
  }

  function bindSubstepClicks(container) {
    if (!container || container._substepBound) return;
    container._substepBound = true;
    container.addEventListener('click', function (e) {
      const row = e.target.closest('[data-substep-item]');
      if (!row || typeof window.toggleSubStep !== 'function') return;
      const itemId = row.getAttribute('data-substep-item');
      const stepId = row.getAttribute('data-substep-id');
      const rowDone = row.getAttribute('data-substep-done') === '1';
      let isDone = rowDone;
      if (window.subStepCache && window.subStepCache[itemId]) {
        const step = window.subStepCache[itemId].find(function (s) {
          return String(s.id) === String(stepId);
        });
        if (step) isDone = !!step.completed;
      }
      window.toggleSubStep(e, itemId, stepId, isDone);
    });
  }

  function substepsProgress(done, total, allDone) {
    const label = (typeof window.cpt === 'function'
      ? cpt('steps.substepsDone', { done: done, total: total })
      : done + '/' + total);
    return (allDone ? '✅' : '📋') + ' ' + label;
  }

  function renderInteractiveSubsteps(container, itemId, steps) {
    if (!container || !steps) return;
    const done = steps.filter(function (s) { return s.completed; }).length;
    const total = steps.length;
    const allDone = done === total && total > 0;
    let html = '<div style="padding: 6px 8px 2px 8px;">';
    if (total > 0) {
      html += '<div class="substep-progress ' + (allDone ? 'all-done' : '') + '" style="display:inline-block;margin-bottom:6px;">' +
        substepsProgress(done, total, allDone) + '</div>';
    }
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isChecked = !!step.completed;
      html +=
        '<div class="substep-row" role="button" tabindex="0" aria-pressed="' + (isChecked ? 'true' : 'false') + '" data-substep-item="' + esc(itemId) + '" data-substep-id="' + esc(step.id) + '" data-substep-done="' + (isChecked ? '1' : '0') + '" id="substep-row-' + esc(step.id) + '">' +
        '<div class="substep-check ' + (isChecked ? 'checked' : '') + '" id="substep-check-' + esc(step.id) + '">' +
        (isChecked ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' : '') +
        '</div>' +
        (step.icon ? '<span style="font-size:1.3rem;flex-shrink:0;">' + esc(step.icon) + '</span>' : '') +
        '<span class="substep-name ' + (isChecked ? 'checked' : '') + '" id="substep-name-' + esc(step.id) + '">' + esc(step.display_name || step.name) + '</span></div>';
    }
    html += '</div>';
    container.innerHTML = html;
    bindSubstepClicks(container);
  }

  window.ChildSupportLayer = {
    renderSubsteps: renderSubsteps,
    renderInteractiveSubsteps: renderInteractiveSubsteps,
  };
})();
