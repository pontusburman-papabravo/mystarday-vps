/**
 * child-samling-present.js — Min samling vy (Fas B, gate: barnets_samling).
 * B2: stjärnglas + medaljtrappa från stats.lifetime_stars.
 */
(function () {
  'use strict';

  const GLASS_SCALE_MAX = 1000;
  const STAR_MEDALS = [
    { threshold: 1, label: '1', title: 'Första stjärnan' },
    { threshold: 25, label: '25', title: '25 stjärnor' },
    { threshold: 50, label: '50', title: '50 stjärnor' },
    { threshold: 100, label: '100', title: '100 stjärnor' },
    { threshold: 250, label: '250', title: '250 stjärnor' },
    { threshold: 500, label: '500', title: '500 stjärnor' },
    { threshold: 1000, label: '1000', title: '1000 stjärnor' },
  ];

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function lifetimeStars(universe) {
    const raw = universe && universe.stats && universe.stats.lifetime_stars;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function glassFillPct(total) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((total / GLASS_SCALE_MAX) * 100));
  }

  function totalStarsLabel(total) {
    if (total === 1) return 'Totalt har du tjänat 1 stjärna';
    return 'Totalt har du tjänat ' + total + ' stjärnor';
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

  function renderMedalLadder(total) {
    const items = STAR_MEDALS.map(function (medal) {
      const unlocked = total >= medal.threshold;
      return (
        '<li class="bsp-medal' + (unlocked ? ' is-unlocked' : ' is-locked') + '"' +
          ' title="' + esc(medal.title) + '"' +
          ' aria-label="' + esc(medal.title + (unlocked ? ' — upplåst' : '')) + '">' +
          '<span class="bsp-medal-disc" aria-hidden="true">🏅</span>' +
          '<span class="bsp-medal-label">' + esc(medal.label) + '</span>' +
        '</li>'
      );
    }).join('');

    return (
      '<div class="bsp-medal-ladder" aria-label="Stjärnmedaljer">' +
        '<p class="bsp-medal-kicker">Stjärnmedaljer</p>' +
        '<ul class="bsp-medal-row">' + items + '</ul>' +
      '</div>'
    );
  }

  function renderGlassSection(universe) {
    const total = lifetimeStars(universe);
    const fillPct = glassFillPct(total);

    return (
      '<section class="bsp-section bsp-glass" aria-label="Stjärnglas">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">✨</span>' +
          '<h3 class="bsp-section-title">Stjärnglaset</h3>' +
        '</div>' +
        '<p class="bsp-glass-total" aria-live="polite">' + esc(totalStarsLabel(total)) + '</p>' +
        '<p class="bsp-section-lead">' +
          esc('De här stjärnorna visar allt du har klarat — de minskar aldrig när du löser in belöningar.') +
        '</p>' +
        '<div class="bsp-glass-jar" role="img" aria-label="' +
          esc('Stjärnglas fyllt till ' + fillPct + ' procent') + '">' +
          '<div class="bsp-glass-fill" style="height:' + fillPct + '%"></div>' +
          '<span class="bsp-glass-count" aria-hidden="true">' + total + ' ⭐</span>' +
        '</div>' +
        renderMedalLadder(total) +
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
    return (
      '<div class="bsp-page">' +
        renderHeader() +
        renderGlassSection(universe) +
        renderWallSection() +
        renderStreakSection() +
      '</div>'
    );
  }

  window.ChildSamlingPresent = { render: render };
})();
