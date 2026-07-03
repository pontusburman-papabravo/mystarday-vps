/**
 * Prenumeration workspace tab shell — Inställningar vs Paketintresse (Fas 2C).
 */
(function () {
  const TABS = [
    { key: 'prenumeration', label: 'Prenumeration & IAP', route: '#prenumeration' },
  ];

  function tabBarHtml(activeKey) {
    return `<div class="admin-prenumeration-tabs flex flex-wrap gap-2 border-b border-sky pb-3 mb-6">${
      TABS.map((tab) => {
        const active = tab.key === activeKey;
        const cls = active
          ? 'admin-prenumeration-tab px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
          : 'admin-prenumeration-tab px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
        return `<button type="button" class="${cls}" data-route="${tab.route}">${tab.label}</button>`;
      }).join('')
    }</div>`;
  }

  function setPrenumerationSubview(activeKey) {
    const settings = document.getElementById('prenumerationSettingsPanels');
    const interest = document.getElementById('prenumerationPaketintressePanel');
    const showInterest = activeKey === 'paketintresse';
    if (settings) settings.classList.toggle('hidden', showInterest);
    if (interest) interest.classList.toggle('hidden', !showInterest);
    if (showInterest && interest) {
      requestAnimationFrame(() => interest.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function mountPrenumerationTabs(activeKey) {
    const container = document.getElementById('prenumerationWorkspaceTabs');
    if (!container) return;
    container.innerHTML = tabBarHtml(activeKey);
    container.querySelectorAll('.admin-prenumeration-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-route');
        if (route && typeof navigateToRoute === 'function') navigateToRoute(route);
      });
    });
    setPrenumerationSubview(activeKey);
  }

  function syncPrenumerationWorkspace(canonicalKey) {
    const key = canonicalKey === 'paketintresse' ? 'paketintresse' : 'prenumeration';
    mountPrenumerationTabs(key);
  }

  window.syncPrenumerationWorkspace = syncPrenumerationWorkspace;
  window.setPrenumerationSubview = setPrenumerationSubview;
})();
