/**
 * Start dashboard — slim morning overview: families, att göra, senaste familjer.
 */
(function () {
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function formatRelativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just nu';
    if (mins < 60) return `${mins} min sedan`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `${hours} tim sedan`;
    const days = Math.floor(hours / 24);
    return `${days} dag${days === 1 ? '' : 'ar'} sedan`;
  }

  function setBlockState(blockId, state, html) {
    const el = document.getElementById(blockId);
    if (!el) return;
    el.dataset.state = state;
    el.innerHTML = html;
  }

  function deltaLabel(delta) {
    if (delta > 0) return `+${delta} vs förra veckan`;
    if (delta < 0) return `${delta} vs förra veckan`;
    return 'oförändrat vs förra veckan';
  }

  function kpiCard(label, value, sub, toneCls, route) {
    const inner = `
      <p class="text-xs font-heading font-bold uppercase tracking-wider text-text-soft mb-1">${esc(label)}</p>
      <p class="text-4xl font-heading font-bold text-navy">${esc(value)}</p>
      ${sub ? `<p class="text-sm mt-2 ${toneCls || 'text-text-soft'}">${esc(sub)}</p>` : ''}`;
    if (route) {
      return `<a href="${esc(route)}" onclick="return adminNavClick(event)" class="block bg-white rounded-2xl border-2 border-gold/60 p-6 hover:border-gold transition-colors shadow-sm">${inner}</a>`;
    }
    return `<div class="bg-white rounded-2xl border-2 border-gold/60 p-6 shadow-sm">${inner}</div>`;
  }

  function renderAttGora(overview) {
    const o = overview || {};
    const unread = o.unreadMessages || 0;
    const followUp = o.messagesNeedFollowUp || 0;
    const stuck = o.stuckOnboarding || 0;
    const todoCount = unread + followUp + stuck;

    if (!todoCount) {
      return `
        <div class="bg-mint/30 border border-mint rounded-2xl p-4">
          <p class="text-sm text-green-800 font-semibold">Allt lugnt — inget som kräver åtgärd just nu.</p>
        </div>`;
    }

    const items = [];
    if (unread > 0) {
      items.push(`<li><a href="#meddelanden" onclick="return adminNavClick(event)" class="font-semibold text-navy hover:text-gold">${unread} olästa meddelanden</a></li>`);
    }
    if (followUp > 0) {
      items.push(`<li><a href="#meddelanden?followup=1" onclick="return adminNavClick(event)" class="font-semibold text-navy hover:text-gold">${followUp} ärenden att följa upp</a></li>`);
    }
    if (stuck > 0) {
      items.push(`<li><a href="#growth-stuck" onclick="return adminNavClick(event)" class="font-semibold text-navy hover:text-gold">${stuck} familjer fast i onboarding</a></li>`);
    }

    return `
      <div class="bg-sky/40 border-2 border-lavender rounded-2xl p-5">
        <h3 class="text-lg font-heading font-bold text-navy mb-3">Att göra</h3>
        <ul class="space-y-2 text-sm list-disc list-inside text-navy">${items.join('')}</ul>
      </div>`;
  }

  function renderRecentFamilies(families) {
    const items = families || [];
    const listHtml = items.length
      ? `<ul class="divide-y divide-lavender/60">${items.map((family) => `
          <li class="py-3 flex flex-wrap items-center justify-between gap-2">
            <a href="#familjer" onclick="return adminNavClick(event)" class="font-semibold text-navy hover:text-gold">${esc(family.name)}</a>
            <span class="text-xs text-text-soft">${esc(formatRelativeTime(family.createdAt))}</span>
          </li>`).join('')}</ul>`
      : '<p class="text-text-soft text-sm">Inga familjer registrerade ännu.</p>';

    return `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="text-lg font-heading font-bold text-navy">Senaste familjer</h3>
        <a href="#familjer" onclick="return adminNavClick(event)" class="text-sm font-semibold text-gold hover:underline">Alla familjer →</a>
      </div>
      ${listHtml}`;
  }

  function renderQuickActions(actions) {
    const items = (actions || []).map((action) =>
      `<a href="${esc(action.route)}" onclick="return adminNavClick(event)" class="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-lavender text-navy hover:border-gold transition-colors">${esc(action.label)}</a>`
    ).join('');
    return items
      ? `<div class="flex flex-wrap gap-2 pt-2">${items}</div>`
      : '';
  }

  function renderStartOverview(overview, recentFamilies, quickActions) {
    const o = overview || {};
    const signupDeltaCls = o.signupsDelta > 0 ? 'text-green-700' : o.signupsDelta < 0 ? 'text-red-600' : 'text-text-soft';

    const html = `
      <div class="mb-5">
        <h2 class="text-xl font-heading font-bold text-navy">Överblick</h2>
        <p class="text-sm text-text-soft">Familjer och det som behöver din uppmärksamhet</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        ${kpiCard(
          'Nya familjer',
          o.signups7d ?? '–',
          `${o.signupsToday || 0} idag · ${deltaLabel(o.signupsDelta || 0)}`,
          signupDeltaCls,
          '#familjer'
        )}
        ${kpiCard(
          'Antal familjer',
          o.totalFamilies ?? '–',
          'Totalt aktiva familjer',
          'text-text-soft',
          '#familjer'
        )}
      </div>
      ${renderAttGora(o)}
      <div class="mt-6 pt-5 border-t border-lavender/60">
        ${renderRecentFamilies(recentFamilies)}
      </div>
      ${renderQuickActions(quickActions)}`;

    setBlockState('startKpiBlock', 'ready', html);
  }

  function renderStartError() {
    setBlockState(
      'startKpiBlock',
      'error',
      `<div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="text-navy font-semibold mb-2">Kunde inte ladda översikten.</p>
        <button type="button" onclick="loadStartSummary()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`
    );
  }

  function renderStartLoading() {
    setBlockState('startKpiBlock', 'loading', '<p class="text-text-soft text-sm">Laddar översikt...</p>');
  }

  async function loadStartSummary() {
    renderStartLoading();

    try {
      const data = await Auth.api('/api/admin/start-summary?_=' + Date.now());
      if (!data || !data.overview) {
        throw new Error('Saknar overview i API-svar — ladda om sidan (hård refresh)');
      }
      renderStartOverview(data.overview, data.recentFamilies, data.quickActions);
    } catch (err) {
      console.error('[ADMIN] Start summary failed:', err);
      renderStartError();
    }
  }

  window.loadStartSummary = loadStartSummary;
})();
