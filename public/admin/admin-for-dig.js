/**
 * Admin — För dig feedback & install stats.
 */
(function () {
  'use strict';

  let loaded = false;
  let selectedGoal = null;
  let adminTab = 'feedback';
  const responseFilters = {
    phase: '',
    outcomeTier: '',
    hasFreeText: false,
    days: '',
  };

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAge(age) {
    if (age == null) return '—';
    return `${age} år`;
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
    const logEl = document.getElementById('forDigAdminInstallLog');
    if (window.AdminHistoryWarning) {
      window.AdminHistoryWarning.setHistoryLimitedWarning('forDigInstallationsHistoryWarning', true);
    }
    if (!el) return;
    try {
      const [summary, log] = await Promise.all([
        Auth.api('/api/admin/for-dig/installations?days=90&min_count=1'),
        logEl ? Auth.api('/api/admin/for-dig/installation-log?days=90&limit=100') : null,
      ]);
      const rows = summary.installations || [];
      if (rows.length === 0) {
        el.innerHTML = '<p class="text-text-soft">Inga installationer registrerade ännu.</p>';
      } else {
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
      }

      if (logEl && log) {
        renderInstallLogTable(log, logEl);
      }
    } catch (_) {
      el.innerHTML = '<p class="text-red-500">Kunde inte ladda installationer</p>';
      if (logEl) logEl.innerHTML = '<p class="text-red-500">Kunde inte ladda installationslogg</p>';
    }
  }

  function renderInstallLogTable(data, el) {
    const rows = data.rows || [];
    if (rows.length === 0) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga enskilda installationer ännu.</p>';
      return;
    }

    el.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-text-soft border-b border-lavender">
            <th class="py-2 pr-2">Datum</th>
            <th class="py-2 pr-2">Förälder</th>
            <th class="py-2 pr-2">Barn</th>
            <th class="py-2">Mål</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-lavender/50 align-top">
              <td class="py-2 pr-2 whitespace-nowrap">${new Date(r.installed_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td class="py-2 pr-2 min-w-[10rem]">${formatSender(r)}</td>
              <td class="py-2 pr-2">${esc(r.child_name || '—')}</td>
              <td class="py-2">${esc(r.goal_icon || '⭐')} ${esc(r.goal_title)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-xs text-text-soft mt-2">Visar ${rows.length} av ${data.total || rows.length} (senaste 90 dagarna). Äldre rader kan sakna förälder tills de aktiveras igen.</p>
    `;
  }

  function renderIntentBreakdown(breakdown) {
    if (!breakdown || Object.keys(breakdown).length === 0) return '';
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    return `
      <ul class="text-xs text-text-soft mt-2 space-y-0.5">
        ${entries.map(([key, count]) => `<li>${esc(INTENT_LABELS[key] || key)}: ${count}</li>`).join('')}
      </ul>`;
  }

  const INTENT_LABELS = {
    mindre_tjat: 'Mindre tjat',
    tydligare_rutiner: 'Tydligare rutiner',
    sjalvstandighet: 'Självständighet',
    mindre_stress: 'Mindre stress',
    annat: 'Annat',
  };

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
        ${renderIntentBreakdown(g.intent_breakdown)}
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

  function copyEmail(email) {
    if (!email || !navigator.clipboard) return;
    navigator.clipboard.writeText(email).catch(() => {});
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
            <th class="py-2 pr-2">Ålder</th>
            <th class="py-2">Fritext</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-lavender/50 align-top">
              <td class="py-2 pr-2 whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('sv-SE')}</td>
              <td class="py-2 pr-2 min-w-[10rem]">
                ${formatSender(r)}
                ${r.parent_email ? `<button type="button" class="text-xs text-gold underline mt-1" data-email="${esc(r.parent_email)}" onclick="copyForDigEmail(this.dataset.email)">Kopiera e-post</button>` : ''}
              </td>
              <td class="py-2 pr-2">${esc(r.goal_title)}</td>
              <td class="py-2 pr-2">${esc(PHASE_LABELS[r.phase] || r.phase)}</td>
              <td class="py-2 pr-2">${r.outcome_emoji || esc(r.intent_label) || '—'}</td>
              <td class="py-2 pr-2">${esc(r.child_name || '—')}</td>
              <td class="py-2 pr-2">${formatAge(r.child_age)}</td>
              <td class="py-2 text-xs text-text-soft max-w-sm whitespace-pre-wrap break-words">${esc(r.free_text || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-xs text-text-soft mt-2">Visar ${rows.length} av ${data.total || rows.length}</p>
    `;
  }

  window.copyForDigEmail = function (email) {
    copyEmail(email);
  };

  function buildResponseParams(goalSlug) {
    const params = new URLSearchParams({ limit: '50' });
    if (goalSlug) params.set('goal_slug', goalSlug);
    if (responseFilters.phase) params.set('phase', responseFilters.phase);
    if (responseFilters.outcomeTier) params.set('outcome_tier', responseFilters.outcomeTier);
    if (responseFilters.hasFreeText) params.set('has_free_text', 'true');
    if (responseFilters.days) params.set('days', responseFilters.days);
    return params;
  }

  function updateFilterLabel() {
    const label = document.getElementById('forDigAdminFilterLabel');
    if (!label) return;
    const parts = [];
    if (selectedGoal) parts.push(`mål: ${selectedGoal}`);
    if (responseFilters.phase) parts.push(`fas: ${PHASE_LABELS[responseFilters.phase] || responseFilters.phase}`);
    if (responseFilters.outcomeTier) parts.push(`utfall: ${responseFilters.outcomeTier}`);
    if (responseFilters.hasFreeText) parts.push('med fritext');
    if (responseFilters.days) parts.push(`senaste ${responseFilters.days}d`);
    label.textContent = parts.length ? `Filter: ${parts.join(' · ')}` : 'Alla mål';
  }

  async function loadResponses(goalSlug) {
    const params = buildResponseParams(goalSlug);
    const res = await Auth.api(`/api/admin/for-dig/responses?${params}`);
    renderResponsesTable(res);
    updateFilterLabel();
  }

  window.filterForDigResponses = function (slug) {
    selectedGoal = slug;
    loadResponses(slug);
  };

  window.applyForDigResponseFilters = function () {
    const phaseEl = document.getElementById('forDigFilterPhase');
    const outcomeEl = document.getElementById('forDigFilterOutcome');
    const freeTextEl = document.getElementById('forDigFilterFreeText');
    const daysEl = document.getElementById('forDigFilterDays');
    responseFilters.phase = phaseEl ? phaseEl.value : '';
    responseFilters.outcomeTier = outcomeEl ? outcomeEl.value : '';
    responseFilters.hasFreeText = freeTextEl ? freeTextEl.checked : false;
    responseFilters.days = daysEl ? daysEl.value : '';
    loadResponses(selectedGoal);
  };

  window.resetForDigResponseFilters = function () {
    selectedGoal = null;
    responseFilters.phase = '';
    responseFilters.outcomeTier = '';
    responseFilters.hasFreeText = false;
    responseFilters.days = '';
    const phaseEl = document.getElementById('forDigFilterPhase');
    const outcomeEl = document.getElementById('forDigFilterOutcome');
    const freeTextEl = document.getElementById('forDigFilterFreeText');
    const daysEl = document.getElementById('forDigFilterDays');
    if (phaseEl) phaseEl.value = '';
    if (outcomeEl) outcomeEl.value = '';
    if (freeTextEl) freeTextEl.checked = false;
    if (daysEl) daysEl.value = '';
    loadResponses(null);
  };

  function renderQuotes(data) {
    const el = document.getElementById('forDigAdminQuotes');
    if (!el) return;
    const rows = data.rows || [];
    if (rows.length === 0) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga positiva citat med fritext ännu.</p>';
      return;
    }

    const quoteText = rows.map((r) => `"${r.free_text}" — ${r.goal_title}, ${formatAge(r.child_age)}, ${new Date(r.created_at).toLocaleDateString('sv-SE')}`).join('\n');

    el.innerHTML = `
      <div class="flex justify-end mb-2">
        <button type="button" onclick="copyForDigQuotes()" class="text-xs px-3 py-1 bg-navy text-white rounded-lg">Kopiera alla</button>
      </div>
      <ul class="space-y-3 text-sm">
        ${rows.map((r) => `
          <li class="border-l-4 border-gold pl-3">
            <p class="italic text-navy">"${esc(r.free_text)}"</p>
            <p class="text-xs text-text-soft mt-1">
              ${esc(r.outcome_emoji || '')} ${esc(r.goal_title)} · ${esc(r.child_name || '—')} · ${formatAge(r.child_age)} · ${new Date(r.created_at).toLocaleDateString('sv-SE')}
            </p>
          </li>
        `).join('')}
      </ul>
      <p class="text-xs text-text-soft mt-2">Visar ${rows.length} av ${data.total || rows.length}</p>
    `;

    window._forDigQuotesCopy = quoteText;
  }

  window.copyForDigQuotes = function () {
    if (window._forDigQuotesCopy && navigator.clipboard) {
      navigator.clipboard.writeText(window._forDigQuotesCopy).catch(() => {});
    }
  };

  function renderPendingOutcomes(data) {
    const el = document.getElementById('forDigAdminPending');
    if (!el) return;
    const rows = data.rows || [];
    if (rows.length === 0) {
      el.innerHTML = '<p class="text-text-soft text-sm">Inga familjer väntar på outcome (≥7 dagar efter aktivering).</p>';
      return;
    }

    el.innerHTML = `
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-text-soft border-b border-lavender">
            <th class="py-2 pr-2">Aktiverad</th>
            <th class="py-2 pr-2">Dagar</th>
            <th class="py-2 pr-2">Förälder</th>
            <th class="py-2 pr-2">Barn</th>
            <th class="py-2 pr-2">Mål</th>
            <th class="py-2">Intent</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-lavender/50 align-top">
              <td class="py-2 pr-2 whitespace-nowrap">${new Date(r.installed_at).toLocaleDateString('sv-SE')}</td>
              <td class="py-2 pr-2">${r.days_since_install}d</td>
              <td class="py-2 pr-2 min-w-[10rem]">
                ${formatSender(r)}
                ${r.parent_email ? `<button type="button" class="text-xs text-gold underline mt-1" data-email="${esc(r.parent_email)}" onclick="copyForDigEmail(this.dataset.email)">Kopiera e-post</button>` : ''}
              </td>
              <td class="py-2 pr-2">${esc(r.child_name || '—')}</td>
              <td class="py-2 pr-2">${esc(r.goal_icon || '⭐')} ${esc(r.goal_title)}</td>
              <td class="py-2">${esc(r.intent_label || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-xs text-text-soft mt-2">Visar ${rows.length} av ${data.total || rows.length} — kandidater för manuellt uppföljningsmejl (§19.6)</p>
    `;
  }

  window.loadForDigAdmin = async function (force) {
    if (loaded && !force) return;
    const status = document.getElementById('forDigAdminStatus');
    if (status) status.textContent = 'Laddar…';
    try {
      const [stats, quotes, pending] = await Promise.all([
        Auth.api('/api/admin/for-dig/stats'),
        Auth.api('/api/admin/for-dig/quotes?limit=20'),
        Auth.api('/api/admin/for-dig/pending-outcomes?limit=50'),
      ]);
      renderGoalCards(stats);
      renderTotals(stats);
      renderQuotes(quotes);
      renderPendingOutcomes(pending);
      await loadResponses(selectedGoal);
      if (adminTab === 'installations') await loadForDigInstallations();
      loaded = true;
      if (status) status.textContent = 'Uppdaterad ' + new Date().toLocaleTimeString('sv-SE');
    } catch (err) {
      if (status) status.textContent = 'Fel: ' + (err.message || 'okänt');
    }
  };
})();
