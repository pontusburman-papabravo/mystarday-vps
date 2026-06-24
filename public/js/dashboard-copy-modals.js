/**
 * Dashboard copy/delete/confirm modals (Fas 8 F2h).
 * Delete-schedule confirm, copy-day, copy-to-child, and the generic confirm modal,
 * extracted from dashboard.js. Reads/writes group state (copyDaySelections,
 * copyTargetChildId) + globals (currentChildId, currentScheduleId, currentDay, children,
 * scheduleItems; renderEmptyDay, showToast, apiFetch, escHtml).
 * Handlers exposed on window for inline onclick + cross-file callers (openConfirmModal).
 */
(function () {
  const { DAYS } = window.ScheduleCore;

  function confirmDeleteSchedule() {
    openConfirmModal(`Ta bort hela schemat för ${DAYS[currentDay]}?`, async () => {
      const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/${currentScheduleId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Schemat har tagits bort'); currentScheduleId = null; scheduleItems = []; renderEmptyDay(); }
      else { const d = await res.json(); showToast(d.error || 'Fel uppstod', true); }
    });
  }

  // ── Copy day/child ────────────────────────────────────────
  function openCopyDayModal() {
    if (!currentScheduleId) { showToast('Inget schema att kopiera', true); return; }
    copyDaySelections = [];
    document.getElementById('copyFromLabel').innerHTML = `Kopiera schemat från <strong>${DAYS[currentDay]}</strong> till:`;
    document.getElementById('copyDayPicker').innerHTML = [1, 2, 3, 4, 5, 6, 0].filter(d => d !== currentDay).map(d => `<button type="button" onclick="toggleCopyDay(${d},this)" class="px-4 py-3 rounded-xl border-2 border-lavender text-sm font-semibold transition-colors hover:border-navy text-navy" data-day="${d}">${DAYS[d]}</button>`).join('');
    document.getElementById('copyDayModal').classList.remove('hidden');
  }
  function toggleCopyDay(d, btn) { const idx = copyDaySelections.indexOf(d); if (idx === -1) { copyDaySelections.push(d); btn.classList.add('bg-navy', 'text-white', 'border-navy'); } else { copyDaySelections.splice(idx, 1); btn.classList.remove('bg-navy', 'text-white', 'border-navy'); } }
  function closeCopyDayModal() { document.getElementById('copyDayModal').classList.add('hidden'); }
  async function submitCopyDay() {
    if (!copyDaySelections.length) { showToast('Välj minst en dag', true); return; }
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-day`, { method: 'POST', body: JSON.stringify({ from_day: currentDay, to_days: copyDaySelections }) });
    const data = await res.json();
    if (res.ok) { closeCopyDayModal(); showToast(`Schema kopierat till ${data.copied_to_days.length} dag(ar)`); }
    else showToast(data.error || 'Fel uppstod', true);
  }
  function openCopyChildModal() {
    if (!currentChildId) return;
    copyTargetChildId = null;
    const others = children.filter(c => c.id !== currentChildId);
    if (!others.length) { showToast('Inga andra barn', true); return; }
    document.getElementById('copyChildPicker').innerHTML = others.map(c => `<button type="button" onclick="selectCopyChild('${c.id}',this)" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-lavender hover:border-gold transition-colors text-left" data-cid="${c.id}"><span class="text-2xl">${c.emoji || '👤'}</span><span class="font-semibold text-navy">${escHtml(c.name)}</span></button>`).join('');
    document.getElementById('copyChildModal').classList.remove('hidden');
  }
  function selectCopyChild(id, btn) { copyTargetChildId = id; document.querySelectorAll('#copyChildPicker button').forEach(b => { b.classList.toggle('border-gold', b.dataset.cid === id); b.classList.toggle('bg-sky', b.dataset.cid === id); }); }
  function closeCopyChildModal() { document.getElementById('copyChildModal').classList.add('hidden'); }
  async function submitCopyChild() {
    if (!copyTargetChildId) { showToast('Välj ett barn', true); return; }
    const res = await window.apiFetch(`/api/children/${currentChildId}/schedules/copy-to-child`, { method: 'POST', body: JSON.stringify({ target_child_id: copyTargetChildId }) });
    const data = await res.json();
    if (res.ok) { closeCopyChildModal(); showToast('Veckoschemat har kopierats'); }
    else showToast(data.error || 'Fel uppstod', true);
  }

  // ── Confirm modal ─────────────────────────────────────────
  function openConfirmModal(msg, cb) {
    document.getElementById('confirmMsg').textContent = msg;
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      okBtn.disabled = true;
      try {
        await cb();
        closeConfirmModal();
      } catch (_) {
        showToast('Nätverksfel. Försök igen.', true);
      } finally {
        okBtn.disabled = false;
      }
    };
    document.getElementById('confirmModal').classList.remove('hidden');
  }
  function closeConfirmModal() { document.getElementById('confirmModal').classList.add('hidden'); }

  // Exposed on window for inline onclick + cross-file callers
  window.confirmDeleteSchedule = confirmDeleteSchedule;
  window.openCopyDayModal = openCopyDayModal;
  window.toggleCopyDay = toggleCopyDay;
  window.closeCopyDayModal = closeCopyDayModal;
  window.submitCopyDay = submitCopyDay;
  window.openCopyChildModal = openCopyChildModal;
  window.selectCopyChild = selectCopyChild;
  window.closeCopyChildModal = closeCopyChildModal;
  window.submitCopyChild = submitCopyChild;
  window.openConfirmModal = openConfirmModal;
  window.closeConfirmModal = closeConfirmModal;
})();
