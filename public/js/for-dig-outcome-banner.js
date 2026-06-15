/**
 * for-dig-outcome-banner.js — 7-day outcome check-in on dashboard.
 */
(function () {
  'use strict';

  const BANNER_ID = 'forDigOutcomeBanner';
  const OUTCOMES = [
    { score: 4, emoji: '😊', label: 'Stor förbättring' },
    { score: 3, emoji: '🙂', label: 'Lite bättre' },
    { score: 2, emoji: '😐', label: 'Ingen skillnad' },
    { score: 1, emoji: '🙁', label: 'Fungerar inte' },
  ];

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
    fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'for_dig_feedback_outcome',
        metadata: { goal_slug: item.goal_slug, outcome_score: score, child_id: item.child_id },
      }),
    }).catch(() => {});
  }

  function showFollowUp(item, score, banner) {
    const isPositive = score >= 3;
    const prompt = isPositive ? 'Vad blev bättre?' : 'Vad saknas?';
    banner.innerHTML = `
      <p class="text-sm font-medium text-amber-900 mb-2">${prompt} (valfritt)</p>
      <textarea id="forDigOutcomeText" rows="2" maxlength="500" class="w-full text-sm rounded-lg border border-amber-200 p-2 mb-2"></textarea>
      <button type="button" id="forDigOutcomeFollowSubmit" class="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm">Skicka</button>
      <button type="button" id="forDigOutcomeFollowSkip" class="w-full mt-2 text-xs text-amber-800 underline">Hoppa över</button>
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
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <p class="font-heading font-bold text-amber-900">Hur har det gått med ${esc(item.goal_title)}?</p>
      <p class="text-xs text-amber-800 mt-1">För ${esc(item.child_name)} — aktiverat för över en vecka sedan</p>
      <div class="flex flex-wrap gap-2 mt-3" id="forDigOutcomeButtons">
        ${OUTCOMES.map((o) => `
          <button type="button" data-score="${o.score}" class="flex-1 min-w-[120px] py-2 px-2 rounded-lg border-2 border-amber-300 bg-white text-sm font-medium hover:bg-amber-100">
            ${o.emoji} ${o.label}
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
})();
