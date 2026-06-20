/**
 * Landningssidor workspace tab shell (Fas 2C).
 */
(function () {
  const TABS = [
    { key: 'landningssidor', label: 'Landningssidor', route: '#landningssidor' },
    { key: 'bildbank', label: 'Bildbank', route: '#bildbank' },
  ];

  function tabBarHtml(activeKey) {
    return `<div class="admin-landning-tabs flex flex-wrap gap-2 border-b border-sky pb-3 mb-6">${
      TABS.map((tab) => {
        const active = tab.key === activeKey;
        const cls = active
          ? 'admin-landning-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
          : 'admin-landning-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
        return `<button type="button" class="${cls}" data-route="${tab.route}">${tab.label}</button>`;
      }).join('')
    }</div>`;
  }

  function mountLandningTabs(containerId, activeKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = tabBarHtml(activeKey);
    container.querySelectorAll('.admin-landning-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-route');
        if (route && typeof navigateToRoute === 'function') navigateToRoute(route);
      });
    });
  }

  function syncLandningWorkspace(canonicalKey) {
    const key = canonicalKey === 'bildbank' ? 'bildbank' : 'landningssidor';
    mountLandningTabs('landningWorkspaceTabs', key);
    mountLandningTabs('bildbankWorkspaceTabs', key);
  }

  window.syncLandningWorkspace = syncLandningWorkspace;
})();
