// Admin Surveys: form builder, question editor, response viewer, seeder.
// Owns: survey CRUD, question/option management, QR codes, response stats.
// Does NOT own: family/child data, auth, analytics outside surveys.

let currentSurvey = null;
let surveyEditMode = false; // 'create' | 'edit' | false

// ── Entry point ────────────────────────────────────────────────────────────
async function loadSurveys() {
  try {
    const surveys = await Auth.api('/api/admin/surveys');
    renderSurveyList(surveys);
  } catch (_err) {
    document.getElementById('surveysListContainer').innerHTML =
      '<p class="text-red-500">Kunde inte ladda enkäter.</p>';
  }
}

// ── Survey list ────────────────────────────────────────────────────────────
function renderSurveyList(surveys) {
  const container = document.getElementById('surveysListContainer');
  if (!surveys || surveys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-text-soft">
        <div class="text-5xl mb-4">📋</div>
        <p class="text-lg font-semibold mb-2">Inga enkäter ännu</p>
        <p class="text-sm mb-6">Skapa din första enkät eller seed de tre inbyggda.</p>
        <button onclick="seedSurveys()" class="px-4 py-2 bg-gold text-navy font-semibold rounded-xl mr-3 hover:bg-gold/80 transition">Seed 3 inbyggda enkäter</button>
        <button onclick="openCreateSurvey()" class="px-4 py-2 bg-navy text-white font-semibold rounded-xl hover:bg-navy-soft transition">+ Ny enkät</button>
      </div>`;
    return;
  }

  const statusLabel = { draft: 'Utkast', active: 'Aktiv', paused: 'Pausad', closed: 'Stängd' };
  const statusColor = {
    draft: 'bg-sky text-navy',
    active: 'bg-mint text-green-800',
    paused: 'bg-gold-light text-yellow-800',
    closed: 'bg-coral text-red-800',
  };

  container.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div></div>
      <div class="flex gap-3">
        <button onclick="seedSurveys()" class="px-3 py-2 bg-sky text-navy text-sm font-semibold rounded-xl hover:bg-lavender transition">🌱 Seed inbyggda</button>
        <button onclick="openCreateSurvey()" class="px-4 py-2 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/80 transition">+ Ny enkät</button>
      </div>
    </div>
    <div class="grid gap-4">
      ${surveys.map(s => `
        <div class="bg-white border-2 border-lavender rounded-2xl p-5 hover:border-gold/50 transition cursor-pointer" onclick="openSurvey('${s.id}')">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[s.status] || statusColor.draft}">${statusLabel[s.status] || s.status}</span>
                ${s.closes_at && new Date(s.closes_at) > new Date() ? `<span class="text-xs text-text-soft">Stängs ${new Date(s.closes_at).toLocaleDateString('sv-SE')}</span>` : ''}
              </div>
              <h4 class="font-heading font-bold text-navy text-lg truncate">${escHtml(s.title)}</h4>
              ${s.target_tag ? `<p class="text-xs text-text-soft mt-0.5">${escHtml(s.target_tag)}</p>` : ''}
              <p class="text-sm text-text-soft mt-1">mystarday.se/tyck/${escHtml(s.slug)}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button onclick="event.stopPropagation();toggleSurveyStatus('${s.id}','${s.status}')"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-navy/20 hover:bg-navy hover:text-white transition"
                title="${s.status === 'active' ? 'Pausa' : 'Aktivera'}">
                ${s.status === 'active' ? '⏸ Pausa' : '▶ Aktivera'}
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Open / edit single survey ──────────────────────────────────────────────
async function openSurvey(id) {
  try {
    const data = await Auth.api(`/api/admin/surveys/${id}`);
    currentSurvey = data;
    renderSurveyEditor(data);
    document.getElementById('surveysListView').classList.add('hidden');
    document.getElementById('surveysEditorView').classList.remove('hidden');
  } catch (_err) {
    alert('Kunde inte öppna enkät.');
  }
}

function closeSurveyEditor() {
  currentSurvey = null;
  document.getElementById('surveysEditorView').classList.add('hidden');
  document.getElementById('surveysListView').classList.remove('hidden');
  loadSurveys();
}

function renderSurveyEditor(survey) {
  const stats = survey.stats || {};
  const statusColor = { draft: 'bg-sky text-navy', active: 'bg-mint text-green-800', paused: 'bg-gold-light text-yellow-800', closed: 'bg-coral text-red-800' };
  const statusLabel = { draft: 'Utkast', active: 'Aktiv', paused: 'Pausad', closed: 'Stängd' };

  document.getElementById('surveysEditorView').innerHTML = `
    <div class="mb-6 flex items-center gap-3">
      <button onclick="closeSurveyEditor()" class="p-2 rounded-xl hover:bg-sky transition text-navy">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div class="flex-1">
        <h3 class="font-heading font-bold text-navy text-xl">${escHtml(survey.title)}</h3>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[survey.status] || statusColor.draft}">${statusLabel[survey.status] || survey.status}</span>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="bg-sky rounded-xl p-4 text-center">
        <div class="text-2xl font-heading font-bold text-navy">${stats.submitted_count || 0}</div>
        <div class="text-xs text-text-soft mt-1">Inskickade svar</div>
      </div>
      <div class="bg-lavender rounded-xl p-4 text-center">
        <div class="text-2xl font-heading font-bold text-navy">${stats.in_progress_count || 0}</div>
        <div class="text-xs text-text-soft mt-1">Påbörjade</div>
      </div>
      <div class="bg-mint rounded-xl p-4 text-center">
        <div class="text-2xl font-heading font-bold text-navy">${stats.total_starts || 0}</div>
        <div class="text-xs text-text-soft mt-1">Totalt startat</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3 mb-6">
      <button onclick="openEditMeta()" class="px-4 py-2 bg-sky text-navy text-sm font-semibold rounded-xl hover:bg-lavender transition">✏️ Redigera info</button>
      <button onclick="toggleSurveyStatus('${survey.id}','${survey.status}')"
        class="px-4 py-2 ${survey.status === 'active' ? 'bg-gold-light text-yellow-800' : 'bg-mint text-green-800'} text-sm font-semibold rounded-xl hover:opacity-80 transition">
        ${survey.status === 'active' ? '⏸ Pausa' : '▶ Aktivera'}
      </button>
      <button onclick="closeSurveyStatus('${survey.id}')" class="px-4 py-2 bg-coral text-red-800 text-sm font-semibold rounded-xl hover:opacity-80 transition">🔒 Stäng enkät</button>
      <button onclick="showQR('${survey.slug}')" class="px-4 py-2 bg-lavender text-navy text-sm font-semibold rounded-xl hover:opacity-80 transition">📱 QR-kod</button>
      <button onclick="viewResponses('${survey.id}')" class="px-4 py-2 bg-sky text-navy text-sm font-semibold rounded-xl hover:bg-lavender transition">📊 Snabbvy</button>
      <button onclick="openRapport('${survey.id}')" class="px-4 py-2 bg-gold text-navy text-sm font-semibold rounded-xl hover:bg-gold/80 transition">📈 Rapport</button>
      <button onclick="openDistributionPanel('${survey.id}')" class="px-4 py-2 bg-lavender text-navy text-sm font-semibold rounded-xl hover:opacity-80 transition">📡 Distribution</button>
      ${survey.contest_enabled ? `<button onclick="openContestPanel('${survey.id}')" class="px-4 py-2 bg-gold-light text-yellow-800 text-sm font-semibold rounded-xl hover:opacity-80 transition">🎁 Tävling</button>` : ''}
    </div>

    <!-- Distribution panel (collapsible) -->
    <div id="distributionPanel" class="hidden mb-6 bg-sky/50 border-2 border-sky rounded-2xl p-5">
      <h4 class="font-heading font-bold text-navy text-base mb-4">📡 Distributionsinställningar</h4>
      <div class="grid grid-cols-1 gap-4">
        <!-- Popup toggles -->
        <div class="bg-white rounded-xl p-4">
          <p class="font-semibold text-navy text-sm mb-3">Popup-kanaler</p>
          <label class="flex items-center gap-3 mb-3">
            <input type="checkbox" id="popupLoggedIn" class="w-4 h-4 accent-navy" ${survey.popup_logged_in_enabled ? 'checked' : ''}>
            <span class="text-sm text-navy">Popup för inloggade föräldrar (Målgrupp A)</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" id="popupLanding" class="w-4 h-4 accent-navy" ${survey.popup_landing_enabled ? 'checked' : ''}>
            <span class="text-sm text-navy">Popup på landningssidan (Målgrupp C)</span>
          </label>
        </div>
        <!-- Trigger config -->
        <div class="bg-white rounded-xl p-4">
          <p class="font-semibold text-navy text-sm mb-3">Trigger (landningssida)</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-soft block mb-1">Fördröjning (sekunder)</label>
              <input type="number" id="triggerDelay" value="${survey.popup_trigger_delay_secs || 8}" min="2" max="60"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-xs text-text-soft block mb-1">Scroll % (0-100)</label>
              <input type="number" id="triggerScroll" value="${survey.popup_trigger_scroll_pct || 50}" min="10" max="90"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
          </div>
        </div>
        <!-- Schedule -->
        <div class="bg-white rounded-xl p-4">
          <p class="font-semibold text-navy text-sm mb-3">Schema</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-soft block mb-1">Startdatum</label>
              <input type="date" id="popupStartDate" value="${survey.popup_start_date ? survey.popup_start_date.slice(0,10) : ''}"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-xs text-text-soft block mb-1">Slutdatum</label>
              <input type="date" id="popupEndDate" value="${survey.popup_end_date ? survey.popup_end_date.slice(0,10) : ''}"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
          </div>
        </div>
        <!-- Audience filter -->
        <div class="bg-white rounded-xl p-4">
          <p class="font-semibold text-navy text-sm mb-1">Målgruppsfilter (registreringsdatum)</p>
          <p class="text-xs text-text-soft mb-3">Lämna tomt för alla användare.</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-soft block mb-1">Registrerade efter</label>
              <input type="date" id="registeredAfter" value="${survey.popup_registered_after ? survey.popup_registered_after.slice(0,10) : ''}"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-xs text-text-soft block mb-1">Registrerade före</label>
              <input type="date" id="registeredBefore" value="${survey.popup_registered_before ? survey.popup_registered_before.slice(0,10) : ''}"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
          </div>
        </div>
        <!-- Contest toggle -->
        <div class="bg-white rounded-xl p-4">
          <label class="flex items-center gap-3 mb-3">
            <input type="checkbox" id="contestEnabled" class="w-4 h-4 accent-navy" ${survey.contest_enabled ? 'checked' : ''} onchange="toggleContestFields()">
            <span class="text-sm font-semibold text-navy">🎁 Aktivera tävlingsfunktion</span>
          </label>
          <div id="contestFields" class="${survey.contest_enabled ? '' : 'hidden'} grid gap-3">
            <div>
              <label class="text-xs text-text-soft block mb-1">Prisbeskrivning</label>
              <input type="text" id="contestPrize" value="${escHtml(survey.contest_prize_description || '')}" placeholder="Ex: Presentkort på 500 kr"
                class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-soft block mb-1">Antal vinnare</label>
                <input type="number" id="contestWinners" value="${survey.contest_winner_count || 1}" min="1" max="20"
                  class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
              </div>
              <div>
                <label class="text-xs text-text-soft block mb-1">Utlottningsdatum</label>
                <input type="date" id="contestClosesAt" value="${survey.contest_closes_at ? survey.contest_closes_at.slice(0,10) : ''}"
                  class="w-full border border-lavender rounded-lg px-3 py-1.5 text-sm">
              </div>
            </div>
          </div>
        </div>
        <!-- Live stats -->
        <div class="bg-white rounded-xl p-4" id="popupStatsBox">
          <p class="font-semibold text-navy text-sm mb-2">Live-status</p>
          <p class="text-xs text-text-soft" id="popupStatsText">Laddar…</p>
        </div>
        <div class="flex gap-3">
          <button onclick="saveDistribution('${survey.id}')" class="px-5 py-2 bg-navy text-white font-semibold rounded-xl text-sm hover:bg-navy-soft transition">Spara inställningar</button>
          <button onclick="document.getElementById('distributionPanel').classList.add('hidden')" class="px-4 py-2 bg-sky text-navy text-sm font-semibold rounded-xl hover:bg-lavender transition">Stäng</button>
        </div>
      </div>
    </div>

    <!-- Contest panel (collapsible) -->
    <div id="contestPanel" class="hidden mb-6 bg-gold-light/60 border-2 border-yellow-300 rounded-2xl p-5">
      <h4 class="font-heading font-bold text-navy text-base mb-4">🎁 Tävlingspanel</h4>
      <div id="contestEntriesContainer" class="mb-4">
        <p class="text-sm text-text-soft">Laddar deltagare…</p>
      </div>
      <div class="flex gap-3 flex-wrap">
        <button onclick="pickWinners('${survey.id}', ${survey.contest_winner_count || 1})"
          class="px-5 py-2 bg-gold text-navy font-bold rounded-xl text-sm hover:bg-gold/80 transition">
          🎲 Lottra ${survey.contest_winner_count || 1} vinnare
        </button>
        <button onclick="document.getElementById('contestPanel').classList.add('hidden')" class="px-4 py-2 bg-sky text-navy text-sm font-semibold rounded-xl hover:bg-lavender transition">Stäng</button>
      </div>
    </div>

    <!-- Link -->
    <div class="bg-navy/5 rounded-xl p-4 mb-6 flex items-center gap-3">
      <span class="text-sm text-text-soft flex-1 font-mono">mystarday.se/tyck/${escHtml(survey.slug)}</span>
      <button onclick="copyLink('${survey.slug}')" class="text-gold hover:text-gold/70 font-semibold text-sm">Kopiera</button>
      <a href="/tyck/${survey.slug}" target="_blank" class="text-navy hover:text-gold font-semibold text-sm">Öppna ↗</a>
    </div>

    <!-- Questions -->
    <div class="mb-4 flex items-center justify-between">
      <h4 class="font-heading font-bold text-navy text-lg">Frågor (${(survey.questions || []).length})</h4>
      <button onclick="openAddQuestion()" class="px-3 py-2 bg-gold text-navy text-sm font-semibold rounded-xl hover:bg-gold/80 transition">+ Lägg till fråga</button>
    </div>

    <div id="surveyQuestionsContainer">
      ${renderQuestionsList(survey.questions || [])}
    </div>
  `;
}

function renderQuestionsList(questions) {
  if (questions.length === 0) {
    return '<p class="text-text-soft text-sm py-4">Inga frågor ännu. Klicka "Lägg till fråga".</p>';
  }
  const typeLabel = { radio: 'Välj ett', checkbox: 'Flerval', text_short: 'Kort fritext', text_long: 'Lång fritext', scale: 'Skala' };
  return `<div id="questionsSort" class="space-y-3">
    ${questions.map((q, i) => `
      <div class="bg-white border-2 border-lavender rounded-xl p-4 flex gap-3" data-qid="${q.id}">
        <div class="text-text-soft cursor-grab drag-handle pt-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <span class="text-xs font-semibold text-text-soft uppercase tracking-wide">${i + 1}. ${typeLabel[q.question_type] || q.question_type}</span>
              <p class="font-semibold text-navy mt-0.5">${escHtml(q.question_text)}</p>
              ${q.options && q.options.length > 0 ? `<p class="text-xs text-text-soft mt-1">${q.options.map(o => escHtml(o.option_text)).join(' · ')}</p>` : ''}
              ${q.condition_question_id ? '<p class="text-xs text-gold mt-1">⚡ Villkorsstyrd</p>' : ''}
            </div>
            <div class="flex gap-2 shrink-0">
              <button onclick="editQuestion('${q.id}')" class="px-2 py-1 text-xs bg-sky rounded-lg hover:bg-lavender transition">Redigera</button>
              <button onclick="deleteQuestion('${q.id}')" class="px-2 py-1 text-xs bg-coral rounded-lg hover:bg-red-200 transition">Ta bort</button>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Survey meta modal ──────────────────────────────────────────────────────
function openCreateSurvey() {
  surveyEditMode = 'create';
  showMetaModal(null);
}

function openEditMeta() {
  surveyEditMode = 'edit';
  showMetaModal(currentSurvey);
}

function showMetaModal(survey) {
  const modal = document.getElementById('surveyMetaModal');
  document.getElementById('surveyMetaTitle').value = survey?.title || '';
  document.getElementById('surveyMetaSlug').value = survey?.slug || '';
  document.getElementById('surveyMetaDesc').value = survey?.description || '';
  document.getElementById('surveyMetaTag').value = survey?.target_tag || '';
  document.getElementById('surveyMetaClosesAt').value = survey?.closes_at ? survey.closes_at.slice(0, 16) : '';
  document.getElementById('surveyMetaThankyou').value = survey?.thank_you_message || '';
  document.getElementById('surveyMetaCtaText').value = survey?.thank_you_cta_text || '';
  document.getElementById('surveyMetaCtaUrl').value = survey?.thank_you_cta_url || '';
  modal.classList.remove('hidden');
}

function closeMetaModal() {
  document.getElementById('surveyMetaModal').classList.add('hidden');
}

async function saveMetaModal() {
  const payload = {
    title: document.getElementById('surveyMetaTitle').value.trim(),
    slug: document.getElementById('surveyMetaSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description: document.getElementById('surveyMetaDesc').value.trim() || null,
    target_tag: document.getElementById('surveyMetaTag').value.trim() || null,
    closes_at: document.getElementById('surveyMetaClosesAt').value || null,
    thank_you_message: document.getElementById('surveyMetaThankyou').value.trim() || null,
    thank_you_cta_text: document.getElementById('surveyMetaCtaText').value.trim() || null,
    thank_you_cta_url: document.getElementById('surveyMetaCtaUrl').value.trim() || null,
  };
  if (!payload.title || !payload.slug) return alert('Titel och slug krävs.');

  try {
    if (surveyEditMode === 'create') {
      const created = await Auth.api('/api/admin/surveys', { method: 'POST', body: JSON.stringify(payload) });
      closeMetaModal();
      await openSurvey(created.id);
    } else {
      await Auth.api(`/api/admin/surveys/${currentSurvey.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      closeMetaModal();
      await openSurvey(currentSurvey.id);
    }
  } catch (err) {
    alert('Fel vid sparning: ' + (err.message || 'Okänt fel'));
  }
}

// ── Status toggles ─────────────────────────────────────────────────────────
async function toggleSurveyStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  try {
    await Auth.api(`/api/admin/surveys/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    if (currentSurvey && currentSurvey.id === id) {
      await openSurvey(id);
    } else {
      await loadSurveys();
    }
  } catch (_err) {
    alert('Kunde inte uppdatera status.');
  }
}

async function closeSurveyStatus(id) {
  if (!confirm('Stäng enkäten permanent? Respondenter kan inte längre svara.')) return;
  try {
    await Auth.api(`/api/admin/surveys/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) });
    await openSurvey(id);
  } catch (_err) {
    alert('Kunde inte stänga enkäten.');
  }
}

// ── Question editor modal ──────────────────────────────────────────────────
let editingQuestion = null;

function openAddQuestion() {
  editingQuestion = null;
  showQuestionModal(null);
}

async function editQuestion(qid) {
  const q = currentSurvey.questions.find(q => q.id === qid);
  if (!q) return;
  editingQuestion = q;
  showQuestionModal(q);
}

function showQuestionModal(q) {
  const modal = document.getElementById('questionModal');
  document.getElementById('qModalText').value = q?.question_text || '';
  document.getElementById('qModalType').value = q?.question_type || 'radio';
  document.getElementById('qModalRequired').checked = q?.is_required !== false;
  document.getElementById('qModalScaleMin').value = q?.scale_min || 1;
  document.getElementById('qModalScaleMax').value = q?.scale_max || 5;
  document.getElementById('qModalScaleMinLabel').value = q?.scale_min_label || '';
  document.getElementById('qModalScaleMaxLabel').value = q?.scale_max_label || '';

  // Render options
  const optionsContainer = document.getElementById('qModalOptions');
  optionsContainer.innerHTML = '';
  if (q?.options) {
    q.options.forEach(opt => addOptionRow(opt.option_text, opt.allows_freetext, opt.id));
  }

  updateQuestionModalUI(q?.question_type || 'radio');
  modal.classList.remove('hidden');
}

function updateQuestionModalUI(type) {
  const showOptions = ['radio', 'checkbox'].includes(type);
  const showScale = type === 'scale';
  document.getElementById('qModalOptionsSection').classList.toggle('hidden', !showOptions);
  document.getElementById('qModalScaleSection').classList.toggle('hidden', !showScale);
}

function closeQuestionModal() {
  document.getElementById('questionModal').classList.add('hidden');
  editingQuestion = null;
}

function addOptionRow(text = '', freetext = false, id = null) {
  const container = document.getElementById('qModalOptions');
  const row = document.createElement('div');
  row.className = 'flex gap-2 items-center';
  row.dataset.optId = id || '';
  row.innerHTML = `
    <input type="text" value="${escHtml(text)}" placeholder="Alternativtext"
      class="flex-1 border border-lavender rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold">
    <label class="flex items-center gap-1 text-xs text-text-soft whitespace-nowrap">
      <input type="checkbox" ${freetext ? 'checked' : ''} class="freetext-check"> Fritext
    </label>
    <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-lg leading-none">×</button>`;
  container.appendChild(row);
}

async function saveQuestionModal() {
  const text = document.getElementById('qModalText').value.trim();
  const type = document.getElementById('qModalType').value;
  const required = document.getElementById('qModalRequired').checked;
  if (!text) return alert('Frågetext krävs.');

  const payload = {
    question_text: text,
    question_type: type,
    is_required: required,
    scale_min: type === 'scale' ? parseInt(document.getElementById('qModalScaleMin').value) : null,
    scale_max: type === 'scale' ? parseInt(document.getElementById('qModalScaleMax').value) : null,
    scale_min_label: type === 'scale' ? document.getElementById('qModalScaleMinLabel').value.trim() || null : null,
    scale_max_label: type === 'scale' ? document.getElementById('qModalScaleMaxLabel').value.trim() || null : null,
  };

  // Collect options
  const optionRows = document.querySelectorAll('#qModalOptions > div');
  const options = [];
  optionRows.forEach((row, i) => {
    const t = row.querySelector('input[type="text"]').value.trim();
    const ft = row.querySelector('.freetext-check').checked;
    const oid = row.dataset.optId;
    if (t) options.push({ sort_order: i, option_text: t, allows_freetext: ft, id: oid || null });
  });

  try {
    if (editingQuestion) {
      // Update question
      const qid = editingQuestion.id;
      const url = `/api/admin/surveys/${currentSurvey.id}/questions/${qid}`;
      await Auth.api(url, { method: 'PATCH', body: JSON.stringify(payload) });

      // Handle options: for simplicity, delete all and recreate
      for (const opt of editingQuestion.options || []) {
        await Auth.api(`/api/admin/surveys/${currentSurvey.id}/questions/${qid}/options/${opt.id}`, { method: 'DELETE' });
      }
      for (const opt of options) {
        await Auth.api(`/api/admin/surveys/${currentSurvey.id}/questions/${qid}/options`, {
          method: 'POST', body: JSON.stringify(opt),
        });
      }
    } else {
      // Create new question
      payload.sort_order = (currentSurvey.questions || []).length;
      const q = await Auth.api(`/api/admin/surveys/${currentSurvey.id}/questions`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      for (const opt of options) {
        await Auth.api(`/api/admin/surveys/${currentSurvey.id}/questions/${q.id}/options`, {
          method: 'POST', body: JSON.stringify(opt),
        });
      }
    }

    closeQuestionModal();
    await openSurvey(currentSurvey.id);
  } catch (err) {
    alert('Fel vid sparning: ' + (err.message || 'Okänt fel'));
  }
}

async function deleteQuestion(qid) {
  if (!confirm('Ta bort frågan?')) return;
  try {
    await Auth.api(`/api/admin/surveys/${currentSurvey.id}/questions/${qid}`, { method: 'DELETE' });
    await openSurvey(currentSurvey.id);
  } catch (_err) {
    alert('Kunde inte ta bort fråga.');
  }
}

// ── QR code ────────────────────────────────────────────────────────────────
function showQR(slug) {
  const url = `https://mystarday.se/tyck/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
  const modal = document.getElementById('qrModal');
  document.getElementById('qrImage').src = qrUrl;
  document.getElementById('qrUrl').textContent = url;
  document.getElementById('qrDownloadLink').href = qrUrl + '&download=1&format=png';
  modal.classList.remove('hidden');
}

function closeQRModal() {
  document.getElementById('qrModal').classList.add('hidden');
}

// ── Copy link ──────────────────────────────────────────────────────────────
function copyLink(slug) {
  const url = `https://mystarday.se/tyck/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Länk kopierad!');
  }).catch(() => {
    prompt('Kopiera länk:', url);
  });
}

// ── Response viewer ────────────────────────────────────────────────────────
async function viewResponses(surveyId) {
  const modal = document.getElementById('responsesModal');
  document.getElementById('responsesContainer').innerHTML = '<p class="text-text-soft text-sm">Laddar svar...</p>';
  modal.classList.remove('hidden');

  try {
    const responses = await Auth.api(`/api/admin/surveys/${surveyId}/responses`);
    if (responses.length === 0) {
      document.getElementById('responsesContainer').innerHTML = '<p class="text-text-soft text-sm py-4">Inga inskickade svar ännu.</p>';
      return;
    }

    const questions = currentSurvey.questions || [];

    document.getElementById('responsesContainer').innerHTML = responses.map((r, i) => `
      <div class="border-b border-lavender py-4 ${i === 0 ? '' : 'mt-2'}">
        <div class="flex items-center gap-3 mb-3">
          <span class="font-semibold text-navy text-sm">#${i + 1}</span>
          <span class="text-xs text-text-soft">${new Date(r.submitted_at).toLocaleString('sv-SE')}</span>
          ${r.gdpr_consent ? '<span class="text-xs bg-mint text-green-800 px-2 py-0.5 rounded-full">GDPR ✓</span>' : ''}
        </div>
        <div class="space-y-2">
          ${(r.answers || []).map(a => {
            const q = questions.find(q => q.id === a.question_id);
            const opts = q?.options || [];
            let answerDisplay = '';
            if (a.scale_value != null) answerDisplay = `⭐ ${a.scale_value}`;
            else if (a.selected_option_ids && a.selected_option_ids.length > 0) {
              answerDisplay = a.selected_option_ids.map(oid => {
                const opt = opts.find(o => o.id === oid);
                return opt ? opt.option_text : oid;
              }).join(', ');
              if (a.freetext_value) answerDisplay += ` (${a.freetext_value})`;
            } else {
              answerDisplay = a.answer_text || '—';
            }
            return `<div class="bg-sky/50 rounded-lg px-3 py-2">
              <p class="text-xs text-text-soft">${q ? escHtml(q.question_text) : 'Fråga'}</p>
              <p class="text-sm font-medium text-navy mt-0.5">${escHtml(answerDisplay)}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  } catch (_err) {
    document.getElementById('responsesContainer').innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda svar.</p>';
  }
}

function closeResponsesModal() {
  document.getElementById('responsesModal').classList.add('hidden');
}

// ── Seeder ─────────────────────────────────────────────────────────────────
async function seedSurveys() {
  if (!confirm('Skapa de tre inbyggda enkäterna? (Befintliga med samma slug skippas.)')) return;
  try {
    const result = await Auth.api('/api/admin/surveys/seed', { method: 'POST', body: JSON.stringify({}) });
    showToast('Enkäter skapade! ' + result.seeded.map(s => s.slug + ':' + s.action).join(', '));
    await loadSurveys();
  } catch (err) {
    alert('Seed misslyckades: ' + (err.message || 'Okänt fel'));
  }
}

// ── Toast helper ───────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy text-white px-6 py-3 rounded-2xl font-semibold z-50 shadow-xl text-sm';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Del 4: Distribution panel ───────────────────────────────────────────────
async function openDistributionPanel(surveyId) {
  const panel = document.getElementById('distributionPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    // Load popup stats
    try {
      const stats = await Auth.api(`/api/admin/surveys/${surveyId}/popup-stats`);
      const r = stats.impressions > 0 ? Math.round((stats.responses / stats.impressions) * 100) : 0;
      document.getElementById('popupStatsText').innerHTML =
        `Popup visad <strong>${stats.impressions}</strong> gånger · <strong>${stats.responses}</strong> svar · Svarsfrekvens <strong>${r}%</strong> · Stängt <strong>${stats.dismissed_count}</strong> · Snoozed <strong>${stats.snoozed_count}</strong>`;
    } catch {
      document.getElementById('popupStatsText').textContent = 'Kunde inte hämta statistik.';
    }
  }
}

function toggleContestFields() {
  const checked = document.getElementById('contestEnabled').checked;
  document.getElementById('contestFields').classList.toggle('hidden', !checked);
}

async function saveDistribution(surveyId) {
  const payload = {
    popup_logged_in_enabled: document.getElementById('popupLoggedIn').checked,
    popup_landing_enabled: document.getElementById('popupLanding').checked,
    popup_trigger_delay_secs: parseInt(document.getElementById('triggerDelay').value) || 8,
    popup_trigger_scroll_pct: parseInt(document.getElementById('triggerScroll').value) || 50,
    popup_start_date: document.getElementById('popupStartDate').value || null,
    popup_end_date: document.getElementById('popupEndDate').value || null,
    popup_registered_after: document.getElementById('registeredAfter').value || null,
    popup_registered_before: document.getElementById('registeredBefore').value || null,
    contest_enabled: document.getElementById('contestEnabled').checked,
    contest_prize_description: document.getElementById('contestPrize')?.value.trim() || null,
    contest_winner_count: parseInt(document.getElementById('contestWinners')?.value) || 1,
    contest_closes_at: document.getElementById('contestClosesAt')?.value || null,
  };
  try {
    await Auth.api(`/api/admin/surveys/${surveyId}/distribution`, { method: 'PATCH', body: JSON.stringify(payload) });
    showToast('✅ Distributionsinställningar sparade');
    // Reload editor to refresh contest button visibility
    await openSurvey(surveyId);
  } catch (err) {
    alert('Kunde inte spara: ' + (err.message || 'Okänt fel'));
  }
}

// ── Del 4: Contest panel ────────────────────────────────────────────────────
async function openContestPanel(surveyId) {
  const panel = document.getElementById('contestPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    await loadContestEntries(surveyId);
  }
}

async function loadContestEntries(surveyId) {
  try {
    const entries = await Auth.api(`/api/admin/surveys/${surveyId}/contest`);
    const container = document.getElementById('contestEntriesContainer');
    if (!entries || entries.length === 0) {
      container.innerHTML = '<p class="text-sm text-text-soft">Inga deltagare ännu. Tävlingen visas när kontestfunktionen är aktiverad och enkäten skickas in.</p>';
      return;
    }
    const winners = entries.filter(e => e.is_winner);
    container.innerHTML = `
      <p class="text-sm font-semibold text-navy mb-3">${entries.length} deltagare · ${winners.length} vinnare</p>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${entries.map(e => `
          <div class="flex items-center justify-between bg-white rounded-xl px-4 py-2 border-2 ${e.is_winner ? 'border-gold' : 'border-lavender'}">
            <div class="flex items-center gap-2">
              ${e.is_winner ? '<span class="text-lg">🏆</span>' : '<span class="text-lg opacity-30">👤</span>'}
              <div>
                <p class="text-sm font-semibold text-navy">${escHtml(e.respondent_email)}</p>
                <p class="text-xs text-text-soft">${e.submitted_at ? new Date(e.submitted_at).toLocaleDateString('sv-SE') : '-'}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${e.is_winner && !e.is_contacted ? `<button onclick="markContacted('${surveyId}','${e.id}')" class="text-xs bg-mint text-green-800 px-3 py-1 rounded-lg font-semibold">Kontaktad</button>` : ''}
              ${e.is_contacted ? '<span class="text-xs text-green-700 font-semibold">✓ Kontaktad</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (_err) {
    document.getElementById('contestEntriesContainer').innerHTML = '<p class="text-red-500 text-sm">Kunde inte hämta deltagare.</p>';
  }
}

async function pickWinners(surveyId, count) {
  if (!confirm(`Lotta ${count} vinnare bland alla deltagare? Befintliga vinnare nollställs.`)) return;
  try {
    const result = await Auth.api(`/api/admin/surveys/${surveyId}/contest/pick-winners`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
    showToast(`🏆 ${result.winners.length} vinnare lottade!`);
    await loadContestEntries(surveyId);
  } catch (err) {
    alert('Lottning misslyckades: ' + (err.message || 'Okänt fel'));
  }
}

async function markContacted(surveyId, entryId) {
  try {
    await Auth.api(`/api/admin/surveys/${surveyId}/contest/${entryId}/contacted`, { method: 'PATCH', body: JSON.stringify({}) });
    showToast('Markerad som kontaktad');
    await loadContestEntries(surveyId);
  } catch (err) {
    alert('Kunde inte uppdatera: ' + (err.message || 'Okänt fel'));
  }
}

// admin/index.html + genererad enkätmarkup onclick
window.openSurvey = openSurvey;
window.closeSurveyEditor = closeSurveyEditor;
window.openCreateSurvey = openCreateSurvey;
window.openEditMeta = openEditMeta;
window.saveMetaModal = saveMetaModal;
window.toggleSurveyStatus = toggleSurveyStatus;
window.closeSurveyStatus = closeSurveyStatus;
window.openAddQuestion = openAddQuestion;
window.editQuestion = editQuestion;
window.saveQuestionModal = saveQuestionModal;
window.deleteQuestion = deleteQuestion;
window.showQR = showQR;
window.closeQRModal = closeQRModal;
window.copyLink = copyLink;
window.viewResponses = viewResponses;
window.closeResponsesModal = closeResponsesModal;
window.seedSurveys = seedSurveys;
window.openDistributionPanel = openDistributionPanel;
window.toggleContestFields = toggleContestFields;
window.saveDistribution = saveDistribution;
window.openContestPanel = openContestPanel;
window.pickWinners = pickWinners;
window.markContacted = markContacted;
