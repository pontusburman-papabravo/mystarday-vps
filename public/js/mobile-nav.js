/**
 * Mobile dropdown navigation for logged-in pages.
 *
 * Automatically:
 *  1. Finds the sidebar <nav> and marks it .app-sidebar (hidden on mobile via CSS)
 *  2. Removes any existing mobile top bar (Type B pages)
 *  3. Injects a sticky top bar with hamburger icon
 *  4. Builds a dropdown menu from the sidebar links
 *  5. Handles open/close, click-outside, and ESC
 */
(function () {
  'use strict';

  // ── Find the sidebar nav ───────────────────────────────────────
  function findSidebarNav() {
    const el = document.getElementById('sidebar');
    if (el) return el;
    const candidates = document.querySelectorAll('nav.bg-navy');
    for (let ci = 0; ci < candidates.length; ci++) {
      const nav = candidates[ci];
      if (nav.hasAttribute('data-page-header')) continue;
      if (nav.classList.contains('md:w-64') || nav.classList.contains('w-full')) return nav;
    }
    return null;
  }

  const sidebar = findSidebarNav();
  if (!sidebar) return; // Not a logged-in page with sidebar layout

  // Mark it so CSS can hide on mobile
  sidebar.classList.add('app-sidebar');

  // ── Remove old mobile top bar if present (Type B pages) ────────
  const oldTopbar = sidebar.previousElementSibling;
  if (
    oldTopbar &&
    oldTopbar.tagName === 'DIV' &&
    oldTopbar.classList.contains('md:hidden') &&
    oldTopbar.classList.contains('bg-navy')
  ) {
    oldTopbar.remove();
  }

  // ── Remove old sidebar overlay if present (calendar.html) ─────
  const oldOverlay = document.getElementById('sidebarOverlay');
  if (oldOverlay) oldOverlay.remove();

  // ── Detect dark-mode function ──────────────────────────────────
  const darkToggleFn =
    typeof Theme !== 'undefined' && Theme.toggleDark
      ? function () { Theme.toggleDark(); }
      : typeof toggleDarkMode === 'function'
        ? toggleDarkMode
        : null;

  // ── Detect if current user is a parent (hide share from children) ──
  // All pages that load mobile-nav.js are parent-only pages, so default to true.
  // Only set false if we can explicitly confirm this is a child user.
  let isParentUser = true;
  try {
    const currentUser = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
    if (currentUser && (currentUser.type === 'child' || (!currentUser.email && currentUser.username))) {
      isParentUser = false;
    }
  } catch (e) { /* silent — keep default true */ }

  // ── Gated feature paths ───────────────────────────────────────
  const GATED_PATHS = {
    '/reports':      'klinisk_rapportering',
    '/pedagog-note': 'pedagoganteckningar',
    '/for-dig':      'for_dig',
  };
  // Populated async after features load. Default to {} (fail-closed = hide gated links until confirmed)
  let accessibleFeatures = {};

  // Fetch accessible features (for dropdown gate filtering) — shared cache
  const featuresFetch = window.fetchStjarndagFeatures
    ? window.fetchStjarndagFeatures()
    : fetch('/api/features', { credentials: 'include' }).then(function (res) { return res.ok ? res.json() : []; });
  featuresFetch
    .then(function (features) {
      accessibleFeatures = {};
      for (let fi = 0; fi < features.length; fi++) {
        accessibleFeatures[features[fi].slug] = true;
      }
    })
    .catch(function () {
      // fail-closed: leave accessibleFeatures as {} (hides gated links on error)
    });

  // ── Build nav links: NavConfig first, else sidebar scrape ─────
  const sidebarLinks = sidebar.querySelectorAll('ul a');
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  function pathMatches(href, path) {
    if (!href) return false;
    const linkPath = href.split('?')[0].replace(/\/$/, '') || '/';
    if (linkPath === path) return true;
    if (window.NavConfig && NavConfig.activeNavItem) {
      const item = NavConfig.activeNavItem(path);
      if (item && item.href === linkPath) return true;
      if (item && item.paths && item.paths.indexOf(path) >= 0) return true;
    }
    return false;
  }

  function buildConfigLinks() {
    if (!window.NavConfig || !NavConfig.PRIMARY_NAV) return null;
    const items = NavConfig.PRIMARY_NAV.slice();
    if (NavConfig.SETTINGS_NAV) items.push(NavConfig.SETTINGS_NAV);
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      out.push({
        href: item.href,
        label: item.icon + ' ' + item.label,
        active: pathMatches(item.href, currentPath) ||
          (item.paths && item.paths.some(function (p) { return p === currentPath; })),
      });
    }
    return out;
  }

  let navLinks = buildConfigLinks();
  if (!navLinks || !navLinks.length) {
    navLinks = [];
    for (let si = 0; si < sidebarLinks.length; si++) {
      const sl = sidebarLinks[si];
      const shref = sl.getAttribute('href');
      const slPath = shref ? shref.replace(/\/$/, '') : '';
      const slug = GATED_PATHS[slPath] || sl.getAttribute('data-feature');
      if (slug && !accessibleFeatures[slug]) continue;
      navLinks.push({
        href: shref,
        label: sl.textContent,
        active: slPath === currentPath,
      });
    }
  }

  // ── Build top bar ──────────────────────────────────────────────
  const topbar = document.createElement('div');
  topbar.className = 'mobile-topbar';
  topbar.innerHTML =
    '<a href="/dashboard" class="topbar-brand">' +
      '<span>⭐</span>' +
      '<h1>appen</h1>' +
    '</a>' +
    '<div class="topbar-actions">' +
      (isParentUser
        ? '<button class="topbar-share-btn" title="Tipsa en familj om appen!" aria-label="Dela appen">' +
          (window.ParentNavIcons ? window.ParentNavIcons.share : '↗') +
          '</button>'
        : '') +
      (darkToggleFn
        ? '<button class="topbar-dark-toggle" title="Mörkt läge" aria-label="Växla mörkt läge">🌙</button>'
        : '') +
      '<button class="mobile-hamburger" aria-label="Öppna meny" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
    '</div>';

  // Insert before sidebar (which is hidden on mobile)
  sidebar.parentNode.insertBefore(topbar, sidebar);

  // ── Build dropdown ─────────────────────────────────────────────
  const dropdown = document.createElement('div');
  dropdown.className = 'mobile-dropdown';
  dropdown.setAttribute('role', 'dialog');
  dropdown.setAttribute('aria-label', 'Mobilmeny');

  let linksHtml = '<div class="mobile-dropdown-links">';
  for (let ni = 0; ni < navLinks.length; ni++) {
    const nlink = navLinks[ni];
    linksHtml +=
      '<a href="' + nlink.href + '"' +
      (nlink.active ? ' class="active-link"' : '') +
      '>' + nlink.label + '</a>';
  }
  linksHtml += '</div>';

  // Tipsa button in dropdown (parent-only, prominent amber CTA)
  if (isParentUser) {
    linksHtml +=
      '<button class="btn-dropdown-share" type="button">' +
        (window.ParentNavIcons ? window.ParentNavIcons.share : '↗') +
        ' Tipsa en familj!' +
      '</button>';
  }

  // Extra actions: Facebook
  linksHtml +=
    '<a href="https://facebook.com/mystarday" target="_blank" rel="noopener noreferrer" class="btn-facebook-link">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2" style="flex-shrink:0;margin-right:6px;" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>' +
      'Följ oss på Facebook' +
    '</a>';

  linksHtml += '<div class="dropdown-footer">';
  if (darkToggleFn) {
    linksHtml +=
      '<button class="btn-dark-toggle" type="button">' +
        '<span>🌙</span> Mörkt läge' +
      '</button>';
  }
  linksHtml +=
    '<button class="btn-logout" type="button">Logga ut</button>';
  linksHtml += '</div>';

  dropdown.innerHTML = linksHtml;

  // Insert after topbar
  topbar.parentNode.insertBefore(dropdown, topbar.nextSibling);

  // ── Wire up hamburger ──────────────────────────────────────────
  const hamburger = topbar.querySelector('.mobile-hamburger');

  function openMenu() {
    dropdown.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    dropdown.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (dropdown.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  hamburger.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMenu();
  });

  // ── Click outside closes ───────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!dropdown.classList.contains('open')) return;
    if (!dropdown.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  // ── ESC closes ─────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dropdown.classList.contains('open')) {
      closeMenu();
    }
  });

  // ── Dropdown link clicks close the menu ────────────────────────
  const dropdownLinks = dropdown.querySelectorAll('a');
  for (let j = 0; j < dropdownLinks.length; j++) {
    dropdownLinks[j].addEventListener('click', closeMenu);
  }

  // ── Dark mode toggle in dropdown ───────────────────────────────
  if (darkToggleFn) {
    const topbarDarkBtn = topbar.querySelector('.topbar-dark-toggle');
    if (topbarDarkBtn) {
      topbarDarkBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        darkToggleFn();
      });
    }

    const dropdownDarkBtn = dropdown.querySelector('.btn-dark-toggle');
    if (dropdownDarkBtn) {
      dropdownDarkBtn.addEventListener('click', function () {
        darkToggleFn();
        closeMenu();
      });
    }
  }

  // ── Inject share button into desktop sidebar (for parent users) ─
  if (isParentUser) {
    const sidebarFooter = sidebar.querySelector('.border-t');
    if (sidebarFooter) {
      var sidebarShareBtn = document.createElement('button');
      sidebarShareBtn.className = 'sidebar-share-btn w-full px-4 py-2 text-white hover:bg-navy-soft rounded-lg transition-colors text-left flex items-center gap-2';
      sidebarShareBtn.type = 'button';
      sidebarShareBtn.innerHTML = (window.ParentNavIcons ? window.ParentNavIcons.share : '<span>↗</span>') + ' Tipsa en familj!';
      // Insert as first child of the footer section
      sidebarFooter.insertBefore(sidebarShareBtn, sidebarFooter.firstChild);
    }
  }


  function handleShare() {
    if (window.ParentShareFlow && ParentShareFlow.open) {
      ParentShareFlow.open();
    }
  }

  // ── Wire up share buttons (topbar + sidebar) ──────────────────
  const inviteBtn = topbar.querySelector('.topbar-share-btn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleShare();
    });
  }

  // Wire up desktop sidebar share button
  var sidebarShareBtn = sidebar.querySelector('.sidebar-share-btn');
  if (sidebarShareBtn) {
    sidebarShareBtn.addEventListener('click', function () {
      handleShare();
    });
  }

  // Wire up dropdown share button (mobile menu Tipsa link)
  const dropdownShareBtn = dropdown.querySelector('.btn-dropdown-share');
  if (dropdownShareBtn) {
    dropdownShareBtn.addEventListener('click', function () {
      closeMenu();
      handleShare();
    });
  }

  // ── Logout button in dropdown ──────────────────────────────────
  const dropdownLogout = dropdown.querySelector('.btn-logout');
  if (dropdownLogout) {
    dropdownLogout.addEventListener('click', function () {
      // Trigger the same logout as auth.js
      const sidebarLogout = document.getElementById('logoutBtn');
      if (sidebarLogout) {
        sidebarLogout.click();
      } else if (typeof Auth !== 'undefined' && Auth.logout) {
        // Fallback: call Auth.logout() (server-side logout + client-side clear)
        Auth.logout();
      } else {
        // Last-resort fallback: clear client state and redirect to landing page
        if (typeof Auth !== 'undefined' && Auth.clearAuth) { Auth.clearAuth(); }
        window.location.href = '/';
      }
    });
  }

  // Expose close function globally (in case other scripts need it)
  window.closeMobileNav = closeMenu;
})();
