/**
 * child-today-warmth.js — Värme & igenkänning på Idag (barnets_samling).
 * Temadekal, dagens berättelse, lugn sektionsfeedback, subtil check-pop.
 * Inte spel: ingen XP, inget konfettiregn, inga explosioner.
 */
(function () {
  'use strict';

  const THEME_DECALS = {
    adventure: { emoji: '🧭', label: 'Äventyr' },
    space: { emoji: '🚀', label: 'Rymd' },
    dinosaurs: { emoji: '🦖', label: 'Dinosaurier' },
    vehicles: { emoji: '🚗', label: 'Fordon' },
    animals: { emoji: '🦊', label: 'Vilda djur' },
    ocean: { emoji: '🐬', label: 'Havet' },
    sports: { emoji: '⚽', label: 'Sport' },
    builders: { emoji: '🧱', label: 'Bygg & skapa' },
    music: { emoji: '🎵', label: 'Musik & rytm' },
    arcade: { emoji: '🎮', label: 'Spelhall' },
  };

  const DAG_NARRATIVES = {
    morgon: 'Idag hjälper vi kroppen att vakna 🌞',
    formiddag: 'Vi tar dagen i lagom takt ☀️',
    eftermiddag: 'Vi fortsätter lugnt framåt 🌤️',
    kvall: 'Nu är kvällsrutinen igång 🌙',
    natt: 'Dags att varva ner 🌑',
  };

  const STATE_NARRATIVES = {
    no_tasks: 'Ledig dag — njut 🌿',
    all_done: 'Allt klart för idag — bra jobbat ✨',
  };

  function isSamlingGateOn() {
    if (typeof document !== 'undefined'
        && document.documentElement.getAttribute('data-barnets-samling') === 'on') {
      return true;
    }
    return !!(window.ChildWorlds
      && window.ChildWorlds.isBarnetsSamlingEnabled
      && window.ChildWorlds.isBarnetsSamlingEnabled());
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function resolveThemeId() {
    if (window.ChildTheme && window.ChildTheme.getActiveThemeId) {
      return window.ChildTheme.getActiveThemeId();
    }
    const root = document.documentElement.getAttribute('data-child-theme');
    return root || 'adventure';
  }

  function dayNarrative(state) {
    if (!state) return '';
    if (state.state === 'no_tasks') return STATE_NARRATIVES.no_tasks;
    if (state.state === 'all_done') return STATE_NARRATIVES.all_done;
    const key = window.ChildTodayFun && window.ChildTodayFun.currentDagdelKey
      ? window.ChildTodayFun.currentDagdelKey()
      : null;
    return (key && DAG_NARRATIVES[key]) || DAG_NARRATIVES.formiddag;
  }

  function sectionCompleteLabel(sectionKey) {
    const labels = {
      morgon: 'Morgon',
      formiddag: 'Förmiddag',
      eftermiddag: 'Eftermiddag',
      kvall: 'Kväll',
      natt: 'Natt',
    };
    const name = labels[sectionKey] || sectionKey;
    return '✓ ' + name + ' klar';
  }

  function mountThemeDecal(themeId) {
    if (typeof document === 'undefined' || !isSamlingGateOn()) return;
    const host = document.getElementById('todayFocusMount');
    if (!host) return;

    let el = document.getElementById('ctfThemeDecal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ctfThemeDecal';
      el.className = 'ctf-theme-decal';
      el.setAttribute('aria-hidden', 'true');
      host.appendChild(el);
    } else if (el.parentNode !== host) {
      host.appendChild(el);
    }

    const id = themeId || resolveThemeId();
    const decal = THEME_DECALS[id] || THEME_DECALS.adventure;
    el.textContent = decal.emoji;
    el.setAttribute('data-theme', id);
    el.title = decal.label;
  }

  function removeThemeDecal() {
    const el = document.getElementById('ctfThemeDecal');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function microSpark(originEl) {
    if (!originEl) return;

    originEl.classList.add('ctf-check-pop');
    setTimeout(function () { originEl.classList.remove('ctf-check-pop'); }, 320);

    if (prefersReducedMotion()) return;

    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const sparks = ['✨', '⭐', '✨'];
    const dur = 300;

    sparks.forEach(function (glyph, i) {
      const el = document.createElement('span');
      el.className = 'ctf-micro-spark';
      el.textContent = glyph;
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.style.setProperty('--ctf-spark-dx', ((i - 1) * 14) + 'px');
      el.style.setProperty('--ctf-spark-dy', (-18 - i * 6) + 'px');
      document.body.appendChild(el);
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, dur + 40);
    });
  }

  function shouldUseWarmthCheckoff() {
    return isSamlingGateOn();
  }

  function shouldSuppressMilestoneConfetti() {
    return isSamlingGateOn();
  }

  function init() {
    if (!isSamlingGateOn()) return;
    mountThemeDecal(resolveThemeId());
    document.addEventListener('child-theme-applied', function (e) {
      if (!isSamlingGateOn()) return;
      const themeId = e.detail && e.detail.themeId ? e.detail.themeId : resolveThemeId();
      mountThemeDecal(themeId);
    });
    document.addEventListener('child-theme-preview', function (e) {
      if (!isSamlingGateOn()) return;
      const themeId = e.detail && e.detail.themeId ? e.detail.themeId : resolveThemeId();
      mountThemeDecal(themeId);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    document.addEventListener('child-worlds-configured', init);
  }

  window.ChildTodayWarmth = {
    isSamlingGateOn: isSamlingGateOn,
    dayNarrative: dayNarrative,
    sectionCompleteLabel: sectionCompleteLabel,
    mountThemeDecal: mountThemeDecal,
    removeThemeDecal: removeThemeDecal,
    microSpark: microSpark,
    shouldUseWarmthCheckoff: shouldUseWarmthCheckoff,
    shouldSuppressMilestoneConfetti: shouldSuppressMilestoneConfetti,
    THEME_DECALS: THEME_DECALS,
  };
})();
