/**
 * child-first-star-mode.js — First Star focused Idag chrome (PR 2).
 * Driven by first_star_mode from GET /api/me/daily-log (PR 1 backend).
 */
(function () {
  'use strict';

  const COPY = {
    title: 'Ditt första uppdrag',
    hint: 'Tryck i ringen när du är klar!',
  };

  let active = false;
  let savedBottomNavDisplay = '';

  function isActive() {
    return active;
  }

  function ensureMount() {
    let mount = document.getElementById('firstStarChromeMount');
    if (mount) return mount;
    mount = document.createElement('div');
    mount.id = 'firstStarChromeMount';
    mount.className = 'first-star-chrome hidden';
    mount.setAttribute('aria-live', 'polite');
    const scheduleView = document.getElementById('scheduleView');
    if (scheduleView && scheduleView.parentNode) {
      scheduleView.parentNode.insertBefore(mount, scheduleView);
    } else {
      document.body.appendChild(mount);
    }
    return mount;
  }

  function renderChrome() {
    const mount = ensureMount();
    mount.innerHTML =
      '<h2 class="first-star-title">' + COPY.title + '</h2>' +
      '<p class="first-star-hint">' + COPY.hint + '</p>';
    mount.classList.remove('hidden');
  }

  function hideChrome() {
    const mount = document.getElementById('firstStarChromeMount');
    if (!mount) return;
    mount.classList.add('hidden');
    mount.innerHTML = '';
  }

  function hideDistractors() {
    document.documentElement.classList.add('first-star-mode');
    document.body.classList.add('first-star-mode');
    document.body.classList.remove('child-has-bottom-nav');

    const bottomNav = document.getElementById('childBottomNav');
    if (bottomNav) {
      savedBottomNavDisplay = bottomNav.style.display;
      bottomNav.style.display = 'none';
      bottomNav.setAttribute('aria-hidden', 'true');
    }

    const focusMount = document.getElementById('todayFocusMount');
    if (focusMount) focusMount.classList.add('hidden');
  }

  function showDistractors() {
    document.documentElement.classList.remove('first-star-mode');
    document.body.classList.remove('first-star-mode');

    const bottomNav = document.getElementById('childBottomNav');
    if (bottomNav) {
      bottomNav.style.display = savedBottomNavDisplay || '';
      bottomNav.removeAttribute('aria-hidden');
    }

    const focusMount = document.getElementById('todayFocusMount');
    if (focusMount) focusMount.classList.remove('hidden');

    if (typeof window.applyChildViewChrome === 'function') {
      window.applyChildViewChrome();
    }
  }

  function enter() {
    active = true;
    hideDistractors();
    renderChrome();
  }

  function exit() {
    if (!active) return;
    active = false;
    hideChrome();
    showDistractors();
  }

  /**
   * @param {{ first_star_mode?: boolean }} data daily-log API payload
   */
  function applyFromDailyLog(data) {
    if (data && data.first_star_mode === true) {
      enter();
    } else {
      exit();
    }
  }

  window.ChildFirstStarMode = {
    isActive: isActive,
    enter: enter,
    exit: exit,
    applyFromDailyLog: applyFromDailyLog,
    COPY: COPY,
  };
})();
