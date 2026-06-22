/**
 * child-star-feedback.js — KX4 extra-stjärnor feedback overlay (barnmeny v2.5).
 */
(function () {
  'use strict';

  var _lastGrantId = null;

  function showOverlay(starCount, reason) {
    var existing = document.getElementById('childStarFeedbackOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'childStarFeedbackOverlay';
    overlay.className = 'child-star-feedback-overlay';
    overlay.setAttribute('role', 'status');
    overlay.innerHTML =
      '<div class="child-star-feedback-card">' +
      '<div class="child-star-feedback-burst" aria-hidden="true">✨</div>' +
      '<p class="child-star-feedback-count">+' + (starCount || 1) + ' ⭐</p>' +
      '<p class="child-star-feedback-reason">' + (typeof window.escHtml === 'function' ? window.escHtml(reason || 'Bonus-stjärnor!') : String(reason || 'Bonus-stjärnor!').replace(/&/g, '&amp;').replace(/</g, '&lt;')) + '</p>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add('is-visible');
    });
    setTimeout(function () {
      overlay.classList.remove('is-visible');
      setTimeout(function () { overlay.remove(); }, 400);
    }, 2200);
  }

  async function onStarGranted() {
    try {
      var data = await Auth.api('/api/me/manual-stars');
      var grants = (data && data.grants) ? data.grants : [];
      if (!grants.length) return;
      var latest = grants[0];
      if (latest.id && latest.id === _lastGrantId) return;
      _lastGrantId = latest.id || latest.created_at;
      showOverlay(latest.star_count, latest.reason);
    } catch (_) { /* silent */ }
  }

  window.ChildStarFeedback = {
    showOverlay: showOverlay,
    onStarGranted: onStarGranted,
  };
})();
