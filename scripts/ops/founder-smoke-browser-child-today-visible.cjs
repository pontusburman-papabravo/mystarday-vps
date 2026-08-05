'use strict';

/** Swedish core copy that must not be visible on en-GB Child Today main/nav. */
const SWEDISH_CHILD_TODAY_LEAK_PATTERNS = [
  { id: 'idag', re: /\bidag\b/i, label: 'Idag' },
  { id: 'skattkammaren', re: /skattkammaren/i, label: 'Skattkammaren' },
  { id: 'nasta', re: /nästa/i, label: 'Nästa' },
  { id: 'uppdrag', re: /\buppdrag\b/i, label: 'Uppdrag' },
  { id: 'klart', re: /\bklart\b/i, label: 'Klart' },
  { id: 'senare', re: /\bsenare\b/i, label: 'Senare' },
  { id: 'nu_zone', re: /(?:^|\n)\s*⚡\s*NU\b/m, label: 'Nu' },
  { id: 'nu_word', re: /(?:^|\s)nu(?:\s|:|$)/i, label: 'Nu' },
];

const CHILD_TODAY_MAIN_SELECTORS = ['#childMainHeader', '#todayFocusMount'];
const CHILD_TODAY_NAV_SELECTOR = '#childBottomNav';
const CHILD_TODAY_READY_ATTR = 'childTodayI18nReady';

function isElementVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = typeof window !== 'undefined' && window.getComputedStyle
    ? window.getComputedStyle(el)
    : null;
  if (style) {
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
  }
  if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) {
    return false;
  }
  return true;
}

function visibleInnerTextFromRoot(root) {
  if (!root || !isElementVisible(root)) return '';
  const parts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !isElementVisible(parent)) return NodeFilter.FILTER_REJECT;
      const raw = node.textContent || '';
      if (!raw.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    parts.push(node.textContent);
    node = walker.nextNode();
  }
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

function collectChildTodayCanonicalVisibleTextInPage() {
  const mainChunks = CHILD_TODAY_MAIN_SELECTORS.map((sel) => {
    const el = document.querySelector(sel);
    return {
      selector: sel,
      text: el ? visibleInnerTextFromRoot(el) : '',
      present: Boolean(el),
      visible: el ? isElementVisible(el) : false,
    };
  });
  const navEl = document.querySelector(CHILD_TODAY_NAV_SELECTOR);
  const navChunk = {
    selector: CHILD_TODAY_NAV_SELECTOR,
    text: navEl ? visibleInnerTextFromRoot(navEl) : '',
    present: Boolean(navEl),
    visible: navEl ? isElementVisible(navEl) : false,
  };
  const mainText = mainChunks.map((c) => c.text).filter(Boolean).join('\n');
  const navText = navChunk.text || '';
  return {
    mainText,
    navText,
    main: mainChunks,
    nav: navChunk,
    child_today_i18n_ready: document.documentElement.dataset[CHILD_TODAY_READY_ATTR] === 'true',
    html_lang: document.documentElement.lang || '',
  };
}

function findSwedishChildTodayLeaks(text, region) {
  const t = String(text || '');
  const hits = [];
  for (const pat of SWEDISH_CHILD_TODAY_LEAK_PATTERNS) {
    if (pat.re.test(t)) {
      hits.push({ region, pattern_id: pat.id, label: pat.label });
    }
  }
  return hits;
}

function hasSwedishChildTodayCoreLeakInText(text) {
  return findSwedishChildTodayLeaks(text, 'text').length > 0;
}

module.exports = {
  SWEDISH_CHILD_TODAY_LEAK_PATTERNS,
  CHILD_TODAY_MAIN_SELECTORS,
  CHILD_TODAY_NAV_SELECTOR,
  CHILD_TODAY_READY_ATTR,
  isElementVisible,
  visibleInnerTextFromRoot,
  collectChildTodayCanonicalVisibleTextInPage,
  findSwedishChildTodayLeaks,
  hasSwedishChildTodayCoreLeakInText,
};
