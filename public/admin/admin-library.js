// Admin Library: default schedules, templates, rewards, login stats, system messages to families
    // ─── Default Schedules CRUD ──────────────────────────────
    let defaultSchedules = [];

    async function loadDefaultSchedules() {
      const container = document.getElementById('defaultSchedulesList');
      try {
        const data = await Auth.api('/api/admin/default-schedules');
        defaultSchedules = data;
        renderDefaultSchedules();
      } catch {
        container.innerHTML = '<p class="text-red-500 text-center py-8">Kunde inte ladda standardscheman</p>';
      }
    }

    let expandedScheduleId = null; // Which schedule is currently expanded for editing

    function renderDefaultSchedules() {
      const container = document.getElementById('defaultSchedulesList');
      if (defaultSchedules.length === 0) {
        container.innerHTML = '<p class="text-text-soft text-center py-8">Inga standardscheman skapade ännu.</p>';
        return;
      }
      container.innerHTML = defaultSchedules.map(s => `
        <div class="bg-white rounded-2xl border-2 ${expandedScheduleId === s.id ? 'border-gold' : 'border-lavender'} p-4 hover:border-gold transition-colors">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span class="text-2xl flex-shrink-0">${esc(s.icon || '📋')}</span>
              <div class="min-w-0">
                <h4 class="font-heading font-bold text-navy">${esc(s.name)}</h4>
                <p class="text-xs text-text-soft">${esc(s.description || '')} · <span id="dsItemCount_${s.id}">${s.item_count || 0}</span> aktiviteter</p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button onclick="viewDefaultSchedule('${s.id}')" class="px-3 py-2 bg-sky hover:bg-blue-100 text-navy rounded-lg text-xs font-semibold transition-colors">👁️ Visa</button>
              <button onclick="toggleScheduleEditor('${s.id}')" class="px-3 py-2 ${expandedScheduleId === s.id ? 'bg-gold text-white' : 'bg-lavender hover:bg-purple-100 text-navy'} rounded-lg text-xs font-semibold transition-colors">✏️ Redigera</button>
              <button onclick="editDefaultScheduleMeta('${s.id}')" class="px-3 py-2 bg-lavender hover:bg-purple-100 text-navy rounded-lg text-xs font-semibold transition-colors" title="Ändra namn/ikon">⚙️</button>
              <button onclick="deleteDefaultSchedule('${s.id}', '${esc(s.name)}')" class="px-3 py-2 bg-coral hover:bg-red-200 text-navy rounded-lg text-xs font-semibold transition-colors">✕</button>
            </div>
          </div>
          <div id="scheduleEditor_${s.id}" class="${expandedScheduleId === s.id ? '' : 'hidden'} mt-4 border-t-2 border-lavender pt-4">
            <div class="text-center text-text-soft text-sm py-4">Laddar aktiviteter…</div>
          </div>
        </div>
      `).join('');
      // If a schedule is expanded, load its items
      if (expandedScheduleId) {
        loadScheduleEditorItems(expandedScheduleId);
      }
    }

    function openAddDefaultScheduleModal() {
      document.getElementById('dsId').value = '';
      document.getElementById('dsName').value = '';
      document.getElementById('dsDescription').value = '';
      document.getElementById('dsIcon').value = '📋';
      document.getElementById('dsModalTitle').textContent = 'Nytt standardschema';
      document.getElementById('defaultScheduleModal').classList.remove('hidden');
    }

    function closeDefaultScheduleModal() {
      document.getElementById('defaultScheduleModal').classList.add('hidden');
    }

    // ─── Metadata editing (name/icon/description) ────────
    function editDefaultScheduleMeta(id) {
      const s = defaultSchedules.find(x => x.id === id);
      if (!s) return;
      document.getElementById('dsId').value = s.id;
      document.getElementById('dsName').value = s.name;
      document.getElementById('dsDescription').value = s.description || '';
      document.getElementById('dsIcon').value = s.icon || '📋';
      document.getElementById('dsModalTitle').textContent = 'Redigera standardschema';
      document.getElementById('defaultScheduleModal').classList.remove('hidden');
    }

    async function submitDefaultSchedule() {
      const id = document.getElementById('dsId').value;
      const name = document.getElementById('dsName').value.trim();
      const description = document.getElementById('dsDescription').value.trim();
      const icon = document.getElementById('dsIcon').value.trim() || '📋';

      if (!name) { alert('Namn krävs'); return; }

      const btn = document.getElementById('dsSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Sparar…';

      try {
        const wasExpanded = expandedScheduleId;
        if (id) {
          await Auth.api('/api/admin/default-schedules/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name, description, icon }),
          });
        } else {
          await Auth.api('/api/admin/default-schedules', {
            method: 'POST',
            body: JSON.stringify({ name, description, icon }),
          });
        }
        closeDefaultScheduleModal();
        await loadDefaultSchedules();
        // Restore editor state if it was open
        if (wasExpanded && id) {
          expandedScheduleId = wasExpanded;
          renderDefaultSchedules();
        }
      } catch (err) {
        alert(err.message || 'Kunde inte spara schemat');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Spara';
      }
    }

    async function deleteDefaultSchedule(id, name) {
      if (!confirm('Ta bort standardschemat "' + name + '"?')) return;
      try {
        await Auth.api('/api/admin/default-schedules/' + id, { method: 'DELETE' });
        if (expandedScheduleId === id) expandedScheduleId = null;
        await loadDefaultSchedules();
      } catch {
        alert('Kunde inte ta bort schemat');
      }
    }

    // ─── Read-only view modal ──────────────────────────────
    async function viewDefaultSchedule(id) {
      try {
        const data = await Auth.api('/api/admin/default-schedules/' + id);
        const sectionLabels = { morgon: '🌅 Morgon', dag: '☀️ Dag', kvall: '🌙 Kväll' };
        const bySection = {};
        for (const item of (data.items || [])) {
          const sec = item.section || 'dag';
          if (!bySection[sec]) bySection[sec] = [];
          bySection[sec].push(item);
        }

        let html = '<div class="space-y-3">';
        for (const [sec, items] of Object.entries(bySection)) {
          html += `<div class="border-l-4 ${sec === 'morgon' ? 'border-yellow-400' : sec === 'kvall' ? 'border-indigo-400' : 'border-blue-400'} pl-3">`;
          html += `<p class="font-semibold text-sm text-navy mb-1">${sectionLabels[sec] || sec}</p>`;
          for (const item of items) {
            const subStepText = item.sub_steps && item.sub_steps.length > 0
              ? ` <span class="text-xs text-text-soft">(${item.sub_steps.length} delsteg)</span>`
              : '';
            html += `<div class="flex items-center gap-2 text-sm py-0.5">
              <span>${item.icon || '📌'}</span>
              <span class="text-navy">${esc(item.name)}</span>${subStepText}
              <span class="text-xs text-text-soft ml-auto">${'⭐'.repeat(item.star_value || 1)}</span>
            </div>`;
          }
          html += '</div>';
        }
        html += '</div>';

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-start overflow-y-auto justify-center z-[60] p-4';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div class="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl my-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-heading font-bold text-navy">${esc(data.icon || '📋')} ${esc(data.name)}</h3>
              <button onclick="this.closest('.fixed').remove()" class="text-text-soft hover:text-navy text-2xl">&times;</button>
            </div>
            <p class="text-sm text-text-soft mb-4">${esc(data.description || '')}</p>
            ${html}
          </div>`;
        document.body.appendChild(modal);
      } catch {
        alert('Kunde inte ladda schemat');
      }
    }

    // ─── Expandable schedule editor ────────────────────────
    async function toggleScheduleEditor(id) {
      if (expandedScheduleId === id) {
        expandedScheduleId = null;
        renderDefaultSchedules();
        return;
      }
      expandedScheduleId = id;
      renderDefaultSchedules();
    }

    async function loadScheduleEditorItems(scheduleId) {
      const container = document.getElementById('scheduleEditor_' + scheduleId);
      if (!container) return;
      container.innerHTML = '<div class="text-center text-text-soft text-sm py-4">Laddar aktiviteter…</div>';
      try {
        const data = await Auth.api('/api/admin/default-schedules/' + scheduleId);
        const items = data.items || [];
        renderScheduleEditor(scheduleId, items, container);
      } catch {
        container.innerHTML = '<p class="text-red-500 text-sm py-4">Kunde inte ladda aktiviteter</p>';
      }
    }

    function renderScheduleEditor(scheduleId, items, container) {
      const sectionOrder = ['morgon', 'dag', 'kvall'];
      const sectionLabels = { morgon: '🌅 Morgon', dag: '☀️ Dag', kvall: '🌙 Kväll' };
      const sectionColors = { morgon: 'border-yellow-400 bg-yellow-50', dag: 'border-blue-400 bg-blue-50', kvall: 'border-indigo-400 bg-indigo-50' };

      const bySection = { morgon: [], dag: [], kvall: [] };
      for (const item of items) {
        const sec = item.section || 'dag';
        if (!bySection[sec]) bySection[sec] = [];
        bySection[sec].push(item);
      }
      // Sort each section by sort_order
      for (const sec of sectionOrder) {
        bySection[sec].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      // Update item count in header
      const countEl = document.getElementById('dsItemCount_' + scheduleId);
      if (countEl) countEl.textContent = items.length;

      let html = '';
      for (const sec of sectionOrder) {
        const secItems = bySection[sec];
        html += `<div class="mb-4">`;
        html += `<div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-heading font-bold text-navy">${sectionLabels[sec]}</span>
          <span class="text-xs text-text-soft">(${secItems.length})</span>
        </div>`;

        if (secItems.length === 0) {
          html += `<p class="text-xs text-text-soft italic pl-2 mb-2">Inga aktiviteter i denna sektion</p>`;
        } else {
          html += '<div class="space-y-1">';
          secItems.forEach((item, idx) => {
            const subCount = (item.sub_steps && item.sub_steps.length) || 0;
            const subText = subCount > 0 ? `<span class="text-xs text-text-soft">(${subCount} delsteg)</span>` : '';
            html += `
              <div class="flex items-center gap-2 bg-white border border-lavender rounded-xl px-3 py-2 group hover:border-gold transition-colors">
                <span class="text-lg flex-shrink-0">${item.icon || '📌'}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-semibold text-navy">${esc(item.name)}</span>
                  ${subText}
                  <span class="text-xs text-text-soft ml-1">${'⭐'.repeat(item.star_value || 1)}</span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  ${idx > 0 ? `<button onclick="moveScheduleItem('${scheduleId}', '${item.id}', 'up')" class="text-xs px-1.5 py-1 bg-lavender hover:bg-sky rounded text-navy" title="Flytta upp">↑</button>` : ''}
                  ${idx < secItems.length - 1 ? `<button onclick="moveScheduleItem('${scheduleId}', '${item.id}', 'down')" class="text-xs px-1.5 py-1 bg-lavender hover:bg-sky rounded text-navy" title="Flytta ner">↓</button>` : ''}
                  <button onclick="openEditScheduleItem('${scheduleId}', '${item.id}')" class="text-xs px-2 py-1 bg-lavender hover:bg-purple-100 rounded text-navy font-semibold" title="Redigera">✏️</button>
                  <button onclick="deleteScheduleItem('${scheduleId}', '${item.id}', '${esc(item.name)}')" class="text-xs px-2 py-1 bg-coral hover:bg-red-200 rounded text-navy" title="Ta bort">✕</button>
                </div>
              </div>`;
          });
          html += '</div>';
        }
        html += `</div>`;
      }

      html += `<div class="flex justify-center pt-2 border-t border-lavender">
        <button onclick="openAddScheduleItem('${scheduleId}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-white rounded-xl font-semibold text-sm transition-colors">+ Lägg till aktivitet</button>
      </div>`;

      container.innerHTML = html;
    }

    // ─── Schedule item sub-steps ───────────────────────────
    let siSubSteps = [];

    function addSiSubStep(name = '', icon = '') {
      siSubSteps.push({ name, icon });
      renderSiSubSteps();
    }

    function removeSiSubStep(idx) {
      siSubSteps.splice(idx, 1);
      renderSiSubSteps();
    }

    function renderSiSubSteps() {
      const container = document.getElementById('siSubStepsList');
      container.innerHTML = siSubSteps.map((s, i) => `
        <div class="flex items-center gap-2">
          <input type="text" value="${esc(s.icon)}" maxlength="10" placeholder="🔹"
            class="w-12 px-1 py-1 rounded-lg border border-lavender text-center text-lg"
            onchange="siSubSteps[${i}].icon = this.value">
          <input type="text" value="${esc(s.name)}" maxlength="100" placeholder="Delsteg"
            class="flex-1 px-3 py-1 rounded-lg border border-lavender text-sm"
            onchange="siSubSteps[${i}].name = this.value">
          <button type="button" onclick="removeSiSubStep(${i})" class="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
        </div>
      `).join('');
    }

    function getSiSubSteps() {
      const container = document.getElementById('siSubStepsList');
      const rows = container.querySelectorAll('div');
      const result = [];
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const icon = inputs[0]?.value?.trim() || '';
        const name = inputs[1]?.value?.trim() || '';
        if (name) result.push({ name, icon });
      });
      return result;
    }

    // ─── Schedule item modal operations ────────────────────
    let _scheduleItemsCache = {}; // scheduleId -> items[]

    function closeScheduleItemModal() {
      document.getElementById('scheduleItemModal').classList.add('hidden');
    }

    function openAddScheduleItem(scheduleId) {
      document.getElementById('siModalTitle').textContent = 'Lägg till aktivitet';
      document.getElementById('siScheduleId').value = scheduleId;
      document.getElementById('siItemId').value = '';
      document.getElementById('siName').value = '';
      document.getElementById('siIcon').value = '📌';
      document.getElementById('siSection').value = 'dag';
      document.getElementById('siStarValue').value = '1';
      document.getElementById('siMsg').textContent = '';
      siSubSteps = [];
      renderSiSubSteps();
      document.getElementById('scheduleItemModal').classList.remove('hidden');
    }

    async function openEditScheduleItem(scheduleId, itemId) {
      // Fetch fresh data to be sure
      try {
        const data = await Auth.api('/api/admin/default-schedules/' + scheduleId);
        const item = (data.items || []).find(i => i.id === itemId);
        if (!item) { alert('Aktiviteten hittades inte'); return; }

        document.getElementById('siModalTitle').textContent = 'Redigera aktivitet';
        document.getElementById('siScheduleId').value = scheduleId;
        document.getElementById('siItemId').value = item.id;
        document.getElementById('siName').value = item.name;
        document.getElementById('siIcon').value = item.icon || '📌';
        document.getElementById('siSection').value = item.section || 'dag';
        document.getElementById('siStarValue').value = item.star_value || 1;
        document.getElementById('siMsg').textContent = '';
        siSubSteps = Array.isArray(item.sub_steps) ? item.sub_steps.map(s => ({ ...s })) : [];
        renderSiSubSteps();
        document.getElementById('scheduleItemModal').classList.remove('hidden');
      } catch {
        alert('Kunde inte ladda aktiviteten');
      }
    }

    async function submitScheduleItem() {
      const scheduleId = document.getElementById('siScheduleId').value;
      const itemId = document.getElementById('siItemId').value;
      const name = document.getElementById('siName').value.trim();
      const icon = document.getElementById('siIcon').value.trim() || '📌';
      const section = document.getElementById('siSection').value;
      const star_value = parseInt(document.getElementById('siStarValue').value) || 1;
      const sub_steps = getSiSubSteps();
      const msg = document.getElementById('siMsg');

      if (!name) { msg.textContent = 'Namn krävs'; msg.className = 'text-sm text-red-500'; return; }

      const btn = document.getElementById('siSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Sparar…';

      try {
        const body = JSON.stringify({ name, icon, section, star_value, sub_steps });
        if (itemId) {
          await Auth.api(`/api/admin/default-schedules/${scheduleId}/items/${itemId}`, { method: 'PUT', body });
        } else {
          await Auth.api(`/api/admin/default-schedules/${scheduleId}/items`, { method: 'POST', body });
        }
        closeScheduleItemModal();
        // Refresh the editor
        await loadScheduleEditorItems(scheduleId);
      } catch (err) {
        msg.textContent = err.message || 'Kunde inte spara';
        msg.className = 'text-sm text-red-500';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Spara';
      }
    }

    async function deleteScheduleItem(scheduleId, itemId, name) {
      if (!confirm('Ta bort "' + name + '" från schemat?')) return;
      try {
        await Auth.api(`/api/admin/default-schedules/${scheduleId}/items/${itemId}`, { method: 'DELETE' });
        await loadScheduleEditorItems(scheduleId);
      } catch {
        alert('Kunde inte ta bort aktiviteten');
      }
    }

    async function moveScheduleItem(scheduleId, itemId, direction) {
      // Fetch current items, find the item, swap sort_order with neighbor
      try {
        const data = await Auth.api('/api/admin/default-schedules/' + scheduleId);
        const items = data.items || [];
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        // Filter to same section and sort
        const sectionItems = items.filter(i => i.section === item.section).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const idx = sectionItems.findIndex(i => i.id === itemId);
        if (idx < 0) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sectionItems.length) return;

        const neighbor = sectionItems[swapIdx];
        // Swap sort_order values
        await Promise.all([
          Auth.api(`/api/admin/default-schedules/${scheduleId}/items/${item.id}`, {
            method: 'PUT', body: JSON.stringify({ sort_order: neighbor.sort_order }),
          }),
          Auth.api(`/api/admin/default-schedules/${scheduleId}/items/${neighbor.id}`, {
            method: 'PUT', body: JSON.stringify({ sort_order: item.sort_order }),
          }),
        ]);
        await loadScheduleEditorItems(scheduleId);
      } catch {
        alert('Kunde inte ändra ordning');
      }
    }

    // ── Default Templates Management ───────────────────────────
    let defaultTemplates = [];
    let activeSchemaTab = 'forskola'; // 'forskola'|'skola'|'morgon'|'dag'|'kvall'|'helg'

    const SCHEMA_TAB_IDS = {
      forskola: 'tabForskola',
      skola: 'tabSkola',
      morgon: 'tabMorgon',
      dag: 'tabDag',
      kvall: 'tabKvall',
      helg: 'tabHelg',
    };

    function switchSchemaTab(tab) {
      activeSchemaTab = tab;
      // Update all tab button styles
      for (const [key, btnId] of Object.entries(SCHEMA_TAB_IDS)) {
        const btn = document.getElementById(btnId);
        if (!btn) continue;
        if (key === tab) {
          btn.className = 'px-4 py-2 rounded-xl font-heading font-bold text-sm transition-colors bg-gold text-navy';
        } else {
          btn.className = 'px-4 py-2 rounded-xl font-heading font-bold text-sm transition-colors bg-lavender text-text-soft hover:bg-sky';
        }
      }
      loadDefaultTemplates();
    }

    async function loadDefaultTemplates() {
      const container = document.getElementById('defaultTemplatesList');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const [data, config] = await Promise.all([
          Auth.api('/api/admin/default-templates'),
          Auth.api('/api/admin/app-config'),
        ]);
        clearTimeout(timeout);
        defaultTemplates = data;
        renderDefaultTemplates(data);

        const toggle = document.getElementById('applyDefaultSchemaToggle');
        if (toggle && config && config.apply_default_schema) {
          toggle.checked = config.apply_default_schema.value === 'true';
        }
      } catch (err) {
        clearTimeout(timeout);
        const msg = err.name === 'AbortError' ? ' (timeout — servern är upptagen)' : esc(err.message);
        container.innerHTML = '<p class="text-red-500 text-center py-4">Kunde inte ladda aktiviteterna:' + msg + '</p>';
      }
    }

    async function toggleApplyDefaultSchema(enabled) {
      const msgEl = document.getElementById('applyDefaultSchemaMsg');
      try {
        await Auth.api('/api/admin/app-config/apply_default_schema', {
          method: 'PUT',
          body: JSON.stringify({ value: enabled ? 'true' : 'false' }),
        });
        msgEl.textContent = enabled ? '✓ Standardschema aktiverat för nya barn' : '✓ Standardschema inaktiverat';
        msgEl.className = 'text-xs min-h-[1.2em] mb-4 -mt-2 text-green-600';
        setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'text-xs min-h-[1.2em] mb-4 -mt-2 text-text-soft'; }, 3000);
      } catch (err) {
        msgEl.textContent = 'Fel: ' + (err.message || 'Kunde inte spara');
        msgEl.className = 'text-xs min-h-[1.2em] mb-4 -mt-2 text-red-500';
        // Revert toggle
        document.getElementById('applyDefaultSchemaToggle').checked = !enabled;
      }
    }

    let _defaultSortables = [];

    function renderDefaultTemplates(templates) {
      const container = document.getElementById('defaultTemplatesList');
      if (!templates || templates.length === 0) {
        container.innerHTML = '<p class="text-text-soft text-center py-8 bg-sky rounded-2xl">Inga standardaktiviteter. Klicka "+ Ny aktivitet" för att lägga till.</p>';
        return;
      }

      // Flat list sorted by sort_order
      const sorted = [...templates].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      container.innerHTML = `
        <div class="sortable-defaults space-y-1">
          ${sorted.map(t => `
            <div class="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100" data-id="${t.id}">
              <span class="drag-handle text-text-soft text-sm select-none px-1">☰</span>
              <span class="text-lg">${esc(t.icon || '📌')}</span>
              <span class="flex-1 text-sm font-semibold text-navy">${esc(t.name)}${t.sub_steps && t.sub_steps.length > 0 ? ' <span class="text-xs text-text-soft font-normal">(' + t.sub_steps.length + ' delsteg)</span>' : ''}</span>
              <span class="text-xs text-text-soft">⭐ ${t.star_value}</span>
              <button onclick="openEditDefaultModal('${t.id}')" class="p-1 hover:bg-lavender rounded-lg text-xs transition-colors">✏️</button>
              <button onclick="deleteDefaultTemplate('${t.id}')" class="p-1 hover:bg-coral rounded-lg text-xs transition-colors">🗑️</button>
            </div>
          `).join('')}
        </div>
      `;

      initDefaultTemplateDnD();
    }

    function initDefaultTemplateDnD() {
      _defaultSortables.forEach(s => s.destroy());
      _defaultSortables = [];
      if (typeof Sortable === 'undefined') return;

      document.querySelectorAll('.sortable-defaults').forEach(el => {
        const s = new Sortable(el, {
          animation: 200,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          forceFallback: true,
          onEnd: async function(evt) {
            const items = Array.from(evt.from.querySelectorAll('[data-id]'));
            const order = items.map((item, i) => ({ id: item.dataset.id, sort_order: i }));
            try {
              await Auth.api('/api/admin/default-templates/reorder', {
                method: 'PUT',
                body: JSON.stringify({ order }),
              });
            } catch (err) {
              console.error('Reorder failed:', err);
            }
          },
        });
        _defaultSortables.push(s);
      });
    }

    const SCHEMA_TAB_LABELS = {
      forskola: 'Förskola', skola: 'Skola', morgon: 'Morgon',
      dag: 'Dag', kvall: 'Kväll', helg: 'Helg',
    };

    // ─── Sub-steps for default templates ──────────────────
    let dtSubSteps = [];

    function addDtSubStep(name = '', icon = '') {
      dtSubSteps.push({ name, icon });
      renderDtSubSteps();
    }

    function removeDtSubStep(idx) {
      dtSubSteps.splice(idx, 1);
      renderDtSubSteps();
    }

    function renderDtSubSteps() {
      const container = document.getElementById('dtSubStepsList');
      container.innerHTML = dtSubSteps.map((s, i) => `
        <div class="flex items-center gap-2">
          <input type="text" value="${esc(s.icon)}" maxlength="10" placeholder="🔹"
            class="w-12 px-1 py-1 rounded-lg border border-lavender text-center text-lg"
            onchange="dtSubSteps[${i}].icon = this.value">
          <input type="text" value="${esc(s.name)}" maxlength="100" placeholder="Delsteg"
            class="flex-1 px-3 py-1 rounded-lg border border-lavender text-sm"
            onchange="dtSubSteps[${i}].name = this.value">
          <button type="button" onclick="removeDtSubStep(${i})" class="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
        </div>
      `).join('');
    }

    function getDtSubSteps() {
      // Read fresh values from inputs
      const container = document.getElementById('dtSubStepsList');
      const rows = container.querySelectorAll('div');
      const result = [];
      rows.forEach((row, i) => {
        const inputs = row.querySelectorAll('input');
        const icon = inputs[0]?.value?.trim() || '';
        const name = inputs[1]?.value?.trim() || '';
        if (name) result.push({ name, icon });
      });
      return result;
    }

    function openAddDefaultModal() {
      document.getElementById('dtModalTitle').textContent = 'Ny aktivitet';
      document.getElementById('dtId').value = '';
      document.getElementById('dtName').value = '';
      document.getElementById('dtIcon').value = '📌';
      document.getElementById('dtStarValue').value = '1';
      document.getElementById('dtSortOrder').value = '0';
      document.getElementById('dtMsg').textContent = '';
      dtSubSteps = [];
      renderDtSubSteps();
      document.getElementById('defaultTemplateModal').classList.remove('hidden');
    }

    function openEditDefaultModal(id) {
      const t = defaultTemplates.find(x => x.id === id);
      if (!t) return;
      document.getElementById('dtModalTitle').textContent = 'Redigera aktivitet';
      document.getElementById('dtId').value = t.id;
      document.getElementById('dtName').value = t.name;
      document.getElementById('dtIcon').value = t.icon || '📌';
      document.getElementById('dtStarValue').value = t.star_value;
      document.getElementById('dtSortOrder').value = t.sort_order;
      document.getElementById('dtMsg').textContent = '';
      dtSubSteps = Array.isArray(t.sub_steps) ? [...t.sub_steps] : [];
      renderDtSubSteps();
      document.getElementById('defaultTemplateModal').classList.remove('hidden');
    }

    function closeDefaultModal() {
      document.getElementById('defaultTemplateModal').classList.add('hidden');
    }

    async function submitDefaultTemplate() {
      const id = document.getElementById('dtId').value;
      const name = document.getElementById('dtName').value.trim();
      const icon = document.getElementById('dtIcon').value.trim() || '📌';
      const star_value = parseInt(document.getElementById('dtStarValue').value) || 1;
      const sort_order = parseInt(document.getElementById('dtSortOrder').value) || 0;
      const sub_steps = getDtSubSteps();
      const msg = document.getElementById('dtMsg');

      if (!name) { msg.textContent = 'Namn krävs'; msg.className = 'text-sm text-red-500'; return; }

      try {
        if (id) {
          await Auth.api('/api/admin/default-templates/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name, icon, star_value, sort_order, sub_steps }),
          });
        } else {
          await Auth.api('/api/admin/default-templates', {
            method: 'POST',
            body: JSON.stringify({ name, icon, star_value, sort_order, sub_steps }),
          });
        }
        closeDefaultModal();
        await loadDefaultTemplates();
      } catch (err) {
        msg.textContent = err.message || 'Fel uppstod';
        msg.className = 'text-sm text-red-500';
      }
    }

    async function deleteDefaultTemplate(id) {
      if (!confirm('Ta bort denna standardaktivitet?')) return;
      try {
        await Auth.api('/api/admin/default-templates/' + id, { method: 'DELETE' });
        await loadDefaultTemplates();
      } catch (err) {
        alert(err.message || 'Kunde inte ta bort');
      }
    }

    // ─── Overview Login Stats (with period filter) ────────────
    let _overviewLoginPeriod = '7d';

    function setLoginPeriod(period) {
      _overviewLoginPeriod = period;
      // Update button styles
      document.querySelectorAll('.login-period-btn').forEach(btn => {
        const active = btn.dataset.period === period;
        btn.classList.remove('border-gold', 'bg-gold-light', 'border-lavender', 'text-text-soft');
        if (active) {
          btn.classList.add('border-gold', 'bg-gold-light');
          btn.classList.remove('text-text-soft');
        } else {
          btn.classList.add('border-lavender', 'text-text-soft');
          btn.classList.remove('border-gold', 'bg-gold-light');
        }
      });
      loadOverviewLoginStats();
    }

    async function loadOverviewLoginStats(retries) {
      document.getElementById('overviewLoginChildTotal').textContent = '…';
      document.getElementById('overviewLoginParentTotal').textContent = '…';
      const maxAttempts = retries || 1;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const data = await Auth.api('/api/admin/login-stats?period=' + _overviewLoginPeriod);
          document.getElementById('overviewLoginChildTotal').textContent =
            data.totals.children.toLocaleString('sv-SE');
          document.getElementById('overviewLoginParentTotal').textContent =
            data.totals.parents.toLocaleString('sv-SE');
          return; // success
        } catch (err) {
          console.error('[ADMIN] Login stats failed (attempt ' + (attempt + 1) + '):', err.message);
          if (attempt < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
      }
      document.getElementById('overviewLoginChildTotal').textContent = '!';
      document.getElementById('overviewLoginParentTotal').textContent = '!';
    }

    // ─── Login Stats (Användning) ─────────────────────────────
    async function loadLoginStats() {
      const container = document.getElementById('loginStatsFamiliesContainer');
      container.innerHTML = '<div class="text-center text-text-soft py-8">Laddar...</div>';

      try {
        const data = await Auth.api('/api/admin/login-stats');

        // Update overview totals
        document.getElementById('loginStatChildTotal').textContent =
          data.totals.children.toLocaleString('sv-SE');
        document.getElementById('loginStatParentTotal').textContent =
          data.totals.parents.toLocaleString('sv-SE');

        if (!data.families || data.families.length === 0) {
          container.innerHTML = '<div class="text-center text-text-soft py-8">Inga familjer att visa.</div>';
          return;
        }

        container.innerHTML = data.families.map(family => {
          const parents = family.parents || [];
          const children = family.children || [];
          const hasParents = parents.length > 0;
          const hasChildren = children.length > 0;

          const parentRows = hasParents ? parents.map(u => renderUserRow(u)).join('') : '';
          const childRows = hasChildren ? children.map(u => renderUserRow(u)).join('') : '';

          const familyId = family.family_id.replace(/-/g, '_');

          return `
            <div class="bg-white rounded-2xl border-2 border-lavender overflow-hidden">
              <button
                class="w-full flex items-center justify-between p-5 hover:bg-sky transition-colors text-left"
                onclick="toggleLoginFamily('${familyId}')"
                aria-expanded="false"
                id="loginFamilyBtn_${familyId}"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">&#128104;&#8205;&#128105;&#8205;&#128103;</span>
                  <span class="font-heading font-bold text-navy text-lg">${escHtml(family.family_name)}</span>
                </div>
                <div class="flex items-center gap-4 text-sm text-text-soft">
                  <span>${parents.length} förälder${parents.length !== 1 ? 'ar' : ''}</span>
                  <span>&middot;</span>
                  <span>${children.length} barn</span>
                  <svg id="loginFamilyChevron_${familyId}" class="w-4 h-4 transition-transform -rotate-90 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>
              <div id="loginFamilyBody_${familyId}" class="hidden">
                <div class="border-t border-lavender">
                  ${hasParents ? `
                    <div class="px-5 pt-4 pb-2">
                      <p class="text-xs font-heading font-bold text-text-soft uppercase tracking-wider mb-2">Föräldrar</p>
                      ${renderUserTable(parentRows)}
                    </div>
                  ` : ''}
                  ${hasChildren ? `
                    <div class="px-5 pt-2 pb-4">
                      <p class="text-xs font-heading font-bold text-text-soft uppercase tracking-wider mb-2">Barn</p>
                      ${renderUserTable(childRows)}
                    </div>
                  ` : ''}
                  ${!hasParents && !hasChildren ? `
                    <div class="px-5 py-4 text-text-soft text-sm">Inga användare i denna familj.</div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');

      } catch (err) {
        container.innerHTML = `<div class="text-center text-red-500 py-8">Kunde inte ladda statistik: ${escHtml(err.message || 'Okänt fel')}</div>`;
      }
    }

    function renderUserTable(rows) {
      return `
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-text-soft text-xs border-b border-lavender">
                <th class="py-2 pr-4 font-semibold">Namn</th>
                <th class="py-2 pr-4 font-semibold text-right">Totalt</th>
                <th class="py-2 pr-4 font-semibold text-right">Senaste 7d</th>
                <th class="py-2 font-semibold text-right">Senaste inloggning</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-lavender">
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderUserRow(u) {
      const last = u.last_login
        ? new Date(u.last_login).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';
      return `
        <tr class="hover:bg-sky transition-colors">
          <td class="py-2 pr-4 font-medium text-navy">${escHtml(u.name || '–')}</td>
          <td class="py-2 pr-4 text-right font-heading font-bold text-navy">${u.total_logins}</td>
          <td class="py-2 pr-4 text-right text-text-soft">${u.logins_last_7d}</td>
          <td class="py-2 text-right text-text-soft text-xs">${last}</td>
        </tr>
      `;
    }

    function toggleLoginFamily(id) {
      const body = document.getElementById('loginFamilyBody_' + id);
      const chevron = document.getElementById('loginFamilyChevron_' + id);
      const btn = document.getElementById('loginFamilyBtn_' + id);
      const isHidden = body.classList.contains('hidden');
      body.classList.toggle('hidden', !isHidden);
      chevron.classList.toggle('-rotate-90', !isHidden);
      btn.setAttribute('aria-expanded', String(isHidden));
    }

    function escHtml(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Load defaults when section is shown
    const origShowSection = showSection;
    showSection = function(name) {
      origShowSection(name);
      if (name === 'defaults') {
        // Load the active library tab
        if (activeLibTab === 'rewards') {
          loadDefaultRewards();
        } else {
          loadDefaultTemplates();
        }
      }
    };

    // ── Default Rewards Library ─────────────────────────────────
    let defaultRewards = [];

    async function loadDefaultRewards() {
      const container = document.getElementById('defaultRewardsList');
      if (!container) return;
      container.innerHTML = '<p class="text-text-soft text-center py-8">Laddar...</p>';
      try {
        const data = await Auth.api('/api/admin/default-rewards');
        defaultRewards = data;
        renderDefaultRewards(data);
      } catch (err) {
        container.innerHTML = '<p class="text-red-500 text-center py-4">Kunde inte ladda belöningar: ' + esc(err.message) + '</p>';
      }
    }

    function renderDefaultRewards(rewards) {
      const container = document.getElementById('defaultRewardsList');
      if (!rewards || rewards.length === 0) {
        container.innerHTML = '<p class="text-text-soft text-center py-8 bg-sky rounded-2xl">Inga standardbelöningar. Klicka "+ Ny belöning" för att lägga till.</p>';
        return;
      }
      container.innerHTML = rewards.map(r => `
        <div class="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border-2 border-lavender hover:border-gold/50 transition-colors">
          <span class="text-2xl">${esc(r.icon || '🎁')}</span>
          <span class="flex-1 text-sm font-semibold text-navy">${esc(r.name)}</span>
          <span class="text-sm font-heading font-bold text-gold">${r.star_cost} ⭐</span>
          <button onclick="openEditDefaultRewardModal('${r.id}')" class="p-2 hover:bg-lavender rounded-lg text-xs transition-colors" title="Redigera">✏️</button>
          <button onclick="deleteDefaultReward('${r.id}')" class="p-2 hover:bg-coral rounded-lg text-xs transition-colors" title="Ta bort">🗑️</button>
        </div>
      `).join('');
    }

    function openAddDefaultRewardModal() {
      document.getElementById('drModalTitle').textContent = 'Ny standardbelöning';
      document.getElementById('drId').value = '';
      document.getElementById('drIcon').value = '🎁';
      document.getElementById('drName').value = '';
      document.getElementById('drStarCost').value = '100';
      document.getElementById('drMsg').textContent = '';
      document.getElementById('defaultRewardModal').classList.remove('hidden');
    }

    function openEditDefaultRewardModal(id) {
      const r = defaultRewards.find(x => x.id === id);
      if (!r) return;
      document.getElementById('drModalTitle').textContent = 'Redigera standardbelöning';
      document.getElementById('drId').value = r.id;
      document.getElementById('drIcon').value = r.icon || '🎁';
      document.getElementById('drName').value = r.name;
      document.getElementById('drStarCost').value = r.star_cost;
      document.getElementById('drMsg').textContent = '';
      document.getElementById('defaultRewardModal').classList.remove('hidden');
    }

    function closeDefaultRewardModal() {
      document.getElementById('defaultRewardModal').classList.add('hidden');
    }

    async function submitDefaultReward() {
      const id = document.getElementById('drId').value;
      const name = document.getElementById('drName').value.trim();
      const icon = document.getElementById('drIcon').value.trim() || '🎁';
      const star_cost = parseInt(document.getElementById('drStarCost').value) || 100;
      const msg = document.getElementById('drMsg');

      if (!name) { msg.textContent = 'Namn krävs'; msg.className = 'text-sm text-red-500'; return; }
      if (star_cost < 1) { msg.textContent = 'Stjärnkostnad måste vara minst 1'; msg.className = 'text-sm text-red-500'; return; }

      try {
        if (id) {
          await Auth.api('/api/admin/default-rewards/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name, icon, star_cost }),
          });
        } else {
          await Auth.api('/api/admin/default-rewards', {
            method: 'POST',
            body: JSON.stringify({ name, icon, star_cost }),
          });
        }
        closeDefaultRewardModal();
        await loadDefaultRewards();
      } catch (err) {
        msg.textContent = err.message || 'Fel uppstod';
        msg.className = 'text-sm text-red-500';
      }
    }

    async function deleteDefaultReward(id) {
      const r = defaultRewards.find(x => x.id === id);
      const label = r ? r.name : id;
      if (!confirm('Ta bort standardbelöningen "' + label + '"?\n\nFamiljers kopior bevaras — de tas ALDRIG bort automatiskt.')) return;
      try {
        await Auth.api('/api/admin/default-rewards/' + id, { method: 'DELETE' });
        await loadDefaultRewards();
      } catch (err) {
        alert(err.message || 'Kunde inte ta bort belöning');
      }
    }

    // ── System Messages (admin direct notifications) ──────────────

    function toggleMsgPanel(familyId) {
      const panel = document.getElementById('msgPanel-' + familyId);
      const chevron = document.getElementById('msgChevron-' + familyId);
      if (!panel) return;
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
      if (chevron) chevron.textContent = isHidden ? '▲' : '▼';
      // Load message history when opening
      if (isHidden) loadMsgHistory(familyId);
    }

    async function sendSystemMessage(familyId) {
      const input = document.getElementById('msgInput-' + familyId);
      const status = document.getElementById('msgStatus-' + familyId);
      if (!input || !status) return;
      const message = input.value.trim();
      if (!message) {
        status.textContent = 'Skriv ett meddelande först';
        status.className = 'text-xs font-semibold text-red-500';
        return;
      }
      status.textContent = 'Skickar...';
      status.className = 'text-xs font-semibold text-text-soft';
      try {
        await Auth.api('/api/admin/messages', {
          method: 'POST',
          body: JSON.stringify({ family_id: familyId, message }),
        });
        input.value = '';
        status.textContent = '✅ Skickat! Familjen ser det i realtid.';
        status.className = 'text-xs font-semibold text-green-600';
        // Reload history to show sent message
        await loadMsgHistory(familyId);
        setTimeout(() => { if (status) status.textContent = ''; }, 4000);
      } catch (err) {
        status.textContent = '❌ ' + (err.message || 'Kunde inte skicka');
        status.className = 'text-xs font-semibold text-red-500';
      }
    }

    async function loadMsgHistory(familyId) {
      const histContainer = document.getElementById('msgHistory-' + familyId);
      if (!histContainer) return;
      try {
        const messages = await Auth.api('/api/admin/messages/' + familyId);
        if (!messages || messages.length === 0) {
          histContainer.innerHTML = '<p class="text-xs text-text-soft italic">Inga skickade meddelanden än.</p>';
          return;
        }
        histContainer.innerHTML = '<p class="text-xs font-bold text-text-soft uppercase tracking-wider mb-2">Senaste 10 meddelanden</p>' +
          messages.map(m => {
            const ts = m.created_at ? new Date(m.created_at).toLocaleString('sv-SE', {
              year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }) : '';
            const readBadge = m.is_read
              ? '<span class="inline-block px-1.5 py-0.5 bg-mint text-green-700 text-xs rounded font-semibold">Läst</span>'
              : '<span class="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-semibold">Oläst</span>';
            return `<div class="flex items-start gap-2 py-2 border-b border-lavender/40 last:border-0">
              <span class="text-base flex-shrink-0">📣</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-navy leading-snug">${escHtml(m.message)}</p>
                <div class="flex items-center gap-2 mt-1">${readBadge}<span class="text-xs text-text-soft">${ts}</span></div>
              </div>
            </div>`;
          }).join('');
      } catch (err) {
        histContainer.innerHTML = '<p class="text-xs text-red-500">Kunde inte ladda historik</p>';
      }
    }
