/**
 * Child dashboard Time Timer SVG countdown (Fas 8 F3c).
 * Reads visualTimer + getTimeMinutes from child-dashboard.js host.
 */
(function () {
  'use strict';

let _timerInterval = null;
const _timerDoneFired = new Map(); // itemId → true (haptic already fired for this timer completion)

function initTimeTimers() {
  // Clear any previous ticker
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  _timerDoneFired.clear();
  if (!visualTimer) return;

  function tick() {
    const wraps = document.querySelectorAll('.time-timer-wrap[id]');
    if (wraps.length === 0) return;

    const nowMins = (() => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    })();

    wraps.forEach(wrap => {
      const fill = wrap.querySelector('.time-timer-fill');
      if (!fill) return;

      const itemId = wrap.id.replace('timer-', '');
      const startMins = getTimeMinutes(fill.dataset.start);
      const endMins   = getTimeMinutes(fill.dataset.end);
      if (startMins === null || endMins === null || endMins <= startMins) return;

      const total = endMins - startMins;
      const elapsed = Math.max(0, Math.min(total, nowMins - startMins));
      const remaining = 1 - elapsed / total; // 1 = full, 0 = done
      const progress = Math.max(0, remaining * 100);

      // stroke-dasharray = "progress gap"
      fill.setAttribute('stroke-dasharray', `${progress.toFixed(1)} ${(100 - progress).toFixed(1)}`);

      // Colour shift: green → orange → red as time runs out
      if (remaining > 0.5) {
        fill.style.stroke = '#22C55E'; // plenty of time
      } else if (remaining > 0.2) {
        fill.style.stroke = '#F97316'; // getting close
      } else {
        fill.style.stroke = '#EF4444'; // urgent
      }

      // Haptic: fire once when timer hits 0 (remaining < 1%)
      if (remaining <= 0.01 && !_timerDoneFired.get(itemId)) {
        _timerDoneFired.set(itemId, true);
        if (window.Platform && window.Platform.haptics) {
          window.Platform.haptics.medium();
        }
      }
    });
  }

  tick(); // immediate first pass
  _timerInterval = setInterval(tick, 5000); // update every 5s
}


  window.initTimeTimers = initTimeTimers;
})();
