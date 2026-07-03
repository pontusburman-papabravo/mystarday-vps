/**
 * Admin Paket workspace V2 — load panels per package component.
 */
(function () {
  const PACKAGE_LABELS = { teacch: 'Extra stöd', reporting: 'Rapportering', pedagog: 'Pedagog' };
  const SEVEN_FIELDS = [
    { key: 'where', label: 'Var?' },
    { key: 'who', label: 'Vem?' },
    { key: 'how_long', label: 'Hur länge?' },
    { key: 'what_next', label: 'Vad händer sen?' },
    { key: 'what_need', label: 'Vad behöver jag?' },
    { key: 'why', label: 'Varför?' },
  ];

  let loadSeq = 0;
  let currentComponent = 'teacch';
  let overviewCache = null;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function msgEl(id) {
    return document.getElementById(id);
  }

  function setMsg(id, text, ok) {
    const el = msgEl(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'text-sm min-h-[1.4em] ' + (ok ? 'text-green-600' : text ? 'text-red-500' : 'text-text-soft');
  }

  async function loadPaketWorkspace(component, panel) {
    currentComponent = component || 'teacch';
    const seq = ++loadSeq;
    try {
      const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent));
      if (seq !== loadSeq) return;
      overviewCache = data;
      renderOverview(data);
      if (panel === 'families' || panel === 'overview') renderFamilies(data);
      if (panel === 'interest') await loadInterestTable();
      if (panel === 'features') await loadFeaturesPanel();
      if (panel === 'content') await loadContentPanel(data);
      if (panel === 'preview') await loadPreviewPanel();
    } catch (err) {
      console.error('[Admin:paket]', err);
      setMsg('paketOverviewMsg', 'Kunde inte ladda paket: ' + (err.message || err), false);
    }
  }

  async function loadPaketPanel(component, panel) {
    currentComponent = component || currentComponent;
    if (panel === 'overview') return loadPaketWorkspace(component, panel);
    if (panel === 'families') {
      try {
        const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/families');
        renderFamiliesList(data.families || []);
      } catch (err) {
        setMsg('paketFamiliesMsg', String(err.message || err), false);
      }
      return;
    }
    if (panel === 'interest') return loadInterestTable();
    if (panel === 'features') return loadFeaturesPanel();
    if (panel === 'content') return loadContentPanel(overviewCache);
    if (panel === 'preview') return loadPreviewPanel();
  }

  function renderOverview(data) {
    const el = msgEl('paketOverviewCards');
    if (!el || !data) return;
    const s = data.stats || {};
    el.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Aktiva familjer</span><strong class="text-lg">${s.active_families ?? 0}</strong></div>
        <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Intresse</span><strong class="text-lg">${s.interest_families ?? 0}</strong></div>
        <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Preview (${s.period || '30d'})</span><strong class="text-lg">${s.preview_families ?? 0}</strong></div>
        <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Starter-mallar</span><strong class="text-lg">${s.starter_activities ?? 0}</strong></div>
      </div>
      <p class="text-sm text-text-soft">Rollout: <strong>${esc(s.rollout_mode || 'off')}</strong> · ${esc(data.meta?.features?.length || 0)} features i paketet</p>
    `;
    setMsg('paketOverviewMsg', '', true);
  }

  function renderFamilies(data) {
    if (data && data.stats) {
      renderFamiliesList([]);
      loadPaketPanel(currentComponent, 'families');
    }
  }

  function renderFamiliesList(rows) {
    const tbody = msgEl('paketFamiliesBody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-text-soft text-sm">Inga familjer med aktiv komponent ännu.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((r) => `
      <tr class="border-t border-lavender/40">
        <td class="py-2 pr-2 text-sm font-semibold text-navy">${esc(r.name || '(namnlös)')}</td>
        <td class="py-2 pr-2 text-xs text-text-soft">${esc(r.parent_emails || '—')}</td>
        <td class="py-2 pr-2 text-xs">${esc(r.child_names || '—')}</td>
        <td class="py-2 pr-2 text-xs text-text-soft">${r.granted_at ? new Date(r.granted_at).toLocaleDateString('sv-SE') : '—'}</td>
        <td class="py-2 text-right space-x-1">
          <button type="button" class="px-2 py-1 text-xs rounded-lg bg-lavender hover:bg-sky" onclick="openFamilyHub('${r.id}')">Öppna</button>
          <button type="button" class="px-2 py-1 text-xs rounded-lg bg-gold text-navy font-semibold" onclick="paketGrantDevFeatures('${r.id}')">Dev-features</button>
          <button type="button" class="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600" onclick="paketArchiveComponent('${r.id}')">Återkalla</button>
        </td>
      </tr>
    `).join('');
  }

  async function loadInterestTable() {
    const tbody = msgEl('paketInterestBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-text-soft text-sm">Laddar…</td></tr>';
    try {
      const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/interest?limit=100');
      const rows = data.rows || [];
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-text-soft text-sm">Inga intresseanmälningar för detta paket.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map((r) => `
        <tr class="border-t border-lavender/40 text-sm">
          <td class="py-2">${r.created_at ? new Date(r.created_at).toLocaleString('sv-SE') : '—'}</td>
          <td class="py-2">${esc(r.parent_name || '—')}</td>
          <td class="py-2">${esc(r.family_name || '—')}</td>
          <td class="py-2 text-xs">${esc(r.source || '—')}</td>
          <td class="py-2 text-xs text-text-soft">${esc(r.comment || '')}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-red-500 text-sm">' + esc(err.message || err) + '</td></tr>';
    }
  }

  async function loadFeaturesPanel() {
    const el = msgEl('paketFeaturesList');
    if (!el) return;
    el.innerHTML = '<p class="text-sm text-text-soft">Laddar features…</p>';
    try {
      const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/features');
      const features = data.features || [];
      if (!features.length) {
        el.innerHTML = '<p class="text-sm text-text-soft">Inga features kopplade till detta paket.</p>';
        return;
      }
      el.innerHTML = features.map((f) => {
        const families = (f.assigned_families || []).length;
        const statusCls = f.status === 'live' ? 'bg-green-100 text-green-800' : f.status === 'dev' ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600';
        return `<div class="border border-lavender rounded-xl p-4 mb-3">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
            <strong class="text-navy">${esc(f.name)}</strong>
            <span class="text-xs px-2 py-0.5 rounded-full ${statusCls}">${esc(f.status)}</span>
          </div>
          <p class="text-xs text-text-soft font-mono mb-1">${esc(f.slug)}</p>
          <p class="text-sm text-text-soft mb-2">${esc(f.description || '')}</p>
          <p class="text-xs">${families} dev-familj${families === 1 ? '' : 'er'} · <a href="/admin/development" class="text-navy underline">Öppna i Utveckling</a></p>
        </div>`;
      }).join('');
    } catch (err) {
      el.innerHTML = '<p class="text-sm text-red-500">' + esc(err.message || err) + '</p>';
    }
  }

  async function loadContentPanel(cached) {
    const wrap = msgEl('paketContentPanel');
    if (!wrap) return;

    if (currentComponent === 'teacch') {
      wrap.innerHTML = '<p class="text-sm text-text-soft mb-4">Starter-mallar med de sju frågorna — kopieras till familjer med Extra stöd via standardbiblioteket.</p><div id="paketStarterList"></div><button type="button" id="paketAddStarterBtn" class="mt-4 px-4 py-2 bg-gold text-navy rounded-xl text-sm font-bold">+ Ny starter-mall</button>';
      document.getElementById('paketAddStarterBtn')?.addEventListener('click', () => openStarterEditor(null));
      await loadStarterActivities();
      return;
    }

    const content = (cached && cached.content) || {};
    const fields = currentComponent === 'reporting'
      ? [
          { key: 'headline', label: 'Rubrik', type: 'text' },
          { key: 'description', label: 'Beskrivning', type: 'textarea' },
          { key: 'default_share_fields', label: 'Delningsfält (kommaseparerat)', type: 'text', join: true },
          { key: 'export_note', label: 'Export-notis', type: 'textarea' },
        ]
      : [
          { key: 'headline', label: 'Rubrik', type: 'text' },
          { key: 'description', label: 'Beskrivning', type: 'textarea' },
          { key: 'note_sections', label: 'Anteckningssektioner (kommaseparerat)', type: 'text', join: true },
          { key: 'invite_note', label: 'Inbjudningsnotis', type: 'textarea' },
        ];

    wrap.innerHTML = `
      <form id="paketContentForm" class="space-y-4 max-w-xl">
        ${fields.map((f) => {
          const val = f.join && Array.isArray(content[f.key]) ? content[f.key].join(', ') : (content[f.key] || '');
          if (f.type === 'textarea') {
            return `<div><label class="block text-xs font-semibold text-navy mb-1">${esc(f.label)}</label><textarea name="${f.key}" rows="3" class="w-full px-3 py-2 rounded-xl border-2 border-lavender text-sm">${esc(val)}</textarea></div>`;
          }
          return `<div><label class="block text-xs font-semibold text-navy mb-1">${esc(f.label)}</label><input name="${f.key}" type="text" value="${esc(val)}" class="w-full px-3 py-2 rounded-xl border-2 border-lavender text-sm"></div>`;
        }).join('')}
        <button type="submit" class="px-4 py-2 bg-gold text-navy rounded-xl text-sm font-bold">Spara innehåll</button>
        <div id="paketContentMsg" class="text-sm min-h-[1.4em]"></div>
      </form>
    `;
    document.getElementById('paketContentForm')?.addEventListener('submit', saveContentForm);
  }

  async function saveContentForm(e) {
    e.preventDefault();
    const form = e.target;
    const body = {};
    for (const f of form.elements) {
      if (!f.name) continue;
      if (f.name === 'default_share_fields' || f.name === 'note_sections') {
        body[f.name] = f.value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        body[f.name] = f.value;
      }
    }
    try {
      await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/content', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setMsg('paketContentMsg', '✓ Sparat', true);
    } catch (err) {
      setMsg('paketContentMsg', String(err.message || err), false);
    }
  }

  async function loadStarterActivities() {
    const el = msgEl('paketStarterList');
    if (!el) return;
    try {
      const data = await Auth.api('/api/admin/packages/teacch/starter-content');
      const rows = data.activities || [];
      if (!rows.length) {
        el.innerHTML = '<p class="text-sm text-text-soft">Inga starter-mallar ännu.</p>';
        return;
      }
      el.innerHTML = rows.map((a) => {
        const filled = SEVEN_FIELDS.filter((f) => a.seven_questions && a.seven_questions[f.key] && a.seven_questions[f.key].text).length;
        return `<div class="border border-lavender rounded-xl p-4 mb-3 flex flex-wrap justify-between gap-2 items-start">
          <div>
            <strong>${esc(a.icon)} ${esc(a.name)}</strong>
            <span class="text-xs text-text-soft ml-2">${filled}/6 frågor ifyllda</span>
          </div>
          <div class="space-x-2">
            <button type="button" class="px-3 py-1 text-xs rounded-lg bg-lavender" data-starter-edit="${a.id}">Redigera</button>
            <button type="button" class="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600" data-starter-del="${a.id}">Ta bort</button>
          </div>
        </div>`;
      }).join('');
      el.querySelectorAll('[data-starter-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-starter-edit');
          const act = rows.find((r) => String(r.id) === String(id));
          openStarterEditor(act);
        });
      });
      el.querySelectorAll('[data-starter-del]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-starter-del');
          if (!confirm('Ta bort starter-mallen?')) return;
          await Auth.api('/api/admin/packages/teacch/starter-content/' + id, { method: 'DELETE' });
          loadStarterActivities();
        });
      });
    } catch (err) {
      el.innerHTML = '<p class="text-sm text-red-500">' + esc(err.message || err) + '</p>';
    }
  }

  function openStarterEditor(act) {
    const sq = (act && act.seven_questions) || {};
    const modal = document.getElementById('paketStarterModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.dataset.editId = act ? act.id : '';
    document.getElementById('paketStarterName').value = act ? act.name : '';
    document.getElementById('paketStarterIcon').value = act ? act.icon : '📌';
    document.getElementById('paketStarterStars').value = act ? act.star_value : 1;
    const fieldsEl = document.getElementById('paketStarterFields');
    fieldsEl.innerHTML = SEVEN_FIELDS.map((f) => {
      const val = sq[f.key] || {};
      return `<div class="grid grid-cols-3 gap-2 items-center">
        <label class="text-xs font-semibold text-navy">${esc(f.label)}</label>
        <input type="text" data-sq="${f.key}" data-part="text" value="${esc(val.text || '')}" placeholder="Text" class="col-span-1 px-2 py-1.5 rounded-lg border border-lavender text-sm">
        <input type="text" data-sq="${f.key}" data-part="emoji" value="${esc(val.emoji || '')}" placeholder="Emoji" class="col-span-1 px-2 py-1.5 rounded-lg border border-lavender text-sm">
      </div>`;
    }).join('');
  }

  function closeStarterModal() {
    document.getElementById('paketStarterModal')?.classList.add('hidden');
  }

  async function saveStarterModal() {
    const modal = document.getElementById('paketStarterModal');
    const name = document.getElementById('paketStarterName').value.trim();
    if (!name) return setMsg('paketStarterMsg', 'Namn krävs', false);
    const seven_questions = {};
    modal.querySelectorAll('[data-sq][data-part="text"]').forEach((input) => {
      const key = input.getAttribute('data-sq');
      const text = input.value.trim();
      const emojiInput = modal.querySelector(`[data-sq="${key}"][data-part="emoji"]`);
      const emoji = emojiInput ? emojiInput.value.trim() : '';
      if (text || emoji) seven_questions[key] = { text, emoji };
    });
    const body = {
      name,
      icon: document.getElementById('paketStarterIcon').value || '📌',
      star_value: parseInt(document.getElementById('paketStarterStars').value, 10) || 1,
      seven_questions,
    };
    const editId = modal.dataset.editId;
    try {
      if (editId) {
        await Auth.api('/api/admin/packages/teacch/starter-content/' + editId, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await Auth.api('/api/admin/packages/teacch/starter-content', { method: 'POST', body: JSON.stringify(body) });
      }
      closeStarterModal();
      loadStarterActivities();
      setMsg('paketStarterMsg', '✓ Sparat', true);
    } catch (err) {
      setMsg('paketStarterMsg', String(err.message || err), false);
    }
  }

  async function loadPreviewPanel() {
    const el = msgEl('paketPreviewEditor');
    if (!el) return;
    el.innerHTML = '<p class="text-sm text-text-soft">Laddar preview…</p>';
    try {
      const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/preview');
      const merged = data.merged || {};
      el.innerHTML = `
        <p class="text-sm text-text-soft mb-3">${esc(merged.watermark || '')}</p>
        <div class="grid gap-3 max-w-xl">
          <div><label class="block text-xs font-semibold text-navy mb-1">Tagline</label><input id="paketPreviewTagline" type="text" class="w-full px-3 py-2 rounded-xl border-2 border-lavender text-sm" value="${esc(merged.tagline || '')}"></div>
          <div><label class="block text-xs font-semibold text-navy mb-1">Badge</label><input id="paketPreviewBadge" type="text" class="w-full px-3 py-2 rounded-xl border-2 border-lavender text-sm" value="${esc(merged.badge || '')}"></div>
          <div><label class="block text-xs font-semibold text-navy mb-1">Preview JSON (body)</label><textarea id="paketPreviewBody" rows="10" class="w-full px-3 py-2 rounded-xl border-2 border-lavender text-sm font-mono">${esc(JSON.stringify(merged.body || {}, null, 2))}</textarea></div>
          <button type="button" id="paketPreviewSaveBtn" class="px-4 py-2 bg-gold text-navy rounded-xl text-sm font-bold w-fit">Spara preview</button>
          <div id="paketPreviewMsg" class="text-sm min-h-[1.4em]"></div>
        </div>
      `;
      document.getElementById('paketPreviewSaveBtn')?.addEventListener('click', savePreview);
    } catch (err) {
      el.innerHTML = '<p class="text-sm text-red-500">' + esc(err.message || err) + '</p>';
    }
  }

  async function savePreview() {
    let body;
    try {
      body = JSON.parse(document.getElementById('paketPreviewBody').value);
    } catch {
      return setMsg('paketPreviewMsg', 'Ogiltig JSON i body', false);
    }
    const payload = {
      tagline: document.getElementById('paketPreviewTagline').value,
      badge: document.getElementById('paketPreviewBadge').value,
      body,
    };
    try {
      await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/preview', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMsg('paketPreviewMsg', '✓ Preview sparad', true);
    } catch (err) {
      setMsg('paketPreviewMsg', String(err.message || err), false);
    }
  }

  async function paketGrantComponent(familyId) {
    await Auth.api('/api/admin/families/' + familyId + '/components/' + currentComponent, {
      method: 'PUT',
      body: JSON.stringify({ action: 'grant' }),
    });
    loadPaketPanel(currentComponent, 'families');
  }

  async function paketArchiveComponent(familyId) {
    if (!confirm('Återkalla paket för denna familj?')) return;
    await Auth.api('/api/admin/families/' + familyId + '/components/' + currentComponent, {
      method: 'PUT',
      body: JSON.stringify({ action: 'archive' }),
    });
    loadPaketPanel(currentComponent, 'families');
  }

  async function paketGrantDevFeatures(familyId) {
    try {
      const res = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/families/' + familyId + '/dev-features', { method: 'POST' });
      alert('Dev-features tillagda: ' + ((res.added || []).join(', ') || 'inga (redan tillagda eller inga dev-features)'));
    } catch (err) {
      alert('Fel: ' + (err.message || err));
    }
  }

  async function paketGrantByEmail() {
    const email = (document.getElementById('paketGrantEmail')?.value || '').trim().toLowerCase();
    if (!email) return setMsg('paketGrantMsg', 'Ange e-post', false);
    try {
      const data = await Auth.api('/api/admin/packages/' + encodeURIComponent(currentComponent) + '/families/lookup?email=' + encodeURIComponent(email));
      const row = (data.families || [])[0];
      if (!row) return setMsg('paketGrantMsg', 'Ingen familj hittades', false);
      await paketGrantComponent(row.id);
      await paketGrantDevFeatures(row.id);
      setMsg('paketGrantMsg', '✓ ' + PACKAGE_LABELS[currentComponent] + ' beviljat till ' + (row.name || row.id), true);
      document.getElementById('paketGrantEmail').value = '';
    } catch (err) {
      setMsg('paketGrantMsg', String(err.message || err), false);
    }
  }

  document.getElementById('paketStarterSaveBtn')?.addEventListener('click', saveStarterModal);
  document.getElementById('paketStarterCancelBtn')?.addEventListener('click', closeStarterModal);
  document.getElementById('paketGrantBtn')?.addEventListener('click', paketGrantByEmail);

  window.loadPaketWorkspace = loadPaketWorkspace;
  window.loadPaketPanel = loadPaketPanel;
  window.paketArchiveComponent = paketArchiveComponent;
  window.paketGrantDevFeatures = paketGrantDevFeatures;
})();
