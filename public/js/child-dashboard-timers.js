/**
 * Child dashboard Time Timer SVG countdown (Fas 8 F3c).
 * Reads visualTimer from host; getTimeMinutes from child-dashboard-activities.js.
 */
(function () {
  'use strict';

  let _timerInterval = null;
  const _timerDoneFired = new Map();

  function initTimeTimers() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _timerDoneFired.clear();

    const shouldTick = visualTimer || transitionSupportEnabled;
    if (!shouldTick) return;

    function tick() {
      const wraps = visualTimer ? document.querySelectorAll('.time-timer-wrap[id]') : [];
      const hasTransitions = transitionSupportEnabled && document.querySelectorAll('.transition-inline[id]').length > 0;
      if (wraps.length === 0 && !hasTransitions) return;

      const nowMins = (() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      })();

      wraps.forEach((wrap) => {
        const fill = wrap.querySelector('.time-timer-fill');
        if (!fill) return;

        const itemId = wrap.id.replace('timer-', '');
        const startMins = getTimeMinutes(fill.dataset.start);
        const endMins = getTimeMinutes(fill.dataset.end);
        if (startMins === null || endMins === null || endMins <= startMins) return;

        const total = endMins - startMins;
        const elapsed = Math.max(0, Math.min(total, nowMins - startMins));
        const remaining = 1 - elapsed / total;
        const progress = Math.max(0, remaining * 100);

        fill.setAttribute('stroke-dasharray', `${progress.toFixed(1)} ${(100 - progress).toFixed(1)}`);

        if (remaining > 0.5) {
          fill.style.stroke = '#22C55E';
        } else if (remaining > 0.2) {
          fill.style.stroke = '#F97316';
        } else {
          fill.style.stroke = '#EF4444';
        }

        if (remaining <= 0.01 && !_timerDoneFired.get(itemId)) {
          _timerDoneFired.set(itemId, true);
          if (window.Platform && window.Platform.haptics) {
            window.Platform.haptics.medium();
          }
        }
      });

      if (hasTransitions) {
        document.querySelectorAll('.transition-inline[id]').forEach((trEl) => {
          const startAttr = trEl.dataset.start;
          if (!startAttr || !window.TransitionSupport) return;
          const tr = TransitionSupport.getTransitionFromStartTime(startAttr, {
            leadMinutes: transitionLeadMinutes,
          });
          if (trEl.textContent !== tr.label) trEl.textContent = tr.label;
        });
      }
    }

    tick();
    _timerInterval = setInterval(tick, 5000);
  }

  window.initTimeTimers = initTimeTimers;
})();
