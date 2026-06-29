/**
 * Celebratory modal — parent aha moment (Fas 2).
 * Invariant #7: modal only, not inline banner.
 */
(function () {
  const MODAL_ID = 'activationAhaModal';
  const QUEUE = [];
  let showing = false;

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showModal(item) {
    const modal = getModal();
    if (!modal) return;

    const childEl = document.getElementById('activationAhaChildName');
    const activityEl = document.getElementById('activationAhaActivityName');
    const btn = document.getElementById('activationAhaDismissBtn');

    if (childEl) childEl.textContent = item.child_name || 'Barnet';
    if (activityEl) activityEl.textContent = item.activity_name || 'en aktivitet';
    if (btn) {
      btn.dataset.dailyLogItemId = item.daily_log_item_id;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    showing = true;
  }

  function hideModal() {
    const modal = getModal();
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    showing = false;
  }

  async function dismissCurrent() {
    const btn = document.getElementById('activationAhaDismissBtn');
    const itemId = btn?.dataset?.dailyLogItemId;
    hideModal();

    if (itemId && typeof window.apiFetch === 'function') {
      try {
        await window.apiFetch('/api/me/activation-program/aha-dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daily_log_item_id: itemId }),
        });
      } catch (_) {
        // Non-critical
      }
    }

    if (QUEUE.length > 0) {
      const next = QUEUE.shift();
      showModal(next);
    }
  }

  function enqueueCompletions(items) {
    for (const item of items) {
      if (!item?.daily_log_item_id) continue;
      const dup = QUEUE.some((q) => q.daily_log_item_id === item.daily_log_item_id);
      if (!dup) QUEUE.push(item);
    }
    if (!showing && QUEUE.length > 0) {
      showModal(QUEUE.shift());
    }
  }

  async function pollNewCompletions() {
    if (typeof window.apiFetch !== 'function') return;
    try {
      if (window.JourneyContextClient) {
        const journeyOn = await JourneyContextClient.isJourneyApiEnabled();
        if (journeyOn) {
          const ctx = await JourneyContextClient.fetchContext();
          if (ctx?.capabilities?.parent_ack_v1 || ctx?.capabilities?.activation_ui_removed) {
            return;
          }
        }
      }
      const res = await window.apiFetch('/api/me/activation-program/new-completions');
      if (res.status === 410) return;
      if (!res.ok) return;
      const data = await res.json();
      if (data?.completions?.length) {
        enqueueCompletions(data.completions);
      }
    } catch (_) {
      // Non-critical
    }
  }

  function init() {
    const btn = document.getElementById('activationAhaDismissBtn');
    if (btn) {
      btn.addEventListener('click', dismissCurrent);
    }

    const modal = getModal();
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) dismissCurrent();
      });
    }

    window.addEventListener('sse:DAILY_LOG_ITEM_COMPLETED', () => {
      setTimeout(pollNewCompletions, 800);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', pollNewCompletions);
    } else {
      pollNewCompletions();
    }
  }

  init();
})();
