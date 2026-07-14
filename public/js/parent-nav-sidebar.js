/**
 * parent-nav-sidebar.js — Desktop sidebar from NavConfig (vuxenmeny v2).
 */
(function () {
  'use strict';

  if (!window.NavConfig) return;

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const path = NavConfig.normalizePath(window.location.pathname);
  const active = NavConfig.activeNavItem(path);
  const activeId = active ? active.id : '';

  function linkClass(id) {
    const base = 'sidebar-nav block px-4 py-3 rounded-lg transition-colors min-h-[44px]';
    if (id === activeId) {
      return base + ' bg-gold text-navy font-semibold';
    }
    return base + ' text-white hover:bg-navy-soft';
  }

  function navIconMarkup(item) {
    if (window.IconSystem && IconSystem.has(item.icon)) {
      return IconSystem.nav(item.icon);
    }
    return item.icon + ' ';
  }

  const primaryHtml = NavConfig.PRIMARY_NAV.map(function (item) {
    return '<li><a href="' + item.href + '" class="' + linkClass(item.id) + '">' +
      navIconMarkup(item) + item.label + '</a></li>';
  }).join('');

  const settings = NavConfig.SETTINGS_NAV;
  const settingsHtml =
    '<li class="mt-4 pt-4 border-t border-navy-soft"><a href="' + settings.href + '" class="' +
    linkClass('settings') + '">' + navIconMarkup(settings) + settings.label + '</a></li>';

  const list = sidebar.querySelector('ul');
  if (list) {
    list.innerHTML = primaryHtml + settingsHtml;
    return;
  }

  const navList = document.createElement('ul');
  navList.className = 'space-y-1 flex-1';
  navList.innerHTML = primaryHtml + settingsHtml;
  sidebar.appendChild(navList);
})();
