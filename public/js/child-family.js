/**
 * child-family.js — Mina personer shell (barnmeny v2 Sprint 2).
 */
(function () {
  'use strict';

  function onEnter() {
    if (typeof window.showTab === 'function') window.showTab('family');
    if (window.ChildFamilyHall && ChildFamilyHall.refresh) ChildFamilyHall.refresh();
  }

  window.ChildFamilyWorld = { onEnter: onEnter };
})();
