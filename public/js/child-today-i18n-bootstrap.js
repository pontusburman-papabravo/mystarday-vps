/**
 * child-today-i18n-bootstrap.js — Canonical Child Today i18n ready signal + surface refresh.
 * Sets document.documentElement.dataset.childTodayI18nReady after main + bottom nav are localized.
 */
(function childTodayI18nBootstrapModule() {
  'use strict';

  const READY_DATASET_KEY = 'childTodayI18nReady';

  function clearChildTodayI18nReady() {
    document.documentElement.dataset[READY_DATASET_KEY] = 'false';
  }

  function applyChildTodayLocalizedSurfaces() {
    if (window.ChildWorldsNav && typeof ChildWorldsNav.renderBottomNav === 'function') {
      ChildWorldsNav.renderBottomNav();
    }
    if (window.ChildTodayFocus && typeof ChildTodayFocus.renameTab === 'function') {
      ChildTodayFocus.renameTab();
    }
    if (typeof window.renderDayTabs === 'function') {
      renderDayTabs();
    }
    if (typeof window.updateViewToggleButton === 'function') {
      updateViewToggleButton();
    }
    if (window.I18n && typeof I18n.apply === 'function') {
      const header = document.getElementById('childMainHeader');
      const todayMount = document.getElementById('todayFocusMount');
      const nav = document.getElementById('childBottomNav');
      if (header) I18n.apply(header);
      if (todayMount) I18n.apply(todayMount);
      if (nav) I18n.apply(nav);
    }
  }

  function markChildTodayI18nReady() {
    applyChildTodayLocalizedSurfaces();
    document.documentElement.dataset[READY_DATASET_KEY] = 'true';
  }

  window.ChildTodayI18n = {
    clearReady: clearChildTodayI18nReady,
    applyLocalizedSurfaces: applyChildTodayLocalizedSurfaces,
    markReady: markChildTodayI18nReady,
  };
})();
