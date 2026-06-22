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

  window.ChildSupportLayer = {
    renderSubsteps: renderSubsteps,
  };
})();
