/**
 * for-dig-outcome-banner.js — dismissible 7-day outcome check-in on Hem.
 *
 * Normal /dashboard shows one eligible pending item and respects dismiss.
 * Explicit /dashboard?for_dig_feedback=1 opens the same form even if dismissed.
 */
(function () {
  'use strict';

  const BANNER_ID = 'forDigOutcomeBanner';
  const EXPLICIT_PARAM = 'for_dig_feedback';

  let explicitQueue = [];
  let homeDismissedThisView = false;

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function outcomes() {
    return [
      { score: 4, emoji: '😊', label: pt('home.forDig.outcome.great') },
      { score: 3, emoji: '🙂', label: pt('home.forDig.outcome.better') },
      { score: 2, emoji: '😐', label: pt('home.forDig.outcome.same') },
      { score: 1, emoji: '🙁', label: pt('home.forDig.outcome.worse') },
    ];
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isExplicitFeedbackMode(search) {
    try {
      const raw = search != null ? search : (window.location && window.location.search) || '';
      return new URLSearchParams(String(raw).replace(/^\?/, '')).get(EXPLICIT_PARAM) === '1';
    } catch (_) {
      return false;
    }
  }

  function isParentUser() {
    if (typeof Auth !== 'undefined' && Auth.getUser) {
      const user = Auth.getUser();
      if (!user || user.type !== 'parent') return false;
    }
    return true;
  }

  function ensureBanner() {
    let el = document.getElementById(BANNER_ID);
    if (el) return el;
    const anchor = document.getElementById('activationProgramBanner') ||
      document.getElementById('dagensNyhetAppBanner');
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.className = 'hidden relative mx-4 mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-4 pr-12';
    el.setAttribute('role', 'region');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      const main = document.querySelector('main') || document.body;
      main.prepend(el);
    }
    return el;
  }

  function hideBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    banner.classList.add('hidden');
    banner.innerHTML = '';
    delete banner.dataset.itemJson;
    delete banner.dataset.mode;
  }

  async function submitOutcome(item, score, freeText) {
    await window.apiFetch('/api/for-dig/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_slug: item.goal_slug,
        child_id: item.child_id,
        phase: 'outcome',
        outcome_score: score,
        free_text: freeText || undefined,
      }),
    });
  }

  async function dismissItem(item) {
    await window.apiFetch('/api/for-dig/feedback/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: item.child_id,
        goal_slug: item.goal_slug,
      }),
    });
  }

  function bindDismiss(banner, item, explicit) {
    const btn = banner.querySelector('#forDigOutcomeDismiss');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (!explicit) {
        homeDismissedThisView = true;
        try {
          await dismissItem(item);
        } catch (_) { /* still hide locally */ }
      }
      hideBanner();
    });
  }

  function showThanks(banner, explicit) {
    banner.dataset.mode = 'thanks';
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <p class="font-heading font-bold text-navy">${esc(pt('home.forDig.outcome.thanks'))}</p>
    `;
    if (explicit && explicitQueue.length > 0) {
      banner.innerHTML += `
        <div class="flex flex-col gap-2 mt-3">
          <button type="button" id="forDigOutcomeNext" class="w-full min-h-[44px] py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm">${esc(pt('home.forDig.outcome.next'))}</button>
          <button type="button" id="forDigOutcomeDone" class="w-full min-h-[44px] py-2 text-sm text-text-soft underline">${esc(pt('home.forDig.outcome.done'))}</button>
        </div>
      `;
      banner.querySelector('#forDigOutcomeNext').addEventListener('click', () => {
        const next = explicitQueue.shift();
        if (next) renderQuestion(next, true);
        else showAlreadyAnswered(banner);
      });
      banner.querySelector('#forDigOutcomeDone').addEventListener('click', hideBanner);
      return;
    }
    window.setTimeout(hideBanner, 2500);
  }

  function showAlreadyAnswered(banner) {
    banner.dataset.mode = 'already';
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <p class="font-heading font-bold text-navy">${esc(pt('home.forDig.outcome.alreadyAnswered'))}</p>
      <button type="button" id="forDigOutcomeDone" class="mt-3 min-h-[44px] text-sm text-text-soft underline">${esc(pt('home.forDig.outcome.done'))}</button>
    `;
    banner.querySelector('#forDigOutcomeDone').addEventListener('click', hideBanner);
  }

  function showFollowUp(item, score, banner, explicit) {
    const isPositive = score >= 3;
    const prompt = isPositive ? pt('home.forDig.outcome.followUpBetter') : pt('home.forDig.outcome.followUpWorse');
    banner.dataset.mode = 'followup';
    banner.innerHTML = `
      <button type="button" id="forDigOutcomeDismiss" class="absolute top-1 right-1 min-h-[44px] min-w-[44px] rounded-lg text-xl text-navy/60 hover:bg-amber-100" aria-label="${esc(pt('home.forDig.outcome.dismissAria'))}">×</button>
      <p class="text-sm font-medium text-navy mb-2">${esc(prompt)} ${esc(pt('home.forDig.outcome.optional'))}</p>
      <textarea id="forDigOutcomeText" rows="2" maxlength="500" class="w-full text-sm rounded-lg border border-amber-200 p-2 mb-2"></textarea>
      <button type="button" id="forDigOutcomeFollowSubmit" class="w-full min-h-[44px] py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm">${esc(pt('home.forDig.outcome.send'))}</button>
      <button type="button" id="forDigOutcomeFollowSkip" class="w-full mt-2 min-h-[44px] text-sm text-text-soft underline">${esc(pt('home.forDig.outcome.skip'))}</button>
    `;
    bindDismiss(banner, item, explicit);
    async function finish(text) {
      try {
        await submitOutcome(item, score, text);
      } catch (_) { /* still show thanks */ }
      showThanks(banner, explicit);
    }
    banner.querySelector('#forDigOutcomeFollowSkip').addEventListener('click', () => finish(''));
    banner.querySelector('#forDigOutcomeFollowSubmit').addEventListener('click', () => {
      const text = banner.querySelector('#forDigOutcomeText').value.trim();
      finish(text);
    });
  }

  function renderQuestion(item, explicit) {
    const banner = ensureBanner();
    banner.dataset.itemJson = JSON.stringify(item);
    banner.dataset.mode = explicit ? 'explicit' : 'home';
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <button type="button" id="forDigOutcomeDismiss" class="absolute top-1 right-1 min-h-[44px] min-w-[44px] rounded-lg text-xl text-navy/60 hover:bg-amber-100" aria-label="${esc(pt('home.forDig.outcome.dismissAria'))}">×</button>
      <p class="font-heading font-bold text-navy">${esc(pt('home.forDig.outcome.title', { goal: item.goal_title }))}</p>
      <p class="text-xs text-text-soft mt-1">${esc(pt('home.forDig.outcome.sub', { name: item.child_name }))}</p>
      <div class="flex flex-wrap gap-2 mt-3" id="forDigOutcomeButtons">
        ${outcomes().map((o) => `
          <button type="button" data-score="${o.score}" class="flex-1 min-w-[120px] min-h-[44px] py-2 px-2 rounded-lg border-2 border-amber-300 bg-white text-sm font-medium hover:bg-amber-100">
            ${o.emoji} ${esc(o.label)}
          </button>
        `).join('')}
      </div>
    `;
    bindDismiss(banner, item, explicit);
    banner.querySelector('#forDigOutcomeButtons').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-score]');
      if (!btn) return;
      const score = parseInt(btn.dataset.score, 10);
      showFollowUp(item, score, banner, explicit);
    });
  }

  async function init() {
    if (!window.apiFetch) return;
    if (!isParentUser()) return;
    try {
      const features = window.fetchStjarndagFeatures
        ? await window.fetchStjarndagFeatures()
        : await (await window.apiFetch('/api/features')).json();
      const hasForDig = Array.isArray(features) && features.some((f) => f.slug === 'for_dig');
      if (!hasForDig) return;
    } catch (_) { return; }

    const explicit = isExplicitFeedbackMode();
    try {
      const res = await window.apiFetch('/api/for-dig/feedback/pending');
      if (!res.ok) return;
      const pending = await res.json();
      const items = Array.isArray(pending) ? pending : [];
      if (explicit) {
        if (items.length === 0) {
          showAlreadyAnswered(ensureBanner());
          return;
        }
        explicitQueue = items.slice(1);
        renderQuestion(items[0], true);
        return;
      }
      if (homeDismissedThisView) return;
      const homeItem = items.find((item) => !item.dismissed);
      if (homeItem) renderQuestion(homeItem, false);
    } catch (_) { /* non-blocking */ }
  }

  window.ForDigOutcomeBanner = {
    init,
    isExplicitFeedbackMode,
    BANNER_ID,
    EXPLICIT_PARAM,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('parent-i18n-ready', () => {
    const el = document.getElementById(BANNER_ID);
    if (el && !el.classList.contains('hidden') && el.dataset.itemJson && el.dataset.mode !== 'thanks' && el.dataset.mode !== 'already') {
      try {
        renderQuestion(JSON.parse(el.dataset.itemJson), el.dataset.mode === 'explicit');
      } catch (_) { /* ignore */ }
    }
  });
})();
