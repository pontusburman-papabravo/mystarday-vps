/**
 * Start dashboard — loads GET /api/admin/start-summary (Fas 2A).
 * Blocks: growth, messages follow-up, activity feed, shortcuts.
 */
(function () {
  const DISCLAIMER_DEFAULT =
    'Detta är en förenklad uppföljningsvy. Riktig inbox-status kommer i en senare version.';

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

  function renderGrowthLoading() {
    setBlockState('startGrowthBlock', 'loading', '<p class="text-text-soft text-sm">Laddar...</p>');
  }

  function renderMessagesLoading() {
    setBlockState('startMessagesBlock', 'loading', '<p class="text-text-soft text-sm">Laddar...</p>');
  }

  function renderActivityLoading() {
    setBlockState('startActivityBlock', 'loading', '<p class="text-text-soft text-sm">Laddar...</p>');
  }

  function growthCard(label, metric, route) {
    const deltaCls = metric.deltaAbs > 0 ? 'text-green-700' : metric.deltaAbs < 0 ? 'text-red-600' : 'text-text-soft';
    return `
      <a href="${esc(route)}" onclick="return adminNavClick(event)" class="block bg-white rounded-2xl border-2 border-lavender p-5 hover:border-gold transition-colors">
        <p class="text-xs font-heading font-bold uppercase tracking-wider text-text-soft mb-1">${esc(label)}</p>
        <p class="text-3xl font-heading font-bold text-navy">${metric.last7d}</p>
        <p class="text-sm text-text-soft mt-1">7 dagar · totalt ${metric.total}</p>
        <p class="text-sm font-semibold mt-2 ${deltaCls}">${esc(formatDelta(metric))} vs förra veckan</p>
      </a>`;
  }

  function renderStartGrowth(growth) {
    const html = `
      <h3 class="text-lg font-heading font-bold text-navy mb-4">Tillväxt idag</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        ${growthCard('Nya paketintressen', growth.packageInterest, '#paketintresse')}
        ${growthCard('Nya pedagogintressen', growth.professionalInterest, '#pedagogintresse')}
        ${growthCard('Nya waitlist-signups', growth.waitlist, '#waitlist')}
        ${growthCard('Nya familjer', growth.newFamilies, '#familjer')}
      </div>`;
    setBlockState('startGrowthBlock', 'ready', html);
  }

  function renderStartGrowthError() {
    setBlockState(
      'startGrowthBlock',
      'error',
      `<div class="bg-coral/30 border border-coral rounded-2xl p-4">
        <p class="text-navy font-semibold mb-2">Kunde inte ladda tillväxtdata.</p>
        <button type="button" onclick="loadStartSummary()" class="text-sm font-bold text-gold hover:underline">Försök igen</button>
      </div>`
    );
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
      <p class="text-xs text-text-soft mt-4 border-t border-lavender/50 pt-3">${esc(messages.disclaimer || DISCLAIMER_DEFAULT)}</p>`;
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
      package_interest_created: 'Paketintresse',
      professional_interest_created: 'Pedagogintresse',
      waitlist_created: 'Waitlist',
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

  async function loadStartSummary() {
    renderGrowthLoading();
    renderMessagesLoading();
    renderActivityLoading();

    try {
      const data = await Auth.api('/api/admin/start-summary');
      renderStartGrowth(data.growth);
      renderStartMessages(data.messages);
      renderStartActivity(data.activity);
      renderStartShortcuts(data.quickActions);
    } catch (err) {
      console.error('[ADMIN] Start summary failed:', err);
      renderStartGrowthError();
      renderStartMessagesError();
      renderStartActivityError();
      renderStartShortcuts([]);
    }
  }

  window.loadStartSummary = loadStartSummary;
})();
