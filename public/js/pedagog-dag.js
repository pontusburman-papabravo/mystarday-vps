/**
 * Pedagog dagvy — tre sektioner (§4.4.10, E12).
 */
(function () {
  'use strict';

  let children = [];
  let childId = null;
  let dateStr = new Date().toLocaleDateString('sv-SE');
  let absence = null;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  async function api(path, opts) {
    return Auth.api(path, opts);
  }

  async function loadChildren() {
    const data = await api('/api/pedagog-notes/children');
    children = data.children || [];
    if (!childId && children[0]) childId = children[0].id;
  }

  async function loadDay() {
    const main = document.getElementById('pedagogDagMain');
    if (!main || !childId) return;

    main.innerHTML = '<p class="text-text-soft text-sm py-8 text-center">Laddar dagvy…</p>';

    const [logRes, absenceRes, schoolRes, noteRes] = await Promise.all([
      api(`/api/pedagog/daily-log?childId=${childId}&date=${dateStr}`).catch(() => ({ items: [] })),
      api(`/api/pedagog/absence?childId=${childId}&date=${dateStr}`).catch(() => ({ absence: null })),
      api(`/api/pedagog/school-activities?childId=${childId}`).catch(() => ({ activities: [] })),
      api(`/api/pedagog-notes?childId=${childId}&date=${dateStr}`).catch(() => ({ note: null })),
    ]);

    absence = absenceRes.absence;
    const items = logRes.items || [];
    const school = schoolRes.activities || [];
    const note = noteRes.note;

    const child = children.find((c) => c.id === childId);
    const readOnly = !!absence;

    main.innerHTML = `
      <header class="mb-4">
        <label class="text-xs font-semibold text-text-soft">Barn</label>
        <select id="pedagogChildSelect" class="w-full mt-1 px-3 py-2 rounded-xl border border-lavender text-sm">
          ${children.map((c) => `<option value="${c.id}" ${c.id === childId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <div class="flex gap-2 mt-3 items-center">
          <input type="date" id="pedagogDateInput" value="${dateStr}" class="flex-1 px-3 py-2 rounded-xl border border-lavender text-sm">
          <button type="button" id="pedagogAbsenceBtn" class="px-3 py-2 rounded-xl text-xs font-semibold ${absence ? 'bg-orange-100 text-orange-800' : 'bg-sky text-navy'}">
            ${absence ? 'Frånvarande ✓' : 'Markera frånvaro'}
          </button>
        </div>
        ${absence ? '<p class="mt-2 text-sm text-orange-700 bg-orange-50 rounded-xl px-3 py-2">⚠️ Barn markerat som frånvarande — aktiviteter är skrivskyddade.</p>' : ''}
      </header>

      <section class="mb-6">
        <h2 class="text-sm font-bold text-navy mb-2">1. Dagens aktiviteter</h2>
        <div class="space-y-2" id="pedagogLogItems">
          ${items.length ? items.map(renderLogItem).join('') : '<p class="text-text-soft text-sm">Inga aktiviteter idag.</p>'}
        </div>
      </section>

      <section class="mb-6">
        <h2 class="text-sm font-bold text-navy mb-2">2. Daganteckning</h2>
        <textarea id="pedagogNoteInput" rows="4" class="w-full px-3 py-2 rounded-xl border border-lavender text-sm" placeholder="Observationer från dagen…" ${readOnly ? 'disabled' : ''}>${esc(note?.notes || '')}</textarea>
        <div class="flex gap-2 mt-2">
          <button type="button" id="pedagogSaveNoteBtn" class="px-4 py-2 bg-lavender text-navy rounded-xl text-sm font-semibold" ${readOnly ? 'disabled' : ''}>Spara utkast</button>
          <button type="button" id="pedagogPublishNoteBtn" class="px-4 py-2 bg-gold text-navy rounded-xl text-sm font-semibold" ${readOnly ? 'disabled' : ''}>Publicera</button>
        </div>
        <p id="pedagogNoteStatus" class="text-xs text-text-soft mt-1">${note?.note_status === 'published' ? 'Publicerad' : note?.note_status === 'locked' ? 'Låst' : 'Utkast'}</p>
      </section>

      <section>
        <h2 class="text-sm font-bold text-navy mb-2">3. Skolaktiviteter</h2>
        <ul class="space-y-2 mb-3" id="pedagogSchoolList">
          ${school.map((a) => `<li class="flex justify-between items-center bg-white border border-lavender rounded-xl px-3 py-2 text-sm">
            <span>${a.icon || '📌'} ${esc(a.name)}</span>
            ${!readOnly ? `<button type="button" data-id="${a.id}" class="pedagogDelSchool text-red-600 text-xs">Ta bort</button>` : ''}
          </li>`).join('') || '<li class="text-text-soft text-sm">Inga skolaktiviteter.</li>'}
        </ul>
        ${!readOnly ? `<div class="flex gap-2">
          <input type="text" id="pedagogSchoolName" placeholder="Ny skolaktivitet…" class="flex-1 px-3 py-2 rounded-xl border border-lavender text-sm">
          <button type="button" id="pedagogAddSchoolBtn" class="px-3 py-2 bg-gold rounded-xl text-sm font-semibold">+</button>
        </div>` : ''}
      </section>`;

    document.getElementById('pedagogChildSelect').addEventListener('change', (e) => {
      childId = e.target.value;
      loadDay();
    });
    document.getElementById('pedagogDateInput').addEventListener('change', (e) => {
      dateStr = e.target.value;
      loadDay();
    });
    document.getElementById('pedagogAbsenceBtn').addEventListener('click', toggleAbsence);
    if (!readOnly) {
      document.getElementById('pedagogSaveNoteBtn').addEventListener('click', saveNote);
      document.getElementById('pedagogPublishNoteBtn').addEventListener('click', publishNote);
      document.getElementById('pedagogAddSchoolBtn').addEventListener('click', addSchool);
      document.querySelectorAll('.pedagogDelSchool').forEach((btn) => {
        btn.addEventListener('click', () => deleteSchool(btn.dataset.id));
      });
      document.querySelectorAll('.pedagog-check-item').forEach((btn) => {
        btn.addEventListener('click', () => completeItem(btn.dataset.id));
      });
    }
  }

  function renderLogItem(item) {
    const done = item.completed;
    const parentDone = done && item.completed_by === 'parent';
    const schoolDone = done && item.completed_by === 'pedagog';
    let status = '';
    if (parentDone) status = '<span class="text-xs text-green-700">Klar hemma</span>';
    else if (schoolDone) status = '<span class="text-xs text-blue-700">Klar i skola</span>';

    const btn = !done && !absence
      ? `<button type="button" class="pedagog-check-item px-3 py-1 bg-mint rounded-lg text-xs font-semibold" data-id="${item.id}">Klar</button>`
      : '';

    return `<div class="flex items-center justify-between bg-white border border-lavender rounded-xl px-3 py-2">
      <div><span class="mr-2">${item.emoji || '⭐'}</span><span class="text-sm font-medium">${esc(item.name)}</span> ${status}</div>
      ${btn}
    </div>`;
  }

  async function completeItem(itemId) {
    try {
      await api(`/api/pedagog/daily-log/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      });
      await loadDay();
    } catch (err) {
      alert(err.message || 'Kunde inte markera aktivitet');
    }
  }

  async function saveNote() {
    const notes = document.getElementById('pedagogNoteInput').value.trim();
    await api('/api/pedagog-notes', {
      method: 'POST',
      body: JSON.stringify({ childId, date: dateStr, notes, isDraft: true }),
    });
    document.getElementById('pedagogNoteStatus').textContent = 'Utkast sparat';
  }

  async function publishNote() {
    await saveNote();
    await api('/api/pedagog-notes/publish', {
      method: 'POST',
      body: JSON.stringify({ childId, date: dateStr }),
    });
    document.getElementById('pedagogNoteStatus').textContent = 'Publicerad';
  }

  async function addSchool() {
    const name = document.getElementById('pedagogSchoolName').value.trim();
    if (!name) return;
    await api('/api/pedagog/school-activities', {
      method: 'POST',
      body: JSON.stringify({ childId, name }),
    });
    await loadDay();
  }

  async function deleteSchool(id) {
    await api(`/api/pedagog/school-activities/${id}`, { method: 'DELETE' });
    await loadDay();
  }

  async function toggleAbsence() {
    if (absence) {
      await api(`/api/pedagog/absence?childId=${childId}&date=${dateStr}`, { method: 'DELETE' });
    } else {
      await api('/api/pedagog/absence', {
        method: 'PUT',
        body: JSON.stringify({ childId, date: dateStr }),
      });
    }
    await loadDay();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login?next=' + encodeURIComponent('/pedagog-dag');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('child')) childId = params.get('child');
    if (params.get('date')) dateStr = params.get('date');
    try {
      await loadChildren();
      if (!children.length) {
        document.getElementById('pedagogDagMain').innerHTML =
          '<p class="text-text-soft text-center py-12">Inga barn kopplade. Be en förälder bjuda in dig.</p>';
        return;
      }
      await loadDay();
    } catch (err) {
      document.getElementById('pedagogDagMain').innerHTML =
        `<p class="text-red-600 text-center py-12">${esc(err.message)}</p>`;
    }
  });
})();
