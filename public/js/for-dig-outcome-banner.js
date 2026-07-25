/**
 * for-dig-outcome-banner.js — 7-day outcome check-in on dashboard.
 */
(function () {
  'use strict';

  const BANNER_ID = 'forDigOutcomeBanner';

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

  function ensureBanner() {
    let el = document.getElementById(BANNER_ID);
    if (el) return el;
    const anchor = document.getElementById('activationProgramBanner') ||
      document.getElementById('dagensNyhetAppBanner');
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.className = 'hidden mx-4 mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-4';
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
    } else {
      const main = document.querySelector('main') || document.body;
      main.prepend(el);
    }
    return el;
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
    // Server records `for_dig_feedback_outcome` on the feedback route — no
    // client-side analytics call here, otherwise the event is counted twice.
  }

  function showFollowUp(item, score, banner) {
    const isPositive = score >= 3;
    const prompt = isPositive ? pt('home.forDig.outcome.followUpBetter') : pt('home.forDig.outcome.followUpWorse');
    banner.innerHTML = `
      <p class="text-sm font-medium text-navy mb-2">${prompt} ${pt('home.forDig.outcome.optional')}</p>
      <textarea id="forDigOutcomeText" rows="2" maxlength="500" class="w-full text-sm rounded-lg border border-amber-200 p-2 mb-2"></textarea>
      <button type="button" id="forDigOutcomeFollowSubmit" class="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm">${pt('home.forDig.outcome.send')}</button>
      <button type="button" id="forDigOutcomeFollowSkip" class="w-full mt-2 text-xs text-text-soft underline">${pt('home.forDig.outcome.skip')}</button>
    `;
    banner.querySelector('#forDigOutcomeFollowSkip').addEventListener('click', () => banner.classList.add('hidden'));
    banner.querySelector('#forDigOutcomeFollowSubmit').addEventListener('click', async () => {
      const text = banner.querySelector('#forDigOutcomeText').value.trim();
      try {
        await submitOutcome(item, score, text);
      } catch (_) { /* silent */ }
      banner.classList.add('hidden');
    });
  }

  function render(item) {
    const banner = ensureBanner();
    banner.dataset.itemJson = JSON.stringify(item);
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <p class="font-heading font-bold text-navy">${esc(pt('home.forDig.outcome.title', { goal: item.goal_title }))}</p>
      <p class="text-xs text-text-soft mt-1">${esc(pt('home.forDig.outcome.sub', { name: item.child_name }))}</p>
      <div class="flex flex-wrap gap-2 mt-3" id="forDigOutcomeButtons">
        ${outcomes().map((o) => `
          <button type="button" data-score="${o.score}" class="flex-1 min-w-[120px] py-2 px-2 rounded-lg border-2 border-amber-300 bg-white text-sm font-medium hover:bg-amber-100">
            ${o.emoji} ${esc(o.label)}
          </button>
        `).join('')}
      </div>
    `;
    banner.querySelector('#forDigOutcomeButtons').addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-score]');
      if (!btn) return;
      const score = parseInt(btn.dataset.score, 10);
      try {
        await submitOutcome(item, score);
        showFollowUp(item, score, banner);
      } catch (_) {
        banner.classList.add('hidden');
      }
    });
  }

  async function init() {
    if (!window.apiFetch) return;
    if (typeof Auth !== 'undefined' && Auth.getUser) {
      const user = Auth.getUser();
      if (!user || user.type !== 'parent') return;
    }
    try {
      const features = window.fetchStjarndagFeatures
        ? await window.fetchStjarndagFeatures()
        : await (await window.apiFetch('/api/features')).json();
      const hasForDig = Array.isArray(features) && features.some((f) => f.slug === 'for_dig');
      if (!hasForDig) return;
    } catch (_) { return; }
    try {
      const res = await window.apiFetch('/api/for-dig/feedback/pending');
      if (!res.ok) return;
      const pending = await res.json();
      if (Array.isArray(pending) && pending.length > 0) {
        render(pending[0]);
      }
    } catch (_) { /* non-blocking */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('parent-i18n-ready', () => {
    const el = document.getElementById(BANNER_ID);
    if (el && !el.classList.contains('hidden') && el.dataset.itemJson) {
      try { render(JSON.parse(el.dataset.itemJson)); } catch (_) { /* ignore */ }
    }
  });
})();
