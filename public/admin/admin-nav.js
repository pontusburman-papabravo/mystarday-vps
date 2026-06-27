// Admin navigation — route registry, sidebar render, resolveRoute (Fas 1).
// Spec: docs/admin-v2/A-admin-nav-spec.md

(function () {
  const GROUP_LABELS = {
    home: 'Hem',
    growth: 'Tillväxt',
    communication: 'Kommunikation',
    insights: 'Insikter',
    content: 'Innehåll',
    settings: 'Inställningar',
  };

  const PARENT_LABELS = {
    landningssidor: 'Landningssidor',
    produktanalys: 'Produktanalys',
    kampanjer: 'Kampanjer',
    experiment: 'Experiment',
  };

  const ADMIN_NAV_GROUPS = [
    {
      id: 'home',
      label: 'Hem',
      items: [
        { key: 'start', navId: 'start', label: 'Start', targetSection: 'overview', aliases: ['overview'], capability: 'proxy-data' },
        { key: 'familjer', navId: 'familjer', label: 'Familjer', targetSection: 'families', aliases: ['families'], capability: 'stable' },
        { key: 'meddelanden', navId: 'meddelanden', label: 'Meddelanden', targetSection: 'messages', aliases: ['messages'], capability: 'stable', badgeId: 'messagesBadge', navClass: 'flex items-center justify-between gap-2' },
      ],
    },
    {
      id: 'growth',
      label: 'Tillväxt',
      items: [
        { key: 'paketintresse', navId: 'paketintresse', label: 'Paketintresse', targetSection: 'prenumeration', subview: 'paketintresse', scrollTargetId: 'paketintresse-anchor', capability: 'ui-only' },
        { key: 'pedagogintresse', navId: 'pedagogintresse', label: 'Pedagogintresse', targetSection: 'intresseanmalningar', aliases: ['intresseanmalningar'], capability: 'stable' },
        { key: 'waitlist', navId: 'waitlist', label: 'Waitlist (EN)', targetSection: 'waitlist', capability: 'stable' },
        { key: 'tillvaxt-pipeline', navId: 'tillvaxt-pipeline', label: 'Pipeline', targetSection: 'growthPipeline', capability: 'stable' },
        {
          key: 'landningssidor',
          navId: 'landningssidor',
          label: 'Landningssidor',
          targetSection: 'landning',
          aliases: ['landning'],
          capability: 'stable',
          children: [
            { key: 'bildbank', navId: 'bildbank', label: 'Bildbank', targetSection: 'bildbank', parentNavId: 'landningssidor', capability: 'ui-only' },
          ],
        },
        { key: 'undersokningar', navId: 'undersokningar', label: 'Undersökningar', targetSection: 'undersokningar', capability: 'stable' },
      ],
    },
    {
      id: 'communication',
      label: 'Kommunikation',
      items: [
        { key: 'nyhetsbrev', navId: 'nyhetsbrev', label: 'Nyhetsbrev', targetSection: 'nyhetsbrev', capability: 'stable' },
        { key: 'epostmallar', navId: 'epostmallar', label: 'E-postmallar', targetSection: 'emailmallar', aliases: ['emailmallar'], capability: 'stable' },
        { key: 'epostlogg', navId: 'epostlogg', label: 'E-postlogg', targetSection: 'emaillog', aliases: ['emaillog'], capability: 'stable' },
        {
          navOnly: true,
          navId: 'kampanjer',
          label: 'Kampanjer',
          children: [
            { key: 'dagens-nyhet', navId: 'dagensnyhet', label: 'Dagens nyhet', targetSection: 'dagensnyhet', aliases: ['dagensnyhet'], parentNavId: 'kampanjer', capability: 'stable' },
          ],
        },
      ],
    },
    {
      id: 'insights',
      label: 'Insikter',
      items: [
        {
          key: 'produktanalys',
          navId: 'produktanalys',
          label: 'Produktanalys',
          targetSection: 'analytics',
          aliases: ['analytics'],
          capability: 'ui-only',
          children: [
            { key: 'anvandning', navId: 'anvandning', label: 'Användning', targetSection: 'anvandning', parentNavId: 'produktanalys', capability: 'ui-only' },
            { key: 'anvandarinsikter', navId: 'anvandarinsikter', label: 'Användarinsikter', targetSection: 'anvandarstatistik', aliases: ['anvandarstatistik'], parentNavId: 'produktanalys', capability: 'ui-only' },
          ],
        },
        { key: 'retention', navId: 'retention', label: 'Retention', targetSection: 'retention', capability: 'stable' },
        {
          navOnly: true,
          navId: 'experiment',
          label: 'Experiment',
          children: [
            { key: 'foraldaraktivering', navId: 'foraldaraktivering', label: 'Föräldraaktivering', targetSection: 'foraldaraktivering', parentNavId: 'experiment', capability: 'stable' },
            { key: 'l1-beslut', navId: 'l1beslut', label: 'L1 beslut (coach)', targetSection: 'l1Governance', parentNavId: 'experiment', capability: 'stable' },
            { key: 'fordig', navId: 'fordig', label: 'För dig', targetSection: 'fordig', parentNavId: 'experiment', capability: 'stable' },
          ],
        },
      ],
    },
    {
      id: 'content',
      label: 'Innehåll',
      items: [
        { key: 'bibliotek', navId: 'bibliotek', label: 'Bibliotek', targetSection: 'defaults', aliases: ['defaults'], capability: 'stable' },
      ],
    },
    {
      id: 'settings',
      label: 'Inställningar',
      items: [
        { key: 'prenumeration', navId: 'prenumeration', label: 'Prenumeration & IAP', targetSection: 'prenumeration', capability: 'stable' },
        { external: true, href: '/admin/development', label: 'Funktioner' },
        { key: 'konto', navId: 'konto', label: 'Konto', targetSection: 'password', aliases: ['password'], capability: 'stable' },
      ],
    },
  ];

  const ROUTE_BY_KEY = {};
  const ALIAS_TO_KEY = {};

  function buildBreadcrumb(groupId, item, parentLabel) {
    const parts = [GROUP_LABELS[groupId]];
    if (parentLabel) parts.push(parentLabel);
    parts.push(item.label);
    return parts;
  }

  function registerRoute(groupId, item, parentLabel) {
    ROUTE_BY_KEY[item.key] = {
      canonicalKey: item.key,
      navId: item.navId,
      label: item.label,
      targetSection: item.targetSection,
      subview: item.subview || null,
      scrollTargetId: item.scrollTargetId ? '#' + item.scrollTargetId : null,
      emailTab: null,
      groupId,
      breadcrumb: buildBreadcrumb(groupId, item, parentLabel),
      refreshKey: item.targetSection,
      capability: item.capability || 'stable',
      parentNavId: item.parentNavId || null,
    };
    if (item.aliases) {
      for (const a of item.aliases) {
        ALIAS_TO_KEY[a] = item.key;
      }
    }
  }

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.external) continue;
      if (item.navOnly && item.children) {
        for (const child of item.children) {
          registerRoute(group.id, child, item.label);
        }
        continue;
      }
      registerRoute(group.id, item, null);
      if (item.children) {
        for (const child of item.children) {
          registerRoute(group.id, child, item.label);
        }
      }
    }
  }

  ROUTE_BY_KEY.valkomstmail = {
    canonicalKey: 'valkomstmail',
    navId: 'epostmallar',
    label: 'Välkomstmail',
    targetSection: 'emailmallar',
    subview: null,
    emailTab: 'valkomstmail',
    scrollTargetId: null,
    groupId: 'communication',
    breadcrumb: ['Kommunikation', 'E-postmallar', 'Välkomstmail'],
    refreshKey: 'emailmallar',
    capability: 'ui-only',
    parentNavId: null,
  };
  ALIAS_TO_KEY.valkomstmail = 'valkomstmail';

  function normalizeHash(hash) {
    if (!hash) return '';
    let raw = String(hash).replace(/^#/, '').trim().toLowerCase();
    const q = raw.indexOf('?');
    if (q >= 0) raw = raw.slice(0, q);
    return raw;
  }

  function resolveRoute(hash) {
    let raw = normalizeHash(hash);
    if (!raw) raw = 'start';
    const canonicalKey = ALIAS_TO_KEY[raw] || (ROUTE_BY_KEY[raw] ? raw : 'start');
    const route = ROUTE_BY_KEY[canonicalKey] || ROUTE_BY_KEY.start;
    return Object.assign({}, route, { requestHash: raw });
  }

  function itemEsc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderNavBadge(item) {
    if (!item.badgeId) return '';
    return `<span id="${itemEsc(item.badgeId)}" class="bg-gold text-navy text-xs font-bold rounded-full px-2 py-0.5 hidden shrink-0" style="min-width:20px;text-align:center;"></span>`;
  }

  function renderNavLink(item, isChild) {
    const cls = isChild
      ? 'nav-item admin-nav-child block px-4 py-2 text-white hover:bg-navy-soft rounded-lg transition-colors'
      : `nav-item block px-4 py-2 text-white hover:bg-navy-soft rounded-lg transition-colors${item.navClass ? ' ' + item.navClass : ''}`;
    return `<li><a href="#${itemEsc(item.key)}" data-nav-id="${itemEsc(item.navId)}" data-section="${itemEsc(item.targetSection)}" onclick="return adminNavClick(event)" class="${cls}">${itemEsc(item.label)}${renderNavBadge(item)}</a></li>`;
  }

  function renderNavItem(item) {
    if (item.external) {
      return `<li><a href="${itemEsc(item.href)}" class="nav-item block px-4 py-2 text-white hover:bg-navy-soft rounded-lg transition-colors">${itemEsc(item.label)}</a></li>`;
    }
    if (item.navOnly && item.children) {
      return `<li><p class="px-4 py-1.5 text-sm text-white/70 font-semibold">${itemEsc(item.label)}</p><ul class="admin-nav-children space-y-0.5">${item.children.map((c) => renderNavLink(c, true)).join('')}</ul></li>`;
    }
    let html = renderNavLink(item, false);
    if (item.children) {
      html += `<li><ul class="admin-nav-children space-y-0.5">${item.children.map((c) => renderNavLink(c, true)).join('')}</ul></li>`;
    }
    return html;
  }

  function renderAdminNav() {
    const container = document.getElementById('adminSidebarLinks');
    if (!container) return;
    container.innerHTML = ADMIN_NAV_GROUPS.map((group) => {
      const itemsHtml = group.items.map(renderNavItem).join('');
      return `<li class="admin-nav-group"><p class="admin-nav-group-label px-4 pt-3 pb-1 text-xs font-heading font-bold uppercase tracking-wider text-white/50">${itemEsc(group.label)}</p><ul class="space-y-0.5">${itemsHtml}</ul></li>`;
    }).join('');
  }

  function adminNavClick(event) {
    event.preventDefault();
    const hash = event.currentTarget.getAttribute('href');
    if (typeof navigateToRoute === 'function') {
      navigateToRoute(hash);
    }
    if (typeof closeMobileMenu === 'function') {
      closeMobileMenu();
    }
    return false;
  }

  window.resolveRoute = resolveRoute;
  window.renderAdminNav = renderAdminNav;
  window.adminNavClick = adminNavClick;
})();
