/**
 * Admin — För dig feedback & install stats.
 */
(function () {
  'use strict';

  let loaded = false;
  let selectedGoal = null;
  let adminTab = 'feedback';

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function switchForDigAdminTab(tab) {
    adminTab = tab;
    const feedbackPanel = document.getElementById('forDigAdminFeedbackPanel');
    const installPanel = document.getElementById('forDigAdminInstallationsPanel');
    const tabFeedback = document.getElementById('forDigTabFeedback');
    const tabInstall = document.getElementById('forDigTabInstallations');
    if (feedbackPanel) feedbackPanel.classList.toggle('hidden', tab !== 'feedback');
    if (installPanel) installPanel.classList.toggle('hidden', tab !== 'installations');
    if (tabFeedback) {
      tabFeedback.classList.toggle('border-gold', tab === 'feedback');
      tabFeedback.classList.toggle('bg-gold', tab === 'feedback');
      tabFeedback.classList.toggle('border-lavender', tab !== 'feedback');
    }
    if (tabInstall) {
      tabInstall.classList.toggle('border-gold', tab === 'installations');
      tabInstall.classList.toggle('bg-gold', tab === 'installations');
      tabInstall.classList.toggle('border-lavender', tab !== 'installations');
    }
    if (tab === 'installations') loadForDigInstallations();
  }

  window.switchForDigAdminTab = switchForDigAdminTab;

  async function loadForDigInstallations() {
    const el = document.getElementById('forDigAdminInstallations');
    if (!el) return;
    try {
      const data = await Auth.api('/api/admin/for-dig/installations?days=90&min_count=1');
      const rows = data.installations || [];
      if (rows.length === 0) {
        el.innerHTML = '<p class="text-text-soft">Inga installationer registrerade ännu.</p>';
        return;
      }
      el.innerHTML = `
        <table class="w-full">
          <thead>
            <tr class="text-left text-text-soft border-b border-lavender">
              <th class="py-2 pr-2">#</th>
              <th class="py-2 pr-2">Mål</th>
              <th class="py-2">Familjer (90d)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `
              <tr class="border-b border-lavender/50">
                <td class="py-2 pr-2">${r.rank}</td>
                <td class="py-2 pr-2">${esc(r.icon)} ${esc(r.title)}</td>
                <td class="py-2">${r.install_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } catch (_) {
      el.innerHTML = '<p class="text-red-500">Kunde inte ladda installationer</p>';
    }
  }

  function renderGoalCards(stats) {
    const el = document.getElementById('forDigAdminGoalCards');
    if (!el) return;

    el.innerHTML = (stats.goals || []).map((g) => `
      <button type="button" class="text-left bg-white border-2 border-lavender rounded-2xl p-4 hover:border-gold transition-colors w-full"
        onclick="filterForDigResponses('${esc(g.slug)}')">
        <p class="text-2xl mb-1">${esc(g.icon || '✨')} ${esc(g.title)}</p>
        <p class="text-sm text-text-soft">${g.intent_count} intent · ${g.outcome_count} outcome · ${g.suggestion_count} förslag</p>
        <p class="text-xs text-text-soft mt-1">
          😊/🙂 ${g.outcome_positive} · 😐 ${g.outcome_neutral} · 🙁 ${g.outcome_negative}
        </p>
        <p class="text-xs text-gold mt-1">${g.install_count_90d} installationer (90d)</p>
      </button>
    `).join('');
  }

  function renderTotals(stats) {
    const el = document.getElementById('forDigAdminTotals');
    if (!el) return;
    const t = stats.totals || {};
    el.textContent = `${t.families_with_feedback || 0} familjer med feedback · ${t.responses_7d || 0} svar senaste 7 dagarna`;
  }

  const PHASE_LABELS = {
    intent: 'Intent',
    outcome: 'Utfall',
    suggestion: 'Förslag',
  };

  function formatSender(row) {
    const name = row.parent_name || '(inget namn)';
    const email = row.parent_email || '';
    if (email) {
      return `<span class="font-medium text-navy">${esc(name)}</span><br><span class="text-xs text-text-soft">${esc(email)}</span>`;
    }
    return esc(name);
  }

  function renderResponsesTable(data) {
    const el = document.getElementById('forDigAdminResponses');
    if (!el) return;
    const rows = data.rows || [];
    if (rows.length === 0) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga svar ännu.</p>';
      return;
    }

    el.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-text-soft border-b border-lavender">
            <th class="py-2 pr-2">Datum</th>
            <th class="py-2 pr-2">Förälder</th>
            <th class="py-2 pr-2">Mål</th>
            <th class="py-2 pr-2">Fas</th>
            <th class="py-2 pr-2">Svar</th>
            <th class="py-2 pr-2">Barn</th>
            <th class="py-2">Fritext</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-lavender/50 align-top">
              <td class="py-2 pr-2 whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('sv-SE')}</td>
              <td class="py-2 pr-2 min-w-[10rem]">${formatSender(r)}</td>
              <td class="py-2 pr-2">${esc(r.goal_title)}</td>
              <td class="py-2 pr-2">${esc(PHASE_LABELS[r.phase] || r.phase)}</td>
              <td class="py-2 pr-2">${r.outcome_emoji || esc(r.intent_label) || '—'}</td>
              <td class="py-2 pr-2">${esc(r.child_name || '—')}</td>
              <td class="py-2 text-xs text-text-soft max-w-sm whitespace-pre-wrap break-words">${esc(r.free_text || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-xs text-text-soft mt-2">Visar ${rows.length} av ${data.total || rows.length}</p>
    `;
  }

  async function loadResponses(goalSlug) {
    const params = new URLSearchParams({ limit: '50' });
    if (goalSlug) params.set('goal_slug', goalSlug);
    const res = await Auth.api(`/api/admin/for-dig/responses?${params}`);
    renderResponsesTable(res);
  }

  window.filterForDigResponses = function (slug) {
    selectedGoal = slug;
    const label = document.getElementById('forDigAdminFilterLabel');
    if (label) label.textContent = slug ? `Filtrerat: ${slug}` : 'Alla mål';
    loadResponses(slug);
  };

  window.loadForDigAdmin = async function (force) {
    if (loaded && !force) return;
    const status = document.getElementById('forDigAdminStatus');
    if (status) status.textContent = 'Laddar…';
    try {
      const stats = await Auth.api('/api/admin/for-dig/stats');
      renderGoalCards(stats);
      renderTotals(stats);
      await loadResponses(selectedGoal);
      if (adminTab === 'installations') await loadForDigInstallations();
      loaded = true;
      if (status) status.textContent = 'Uppdaterad ' + new Date().toLocaleTimeString('sv-SE');
    } catch (err) {
      if (status) status.textContent = 'Fel: ' + (err.message || 'okänt');
    }
  };
})();
