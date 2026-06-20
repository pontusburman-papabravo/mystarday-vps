// Admin navigation — single source of truth for groups, routes, aliases, breadcrumbs.
(function () {
  const ADMIN_NAV = [
    {
      id: 'home',
      label: 'Hem',
      items: [
        { id: 'start', label: 'Start', hash: '#overview', section: 'overview' },
        { id: 'families', label: 'Familjer', hash: '#families', section: 'families' },
        { id: 'messages', label: 'Meddelanden', hash: '#messages', section: 'messages', badgeId: 'messagesBadge' },
      ],
    },
    {
      id: 'growth',
      label: 'Tillväxt',
      items: [
        {
          id: 'paketintresse',
          label: 'Paketintresse',
          hash: '#paketintresse',
          section: 'prenumeration',
          subview: 'paketintresse',
          scrollTarget: '#paketintresse-anchor',
        },
        {
          id: 'pedagogintresse',
          label: 'Pedagogintresse',
          hash: '#intresseanmalningar',
          section: 'intresseanmalningar',
        },
        { id: 'waitlist', label: 'Waitlist (EN)', hash: '#waitlist', section: 'waitlist' },
        {
          id: 'landningssidor',
          label: 'Landningssidor',
          hash: '#landning',
          section: 'landning',
          children: [
            { id: 'bildbank', label: 'Bildbank', hash: '#bildbank', section: 'bildbank' },
          ],
        },
        { id: 'undersokningar', label: 'Undersökningar', hash: '#undersokningar', section: 'undersokningar' },
      ],
    },
    {
      id: 'communication',
      label: 'Kommunikation',
      items: [
        { id: 'nyhetsbrev', label: 'Nyhetsbrev', hash: '#nyhetsbrev', section: 'nyhetsbrev' },
        { id: 'emailmallar', label: 'E-postmallar', hash: '#emailmallar', section: 'emailmallar' },
        { id: 'emaillog', label: 'E-postlogg', hash: '#emaillog', section: 'emaillog' },
        {
          id: 'kampanjer',
          label: 'Kampanjer',
          navOnly: true,
          children: [
            { id: 'dagensnyhet', label: 'Dagens nyhet', hash: '#dagensnyhet', section: 'dagensnyhet' },
          ],
        },
      ],
    },
    {
      id: 'insights',
      label: 'Insikter',
      items: [
        {
          id: 'produktanalys',
          label: 'Produktanalys',
          hash: '#analytics',
          section: 'analytics',
          children: [
            { id: 'anvandning', label: 'Användning', hash: '#anvandning', section: 'anvandning' },
            {
              id: 'anvandarinsikter',
              label: 'Användarinsikter',
              hash: '#anvandarstatistik',
              section: 'anvandarstatistik',
            },
          ],
        },
        { id: 'retention', label: 'Retention', hash: '#retention', section: 'retention' },
        {
          id: 'experiment',
          label: 'Experiment',
          navOnly: true,
          children: [
            {
              id: 'foraldaraktivering',
              label: 'Föräldraaktivering',
              hash: '#foraldaraktivering',
              section: 'foraldaraktivering',
            },
            { id: 'fordig', label: 'För dig', hash: '#fordig', section: 'fordig' },
          ],
        },
      ],
    },
    {
      id: 'content',
      label: 'Innehåll',
      items: [
        { id: 'bibliotek', label: 'Bibliotek', hash: '#defaults', section: 'defaults' },
      ],
    },
    {
      id: 'settings',
      label: 'Inställningar',
      items: [
        {
          id: 'prenumeration',
          label: 'Prenumeration & IAP',
          hash: '#prenumeration',
          section: 'prenumeration',
        },
        { id: 'funktioner', label: 'Funktioner', href: '/admin/development', external: true },
        { id: 'konto', label: 'Konto', hash: '#password', section: 'password' },
      ],
    },
  ];

  /** Hash fragments (without #) → nav item id */
  const ADMIN_HASH_ALIASES = {
    overview: 'start',
    start: 'start',
    intresseanmalningar: 'pedagogintresse',
    analytics: 'produktanalys',
    anvandarstatistik: 'anvandarinsikter',
    anvandning: 'anvandning',
    valkomstmail: 'emailmallar',
    paketintresse: 'paketintresse',
    bildbank: 'bildbank',
    landning: 'landningssidor',
    defaults: 'bibliotek',
    password: 'konto',
    dagensnyhet: 'dagensnyhet',
    foraldaraktivering: 'foraldaraktivering',
    fordig: 'fordig',
    retention: 'retention',
    undersokningar: 'undersokningar',
    nyhetsbrev: 'nyhetsbrev',
    emailmallar: 'emailmallar',
    emaillog: 'emaillog',
    waitlist: 'waitlist',
    prenumeration: 'prenumeration',
    families: 'families',
    messages: 'messages',
  };

  const SPECIAL_ROUTES = {
    valkomstmail: { emailTab: 'valkomstmail' },
  };

  function flattenNavItems(items, groupLabel, parentItem) {
    const flat = [];
    for (const item of items) {
      const entry = {
        ...item,
        groupLabel,
        parentItem: parentItem || null,
      };
      flat.push(entry);
      if (item.children?.length) {
        flat.push(...flattenNavItems(item.children, groupLabel, item));
      }
    }
    return flat;
  }

  function getAllNavItems() {
    const all = [];
    for (const group of ADMIN_NAV) {
      all.push(...flattenNavItems(group.items, group.label));
    }
    return all;
  }

  function findNavItemById(id) {
    return getAllNavItems().find((item) => item.id === id) || null;
  }

  function findNavItemByHash(rawHash) {
    const hash = (rawHash || '').replace(/^#/, '').trim();
    if (!hash) return findNavItemById('start');

    const aliasId = ADMIN_HASH_ALIASES[hash];
    if (aliasId) {
      const aliased = findNavItemById(aliasId);
      if (aliased) return aliased;
    }

    const all = getAllNavItems();
    return (
      all.find((item) => (item.hash || '').replace(/^#/, '') === hash) ||
      all.find((item) => item.section === hash) ||
      null
    );
  }

  function buildBreadcrumb(item) {
    const crumbs = [];
    if (item.groupLabel) crumbs.push(item.groupLabel);

    if (item.parentItem) {
      if (item.parentItem.navOnly) {
        crumbs.push(item.parentItem.label);
      } else if (!item.parentItem.navOnly && item.parentItem.section) {
        crumbs.push(item.parentItem.label);
      } else if (item.parentItem.navOnly === undefined && item.parentItem.children) {
        crumbs.push(item.parentItem.label);
      }
    }

    if (!item.navOnly) crumbs.push(item.label);
    return crumbs;
  }

  function resolveRoute(rawHash) {
    const hash = (rawHash || '').replace(/^#/, '').trim();
    const hashKey = hash || 'overview';
    const item = findNavItemByHash(hashKey) || findNavItemById('start');
    const special = SPECIAL_ROUTES[hashKey] || {};

    let emailTab = special.emailTab || null;
    if (hashKey === 'valkomstmail') emailTab = 'valkomstmail';

    const canonicalHash = item.hash || '#overview';
    const preserveAlias = hash && (ADMIN_HASH_ALIASES[hash] || hash === hashKey) && hash !== canonicalHash.replace(/^#/, '');

    return {
      navId: item.id,
      hash: preserveAlias ? `#${hash}` : canonicalHash,
      actualSection: item.section || 'overview',
      pageTitle: item.label,
      breadcrumb: buildBreadcrumb(item),
      subview: item.subview || null,
      scrollTarget: item.scrollTarget || null,
      emailTab,
      external: !!item.external,
      href: item.href || null,
    };
  }

  function navItemClasses(isActive, isChild) {
    const base = [
      'nav-item',
      'block',
      'rounded-lg',
      'transition-colors',
      isChild ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
    ];
    if (isActive) {
      base.push('bg-gold', 'text-navy', 'font-semibold');
    } else {
      base.push('text-white', 'hover:bg-navy-soft');
    }
    return base.join(' ');
  }

  function renderNavLink(item, isChild) {
    if (item.external && item.href) {
      return `<li>
        <a href="${item.href}" class="${navItemClasses(false, isChild)}" data-nav-id="${item.id}">
          ${item.label} <span class="text-xs opacity-70">↗</span>
        </a>
      </li>`;
    }

    const hash = item.hash || '#overview';
    const badge = item.badgeId
      ? `<span id="${item.badgeId}" class="bg-gold text-navy text-xs font-bold rounded-full px-2 py-0.5 hidden shrink-0" style="min-width: 20px; text-align: center;"></span>`
      : '';

    return `<li>
      <a href="${hash}" class="${navItemClasses(false, isChild)} flex items-center justify-between gap-2" data-nav-id="${item.id}" data-section="${item.section || ''}">
        <span>${item.label}</span>${badge}
      </a>
    </li>`;
  }

  function renderNavItem(item) {
    if (item.navOnly && item.children?.length) {
      const childHtml = item.children.map((child) => renderNavLink(child, true)).join('');
      return `<li class="mt-1">
        <p class="px-4 py-1 text-xs text-white/60 font-semibold">${item.label}</p>
        <ul class="space-y-0.5 ml-2 border-l border-white/10 pl-2">${childHtml}</ul>
      </li>`;
    }

    const parentLink = item.section || item.hash
      ? renderNavLink(item, false)
      : '';

    if (!item.children?.length) return parentLink;

    const childHtml = item.children.map((child) => renderNavLink(child, true)).join('');
    if (!parentLink) {
      return `<li class="mt-1">
        <p class="px-4 py-1 text-xs text-white/60 font-semibold">${item.label}</p>
        <ul class="space-y-0.5 ml-2 border-l border-white/10 pl-2">${childHtml}</ul>
      </li>`;
    }

    return `<li>
      ${parentLink.replace(/^<li>|<\/li>$/g, '')}
      <ul class="space-y-0.5 ml-4 mt-0.5 border-l border-white/10 pl-2">${childHtml}</ul>
    </li>`;
  }

  function renderAdminSidebar() {
    const container = document.getElementById('adminSidebarLinks');
    if (!container) return;

    container.innerHTML = ADMIN_NAV.map((group) => `
      <li class="admin-nav-group">
        <p class="text-xs font-semibold uppercase tracking-wider text-white/50 px-4 pt-3 pb-1 first:pt-0">${group.label}</p>
        <ul class="space-y-0.5">
          ${group.items.map((item) => renderNavItem(item)).join('')}
        </ul>
      </li>
    `).join('');

    container.querySelectorAll('a.nav-item[data-nav-id]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (link.getAttribute('href')?.startsWith('/')) return;
        event.preventDefault();
        const hash = link.getAttribute('href') || '#overview';
        if (typeof navigateToHash === 'function') navigateToHash(hash);
        if (typeof closeMobileMenu === 'function') closeMobileMenu();
      });
    });
  }

  function setActiveNavItem(navId) {
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.remove('bg-gold', 'text-navy', 'font-semibold');
      el.classList.add('text-white', 'hover:bg-navy-soft');
    });
    const active = document.querySelector(`.nav-item[data-nav-id="${navId}"]`);
    if (active) {
      active.classList.add('bg-gold', 'text-navy', 'font-semibold');
      active.classList.remove('text-white', 'hover:bg-navy-soft');
    }
  }

  function renderBreadcrumb(crumbs) {
    const el = document.getElementById('adminBreadcrumb');
    if (!el || !crumbs?.length) return;
    el.innerHTML = crumbs
      .map((part, i) => {
        const sep = i > 0 ? '<span class="mx-1.5 text-text-soft/60" aria-hidden="true">›</span>' : '';
        const isLast = i === crumbs.length - 1;
        const cls = isLast ? 'text-navy font-medium' : 'text-text-soft';
        return `${sep}<span class="${cls}">${part}</span>`;
      })
      .join('');
    el.classList.remove('hidden');
  }

  window.ADMIN_NAV = ADMIN_NAV;
  window.resolveRoute = resolveRoute;
  window.renderAdminSidebar = renderAdminSidebar;
  window.setActiveNavItem = setActiveNavItem;
  window.renderBreadcrumb = renderBreadcrumb;
  window.findNavItemByHash = findNavItemByHash;
})();
