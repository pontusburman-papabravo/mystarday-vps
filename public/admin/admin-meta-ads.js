// Admin Meta Ads: approval-gated campaign drafts for Cursor + founder review.
// Owns: list, import JSON, submit, approve, reject, pause, resume, insights.
// Does NOT own: Meta Graph calls (server) or page feed posting.

(function () {
  'use strict';

  const STATUS_LABELS = {
    draft: { label: 'Utkast', class: 'bg-gray-100 text-gray-700' },
    pending_approval: { label: 'Väntar godkännande', class: 'bg-yellow-100 text-yellow-800' },
    rejected: { label: 'Avvisad', class: 'bg-gray-200 text-gray-600' },
    publishing: { label: 'Publicerar…', class: 'bg-blue-100 text-blue-800' },
    live: { label: 'Live', class: 'bg-green-100 text-green-800' },
    paused: { label: 'Pausad', class: 'bg-amber-100 text-amber-900' },
    failed: { label: 'Misslyckad publicering', class: 'bg-red-100 text-red-700' },
  };

  let metaAdsState = { campaigns: [], summary: {}, config: {} };
  let metaAdsLoading = false;
  let editingId = null;

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function api(url, options, ms) {
    const timeoutMs = ms || 20000;
    return Promise.race([
      Auth.api(url, options),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout efter ' + timeoutMs / 1000 + 's')), timeoutMs);
      }),
    ]);
  }

  function statusBadge(status) {
    const meta = STATUS_LABELS[status] || { label: status, class: 'bg-gray-100 text-gray-700' };
    return '<span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + meta.class + '">' + esc(meta.label) + '</span>';
  }

  function readForm() {
    return {
      name: document.getElementById('metaAdsName').value,
      slug: document.getElementById('metaAdsSlug').value || undefined,
      destination_url: document.getElementById('metaAdsUrl').value,
      daily_budget_sek: document.getElementById('metaAdsBudget').value,
      countries: document.getElementById('metaAdsCountries').value.split(',').map((s) => s.trim()).filter(Boolean),
      age_min: document.getElementById('metaAdsAgeMin').value,
      age_max: document.getElementById('metaAdsAgeMax').value,
      headline: document.getElementById('metaAdsHeadline').value,
      primary_text: document.getElementById('metaAdsPrimary').value,
      description: document.getElementById('metaAdsDescription').value,
      call_to_action: document.getElementById('metaAdsCta').value,
      image_url: document.getElementById('metaAdsImage').value,
      hypothesis: document.getElementById('metaAdsHypothesis').value,
      primary_metric: document.getElementById('metaAdsMetric').value,
      notes: document.getElementById('metaAdsNotes').value,
    };
  }

  function fillForm(data) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value == null ? '' : value;
    };
    set('metaAdsName', data.name);
    set('metaAdsSlug', data.slug);
    set('metaAdsUrl', data.destination_url);
    set('metaAdsBudget', data.daily_budget_sek);
    set('metaAdsCountries', (data.countries || []).join(','));
    set('metaAdsAgeMin', data.age_min);
    set('metaAdsAgeMax', data.age_max);
    set('metaAdsHeadline', data.headline);
    set('metaAdsPrimary', data.primary_text);
    set('metaAdsDescription', data.description);
    set('metaAdsCta', data.call_to_action || 'LEARN_MORE');
    set('metaAdsImage', data.image_url);
    set('metaAdsHypothesis', data.hypothesis);
    set('metaAdsMetric', data.primary_metric);
    set('metaAdsNotes', data.notes);
  }

  function renderConfig(config) {
    const el = document.getElementById('metaAdsConfigBanner');
    if (!el) return;
    if (config && config.configured) {
      el.className = 'mb-4 rounded-2xl border-2 border-mint bg-mint/20 p-4 text-sm text-navy';
      el.innerHTML = 'Kopplad till Meta-konto <span class="font-mono">' + esc(config.adAccountId) +
        '</span>. Dagsbudgettak ' + esc(config.maxDailyBudgetSek) + ' kr. Inget går live utan godkännande.';
      return;
    }
    el.className = 'mb-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900';
    el.innerHTML = 'Meta Ads-nycklar saknas ännu. Ni kan skapa och godkänna-köa utkast, men publicering kräver ' +
      '<span class="font-mono">META_ADS_ACCESS_TOKEN</span>, <span class="font-mono">META_AD_ACCOUNT_ID</span> och sid-id.';
  }

  function actionButtons(row) {
    const id = esc(row.id);
    const buttons = [];
    if (row.status === 'draft' || row.status === 'rejected') {
      buttons.push('<button type="button" data-meta-ads-edit="' + id + '" class="px-3 py-2 rounded-xl border-2 border-navy text-sm font-semibold text-navy" style="min-height:44px">Redigera</button>');
      buttons.push('<button type="button" data-meta-ads-submit="' + id + '" class="px-3 py-2 rounded-xl bg-navy text-white text-sm font-semibold" style="min-height:44px">Skicka för godkännande</button>');
      buttons.push('<button type="button" data-meta-ads-reject="' + id + '" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy" style="min-height:44px">Avvisa</button>');
    }
    if (row.status === 'pending_approval' || row.status === 'failed') {
      buttons.push('<button type="button" data-meta-ads-approve="' + id + '" class="px-3 py-2 rounded-xl bg-gold text-navy text-sm font-semibold" style="min-height:44px">Godkänn och publicera</button>');
      buttons.push('<button type="button" data-meta-ads-reject="' + id + '" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy" style="min-height:44px">Avvisa</button>');
    }
    if (row.status === 'publishing') {
      buttons.push('<button type="button" data-meta-ads-reject="' + id + '" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy" style="min-height:44px">Avbryt publicering</button>');
    }
    if (row.status === 'live') {
      buttons.push('<button type="button" data-meta-ads-pause="' + id + '" class="px-3 py-2 rounded-xl bg-navy text-white text-sm font-semibold" style="min-height:44px">Pausa</button>');
      buttons.push('<button type="button" data-meta-ads-insights="' + id + '" class="px-3 py-2 rounded-xl border-2 border-lavender text-sm font-semibold text-navy" style="min-height:44px">Hämta resultat</button>');
    }
    if (row.status === 'paused') {
      buttons.push('<button type="button" data-meta-ads-resume="' + id + '" class="px-3 py-2 rounded-xl bg-gold text-navy text-sm font-semibold" style="min-height:44px">Återuppta</button>');
    }
    return buttons.join('');
  }

  function renderList() {
    const container = document.getElementById('metaAdsList');
    if (!container) return;
    const rows = metaAdsState.campaigns || [];
    const summary = metaAdsState.summary || {};
    const pending = summary.pending_approval || 0;
    const summaryHtml = '<p class="text-sm text-text-soft mb-4">' +
      esc(pending) + ' väntar godkännande · ' +
      esc(summary.live || 0) + ' live · ' +
      esc(summary.paused || 0) + ' pausade · ' +
      esc(summary.failed || 0) + ' misslyckade</p>';
    if (!rows.length) {
      container.innerHTML = summaryHtml + '<p class="text-text-soft text-sm">Inga kampanjer ännu. Skapa ett utkast eller klistra in JSON från Cursor.</p>';
      return;
    }
    container.innerHTML = summaryHtml + rows.map((row) => {
      return '<article class="bg-white rounded-2xl border-2 border-lavender p-4 mb-3">' +
        '<div class="flex flex-wrap items-start justify-between gap-3">' +
          '<div>' +
            '<h4 class="font-heading font-bold text-navy">' + esc(row.name) + '</h4>' +
            '<p class="text-xs text-text-soft font-mono mt-1">' + esc(row.slug) + ' · ' + esc(row.created_source) + '</p>' +
          '</div>' +
          statusBadge(row.status) +
        '</div>' +
        '<p class="text-sm text-navy mt-3">' + esc(row.headline) + '</p>' +
        '<p class="text-sm text-text-soft mt-1">' + esc(row.primary_text) + '</p>' +
        '<p class="text-xs text-text-soft mt-2">' + esc(row.daily_budget_sek) + ' kr/dag · ' +
          esc((row.countries || []).join(', ')) + ' · ' + esc(row.destination_url) + '</p>' +
        '<p class="text-xs text-navy mt-2"><span class="font-semibold">Hypotes:</span> ' + esc(row.hypothesis) +
          ' · <span class="font-semibold">Mått:</span> ' + esc(row.primary_metric) + '</p>' +
        (row.last_error ? '<p class="text-sm text-red-700 mt-2">' + esc(row.last_error) + '</p>' : '') +
        (row.last_insights ? '<pre class="text-xs bg-sky/30 rounded-xl p-3 mt-2 overflow-x-auto">' +
          esc(JSON.stringify(row.last_insights, null, 2)) + '</pre>' : '') +
        '<div class="flex flex-wrap gap-2 mt-4">' + actionButtons(row) + '</div>' +
      '</article>';
    }).join('');
  }

  async function loadMetaAdsCampaigns() {
    if (metaAdsLoading) return;
    metaAdsLoading = true;
    const container = document.getElementById('metaAdsList');
    if (container) container.innerHTML = '<p class="text-text-soft text-sm">Laddar…</p>';
    try {
      const data = await api('/api/admin/meta-ads');
      metaAdsState = data;
      renderConfig(data.config);
      renderList();
    } catch (err) {
      if (container) {
        container.innerHTML = '<p class="text-red-600 text-sm">Kunde inte ladda Meta-annonser: ' + esc(err.message) + '</p>';
      }
    } finally {
      metaAdsLoading = false;
    }
  }

  async function createFromForm(event) {
    event.preventDefault();
    try {
      if (editingId) {
        await api('/api/admin/meta-ads/' + editingId, {
          method: 'PUT',
          body: JSON.stringify(readForm()),
        });
      } else {
        await api('/api/admin/meta-ads', {
          method: 'POST',
          body: JSON.stringify(readForm()),
        });
      }
      editingId = null;
      document.getElementById('metaAdsForm').reset();
      await loadMetaAdsCampaigns();
    } catch (err) {
      alert(err.message || 'Kunde inte spara utkast');
    }
  }

  async function importJson() {
    const raw = document.getElementById('metaAdsJsonImport').value.trim();
    if (!raw) {
      alert('Klistra in JSON från Cursor först.');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      alert('Ogiltig JSON');
      return;
    }
    parsed.created_source = 'cursor';
    try {
      const created = await api('/api/admin/meta-ads', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      editingId = created.campaign.id;
      fillForm(created.campaign);
      document.getElementById('metaAdsJsonImport').value = '';
      await loadMetaAdsCampaigns();
    } catch (err) {
      alert(err.message || 'Kunde inte importera utkast');
    }
  }

  async function act(kind, id) {
    const paths = {
      submit: '/submit',
      approve: '/approve',
      reject: '/reject',
      pause: '/pause',
      resume: '/resume',
    };
    let body;
    if (kind === 'reject') {
      const reason = window.prompt('Anledning (valfritt)') || '';
      body = JSON.stringify({ reason });
    }
    if (kind === 'approve' && !window.confirm('Godkänn och publicera till Meta? Detta kan kosta pengar.')) {
      return;
    }
    try {
      if (kind === 'insights') {
        await api('/api/admin/meta-ads/' + id + '/insights', { method: 'GET' }, 30000);
      } else {
        await api('/api/admin/meta-ads/' + id + paths[kind], {
          method: 'POST',
          body: body,
        }, kind === 'approve' ? 60000 : 20000);
      }
      await loadMetaAdsCampaigns();
    } catch (err) {
      alert(err.message || 'Åtgärden misslyckades');
      await loadMetaAdsCampaigns();
    }
  }

  function onListClick(event) {
    const t = event.target;
    if (!t || !t.getAttribute) return;
    const editId = t.getAttribute('data-meta-ads-edit');
    if (editId) {
      const row = (metaAdsState.campaigns || []).find((item) => String(item.id) === String(editId));
      if (row) {
        editingId = row.id;
        fillForm(row);
        const form = document.getElementById('metaAdsForm');
        if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const mapping = [
      ['data-meta-ads-submit', 'submit'],
      ['data-meta-ads-approve', 'approve'],
      ['data-meta-ads-reject', 'reject'],
      ['data-meta-ads-pause', 'pause'],
      ['data-meta-ads-resume', 'resume'],
      ['data-meta-ads-insights', 'insights'],
    ];
    for (let i = 0; i < mapping.length; i++) {
      const id = t.getAttribute(mapping[i][0]);
      if (id) {
        act(mapping[i][1], id);
        return;
      }
    }
  }

  function bindOnce() {
    const form = document.getElementById('metaAdsForm');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', createFromForm);
    }
    const importBtn = document.getElementById('metaAdsImportBtn');
    if (importBtn && !importBtn.dataset.bound) {
      importBtn.dataset.bound = '1';
      importBtn.addEventListener('click', importJson);
    }
    const list = document.getElementById('metaAdsList');
    if (list && !list.dataset.bound) {
      list.dataset.bound = '1';
      list.addEventListener('click', onListClick);
    }
    const reload = document.getElementById('metaAdsReloadBtn');
    if (reload && !reload.dataset.bound) {
      reload.dataset.bound = '1';
      reload.addEventListener('click', loadMetaAdsCampaigns);
    }
  }

  window.loadMetaAdsCampaigns = function () {
    bindOnce();
    return loadMetaAdsCampaigns();
  };
})();
