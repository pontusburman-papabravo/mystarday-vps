/**
 * Celebratory modal — parent aha moment (first unseen child completion).
 */

(function () {
  let _queue = [];
  let _showing = false;

  function ensureModal() {
    let el = document.getElementById('activationAhaModal');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'activationAhaModal';
    el.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50';
    el.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border-2 border-gold" role="dialog" aria-modal="true">
        <div class="text-5xl mb-3" id="activationAhaEmoji">🎉</div>
        <p class="font-heading font-bold text-navy text-lg mb-2" id="activationAhaTitle"></p>
        <p class="text-text-soft text-sm mb-6" id="activationAhaBody"></p>
        <button type="button" id="activationAhaDismissBtn"
          class="w-full py-3 rounded-xl bg-gold text-navy font-semibold hover:opacity-90 transition-opacity">
          Toppen!
        </button>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('#activationAhaDismissBtn').addEventListener('click', dismissCurrent);
    return el;
  }

  async function markSeen(itemId) {
    try {
      await window.apiFetch('/api/me/activation-program/aha-seen', {
        method: 'POST',
        body: JSON.stringify({ daily_log_item_id: itemId }),
      });
    } catch (_) {}
  }

  async function trackDismissed(itemId) {
    try {
      await window.apiFetch('/api/me/activation-program/aha-dismissed', {
        method: 'POST',
        body: JSON.stringify({ daily_log_item_id: itemId }),
      });
    } catch (_) {}
  }

  function showNext() {
    if (_showing || !_queue.length) return;
    _showing = true;
    const moment = _queue.shift();
    const modal = ensureModal();
    document.getElementById('activationAhaTitle').textContent =
      `${moment.child_name} klarade "${moment.activity_name}"`;
    document.getElementById('activationAhaBody').textContent =
      'Utan att du behövde påminna.';
    modal.dataset.itemId = moment.daily_log_item_id;
    modal.classList.remove('hidden');
    markSeen(moment.daily_log_item_id);
  }

  async function dismissCurrent() {
    const modal = document.getElementById('activationAhaModal');
    if (!modal) return;
    const itemId = modal.dataset.itemId;
    modal.classList.add('hidden');
    if (itemId) await trackDismissed(itemId);
    _showing = false;
    showNext();
  }

  function enqueue(moments) {
    if (!Array.isArray(moments) || !moments.length) return;
    _queue = _queue.concat(moments);
    showNext();
  }

  window.ActivationProgramAha = { enqueue, dismissCurrent };
})();
