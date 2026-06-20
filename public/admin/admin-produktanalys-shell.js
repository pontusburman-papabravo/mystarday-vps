/**
 * Produktanalys workspace tab shell (Fas 2B).
 * Routes between existing analytics / anvandning / anvandarstatistik sections.
 */
(function () {
  const TABS = [
    { key: 'produktanalys', label: 'Produktanalys', route: '#produktanalys' },
    { key: 'anvandning', label: 'Användning', route: '#anvandning' },
    { key: 'anvandarinsikter', label: 'Användarinsikter', route: '#anvandarinsikter' },
  ];

  function tabBarHtml(activeKey) {
    const buttons = TABS.map((tab) => {
      const active = tab.key === activeKey;
      const cls = active
        ? 'admin-produktanalys-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
        : 'admin-produktanalys-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
      return `<button type="button" class="${cls}" data-route="${tab.route}">${tab.label}</button>`;
    }).join('');
    return `<div class="admin-produktanalys-tabs flex flex-wrap gap-2 border-b border-sky pb-3 mb-6">${buttons}</div>`;
  }

  function mountProduktanalysTabs(containerId, activeKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = tabBarHtml(activeKey);
    container.querySelectorAll('.admin-produktanalys-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-route');
        if (route && typeof navigateToRoute === 'function') navigateToRoute(route);
      });
    });
  }

  function syncProduktanalysWorkspace(canonicalKey) {
    const key = canonicalKey || 'produktanalys';
    mountProduktanalysTabs('produktanalysWorkspaceTabs', key);
    mountProduktanalysTabs('anvandningWorkspaceTabs', key);
    mountProduktanalysTabs('anvandarinsikterWorkspaceTabs', key);
  }

  window.syncProduktanalysWorkspace = syncProduktanalysWorkspace;
})();
