/**
 * Paket workspace — package switcher + panel tabs (V2).
 */
(function () {
  const PACKAGES = [
    { key: 'teacch', label: 'Extra stöd', route: '#extra-stod' },
    { key: 'reporting', label: 'Rapportering', route: '#paket-rapportering' },
    { key: 'pedagog', label: 'Pedagog', route: '#paket-pedagog' },
  ];

  const PANELS = [
    { key: 'overview', label: 'Översikt' },
    { key: 'families', label: 'Familjer' },
    { key: 'content', label: 'Innehåll' },
    { key: 'features', label: 'Features' },
    { key: 'preview', label: 'Preview' },
    { key: 'interest', label: 'Intresse' },
  ];

  let activeComponent = 'teacch';
  let activePanel = 'overview';

  function packageTabsHtml(component) {
    return `<div class="admin-paket-package-tabs flex flex-wrap gap-2 border-b border-sky pb-3 mb-4">${
      PACKAGES.map((pkg) => {
        const active = pkg.key === component;
        const cls = active
          ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
          : 'px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
        return `<button type="button" class="admin-paket-package-tab ${cls}" data-route="${pkg.route}">${pkg.label}</button>`;
      }).join('')
    }</div>`;
  }

  function panelTabsHtml(panel) {
    return `<div class="admin-paket-panel-tabs flex flex-wrap gap-2 mb-6">${
      PANELS.map((tab) => {
        const active = tab.key === panel;
        const cls = active
          ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-navy text-white'
          : 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-lavender text-text-soft hover:bg-lavender/30';
        return `<button type="button" class="admin-paket-panel-tab ${cls}" data-panel="${tab.key}">${tab.label}</button>`;
      }).join('')
    }</div>`;
  }

  function showPanel(panel) {
    activePanel = panel;
    document.querySelectorAll('[data-paket-panel]').forEach((el) => {
      el.classList.toggle('hidden', el.getAttribute('data-paket-panel') !== panel);
    });
    document.querySelectorAll('.admin-paket-panel-tab').forEach((btn) => {
      const isActive = btn.getAttribute('data-panel') === panel;
      btn.classList.toggle('bg-navy', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-white', !isActive);
      btn.classList.toggle('border', !isActive);
      btn.classList.toggle('border-lavender', !isActive);
      btn.classList.toggle('text-text-soft', !isActive);
    });
  }

  function mountPaketShell(component, panel) {
    activeComponent = component || 'teacch';
    if (panel) activePanel = panel;

    const pkgContainer = document.getElementById('paketPackageTabs');
    const panelContainer = document.getElementById('paketPanelTabs');
    if (pkgContainer) {
      pkgContainer.innerHTML = packageTabsHtml(activeComponent);
      pkgContainer.querySelectorAll('.admin-paket-package-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          const route = btn.getAttribute('data-route');
          if (route && typeof navigateToRoute === 'function') navigateToRoute(route);
        });
      });
    }
    if (panelContainer) {
      panelContainer.innerHTML = panelTabsHtml(activePanel);
      panelContainer.querySelectorAll('.admin-paket-panel-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = btn.getAttribute('data-panel');
          showPanel(next);
          if (typeof loadPaketPanel === 'function') loadPaketPanel(activeComponent, next);
        });
      });
    }
    showPanel(activePanel);
  }

  function componentFromRoute(route) {
    const sub = route && route.subview;
    if (sub === 'reporting' || sub === 'pedagog' || sub === 'teacch') return sub;
    return 'teacch';
  }

  function syncPaketWorkspace(route) {
    const component = componentFromRoute(route);
    const panel = (route && route.workspacePanel) || activePanel || 'overview';
    mountPaketShell(component, panel);
    if (typeof loadPaketWorkspace === 'function') {
      loadPaketWorkspace(component, panel);
    }
  }

  window.syncPaketWorkspace = syncPaketWorkspace;
  window.getPaketActiveComponent = () => activeComponent;
  window.getPaketActivePanel = () => activePanel;
  window.setPaketPanel = (panel) => {
    showPanel(panel);
    if (typeof loadPaketPanel === 'function') loadPaketPanel(activeComponent, panel);
  };
})();
