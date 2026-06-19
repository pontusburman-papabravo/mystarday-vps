/**
 * Child v1.2 nav — 2 tabs + hide during teacch NU (E5).
 */
(function (global) {
  'use strict';

  let v12Nav = false;

  function setNavHidden(hidden) {
    const nav = document.getElementById('childBottomNav');
    const legacy = document.getElementById('childLayerNav');
    if (nav) nav.classList.toggle('child-nav-hidden', !!hidden);
    if (legacy) legacy.classList.toggle('child-nav-hidden', !!hidden);
    document.body.classList.toggle('child-teacch-nu-active', !!hidden);
  }

  function applyTwoTabNav() {
    const nav = document.getElementById('childBottomNav');
    if (!nav) return;

    const home = document.getElementById('tabHome');
    const schedule = document.getElementById('tabSchedule');
    const rewards = document.getElementById('tabRewards');
    const more = document.getElementById('tabMore');

    if (home) home.style.display = 'none';
    if (more) more.style.display = 'none';
    if (schedule) {
      schedule.querySelector('span:last-child').textContent = 'Idag';
      schedule.querySelector('.child-bottom-nav-icon').textContent = '☀️';
    }
    if (rewards) {
      rewards.querySelector('span:last-child').textContent = 'Skatt';
    }

    const legacyFamily = document.getElementById('tabFamilyLegacy');
    if (legacyFamily) legacyFamily.style.display = 'none';
  }

  async function init() {
    try {
      const res = await fetch('/api/subscription/access', { credentials: 'include' });
      if (!res.ok) return;
      const access = await res.json();
      if (access.rollout_mode && access.rollout_mode !== 'off') {
        v12Nav = true;
        applyTwoTabNav();
      }
    } catch (_) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.ChildPackageNav = { setNavHidden, isV12: () => v12Nav };
})(window);
