/**
 * Schedule template-editing mode (Fas 8 F3b).
 * Family schedule-template editing (?view=template): load/render template, add/delete items,
 * template-modal create flow — extracted from schedule.js. Shared state (templateMode,
 * currentTemplateId, templateItems, templateName, activities) stays in schedule.js and is
 * read/written via global scope. Reads SECTIONS via ScheduleCore; calls escHtml/showToast/apiFetch.
 * Handlers exposed on window for inline onclick + schedule.js callers.
 */
(function () {
// ── Template Editing Mode ──────────────────────────────────
// When ?view=template&template=<id> is in the URL, the user is editing a family schedule template.
// Templates are family-level (child_id IS NULL) and have no day-of-week — they're reusable by any child.
// Items are stored in weekly_schedule_item with a weekly_schedule_id pointing to the template.
async function loadTemplate(templateId) {
  templateMode = true;
  currentTemplateId = templateId;
  templateItems = [];
  templateName = '';

  try {
    // Show loading state in the main content area
    document.getElementById('childrenListView').classList.add('hidden');
    document.getElementById('scheduleEditorView').classList.remove('hidden');
    document.getElementById('backToChildrenBtn').classList.add('hidden'); // no back button in template mode
    document.getElementById('daySelectorWrap').classList.add('hidden');   // no day tabs
    document.getElementById('viewModeBar').classList.add('hidden');
    document.getElementById('calNavBar').classList.add('hidden');
    document.getElementById('sbsChildSelector').classList.add('hidden');
    const fwBtn = document.getElementById('fillWeekBtn');
    if (fwBtn) fwBtn.classList.add('hidden');
    const editorRewardsBtn = document.getElementById('editorRewardsBtn');
    if (editorRewardsBtn) editorRewardsBtn.classList.add('hidden');

    document.getElementById('scheduleContent').innerHTML =
      '<div class="text-center py-16"><span style="display:inline-block;font-size:2rem;animation:spin 1s linear infinite;">📋</span><p class="mt-2 text-text-soft font-semibold">Laddar schemamall…</p></div>';

    const res = await window.apiFetch(`/api/schedule-templates/${templateId}`);
    if (!res.ok) {
      const err = await res.json();
      document.getElementById('scheduleContent').innerHTML = `
        <div class="text-center py-16">
          <p class="text-5xl mb-4">❌</p>
          <p class="font-semibold text-navy mb-1">Schemamallen hittades inte</p>
          <p class="text-text-soft text-sm">${escHtml(err.error || 'Okänt fel')}</p>
          <a href="/library" class="mt-6 inline-block px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold">Tillbaka till biblioteket</a>
        </div>`;
      return;
    }

    const data = await res.json();
    templateName = data.name || 'Schemamall';
    templateItems = data.items || [];

    // Also load activities so the add-modal has a searchable list
    if (activities.length === 0) await loadActivities();

    renderTemplate();
  } catch (err) {
    console.error('[TEMPLATE] loadTemplate error:', err);
    document.getElementById('scheduleContent').innerHTML = `
      <div class="text-center py-16">
        <p class="text-5xl mb-4">❌</p>
        <p class="font-semibold text-navy mb-1">Kunde inte ladda schemamallen</p>
        <p class="text-text-soft text-sm mb-4">${escHtml(err.message)}</p>
        <a href="/library" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold inline-block">Tillbaka till biblioteket</a>
      </div>`;
  }
}

function renderTemplate() {
  // Group items by section (morgon, dag, kväll, natt)
  const sections = SECTIONS.map(sec => {
    const items = templateItems
      .filter(i => i.section === sec.key)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const itemsHtml = items.length === 0
      ? `<p class="text-sm text-text-soft text-center py-3">Inga aktiviteter</p>`
      : items.map(i => renderTemplateScheduleItem(i)).join('');
    return `<div class="section-card border-2 ${sec.color} rounded-2xl p-4 mb-4" data-section="${sec.key}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">${sec.emoji}</span>
          <h4 class="font-heading font-bold text-navy">${sec.label}</h4>
          <span class="text-xs text-text-soft">${items.length} aktivitet${items.length !== 1 ? 'er' : ''}</span>
        </div>
        <button onclick="openAddTemplateItemModal('${sec.key}')"
          class="px-3 py-2 bg-white hover:bg-lavender rounded-xl text-sm font-semibold transition-colors border border-lavender">
          + Aktivitet
        </button>
      </div>
      <div class="space-y-2" id="template-items-${sec.key}">${itemsHtml}</div>
    </div>`;
  }).join('');

  document.getElementById('scheduleContent').innerHTML = `
    <div class="mb-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h2 class="text-2xl font-heading font-bold text-navy">Mall: ${escHtml(templateName)}</h2>
        <p class="text-sm text-text-soft mt-0.5">Egna schemamallen — redigera och spara</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/library" class="px-4 py-2 border-2 border-lavender hover:border-navy rounded-xl font-semibold text-sm transition-colors">← Biblioteket</a>
      </div>
    </div>
    <div class="mb-4 p-3 bg-sky/60 border-2 border-lavender rounded-xl">
      <p class="text-sm text-text-soft">
        ✏️ Du redigerar schemamallen. <strong>${templateItems.length} aktiviteter</strong>.
        Klicka på "Applicera på barn" för att koppla schemat till ett barns veckodagar.
      </p>
    </div>
    ${sections}
    <div class="mt-6 text-center">
      <a href="/library" class="px-6 py-3 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold transition-colors inline-block">
        ✓ Klart — tillbaka till biblioteket
      </a>
    </div>`;
}

function renderTemplateScheduleItem(item) {
  // Renders a schedule item row in template edit mode (not the add-modal template list)
  return `<div class="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm group"
    id="ti-${item.id}">
    <span class="text-xl flex-shrink-0">${item.icon || item.activity_icon || '📌'}</span>
    <div class="flex-1 min-w-0">
      <div class="font-semibold text-sm text-navy truncate">${escHtml(item.name || item.activity_name || 'Aktivitet')}</div>
      ${item.star_value ? `<div class="text-xs text-amber-600 font-semibold">⭐ ${item.star_value}</div>` : ''}
    </div>
    <button onclick="deleteTemplateItem('${item.id}')"
      class="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold"
      title="Ta bort">🗑</button>
  </div>`;
}

async function deleteTemplateItem(itemId) {
  if (!currentTemplateId) return;
  const confirmed = confirm('Ta bort denna aktivitet från schemamallen?');
  if (!confirmed) return;
  try {
    const res = await window.apiFetch(`/api/schedule-templates/${currentTemplateId}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      templateItems = templateItems.filter(i => i.id !== itemId);
      renderTemplate();
      showToast('Aktivitet borttagen');
    } else {
      const err = await res.json();
      showToast(err.error || 'Kunde inte ta bort aktiviteten', true);
    }
  } catch {
    showToast('Något gick fel', true);
  }
}

function openAddTemplateItemModal(sectionKey) {
  // Reuse the existing add activity modal but in template mode
  selectedTemplateId = null; // clear any previous selection
  addSectionOverride = sectionKey || 'dag';
  addSectionsMulti = new Set([sectionKey || 'dag']);
  pickSection(sectionKey || 'dag');
  document.getElementById('addActivityError').classList.add('hidden');
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  document.getElementById('selectedTemplateInfo').classList.add('hidden');
  document.getElementById('templateSearch').value = '';
  renderTemplateSearchResults('');
  document.getElementById('addTimeFields').classList.add('hidden');
  document.getElementById('addTimeChevron').textContent = '▸';
  document.getElementById('addTimeSummary').textContent = '';
  document.getElementById('addTimeSummary').classList.add('hidden');
  const addModal = document.getElementById('addActivityModal');
  addModal.classList.remove('hidden');
  addModal.scrollTop = 0;
  setTimeout(() => { addModal.scrollTop = 0; document.getElementById('templateSearch').focus(); }, 100);
}

// Note: submitAddActivity() is patched at its original definition (line ~2196)
// to handle templateMode — see that function for the full implementation.
function renderTemplateSearchResults(query) {
  const list = document.getElementById('templateList');
  if (!list) return;
  let items = allTemplates;
  if (query) items = items.filter(t => t.name && t.name.toLowerCase().includes(query.toLowerCase()));
  if (items.length === 0) { list.innerHTML = '<p class="text-sm text-text-soft text-center py-4">Inga aktiviteter hittades</p>'; return; }
  list.innerHTML = items.map(t => `
    <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-lavender cursor-pointer transition-colors template-item ${selectedTemplateId===t.id?'bg-gold-light border-2 border-gold':'border border-transparent'}"
      onclick="selectTemplateItem('${t.id}')" data-id="${t.id}">
      <span class="text-2xl flex-shrink-0">${t.icon || '📌'}</span>
      <div class="flex-1 min-w-0"><div class="font-semibold text-sm text-navy truncate">${escHtml(t.name)}</div>
        ${t.star_value ? `<div class="text-xs text-text-soft">⭐ ${t.star_value}</div>` : ''}
      </div>
      ${selectedTemplateId === t.id ? '<span class="text-gold font-bold text-sm">✓</span>' : ''}
    </div>`).join('');
}

function selectTemplateItem(id) {
  selectedTemplateId = id;
  const tpl = allTemplates.find(t => t.id === id);
  if (tpl) {
    document.getElementById('selectedTemplateInfo').classList.remove('hidden');
    document.getElementById('selectedTemplateName').textContent = tpl.name;
    document.getElementById('selectedTemplateIcon').textContent = tpl.icon || '📌';
  }
  renderTemplateSearchResults(document.getElementById('templateSearch').value);
}

async function loadActivities() {
  try {
    const res = await window.apiFetch('/api/activities');
    if (res.ok) activities = await res.json();
    allTemplates = activities;
  } catch { /* ignore */ }
}

async function openTemplateModal() {
  // Fetch categories for the family
  try {
    const res = await window.apiFetch('/api/categories');
    if (!res.ok) { showToast('Kunde inte ladda kategorier', true); return; }
    const categories = await res.json();
    const listEl = document.getElementById('templateCategoryList');

    if (categories.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-text-soft text-center py-2">Inga kategorier skapade ännu</p>';
    } else {
      // Fetch template counts per category
      const tplRes = await window.apiFetch('/api/activities');
      const templates = tplRes.ok ? await tplRes.json() : [];
      const countByCategory = {};
      templates.forEach(t => {
        countByCategory[t.category_id] = (countByCategory[t.category_id] || 0) + 1;
      });

      listEl.innerHTML = categories.map(cat => {
        const count = countByCategory[cat.id] || 0;
        const emoji = cat.name.includes('Förskola') ? '🎨' : cat.name.includes('Skola') ? '📚' : '📁';
        return `<button onclick="createScheduleWithTemplate('${cat.id}')" class="w-full px-4 py-3 bg-sky hover:bg-blue-100 text-navy rounded-xl font-semibold flex items-center gap-3 text-left transition-colors">
          <span class="text-2xl">${emoji}</span>
          <div>
            <div class="font-bold">${escHtml(cat.name)}</div>
            <div class="text-xs text-text-soft">${count} aktivitet${count !== 1 ? 'er' : ''}</div>
          </div>
          <span class="ml-auto text-text-soft">→</span>
        </button>`;
      }).join('');
    }

    document.getElementById('chooseTemplateModal').classList.remove('hidden');
  } catch (err) {
    console.error('Error opening template modal:', err);
    showToast('Kunde inte ladda aktiviteter', true);
  }
}

function closeTemplateModal() {
  document.getElementById('chooseTemplateModal').classList.add('hidden');
}

async function createScheduleWithTemplate(categoryId) {
  closeTemplateModal();
  const body = { day_of_week: currentDay };
  if (categoryId) body.template_category_id = categoryId;
  if (window.ScheduleCustody) Object.assign(body, ScheduleCustody.getCreateExtras());
  const res = await window.apiFetch(`/api/children/${currentChildId}/schedules`, { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) { currentScheduleId = data.id; await loadScheduleForDay(); }
  else if (res.status === 409 && data.id) { currentScheduleId = data.id; await loadScheduleForDay(); }
  else showToast(data.error || 'Fel uppstod', true);
}

  // Exposed on window for inline onclick + cross-file callers
  window.loadTemplate = loadTemplate;
  window.renderTemplate = renderTemplate;
  window.renderTemplateScheduleItem = renderTemplateScheduleItem;
  window.deleteTemplateItem = deleteTemplateItem;
  window.openAddTemplateItemModal = openAddTemplateItemModal;
  window.renderTemplateSearchResults = renderTemplateSearchResults;
  window.selectTemplateItem = selectTemplateItem;
  window.loadActivities = loadActivities;
  window.openTemplateModal = openTemplateModal;
  window.closeTemplateModal = closeTemplateModal;
  window.createScheduleWithTemplate = createScheduleWithTemplate;
})();
