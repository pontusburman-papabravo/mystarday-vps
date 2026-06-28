/**
 * journey-parent-ack.js — parent acknowledgment modal via Journey Context (Fas 2).
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

    const headline = document.getElementById('journeyParentAckHeadline');
    const activity = document.getElementById('journeyParentAckActivity');
    const child = document.getElementById('journeyParentAckChild');
    const btn = document.getElementById('journeyParentAckDismissBtn');

    if (headline) headline.textContent = exp.headline || 'Barnet klarade en aktivitet!';
    if (child) child.textContent = item.child_name || 'Barnet';
    if (activity) activity.textContent = item.activity_name || 'en aktivitet';
    if (btn) {
      btn.textContent = exp.cta || 'Visa';
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
    setInterval(pollPendingCompletions, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.JourneyParentAck = { pollPendingCompletions };
})();
