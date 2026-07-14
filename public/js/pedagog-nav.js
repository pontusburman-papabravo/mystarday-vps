/**
 * Pedagogläge bottom nav — 4 flikar (E12).
 */
(function () {
  'use strict';

  const path = (window.location.pathname || '').replace(/\/$/, '');
  if (!path.match(/^\/(pedagog-oversikt|pedagog-note|pedagog-dag|pedagog-historik|samarbete)/)) return;

  const TABS = [
    { href: '/pedagog-oversikt', label: 'Översikt', icon: 'rapport' },
    { href: '/pedagog-dag', label: 'Idag', icon: 'dag' },
    { href: '/pedagog-historik', label: 'Historik', icon: 'historik' },
    { href: '/settings', label: 'Inställningar', icon: 'installningar' },
  ];

  function isActive(tab) {
    return path === tab.href || path.indexOf(tab.href + '/') === 0;
  }

  function tabIcon(tab) {
    if (window.IconSystem && IconSystem.has(tab.icon)) {
      return IconSystem.nav(tab.icon);
    }
    return tab.icon;
  }

  function mount() {
    if (document.querySelector('.pedagog-tab-bar')) return;
    const items = TABS.map(function (tab) {
      return '<a href="' + tab.href + '" class="pedagog-tab-item' + (isActive(tab) ? ' active' : '') + '">' +
        '<span class="tab-icon">' + tabIcon(tab) + '</span><span>' + tab.label + '</span></a>';
    }).join('');
    const nav = document.createElement('nav');
    nav.className = 'pedagog-tab-bar native-tab-bar';
    nav.setAttribute('aria-label', 'Pedagogmeny');
    nav.innerHTML = items;
    document.body.appendChild(nav);
    document.body.classList.add('has-pedagog-tab-bar');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
