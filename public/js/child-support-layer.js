/**
 * child-support-layer.js — Adaptive substep rendering skeleton (barnmeny v2 Sprint 2/4).
 */
(function () {
  'use strict';

  function renderSubsteps(container, substeps, mode) {
    if (!container || !substeps || !substeps.length) return;
    var renderMode = mode || 'compact';
    container.setAttribute('data-support-mode', renderMode);
    container.innerHTML = substeps
      .map(function (step, idx) {
        return (
          '<div class="child-support-step p-3 bg-white rounded-xl border border-lavender mb-2" data-step-index="' +
          idx +
          '">' +
          '<p class="text-xs text-text-soft mb-1">Steg ' +
          (idx + 1) +
          ' av ' +
          substeps.length +
          '</p>' +
          '<p class="font-semibold text-navy">' +
          (step.label || step.title || '') +
          '</p></div>'
        );
      })
      .join('');
  }

  function renderInteractiveSubsteps(container, itemId, steps) {
    if (!container || !steps) return;
    var esc = typeof window.escHtml === 'function' ? window.escHtml : function (s) { return String(s || ''); };
    var done = steps.filter(function (s) { return s.completed; }).length;
    var total = steps.length;
    var allDone = done === total && total > 0;
    var html = '<div style="padding: 6px 8px 2px 8px;">';
    if (total > 0) {
      html += '<div class="substep-progress ' + (allDone ? 'all-done' : '') + '" style="display:inline-block;margin-bottom:6px;">' +
        (allDone ? '✅' : '📋') + ' ' + done + '/' + total + ' klara</div>';
    }
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      var isChecked = !!step.completed;
      html +=
        '<div class="substep-row" onclick="toggleSubStep(event, \'' + itemId + '\', \'' + step.id + '\', ' + isChecked + ')" id="substep-row-' + step.id + '">' +
        '<div class="substep-check ' + (isChecked ? 'checked' : '') + '" id="substep-check-' + step.id + '">' +
        (isChecked ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>' : '') +
        '</div>' +
        (step.icon ? '<span style="font-size:1.3rem;flex-shrink:0;">' + step.icon + '</span>' : '') +
        '<span class="substep-name ' + (isChecked ? 'checked' : '') + '" id="substep-name-' + step.id + '">' + esc(step.name) + '</span></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  window.ChildSupportLayer = {
    renderSubsteps: renderSubsteps,
    renderInteractiveSubsteps: renderInteractiveSubsteps,
  };
})();
