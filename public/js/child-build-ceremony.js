/**
 * child-build-ceremony.js — Stor upplåsningsceremoni vid del 75.
 */
(function () {
  'use strict';

  const OVERLAY_ID = 'childBuildUnlockOverlay';

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function playHref(project) {
    if (!project) return '/child/world';
    if (window.BuildPlayHrefs && BuildPlayHrefs.playHrefForSlug) {
      return BuildPlayHrefs.playHrefForSlug(project.catalog_slug);
    }
    return project.catalog_slug === 'racerbil' ? '/child/garage' : '/child/world';
  }

  function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
    document.body.classList.remove('cbh-ceremony-open');
  }

  function show(project) {
    if (!project) return;
    removeOverlay();

    const unlock = project.unlock_label || 'din värld';
    const icon = project.icon || '🎉';
    const href = playHref(project);

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'cbh-ceremony';
    overlay.innerHTML =
      '<div class="cbh-ceremony-backdrop"></div>' +
      '<div class="cbh-ceremony-panel" role="dialog" aria-modal="true" aria-labelledby="cbhCeremonyTitle">' +
        '<div class="cbh-ceremony-burst" aria-hidden="true">' + esc(icon) + '</div>' +
        '<p class="cbh-ceremony-kicker">DU KLARADE DET!</p>' +
        '<h2 class="cbh-ceremony-title" id="cbhCeremonyTitle">' + esc(unlock) + ' är öppen!</h2>' +
        '<p class="cbh-ceremony-sub">Du samlade alla 75 delar. Nu kan du leka!</p>' +
        '<div class="cbh-ceremony-door" aria-hidden="true"><span class="cbh-ceremony-door-icon">' + esc(icon) + '</span></div>' +
        '<a href="' + href + '" class="cbh-ceremony-cta">Lek nu →</a>' +
        '<button type="button" class="cbh-ceremony-close">Stäng</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('cbh-ceremony-open');

    if (typeof window.launchMilestoneConfetti === 'function') {
      window.launchMilestoneConfetti();
      setTimeout(window.launchMilestoneConfetti, 400);
    }
    if (window.BuildGameMobile) BuildGameMobile.haptic('success');
    else if (window.Platform && Platform.haptics) Platform.haptics.success();
    else if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    overlay.querySelector('.cbh-ceremony-close').addEventListener('click', removeOverlay);
    overlay.querySelector('.cbh-ceremony-backdrop').addEventListener('click', removeOverlay);
  }

  window.ChildBuildCeremony = { show: show, dismiss: removeOverlay };
})();
