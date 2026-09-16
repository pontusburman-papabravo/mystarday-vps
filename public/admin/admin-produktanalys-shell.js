/**
 * Produktanalys workspace tab shell (Fas 2B).
 * Routes between existing analytics / anvandning / anvandarstatistik sections.
 */
(function () {
  const TABS = [
    {
      key: 'produktanalys',
      label: 'Hur går det?',
      hint: 'Användning, första veckan och var familjer fastnar',
      route: '#produktanalys',
    },
    {
      key: 'anvandning',
      label: 'Nya och aktiva',
      hint: 'Registreringar och aktivitet per period',
      route: '#anvandning',
    },
    {
      key: 'anvandarinsikter',
      label: 'Vilka användare',
      hint: 'Föräldrar, barn och pedagoger',
      route: '#anvandarinsikter',
    },
  ];

  function tabBarHtml(activeKey) {
    const buttons = TABS.map((tab) => {
      const active = tab.key === activeKey;
      const cls = active
        ? 'admin-produktanalys-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
        : 'admin-produktanalys-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
      return `<button type="button" class="${cls}" data-route="${tab.route}" title="${tab.hint}">${tab.label}</button>`;
    }).join('');
    const active = TABS.find((t) => t.key === activeKey) || TABS[0];
    return `<div class="admin-produktanalys-tabs mb-6">
      <div class="flex flex-wrap gap-2 border-b border-sky pb-3">${buttons}</div>
      <p class="text-sm text-text-soft mt-3">${active.hint}</p>
    </div>`;
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
