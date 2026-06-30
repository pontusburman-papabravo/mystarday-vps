/**
 * journey-parent-ack.js — parent acknowledgment modal via Journey Context (Fas 2).
 * Experience Pack copy takes precedence when platform runtime is active.
 */
(function () {
  'use strict';

  const MODAL_ID = 'journeyParentAckModal';

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  async function pollPendingCompletions() {
    if (!window.JourneyContextClient) return;
    const ackOn = await JourneyContextClient.isJourneyApiEnabled();
    if (!ackOn) return;

    const ctx = await JourneyContextClient.fetchContext();
    if (ctx?.blocking_experience !== 'parent_ack_completion') return;

    try {
      const res = await window.apiFetch('/api/me/journey-context/pending-completions');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.completions?.length) showAck(data.completions[0], ctx);
    } catch (_) {}
  }

  async function showAck(item, ctx) {
    const modal = getModal();
    if (!modal) return;

    const registry = await JourneyContextClient.fetchRegistry();
    const exp = registry?.phases?.[ctx.phase]?.parent_ack_completion
      || registry?.phases?.FIRST_USE?.parent_ack_completion
      || {};

    const pack = item.pack_feedback;
    const hasPack = Boolean(pack?.headline || pack?.parent_message);

    const headline = document.getElementById('journeyParentAckHeadline');
    const body = document.getElementById('journeyParentAckBody');
    const detail = document.getElementById('journeyParentAckDetail');
    const child = document.getElementById('journeyParentAckChild');
    const activity = document.getElementById('journeyParentAckActivity');
    const btn = document.getElementById('journeyParentAckDismissBtn');

    if (headline) {
      headline.textContent = hasPack
        ? (pack.headline || pack.parent_message)
        : (exp.headline || 'Barnet klarade en aktivitet!');
    }

    if (body) {
      const bodyText = hasPack ? pack.body : exp.body;
      if (bodyText) {
        body.textContent = bodyText;
        body.classList.remove('hidden');
      } else {
        body.textContent = '';
        body.classList.add('hidden');
      }
    }

    if (detail) {
      if (hasPack) {
        detail.classList.add('hidden');
      } else {
        detail.classList.remove('hidden');
        if (child) child.textContent = item.child_name || 'Barnet';
        if (activity) activity.textContent = item.activity_name || 'en aktivitet';
      }
    }

    if (btn) {
      btn.textContent = (hasPack && pack.cta) ? pack.cta : (exp.cta || 'Det ser jag');
      btn.dataset.dailyLogItemId = item.daily_log_item_id;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideAck() {
    const modal = getModal();
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function dismissAck() {
    const btn = document.getElementById('journeyParentAckDismissBtn');
    const itemId = btn?.dataset?.dailyLogItemId;
    hideAck();
    if (itemId && window.JourneyContextClient) {
      await JourneyContextClient.postEvent('parent_ack_dismissed', null, itemId);
    }
  }

  function init() {
    const btn = document.getElementById('journeyParentAckDismissBtn');
    if (btn) btn.addEventListener('click', dismissAck);
    pollPendingCompletions();
    setInterval(pollPendingCompletions, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JourneyParentAck = { pollPendingCompletions };
})();
