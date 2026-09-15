/**
 * Contextual Help Bubble (❓) for logged-in pages.
 * Auto-detects the current page and shows relevant FAQ content.
 * Position: bottom-right, above the nav bar on mobile.
 * Does NOT conflict with support-bubble.js (which is logged-out only).
 *
 * Usage: Include <script src="/js/help-bubble.js"></script> before </body>.
 * Optional: set window.HELP_PAGE to override auto-detection.
 */
(function () {
  'use strict';

  if (document.getElementById('helpBubbleRoot')) return;
  // Skip if the page already has its own help button (e.g. dashboard.html)
  if (document.getElementById('helpBtn')) return;
  // Admin panel has its own layout — no floating help bubble
  if ((window.location.pathname || '').startsWith('/admin')) return;

  const SUPPORTED_PAGES = new Set([
    'dashboard', 'child-dashboard', 'skattkammaren', 'schedule', 'family',
    'activities', 'library', 'settings', 'calendar', 'daily-log', 'assign-schedule', 'admin',
  ]);

  let _pageKey = null;
  let _root = null;
  let _stylesMounted = false;

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function ht(key, params) {
    if (window.I18n && typeof I18n.t === 'function') {
      const full = 'help.' + key;
      const value = I18n.t(full, params || {});
      if (value !== full) return value;
    }
    if (typeof window.pt === 'function') return window.pt('help.' + key, params || {});
    return key;
  }

  function getPageContent(pageKey) {
    if (!window.I18n || typeof I18n.get !== 'function') return null;
    if (pageKey === 'child-dashboard') {
      const childContent = I18n.get('child.helpBubble');
      if (!childContent || !Array.isArray(childContent.tabs)) return null;
      return { title: childContent.title, tabs: childContent.tabs };
    }
    const page = I18n.get('help.pages.' + pageKey);
    if (!page || !Array.isArray(page.tabs)) return null;
    return page;
  }

  async function ensureI18n() {
    if (!window.I18n) return;
    if (Object.keys(I18n.locale || {}).length > 0) return;
    try {
      await I18n.init();
    } catch (_) { /* non-blocking */ }
  }

  // ─── Auto-detect page ──────────────────────────────────────────────────────
  function detectPage() {
    if (window.HELP_PAGE) return window.HELP_PAGE;
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '') || 'dashboard';
    if (path === 'admin' || path.startsWith('admin/')) return 'admin';
    return path;
  }

  // ─── Build HTML ────────────────────────────────────────────────────────────
  function buildFaqItem(faq) {
    return `
      <div class="hb-faq-item">
        <button class="hb-faq-q" onclick="window.__hbToggleFaq(this)">
          <span class="hb-faq-text">${esc(faq.q)}</span>
          <span class="hb-faq-icon">+</span>
        </button>
        <div class="hb-faq-a" style="display:none;">
          ${faq.a}
        </div>
      </div>
      <hr class="hb-hr">
    `;
  }

  function buildTabContent(tab, isFirst) {
    return `
      <div id="hb-content-${tab.id}" class="hb-tab-content" ${isFirst ? '' : 'style="display:none;"'}>
        ${tab.faqs.map(buildFaqItem).join('')}
      </div>
    `;
  }

  function buildTabBtn(tab, isFirst) {
    return `
      <button class="hb-tab-btn ${isFirst ? 'hb-tab-active' : ''}"
        data-tab="${tab.id}"
        onclick="window.__hbSwitchTab(this, '${tab.id}')">
        ${esc(tab.label)}
      </button>
    `;
  }

  function buildPanelBody(content) {
    const tabsHtml = content.tabs.length > 1
      ? '<div class="hb-tabs" role="tablist">' +
        content.tabs.map(function (tab, i) { return buildTabBtn(tab, i === 0); }).join('') +
        '</div>'
      : '';
    const contentHtml = content.tabs.map(function (tab, i) { return buildTabContent(tab, i === 0); }).join('');
    return tabsHtml + '<div class="hb-content">' + contentHtml + '</div>';
  }

  function renderPanel(content) {
    if (!_root || !content) return;
    const btn = _root.querySelector('#hbBtn');
    const panel = _root.querySelector('#hbPanel');
    const titleEl = _root.querySelector('.hb-title');
    const closeBtn = _root.querySelector('.hb-close');
    if (btn) {
      btn.title = ht('chrome.openTitle');
      btn.setAttribute('aria-label', ht('chrome.openAria'));
    }
    if (panel) panel.setAttribute('aria-label', content.title || '');
    if (titleEl) titleEl.textContent = content.title || '';
    if (closeBtn) closeBtn.setAttribute('aria-label', ht('chrome.closeAria'));
    const journeyMount = panel && panel.querySelector('#hbJourneyTipMount');
    const existingTabs = panel && panel.querySelector('.hb-tabs');
    const existingContent = panel && panel.querySelector('.hb-content');
    if (existingTabs) existingTabs.remove();
    if (existingContent) existingContent.remove();
    if (panel && journeyMount) {
      journeyMount.insertAdjacentHTML('afterend', buildPanelBody(content));
    }
  }

  function buildShellHtml() {
    return (
      '<button id="hbBtn" onclick="window.__hbToggle()" title="" aria-label="">' +
        '?' +
      '</button>' +
      '<div id="hbBackdrop" onclick="window.__hbClose()"></div>' +
      '<div id="hbPanel" role="dialog" aria-modal="true" aria-label="">' +
        '<div class="hb-header">' +
          '<h2 class="hb-title"></h2>' +
          '<button class="hb-close" onclick="window.__hbClose()" aria-label="">×</button>' +
        '</div>' +
        '<div id="hbJourneyTipMount" class="hb-journey-tip-mount" style="display:none;"></div>' +
      '</div>'
    );
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #helpBubbleRoot {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Trigger button — mobile: stack above native tab bar when present.
       z-index stays BELOW modal overlays (Tailwind z-50) so the bubble never
       covers modal CTAs or validation errors. */
    #hbBtn {
      position: fixed;
      bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 64px);
      right: max(16px, env(safe-area-inset-right, 0px));
      z-index: 40;
      width: 44px;
      height: 44px;
      background: #1B2340;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(27,35,64,0.3);
      transition: background 0.2s, transform 0.15s;
    }
    #hbBtn:hover {
      background: #2A3458;
      transform: scale(1.08);
    }
    #hbBtn:active {
      transform: scale(0.95);
    }
    /* On desktop, align higher (no bottom nav) */
    @media (min-width: 768px) {
      #hbBtn {
        bottom: 24px;
        right: 80px;  /* offset right of support bubble at right:24px */
        z-index: 40;
      }
    }

    /* PWA/mobile without native tab bar or magic shell dock */
    @media (max-width: 767px) {
      body:not(.has-native-tab-bar):not(.parent-magic-view):not(.parent-magic-dashboard):not(.parent-magic-library) #hbBtn {
        bottom: 80px;
        z-index: 40;
      }
    }

    /* Backdrop */
    #hbBackdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 9980;
    }
    #hbBackdrop.hb-open { display: block; }

    /* Panel */
    #hbPanel {
      display: none;
      position: fixed;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 100%;
      max-width: 520px;
      max-height: 82vh;
      background: white;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 40px rgba(27,35,64,0.18);
      z-index: 9981;
      overflow: hidden;
      flex-direction: column;
      animation: hbSlideUp 0.25s ease-out;
    }
    #hbPanel.hb-open {
      display: flex;
    }
    @media (min-width: 768px) {
      #hbPanel {
        bottom: 80px;
        right: 80px;
        left: auto;
        transform: none;
        border-radius: 20px;
        max-height: 80vh;
        max-width: 480px;
      }
    }

    @keyframes hbSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @media (min-width: 768px) {
      @keyframes hbSlideUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    }

    /* Header */
    .hb-header {
      position: sticky;
      top: 0;
      background: white;
      border-bottom: 1px solid #EDE7F6;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      border-radius: 20px 20px 0 0;
    }
    .hb-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 16px;
      color: #1B2340;
      margin: 0;
    }
    .hb-close {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #EDE7F6;
      border: none;
      cursor: pointer;
      font-size: 20px;
      font-weight: 700;
      color: #1B2340;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      line-height: 1;
    }
    .hb-close:hover { background: #d8d0f0; }

    /* Tabs */
    .hb-tabs {
      display: flex;
      gap: 4px;
      padding: 10px 12px;
      border-bottom: 1px solid #EDE7F6;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .hb-tabs::-webkit-scrollbar { display: none; }
    .hb-tab-btn {
      white-space: nowrap;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      background: #EDE7F6;
      color: #1B2340;
    }
    .hb-tab-btn:hover { background: #d8d0f0; }
    .hb-tab-btn.hb-tab-active {
      background: #1B2340;
      color: white;
    }

    /* Scrollable content area */
    .hb-content {
      overflow-y: auto;
      padding: 16px 20px;
      flex: 1;
    }

    /* FAQ items */
    .hb-faq-item { }
    .hb-faq-q {
      width: 100%;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: #1B2340;
      gap: 8px;
    }
    .hb-faq-q:hover .hb-faq-text { color: #2A3458; }
    .hb-faq-text { flex: 1; text-align: left; }
    .hb-faq-icon {
      color: #5A6178;
      font-size: 18px;
      flex-shrink: 0;
      line-height: 1;
    }
    .hb-faq-a {
      padding-bottom: 12px;
      font-size: 12px;
      color: #5A6178;
      line-height: 1.7;
    }
    .hb-hr {
      border: none;
      border-top: 1px solid #EDE7F6;
      margin: 0;
    }
    .hb-hr:last-child { display: none; }

    /* Signup journey contextual tip */
    .hb-journey-tip-mount {
      flex-shrink: 0;
      padding: 0 16px 12px;
      border-bottom: 1px solid #EDE7F6;
    }
    .help-journey-tip {
      border-radius: 14px;
      border: 2px solid #C7D2FE;
      background: #EEF2FF;
      padding: 12px 14px;
    }
    .help-journey-tip--celebration {
      border-color: rgba(245, 166, 35, 0.45);
      background: #FFF8E7;
    }
    .help-journey-tip--reflection {
      border-color: rgba(245, 166, 35, 0.45);
      background: #FFF8E7;
    }
    .help-journey-tip-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #4338CA;
      margin: 0 0 4px;
    }
    .help-journey-tip--celebration .help-journey-tip-label,
    .help-journey-tip--reflection .help-journey-tip-label {
      color: #B45309;
    }
    .help-journey-tip-headline {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: #1B2340;
      margin: 0 0 4px;
    }
    .help-journey-tip-body {
      font-size: 12px;
      color: #5A6178;
      line-height: 1.6;
      margin: 0 0 10px;
    }
    .help-journey-tip-body--pre {
      white-space: pre-line;
    }
    .help-journey-tip-cta {
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 10px;
      background: #F5A623;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .help-journey-tip-cta:hover { background: #E09510; }
  `;

  function refreshHelpContent() {
    if (!_pageKey) _pageKey = detectPage();
    if (!SUPPORTED_PAGES.has(_pageKey)) return;
    const content = getPageContent(_pageKey);
    if (!content) return;
    if (!_root) {
      mountHelpBubble();
      return;
    }
    renderPanel(content);
  }

  async function mountHelpBubble() {
    await ensureI18n();
    _pageKey = detectPage();
    if (!SUPPORTED_PAGES.has(_pageKey)) return;
    const content = getPageContent(_pageKey);
    if (!content) return;

    if (!_stylesMounted) {
      document.head.appendChild(style);
      _stylesMounted = true;
    }

    if (!_root) {
      _root = document.createElement('div');
      _root.id = 'helpBubbleRoot';
      _root.innerHTML = buildShellHtml();
      document.body.appendChild(_root);
    }

    renderPanel(content);
  }

  function scheduleMount() {
    mountHelpBubble().catch(function (err) {
      console.warn('[help-bubble] mount failed:', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMount);
  } else {
    scheduleMount();
  }

  document.addEventListener('locale-changed', refreshHelpContent);
  document.addEventListener('parent-i18n-ready', refreshHelpContent);
  document.addEventListener('child-i18n-ready', refreshHelpContent);

  // ─── Journey tip (signup slim) ─────────────────────────────────────────────
  let tipModuleLoading = false;
  let systemHelpModuleLoading = false;

  function ensureSystemHelpModule(cb) {
    if (window.GrowthSystemHelp) {
      cb();
      return;
    }
    if (systemHelpModuleLoading) {
      document.addEventListener('growth-system-help-ready', cb, { once: true });
      return;
    }
    systemHelpModuleLoading = true;
    const s = document.createElement('script');
    s.src = '/js/growth-system-help.js';
    s.onload = function () {
      systemHelpModuleLoading = false;
      document.dispatchEvent(new Event('growth-system-help-ready'));
      cb();
    };
    s.onerror = function () {
      systemHelpModuleLoading = false;
      cb();
    };
    document.head.appendChild(s);
  }

  function ensureTipModule(cb) {
    if (window.HelpJourneyTip) {
      cb();
      return;
    }
    if (tipModuleLoading) {
      document.addEventListener('help-journey-tip-ready', cb, { once: true });
      return;
    }
    tipModuleLoading = true;
    const s = document.createElement('script');
    s.src = '/js/help-journey-tip.js';
    s.onload = function () {
      tipModuleLoading = false;
      document.dispatchEvent(new Event('help-journey-tip-ready'));
      cb();
    };
    s.onerror = function () {
      tipModuleLoading = false;
    };
    document.head.appendChild(s);
  }

  function refreshJourneyTip() {
    const mount = document.getElementById('hbJourneyTipMount');
    if (!mount) return;
    ensureSystemHelpModule(function () {
      if (window.GrowthSystemHelp && typeof GrowthSystemHelp.refreshHelpPanel === 'function') {
        GrowthSystemHelp.refreshHelpPanel(mount).then(function (data) {
          if (data && data.eligible) return;
          ensureTipModule(function () {
            if (window.HelpJourneyTip) HelpJourneyTip.refresh(mount);
          });
        });
        return;
      }
      ensureTipModule(function () {
        if (window.HelpJourneyTip) HelpJourneyTip.refresh(mount);
      });
    });
  }

  // ─── Logic ─────────────────────────────────────────────────────────────────
  window.__hbToggle = function () {
    const panel = document.getElementById('hbPanel');
    const backdrop = document.getElementById('hbBackdrop');
    const isOpen = panel.classList.contains('hb-open');
    if (isOpen) {
      panel.classList.remove('hb-open');
      backdrop.classList.remove('hb-open');
    } else {
      panel.classList.add('hb-open');
      backdrop.classList.add('hb-open');
      refreshJourneyTip();
    }
  };

  window.__hbClose = function () {
    document.getElementById('hbPanel').classList.remove('hb-open');
    document.getElementById('hbBackdrop').classList.remove('hb-open');
  };

  window.__hbSwitchTab = function (btn, tabId) {
    // Reset tab buttons
    document.querySelectorAll('#helpBubbleRoot .hb-tab-btn').forEach(b => {
      b.classList.remove('hb-tab-active');
    });
    btn.classList.add('hb-tab-active');
    // Hide/show content
    document.querySelectorAll('#helpBubbleRoot .hb-tab-content').forEach(c => {
      c.style.display = 'none';
    });
    const target = document.getElementById('hb-content-' + tabId);
    if (target) target.style.display = 'block';
  };

  window.__hbToggleFaq = function (btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.style.display !== 'none';
    answer.style.display = isOpen ? 'none' : 'block';
    btn.querySelector('.hb-faq-icon').textContent = isOpen ? '+' : '−';
  };

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.__hbClose();
  });

})();
