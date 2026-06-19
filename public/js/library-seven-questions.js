/**
 * Library editor — De sju frågorna per aktivitet (E7).
 */
(function (global) {
  'use strict';

  const FIELDS = [
    { key: 'where', label: 'Var?' },
    { key: 'who', label: 'Vem?' },
    { key: 'how_long', label: 'Hur länge?' },
    { key: 'what_next', label: 'Vad händer sen?' },
    { key: 'what_need', label: 'Vad behöver jag?' },
    { key: 'why', label: 'Varför?' },
  ];

  let pictograms = [];
  let familyActivities = [];
  let draft = {};
  let editorEnabled = false;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  async function loadPictograms() {
    if (pictograms.length) return pictograms;
    try {
      const res = await window.apiFetch('/api/activities/pictograms');
      if (res.ok) {
        const data = await res.json();
        pictograms = data.pictograms || [];
      }
    } catch (_) { /* ignore */ }
    return pictograms;
  }

  async function loadFamilyActivities() {
    if (familyActivities.length) return familyActivities;
    try {
      const res = await window.apiFetch('/api/activities');
      if (res.ok) familyActivities = await res.json();
    } catch (_) { /* ignore */ }
    return familyActivities;
  }

  async function checkEditorAccess() {
    if (!global.PreviewShell) {
      editorEnabled = true;
      return true;
    }
    try {
      const access = await PreviewShell.loadAccess();
      if (access.components?.teacch?.has) {
        editorEnabled = true;
        return true;
      }
      if (access.preview?.teacch && access.rollout_mode !== 'off') {
        editorEnabled = false;
        return false;
      }
      editorEnabled = false;
      return false;
    } catch (_) {
      editorEnabled = true;
      return true;
    }
  }

  function pictogramEmoji(key) {
    const p = pictograms.find((x) => x.key === key);
    return p ? p.emoji : '•';
  }

  function renderFieldRow(field) {
    const val = draft[field.key] || {};
    const emoji = val.emoji || pictogramEmoji(val.icon_key);
    const isHowLong = field.key === 'how_long';
    const isWhatNext = field.key === 'what_next';

    let extra = '';
    if (isHowLong) {
      extra = `<input type="number" min="1" max="120" placeholder="min" class="sq-minutes w-16 px-2 py-1 rounded-lg border border-lavender text-sm" value="${val.minutes != null ? esc(val.minutes) : ''}" data-field="${field.key}">`;
    }
    if (isWhatNext && familyActivities.length) {
      const opts = familyActivities.map((a) =>
        `<option value="${a.id}" ${val.activity_template_id === a.id ? 'selected' : ''}>${esc(a.name)}</option>`
      ).join('');
      extra += `<select class="sq-next-activity mt-1 w-full px-2 py-1 rounded-lg border border-lavender text-sm" data-field="${field.key}">
        <option value="">Välj aktivitet (valfritt)</option>${opts}</select>`;
    }

    return `<div class="sq-field border border-lavender/60 rounded-xl p-3" data-sq-field="${field.key}">
      <label class="text-xs font-bold text-navy block mb-1">${field.label}</label>
      <div class="flex gap-2 items-start flex-wrap">
        <button type="button" class="sq-pic-btn text-xl w-10 h-10 rounded-lg bg-sky border border-lavender" data-field="${field.key}" title="Välj bild">${emoji}</button>
        <input type="text" class="sq-text flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-lavender text-sm" data-field="${field.key}" placeholder="Text…" value="${esc(val.text || '')}">
        ${extra}
      </div>
      <div class="sq-pic-picker hidden flex flex-wrap gap-1 mt-2 max-h-24 overflow-y-auto p-2 bg-sky rounded-lg" data-picker="${field.key}"></div>
    </div>`;
  }

  function renderSection() {
    const section = document.getElementById('libSevenQuestionsSection');
    const body = document.getElementById('libSevenQuestionsBody');
    if (!section || !body) return;

    if (!editorEnabled) {
      body.innerHTML = `
        <p class="text-sm text-text-soft mb-3">Visuellt stöd (De sju frågorna) ingår i paketet Extra stöd.</p>
        <button type="button" id="libSqInterestBtn" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-navy rounded-xl text-sm font-semibold">Jag är intresserad av Extra stöd</button>
        <p id="libSqInterestMsg" class="text-xs text-green-700 mt-2 hidden"></p>`;
      const btn = document.getElementById('libSqInterestBtn');
      if (btn && global.PackageInterestTriggers) {
        btn.addEventListener('click', () => {
          PackageInterestTriggers.showModal({ component: 'teacch', source: 'contextual_trigger' });
        });
      }
      return;
    }

    body.innerHTML = FIELDS.map(renderFieldRow).join('');
    body.querySelectorAll('.sq-pic-btn').forEach((btn) => {
      btn.addEventListener('click', () => togglePicker(btn.dataset.field));
    });
    body.querySelectorAll('.sq-pic-picker').forEach((picker) => {
      picker.innerHTML = pictograms.map((p) =>
        `<button type="button" class="text-lg p-1 hover:bg-white rounded" data-key="${p.key}" data-emoji="${esc(p.emoji)}" title="${esc(p.label)}">${p.emoji}</button>`
      ).join('');
      picker.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => selectPictogram(picker.dataset.picker, b.dataset.key, b.dataset.emoji));
      });
    });
  }

  function togglePicker(field) {
    const picker = document.querySelector(`.sq-pic-picker[data-picker="${field}"]`);
    if (!picker) return;
    picker.classList.toggle('hidden');
  }

  function selectPictogram(field, key, emoji) {
    draft[field] = draft[field] || {};
    draft[field].icon_key = key;
    draft[field].emoji = emoji;
    const btn = document.querySelector(`.sq-pic-btn[data-field="${field}"]`);
    if (btn) btn.textContent = emoji;
    const picker = document.querySelector(`.sq-pic-picker[data-picker="${field}"]`);
    if (picker) picker.classList.add('hidden');
  }

  function collectFromDom() {
    const out = {};
    FIELDS.forEach((field) => {
      const textEl = document.querySelector(`.sq-text[data-field="${field.key}"]`);
      const minutesEl = document.querySelector(`.sq-minutes[data-field="${field.key}"]`);
      const nextEl = document.querySelector(`.sq-next-activity[data-field="${field.key}"]`);
      const text = textEl ? textEl.value.trim() : (draft[field.key]?.text || '');
      const icon_key = draft[field.key]?.icon_key || null;
      const emoji = draft[field.key]?.emoji || null;
      if (!text && !icon_key && !emoji) return;
      out[field.key] = { text, icon_key, emoji };
      if (field.key === 'how_long' && minutesEl && minutesEl.value) {
        out[field.key].minutes = parseInt(minutesEl.value, 10) || null;
      }
      if (field.key === 'what_next' && nextEl && nextEl.value) {
        out[field.key].activity_template_id = nextEl.value;
      }
    });
    return out;
  }

  async function initForActivity(act) {
    draft = act && act.seven_questions ? JSON.parse(JSON.stringify(act.seven_questions)) : {};
    delete draft.what;

    const section = document.getElementById('libSevenQuestionsSection');
    if (!section) return;

    await Promise.all([loadPictograms(), loadFamilyActivities(), checkEditorAccess()]);
    renderSection();
    section.classList.remove('hidden');
  }

  function reset() {
    draft = {};
    editorEnabled = false;
    const section = document.getElementById('libSevenQuestionsSection');
    if (section) section.classList.add('hidden');
  }

  function getPayload() {
    if (!editorEnabled) return undefined;
    return collectFromDom();
  }

  global.LibrarySevenQuestions = {
    initForActivity,
    reset,
    getPayload,
  };
})(window);
