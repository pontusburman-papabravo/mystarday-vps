/**
 * Start dashboard — loads GET /api/admin/start-summary (Fas 2A).
 * Blocks: growth, messages follow-up, activity feed, shortcuts.
 */
(function () {
  const DISCLAIMER_DEFAULT =
    'Detta är en förenklad uppföljningsvy. Riktig inbox-status kommer i en senare version.';
  const EPHEMERAL_DISMISS_KEY = 'admin_start_ephemeral_dismiss';
  const EPHEMERAL_DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function formatDelta(metric) {
    if (!metric) return '–';
    const sign = metric.deltaAbs > 0 ? '+' : '';
    const pct = metric.deltaPct == null ? '' : ` (${sign}${metric.deltaPct}%)`;
    return `${sign}${metric.deltaAbs}${pct}`;
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

  function formatPct(value) {
    if (value == null) return '–';
    return `${value}%`;
  }

  function deltaLabel(delta) {
    if (delta > 0) return `+${delta} vs förra veckan`;
    if (delta < 0) return `${delta} vs förra veckan`;
    return 'oförändrat vs förra veckan';
  }

  function rateTone(pct, target) {
    if (pct == null) return 'text-text-soft';
    if (pct >= target) return 'text-green-700';
    if (pct >= target * 0.4) return 'text-gold-dark';
    return 'text-red-600';
  }

  function kpiCard(label, value, sub, toneCls, route) {
    const inner = `
      <p class="text-xs font-heading font-bold uppercase tracking-wider text-text-soft mb-1">${esc(label)}</p>
      <p class="text-3xl font-heading font-bold text-navy">${esc(value)}</p>
      ${sub ? `<p class="text-sm mt-1 ${toneCls || 'text-text-soft'}">${esc(sub)}</p>` : ''}`;
    if (route) {
      return `<a href="${esc(route)}" onclick="return adminNavClick(event)" class="block bg-white rounded-2xl border-2 border-lavender p-5 hover:border-gold transition-colors">${inner}</a>`;
    }
    return `<div class="bg-white rounded-2xl border-2 border-lavender p-5">${inner}</div>`;
  }

  function renderStartKpis(metrics) {
    const m = metrics || {};
    const signupDeltaCls = m.signupsDelta > 0 ? 'text-green-700' : m.signupsDelta < 0 ? 'text-red-600' : 'text-text-soft';
    const p0Tone = rateTone(m.p0RatePct, m.p0TargetPct || 25);
    const starTone = rateTone(m.starAfterAccessRatePct, 50);

    const funnelHtml = `
      <div class="mt-5 pt-4 border-t border-lavender/60">
        <p class="text-xs font-bold uppercase text-text-soft mb-2">Tratt senaste 7 dagar (av ${m.signups7d || 0} registreringar)</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
          <div class="bg-sky/50 rounded-xl p-3 border border-lavender">
            <p class="text-2xl font-heading font-bold text-navy">${m.schemaSaved7d || 0}</p>
            <p class="text-xs text-text-soft">Schema sparat</p>
            <p class="text-xs font-semibold">${formatPct(m.schemaRatePct)}</p>
          </div>
          <div class="bg-sky/50 rounded-xl p-3 border border-lavender">
            <p class="text-2xl font-heading font-bold text-navy">${m.childAccess7d || 0}</p>
            <p class="text-xs text-text-soft">Barnåtkomst</p>
            <p class="text-xs font-semibold">${formatPct(m.childAccessRatePct)}</p>
          </div>
          <div class="bg-sky/50 rounded-xl p-3 border border-lavender">
            <p class="text-2xl font-heading font-bold text-navy">${m.firstCompletion7d || 0}</p>
            <p class="text-xs text-text-soft">Första stjärnan</p>
            <p class="text-xs font-semibold">${formatPct(m.firstCompletionRatePct)}</p>
          </div>
          <div class="bg-mint/40 rounded-xl p-3 border border-mint">
            <p class="text-2xl font-heading font-bold text-navy">${m.p0_48h || 0}</p>
            <p class="text-xs text-text-soft">P0 inom 48h</p>
            <p class="text-xs font-semibold ${p0Tone}">${formatPct(m.p0RatePct)} · mål ${m.p0TargetPct || 25}%</p>
          </div>
        </div>
      </div>`;

    const html = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 class="text-xl font-heading font-bold text-navy">Nyckeltal</h2>
          <p class="text-sm text-text-soft">Registrering, Meta-annons och aktivering — senaste 7 dagar</p>
        </div>
        <a href="#analytics" onclick="return adminNavClick(event)" class="text-sm font-semibold text-gold hover:underline">Öppna Analytics →</a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        ${kpiCard(
          'Nya familjer',
          m.signups7d ?? '–',
          `${m.signupsToday || 0} idag · ${deltaLabel(m.signupsDelta || 0)}`,
          signupDeltaCls,
          '#familjer'
        )}
        ${kpiCard(
          'Från Meta-annons',
          m.metaSignups7d ?? '–',
          `${m.metaSignupsToday || 0} idag · utm_source=meta`,
          m.metaSignups7d > 0 ? 'text-green-700' : 'text-text-soft',
          '#analytics'
        )}
        ${kpiCard(
          'P0 inom 48h',
          m.p0_48h ?? '–',
          `${formatPct(m.p0RatePct)} av nya · mål ${m.p0TargetPct || 25}%`,
          p0Tone
        )}
        ${kpiCard(
          'Stjärna efter barnåtkomst',
          formatPct(m.starAfterAccessRatePct),
          `${m.firstCompletion7d || 0}/${m.childAccess7d || 0} nådde första stjärnan`,
          starTone
        )}
        ${kpiCard(
          'Fast i onboarding',
          m.stuckOnboarding ?? '–',
          '48h–14d utan klar onboarding',
          (m.stuckOnboarding || 0) > 0 ? 'text-red-600' : 'text-green-700',
          '#analytics'
        )}
        ${kpiCard(
          'Grundarmedlemmar kvar',
          m.founderSlotsLeft ?? '–',
          `${m.totalFamilies || 0} / ${m.founderLimit || 225} familjer totalt`,
          (m.founderSlotsLeft || 0) < 30 ? 'text-gold-dark' : 'text-text-soft'
        )}
      </div>
      ${funnelHtml}`;
    setBlockState('startKpiBlock', 'ready', html);
  }

  function renderStartKpisError() {
    setBlockState(
      'startKpiBlock',
      'error',
      `<div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="text-navy font-semibold mb-2">Kunde inte ladda nyckeltal.</p>
        <button type="button" onclick="loadStartSummary()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`
    );
  }

  function renderStartKpisLoading() {
    setBlockState('startKpiBlock', 'loading', '<p class="text-text-soft text-sm">Laddar nyckeltal...</p>');
  }

  function renderMessagesLoading() {
    setBlockState('startMessagesBlock', 'loading', '<p class="text-text-soft text-sm">Laddar...</p>');
  }

  function renderActivityLoading() {
    setBlockState('startActivityBlock', 'loading', '<p class="text-text-soft text-sm">Laddar...</p>');
  }

  function renderStartMessages(messages) {
    const latest = messages.latest || [];
    const listHtml = latest.length
      ? `<ul class="divide-y divide-lavender/60">${latest.map((m) => {
          const badge = m.followUpReason === 'unread' ? 'Oläst' : 'Saknar anteckning';
          const familyHint = m.linkedFamily?.type === 'email_match'
            ? `<span class="text-xs text-text-soft"> · matchad familj: ${esc(m.linkedFamily.familyName || '—')}</span>`
            : '';
          return `<li class="py-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-navy truncate">${esc(m.name || m.email || 'Okänd')}</p>
                <p class="text-sm text-text-soft truncate">${esc(m.messagePreview)}</p>
                ${familyHint}
              </div>
              <div class="text-right shrink-0">
                <span class="inline-block text-xs font-bold px-2 py-0.5 rounded-full bg-sky text-navy">${esc(badge)}</span>
                <p class="text-xs text-text-soft mt-1">${esc(formatRelativeTime(m.createdAt))}</p>
              </div>
            </div>
          </li>`;
        }).join('')}</ul>`
      : '<p class="text-text-soft text-sm">Inga meddelanden att följa upp just nu.</p>';

    const html = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="text-lg font-heading font-bold text-navy">Meddelanden att följa upp</h3>
        <div class="flex gap-2">
          <a href="#meddelanden" onclick="return adminNavClick(event)" class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gold text-navy">Öppna Meddelanden</a>
          <a href="#meddelanden?followup=1" onclick="return adminNavClick(event)" class="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 border-lavender text-navy hover:border-gold">Visa att följa upp</a>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div class="bg-sky rounded-xl p-4 border border-lavender">
          <p class="text-xs font-bold text-text-soft uppercase">Olästa</p>
          <p class="text-2xl font-heading font-bold text-navy">${messages.unreadCount}</p>
        </div>
        <div class="bg-mint rounded-xl p-4 border border-mint">
          <p class="text-xs font-bold text-text-soft uppercase">Att följa upp</p>
          <p class="text-2xl font-heading font-bold text-navy">${messages.needsFollowUpCount}</p>
        </div>
      </div>
      ${listHtml}
      ${messages.disclaimer ? `<p class="text-xs text-text-soft mt-4 border-t border-lavender/50 pt-3">${esc(messages.disclaimer)}</p>` : ''}`;
    setBlockState('startMessagesBlock', 'ready', html);
  }

  function renderStartMessagesError() {
    setBlockState(
      'startMessagesBlock',
      'error',
      `<div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="text-navy font-semibold mb-2">Kunde inte ladda meddelanden.</p>
        <button type="button" onclick="loadStartSummary()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`
    );
  }

  function activityTitle(type) {
    const map = {
      family_created: 'Ny familj',
      contact_message_created: 'Meddelande',
      newsletter_sent: 'Nyhetsbrev',
      dagens_nyhet_published: 'Dagens nyhet',
    };
    return map[type] || 'Händelse';
  }

  function renderStartActivity(activity) {
    const items = activity || [];
    const listHtml = items.length
      ? `<ul class="divide-y divide-lavender/60">${items.map((item) => `
          <li class="py-3 flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-bold text-text-soft uppercase">${esc(activityTitle(item.type))}</p>
              <a href="${esc(item.route)}" onclick="return adminNavClick(event)" class="font-semibold text-navy hover:text-gold">${esc(item.title)}</a>
              ${item.meta ? `<p class="text-xs text-text-soft mt-0.5">${esc(item.meta)}</p>` : ''}
            </div>
            <span class="text-xs text-text-soft shrink-0">${esc(formatRelativeTime(item.createdAt))}</span>
          </li>`).join('')}</ul>`
      : '<p class="text-text-soft text-sm">Inga händelser de senaste dagarna.</p>';

    const html = `
      <h3 class="text-lg font-heading font-bold text-navy mb-4">Senaste aktivitet</h3>
      ${listHtml}`;
    setBlockState('startActivityBlock', 'ready', html);
  }

  function renderStartActivityError() {
    setBlockState(
      'startActivityBlock',
      'error',
      `<div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="text-navy font-semibold mb-2">Kunde inte ladda aktivitet.</p>
        <button type="button" onclick="loadStartSummary()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`
    );
  }

  function renderStartShortcuts(actions) {
    const items = actions && actions.length ? actions : [];
    const html = `
      <h3 class="text-lg font-heading font-bold text-navy mb-4">Genvägar</h3>
      <div class="flex flex-wrap gap-2">
        ${items.map((a) => `<a href="${esc(a.route)}" onclick="return adminNavClick(event)" class="px-4 py-2 rounded-xl text-sm font-semibold bg-white border-2 border-lavender text-navy hover:border-gold transition-colors">${esc(a.label)}</a>`).join('')}
      </div>`;
    setBlockState('startShortcutsBlock', 'ready', html);
  }

  function severityStyles(severity) {
    if (severity === 'critical') {
      return {
        border: 'border-coral',
        bg: 'bg-coral/20',
        badge: 'bg-coral text-navy',
        label: 'Kritisk',
      };
    }
    if (severity === 'warning') {
      return {
        border: 'border-gold',
        bg: 'bg-gold-light',
        badge: 'bg-gold text-navy',
        label: 'Varning',
      };
    }
    return {
      border: 'border-lavender',
      bg: 'bg-white',
      badge: 'bg-sky text-navy',
      label: 'Info',
    };
  }

  function loadEphemeralDismissed() {
    try {
      return JSON.parse(sessionStorage.getItem(EPHEMERAL_DISMISS_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function filterEphemeralRecommendations(recommendations) {
    const dismissed = loadEphemeralDismissed();
    const now = Date.now();
    return (recommendations || []).filter((card) => {
      if (!card.type || card.id) return true;
      const ts = dismissed[card.type];
      return !ts || now - ts > EPHEMERAL_DISMISS_TTL_MS;
    });
  }

  function dismissEphemeralCard(type, buttonEl) {
    if (!type || !buttonEl) return;
    const dismissed = loadEphemeralDismissed();
    dismissed[type] = Date.now();
    try {
      sessionStorage.setItem(EPHEMERAL_DISMISS_KEY, JSON.stringify(dismissed));
    } catch (_) { /* ignore quota */ }
    const card = buttonEl.closest('[data-rec-type]');
    if (card) card.remove();
    const block = document.getElementById('startRecommendationsBlock');
    if (block && !block.querySelector('[data-alert-id], [data-rec-type]')) {
      block.innerHTML = '';
    }
  }

  async function dismissOperationalAlert(alertId, buttonEl, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!alertId || !buttonEl) return;
    buttonEl.disabled = true;
    try {
      await Auth.api(`/api/admin/operational-alerts/${alertId}/dismiss`, { method: 'POST' });
      const card = buttonEl.closest('[data-alert-id]');
      if (card) card.remove();
      const block = document.getElementById('startRecommendationsBlock');
      if (block && !block.querySelector('[data-alert-id]')) {
        block.innerHTML = '';
      }
    } catch (err) {
      console.error('[ADMIN] Dismiss alert failed:', err);
      buttonEl.disabled = false;
      if (typeof showToast === 'function') showToast('Kunde inte avfärda meddelandet', 'error');
    }
  }

  function recommendationCardBody(card, styles) {
    return `
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          ${card.severity ? `<span class="text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}">${esc(styles.label)}</span>` : ''}
          <p class="font-semibold text-navy">${esc(card.title)}</p>
        </div>
        <p class="text-sm text-text-soft">${esc(card.body)}</p>
      </div>`;
  }

  function renderDismissButton(card) {
    if (card.dismissible && card.id) {
      return `<button type="button" onclick="dismissOperationalAlert('${esc(card.id)}', this, event)" class="shrink-0 text-xs font-semibold text-text-soft hover:text-navy px-2 py-1 rounded-lg hover:bg-white/60">Avfärda</button>`;
    }
    if (card.type && !card.id) {
      return `<button type="button" onclick="dismissEphemeralCard('${esc(card.type)}', this)" class="shrink-0 text-xs font-semibold text-text-soft hover:text-navy px-2 py-1 rounded-lg hover:bg-white/60">Avfärda</button>`;
    }
    return '';
  }

  function renderStartRecommendations(recommendations) {
    const el = document.getElementById('startRecommendationsBlock');
    if (!el) return;
    const items = filterEphemeralRecommendations(recommendations);
    if (!items.length) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `
      <h3 class="text-lg font-heading font-bold text-navy mb-4">Prioritera nu</h3>
      <div class="space-y-3">
        ${items.map((card) => {
          const styles = severityStyles(card.severity);
          const dismissBtn = renderDismissButton(card);
          const linkHtml = card.route
            ? `<a href="${esc(card.route)}" onclick="return adminNavClick(event)" class="block min-w-0 flex-1 hover:opacity-90 transition-opacity">${recommendationCardBody(card, styles)}</a>`
            : `<div class="min-w-0 flex-1">${recommendationCardBody(card, styles)}</div>`;
          const attrs = card.id
            ? `data-alert-id="${esc(card.id)}"`
            : card.type
              ? `data-rec-type="${esc(card.type)}"`
              : '';
          return `<div ${attrs} class="flex flex-wrap items-start justify-between gap-3 ${styles.bg} border-2 ${styles.border} rounded-2xl p-4">
            ${linkHtml}
            ${dismissBtn}
          </div>`;
        }).join('')}
      </div>`;
  }

  async function loadStartSummary() {
    renderStartKpisLoading();
    renderMessagesLoading();
    renderActivityLoading();

    try {
      const data = await Auth.api('/api/admin/start-summary?_=' + Date.now());
      if (!data || !data.keyMetrics) {
        throw new Error('Saknar keyMetrics i API-svar — ladda om sidan (hård refresh)');
      }
      renderStartKpis(data.keyMetrics);
      renderStartRecommendations(filterEphemeralRecommendations(data.recommendations));
      renderStartMessages(data.messages);
      renderStartActivity(data.activity);
      renderStartShortcuts(data.quickActions);
    } catch (err) {
      console.error('[ADMIN] Start summary failed:', err);
      renderStartKpisError();
      renderStartMessagesError();
      renderStartActivityError();
      renderStartShortcuts([]);
    }
  }

  window.loadStartSummary = loadStartSummary;
  window.dismissOperationalAlert = dismissOperationalAlert;
  window.dismissEphemeralCard = dismissEphemeralCard;
})();
