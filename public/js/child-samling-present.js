/**
 * child-samling-present.js — Min samling vy (Fas B, gate: barnets_samling).
 * B1: lugn shell med sektioner för glas, trofévägg och streak (innehåll i B2–B4).
 */
(function () {
  'use strict';

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function renderHeader() {
    return (
      '<header class="bsp-header" aria-label="Min samling">' +
        '<p class="bsp-kicker" aria-hidden="true">🏆</p>' +
        '<h2 class="bsp-title">Min samling</h2>' +
        '<p class="bsp-subtitle">Titta vad du har samlat</p>' +
      '</header>'
    );
  }

  function renderGlassSection() {
    return (
      '<section class="bsp-section bsp-glass" aria-label="Stjärnglas">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">✨</span>' +
          '<h3 class="bsp-section-title">Stjärnglaset</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' +
          esc('Här fylls ditt glas med alla stjärnor du tjänat — de minskar aldrig.') +
        '</p>' +
        '<div class="bsp-stub-card" aria-hidden="true">' +
          '<span class="bsp-stub-glass">🫙</span>' +
        '</div>' +
      '</section>'
    );
  }

  function renderWallSection() {
    return (
      '<section class="bsp-section bsp-wall" aria-label="Trofévägg">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🏅</span>' +
          '<h3 class="bsp-section-title">Trofévägg</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' +
          esc('Här kommer dina medaljer att synas när du samlar fler stjärnor.') +
        '</p>' +
      '</section>'
    );
  }

  function renderStreakSection() {
    return (
      '<section class="bsp-section bsp-streak" aria-label="Dagar i rad">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🔥</span>' +
          '<h3 class="bsp-section-title">Dagar i rad</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' +
          esc('Här växer din kedja när du är aktiv.') +
        '</p>' +
      '</section>'
    );
  }

  function render(universe) {
    void universe;
    return (
      '<div class="bsp-page">' +
        renderHeader() +
        renderGlassSection() +
        renderWallSection() +
        renderStreakSection() +
      '</div>'
    );
  }

  window.ChildSamlingPresent = { render: render };
})();
