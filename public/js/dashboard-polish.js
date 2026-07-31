/**
 * dashboard-polish.js — Sprint 26: fade-in barnkort efter laddning.
 */
(function () {
  'use strict';

  function markReady() {
    const grid = document.getElementById('childCardsGrid');
    if (grid) grid.classList.add('dash-grid-ready');
  }

  function observeGrid() {
    const grid = document.getElementById('childCardsGrid');
    if (!grid || typeof MutationObserver === 'undefined') {
      setTimeout(markReady, 400);
      return;
    }
    const obs = new MutationObserver(function () {
      if (grid.children.length > 0 && !grid.textContent.includes('Laddar')) {
        markReady();
        obs.disconnect();
      }
    });
    obs.observe(grid, { childList: true, subtree: true });
    setTimeout(function () {
      markReady();
      obs.disconnect();
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeGrid);
  } else {
    observeGrid();
  }
})();
