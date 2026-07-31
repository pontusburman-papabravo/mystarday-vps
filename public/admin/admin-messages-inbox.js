/**
 * Ärenden inbox — support cases (status tabs, family link, resolution).
 */
(function () {
  const STATUS_LABELS = {
    new: 'Ny',
    read: 'Läst',
    in_progress: 'Pågående',
    answered: 'Besvarad',
    archived: 'Arkiverad',
  };

  const INBOX_TABS = [
    { key: 'unread', label: 'Olästa' },
    { key: 'active', label: 'Pågående' },
    { key: 'answered', label: 'Besvarade' },
    { key: 'archived', label: 'Arkiverade' },
    { key: 'all', label: 'Alla' },
  ];

  const TYPE_LABELS = {
    bug: 'Bug',
    feedback: 'Feedback',
    contact: 'Kontakt',
    language: 'Språk',
  };

  let activeInbox = 'all';
  let lastLoadedMessages = [];
  let selectedTicketId = null;
  let searchDebounceTimer = null;
  let supportTaxonomy = { rootCauses: {}, resolutionTypes: {} };
  let supportAnalytics = null;
  const eventCache = new Map();

  const EVENT_LABELS = {
    status_changed: 'Status ändrad',
    reply_sent: 'Svar skickat',
    note_saved: 'Anteckning sparad',
    resolution_set: 'Klassificering sparad',
    archived: 'Arkiverat',
    auto_archived: 'Auto-arkiverat',
    family_linked: 'Familj kopplad',
  };

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function renderInboxTabs() {
    const el = document.getElementById('messagesInboxTabs');
    if (!el) return;
    el.innerHTML = INBOX_TABS.map((tab) => {
      const active = tab.key === activeInbox;
      const cls = active
        ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy'
        : 'px-4 py-2 rounded-lg text-sm font-semibold bg-lavender text-text-soft hover:bg-sky';
      return `<button type="button" class="messages-inbox-tab ${cls}" data-inbox="${tab.key}">${tab.label}</button>`;
    }).join('');
    el.querySelectorAll('.messages-inbox-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeInbox = btn.getAttribute('data-inbox');
        renderInboxTabs();
        loadMessagesInbox();
      });
    });
  }

  function statusBadge(status) {
    return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-sky text-navy">${esc(STATUS_LABELS[status] || status)}</span>`;
  }

  function extractManualNote(note) {
    if (!note) return '';
    const idx = String(note).indexOf('\n--- Svar ');
    if (idx === -1) return String(note).trim();
    return String(note).slice(0, idx).trim();
  }

  function extractReplyHistory(note) {
    if (!note) return [];
    const chunks = String(note).split(/\n--- Svar /).slice(1);
    return chunks.map((chunk) => {
      const lines = chunk.split('\n');
      const header = lines[0] || '';
      const body = lines.slice(1).join('\n').replace(/\n\(Resend:.*\)$/s, '').trim();
      return { header: header.replace(/---$/, '').trim(), body };
    });
  }

  function renderReplyHistory(note) {
    const replies = extractReplyHistory(note);
    if (!replies.length) return '';
    return replies.map((reply) => (
      `<div class="mt-3 p-3 rounded-xl border border-mint bg-mint/20">
        <p class="text-xs font-bold text-navy mb-1">Skickat svar · ${esc(reply.header)}</p>
        <p class="text-sm text-navy whitespace-pre-wrap">${esc(reply.body)}</p>
      </div>`
    )).join('');
  }

  function canReplyToMessage(m) {
    return Boolean(m.email && String(m.email).includes('@'));
  }

  function familyBlock(m) {
    const fam = m.linkedFamily || {};
    if (fam.type === 'none') {
      return `<div class="mt-2 flex gap-2 items-center">
        <input type="text" id="link-family-${m.id}" placeholder="Klistra in family UUID" class="flex-1 px-2 py-1 rounded border border-lavender text-xs">
        <button type="button" onclick="linkMessageFamily('${m.id}')" class="px-2 py-1 text-xs font-bold bg-mint rounded">Koppla familj</button>
      </div>`;
    }
    const label = fam.familyName || fam.familyId;
    return `<p class="text-xs text-text-soft mt-1">Familj: <button type="button" onclick="openFamilyHub('${fam.familyId}')" class="font-semibold text-gold hover:underline">${esc(label)}</button>${fam.type === 'email_match' ? ' (e-postmatch)' : ''}</p>`;
  }

  function optionList(map, selected) {
    return Object.entries(map || {}).map(([value, label]) => (
      `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(label)}</option>`
    )).join('');
  }

  function resolutionBadge(m) {
    const parts = [];
    if (m.root_cause && supportTaxonomy.rootCauses[m.root_cause]) {
      parts.push(supportTaxonomy.rootCauses[m.root_cause]);
    }
    if (m.resolution_type && supportTaxonomy.resolutionTypes[m.resolution_type]) {
      parts.push(supportTaxonomy.resolutionTypes[m.resolution_type]);
    }
    if (!parts.length) return '';
    return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-mint text-navy">${esc(parts.join(' · '))}</span>`;
  }

  function renderResolutionBlock(m) {
    if (m.status === 'archived') {
      const summary = m.resolution_summary ? `<p class="text-sm text-navy whitespace-pre-wrap mt-2">${esc(m.resolution_summary)}</p>` : '';
      const fixRef = m.fix_reference ? `<p class="text-xs text-text-soft mt-1">Fix: ${esc(m.fix_reference)}</p>` : '';
      return `<div class="mb-3 p-3 rounded-xl border border-lavender bg-lavender/20">
        <p class="text-xs font-bold text-navy mb-1">Avslutat ärende</p>
        ${resolutionBadge(m)}
        ${summary}
        ${fixRef}
        ${m.archived_at ? `<p class="text-xs text-text-soft mt-2">Arkiverat ${esc(new Date(m.archived_at).toLocaleString('sv-SE'))}</p>` : ''}
      </div>`;
    }

    return `<div class="mb-3 p-3 rounded-xl border border-lavender bg-white">
      <p class="text-xs font-bold text-navy mb-2">Klassificera för uppföljning</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <select id="root-cause-${m.id}" class="px-3 py-2 rounded-lg border border-lavender text-sm">
          <option value="">Rotorsak…</option>
          ${optionList(supportTaxonomy.rootCauses, m.root_cause || '')}
        </select>
        <select id="resolution-type-${m.id}" class="px-3 py-2 rounded-lg border border-lavender text-sm">
          <option value="">Lösningstyp…</option>
          ${optionList(supportTaxonomy.resolutionTypes, m.resolution_type || '')}
        </select>
      </div>
      <textarea id="resolution-summary-${m.id}" rows="2" placeholder="Vad gjordes? (internt)" class="w-full px-3 py-2 rounded-lg border border-lavender text-sm mb-2">${esc(m.resolution_summary || '')}</textarea>
      <input type="text" id="fix-reference-${m.id}" value="${esc(m.fix_reference || '')}" placeholder="PR / commit / deploy (valfritt)" class="w-full px-3 py-2 rounded-lg border border-lavender text-sm mb-2">
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="saveMessageResolution('${m.id}')" class="px-3 py-1.5 bg-mint text-xs font-bold rounded">Spara klassificering</button>
        <button type="button" onclick="archiveMessageWithResolution('${m.id}', '${m.message_type || ''}')" class="px-3 py-1.5 bg-lavender text-xs font-bold rounded">Stäng &amp; arkivera</button>
      </div>
    </div>`;
  }

  function renderEventHistoryBlock(m) {
    return `<details class="mb-3" ontoggle="if(this.open) loadMessageEvents('${m.id}')">
      <summary class="text-xs font-bold text-navy cursor-pointer">Historik</summary>
      <div id="events-${m.id}" class="mt-2 text-xs text-text-soft">Laddar vid behov…</div>
    </details>`;
  }

  async function renderSupportStats() {
    const el = document.getElementById('messagesSupportStats');
    if (!el) return;
    if (!supportAnalytics) {
      el.innerHTML = '';
      return;
    }
    const t = supportAnalytics.totals || {};
    const topCauses = (supportAnalytics.byRootCause || []).slice(0, 3);
    const causeHtml = topCauses.length
      ? topCauses.map((row) => {
        const label = supportTaxonomy.rootCauses[row.root_cause] || row.root_cause;
        return `<li>${esc(label)}: ${row.total} (${row.open_count} öppna)</li>`;
      }).join('')
      : '<li>Inga klassade buggar ännu</li>';

    el.innerHTML = `
      <div class="bg-sky rounded-xl p-4"><p class="text-xs text-text-soft">Öppna ärenden</p><p class="text-2xl font-bold text-navy">${t.open_count || 0}</p></div>
      <div class="bg-gold/20 rounded-xl p-4"><p class="text-xs text-text-soft">Öppna buggar</p><p class="text-2xl font-bold text-navy">${t.open_bugs_count || 0}</p></div>
      <div class="bg-lavender rounded-xl p-4"><p class="text-xs text-text-soft">Saknar klassificering</p><p class="text-2xl font-bold text-navy">${t.missing_resolution_count || 0}</p></div>
      <div class="bg-mint/30 rounded-xl p-4"><p class="text-xs font-bold text-navy mb-1">Topp rotorsaker (buggar)</p><ul class="text-xs text-navy space-y-1">${causeHtml}</ul></div>`;
  }

  function messagePreview(text, max = 72) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= max) return raw;
    return raw.slice(0, max - 1) + '…';
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || type || '—';
  }

  function renderTicketTable(messages) {
    const panel = document.getElementById('arendenListPanel');
    const meta = document.getElementById('arendenListMeta');
    if (!panel) return;

    if (meta) {
      const q = document.getElementById('messagesSearch')?.value?.trim();
      meta.textContent = q
        ? `Visar ${messages.length} träff${messages.length === 1 ? '' : 'ar'}`
        : `${messages.length} ärenden i vald vy`;
    }

    if (!messages.length) {
      panel.innerHTML = '<div class="text-center text-text-soft py-8 px-4">Inga ärenden matchar sökningen</div>';
      return;
    }

    panel.innerHTML = `<table class="w-full text-sm">
      <thead class="sticky top-0 bg-lavender/80 backdrop-blur text-xs uppercase text-navy">
        <tr>
          <th class="text-left px-3 py-2 font-bold">#</th>
          <th class="text-left px-3 py-2 font-bold">Rapporterare</th>
          <th class="text-left px-3 py-2 hidden sm:table-cell font-bold">Typ</th>
          <th class="text-left px-3 py-2 font-bold">Status</th>
          <th class="text-left px-3 py-2 hidden md:table-cell font-bold">Datum</th>
        </tr>
      </thead>
      <tbody>
        ${messages.map((m) => {
          const isSelected = String(selectedTicketId) === String(m.id);
          const isUnread = m.status === 'new';
          const rowCls = isSelected
            ? 'bg-gold/25 border-l-4 border-gold'
            : isUnread
              ? 'bg-red-50/80 hover:bg-sky/40'
              : 'hover:bg-sky/30';
          const date = new Date(m.created_at).toLocaleDateString('sv-SE', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          });
          return `<tr class="border-b border-lavender/50 cursor-pointer ${rowCls}" onclick="selectArendeTicket('${m.id}')">
            <td class="px-3 py-2.5 font-mono text-xs text-text-soft">#${m.id}</td>
            <td class="px-3 py-2.5">
              <div class="font-semibold text-navy">${esc(m.name || 'Okänd')}</div>
              <div class="text-xs text-text-soft truncate max-w-[10rem] sm:max-w-[14rem]">${esc(m.email || '')}</div>
              <div class="text-xs text-text-soft mt-0.5 sm:hidden">${esc(messagePreview(m.message, 40))}</div>
            </td>
            <td class="px-3 py-2.5 hidden sm:table-cell text-xs">${esc(typeLabel(m.message_type))}</td>
            <td class="px-3 py-2.5">${statusBadge(m.status)}</td>
            <td class="px-3 py-2.5 hidden md:table-cell text-xs text-text-soft whitespace-nowrap">${date}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  function renderTicketDetail(m) {
    const panel = document.getElementById('arendenDetailPanel');
    if (!panel || !m) return;

    const date = new Date(m.created_at).toLocaleString('sv-SE');
    panel.innerHTML = `<div>
      <div class="flex flex-wrap justify-between gap-3 mb-4 pb-4 border-b border-lavender">
        <div>
          <p class="text-xs font-mono text-text-soft mb-1">Ärende #${m.id}</p>
          <h4 class="text-xl font-bold text-navy">${esc(m.name || m.email || 'Okänd')}</h4>
          <p class="text-sm text-text-soft">${esc(m.email || '')}</p>
          <p class="text-xs text-text-soft mt-1">${esc(typeLabel(m.message_type))} · ${date}</p>
          ${familyBlock(m)}
        </div>
        <div class="flex flex-wrap gap-1 items-start">
          ${statusBadge(m.status)}
          ${resolutionBadge(m)}
          ${m.status !== 'answered' ? `<button type="button" onclick="setMessageStatus('${m.id}','answered')" class="px-2 py-1 text-xs font-bold bg-gold rounded">Besvarad</button>` : ''}
          ${m.status === 'new' ? `<button type="button" onclick="toggleRead('${m.id}', true)" class="px-2 py-1 text-xs font-bold bg-sky rounded">Markera läst</button>` : ''}
        </div>
      </div>
      <div class="mb-4">
        <p class="text-xs font-bold text-navy mb-2">Meddelande</p>
        <p class="text-sm text-navy bg-sky rounded-lg p-3 whitespace-pre-wrap">${esc(m.message)}</p>
      </div>
      ${renderReplyHistory(m.internal_note)}
      ${m.internal_note && !extractReplyHistory(m.internal_note).length ? `<p class="text-xs text-text-soft mb-2">Anteckning: ${esc(m.internal_note)}</p>` : ''}
      ${canReplyToMessage(m) ? `<div class="mb-3 p-3 rounded-xl border border-gold/40 bg-gold/5">
        <label class="block text-xs font-bold text-navy mb-2" for="reply-${m.id}">Svara användaren via e-post</label>
        <textarea id="reply-${m.id}" rows="5" placeholder="Skriv ditt svar här…" class="w-full px-3 py-2 rounded-xl border border-lavender text-sm mb-2"></textarea>
        <button type="button" onclick="sendMessageReply('${m.id}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-navy text-sm font-bold rounded-xl">Skicka svar</button>
      </div>` : '<p class="text-xs text-coral mb-3">Kan inte svara — meddelandet saknar e-postadress.</p>'}
      ${renderResolutionBlock(m)}
      ${renderEventHistoryBlock(m)}
      <div class="flex gap-2 mt-4">
        <input type="text" id="note-${m.id}" value="${esc(extractManualNote(m.internal_note))}" placeholder="Intern anteckning..." class="flex-1 px-3 py-1.5 rounded-lg border border-lavender text-sm">
        <button type="button" onclick="saveNote('${m.id}')" class="px-3 py-1.5 bg-mint text-xs font-bold rounded">Spara</button>
        <button type="button" onclick="deleteMessage('${m.id}')" class="px-3 py-1.5 bg-coral text-xs font-bold rounded">Ta bort</button>
      </div>
    </div>`;
  }

  function renderEmptyDetail(message) {
    const panel = document.getElementById('arendenDetailPanel');
    if (!panel) return;
    panel.innerHTML = `<div class="text-center text-text-soft py-12">
      <p class="font-semibold text-navy mb-1">Välj ett ärende</p>
      <p class="text-sm">${esc(message || 'Klicka på en rad i listan eller sök på namn, e-post eller ärendenummer.')}</p>
    </div>`;
  }

  async function selectArendeTicket(id) {
    selectedTicketId = id;
    renderTicketTable(lastLoadedMessages);

    const cached = lastLoadedMessages.find((m) => String(m.id) === String(id));
    if (cached) renderTicketDetail(cached);

    try {
      const detail = await Auth.api('/api/admin/contact-messages/' + id);
      const idx = lastLoadedMessages.findIndex((m) => String(m.id) === String(id));
      if (idx >= 0) lastLoadedMessages[idx] = detail;
      renderTicketDetail(detail);
    } catch (_e) {
      if (!cached) renderEmptyDetail('Kunde inte ladda ärendet.');
    }

    if (window.history && window.history.replaceState) {
      const base = (window.location.hash || '#arenden').split('?')[0];
      window.history.replaceState(null, '', base + '?ticket=' + encodeURIComponent(id));
    }
  }

  function renderMessagesList(messages) {
    renderTicketTable(messages);
    if (selectedTicketId) {
      const current = messages.find((m) => String(m.id) === String(selectedTicketId));
      if (current) renderTicketDetail(current);
      else renderEmptyDetail('Ärendet finns inte i aktuell vy — prova en annan filter.');
    }
  }

  function filterMessagesInbox(_query) {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      loadMessagesInbox();
    }, 280);
  }

  function populateRootCauseFilter() {
    const el = document.getElementById('messagesRootCauseFilter');
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Alla rotorsaker</option>'
      + Object.entries(supportTaxonomy.rootCauses || {}).map(([value, label]) => (
        `<option value="${esc(value)}">${esc(label)}</option>`
      )).join('');
    if (current) el.value = current;
  }

  async function loadSupportAnalytics() {
    try {
      supportAnalytics = await Auth.api('/api/admin/contact-messages/analytics');
      await renderSupportStats();
      if (typeof renderArendenCharts === 'function') {
        renderArendenCharts(supportAnalytics, supportTaxonomy);
      }
    } catch (e) {
      console.error('[INBOX] analytics', e);
    }
  }

  async function loadTaxonomy() {
    try {
      const data = await Auth.api('/api/admin/contact-messages/taxonomy');
      supportTaxonomy = {
        rootCauses: data.rootCauses || {},
        resolutionTypes: data.resolutionTypes || {},
      };
      populateRootCauseFilter();
    } catch (e) {
      console.error('[INBOX] taxonomy', e);
    }
  }

  function readResolutionForm(id) {
    return {
      root_cause: document.getElementById('root-cause-' + id)?.value || '',
      resolution_type: document.getElementById('resolution-type-' + id)?.value || '',
      resolution_summary: document.getElementById('resolution-summary-' + id)?.value?.trim() || '',
      fix_reference: document.getElementById('fix-reference-' + id)?.value?.trim() || '',
    };
  }

  async function saveMessageResolution(id) {
    const body = readResolutionForm(id);
    if (!body.resolution_type) {
      alert('Välj en lösningstyp.');
      return;
    }
    try {
      await Auth.api('/api/admin/contact-messages/' + id + '/resolution', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      eventCache.delete(String(id));
      await Promise.all([loadMessagesInbox(), loadSupportAnalytics()]);
    } catch (e) {
      alert(e?.message || 'Kunde inte spara klassificering');
    }
  }

  async function archiveMessageWithResolution(id, messageType) {
    const body = readResolutionForm(id);
    if (!body.resolution_type) {
      alert('Välj en lösningstyp innan arkivering.');
      return;
    }
    if (messageType === 'bug' && !body.root_cause) {
      alert('Buggrapporter kräver rotorsak innan arkivering.');
      return;
    }
    if (!confirm('Stäng och arkivera ärendet?')) return;

    try {
      await Auth.api('/api/admin/contact-messages/' + id + '/archive', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      eventCache.delete(String(id));
      await Promise.all([loadMessagesInbox(), loadSupportAnalytics()]);
      if (typeof loadStartSummary === 'function') loadStartSummary();
    } catch (e) {
      alert(e?.message || 'Kunde inte arkivera ärendet');
    }
  }

  async function loadMessageEvents(id) {
    const container = document.getElementById('events-' + id);
    if (!container || eventCache.has(String(id))) {
      if (container && eventCache.has(String(id))) {
        container.innerHTML = eventCache.get(String(id));
      }
      return;
    }
    try {
      const events = await Auth.api('/api/admin/contact-messages/' + id + '/events');
      const html = Array.isArray(events) && events.length
        ? events.map((ev) => {
          const when = new Date(ev.created_at).toLocaleString('sv-SE');
          const label = EVENT_LABELS[ev.event_type] || ev.event_type;
          const who = ev.admin_name ? ` · ${ev.admin_name}` : '';
          return `<div class="py-1 border-b border-lavender/40">${esc(when)} · ${esc(label)}${esc(who)}</div>`;
        }).join('')
        : '<div>Ingen historik ännu</div>';
      eventCache.set(String(id), html);
      container.innerHTML = html;
    } catch (_e) {
      container.innerHTML = '<div class="text-coral">Kunde inte ladda historik</div>';
    }
  }

  async function loadMessagesInbox() {
    const listPanel = document.getElementById('arendenListPanel');
    if (!listPanel) return;
    listPanel.innerHTML = '<div class="text-center text-text-soft py-8">Laddar…</div>';

    try {
      const typeFilter = document.getElementById('messagesTypeFilter')?.value || '';
      const statusFilter = document.getElementById('messagesStatusFilter')?.value || '';
      const rootCauseFilter = document.getElementById('messagesRootCauseFilter')?.value || '';
      const searchVal = document.getElementById('messagesSearch')?.value?.trim() || '';
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      else if (window._messagesFollowupFilter) params.set('followup', '1');
      else if (activeInbox !== 'all') params.set('inbox', activeInbox);
      if (rootCauseFilter) params.set('root_cause', rootCauseFilter);
      if (searchVal) params.set('q', searchVal);
      params.set('limit', '200');

      const messages = await Auth.api('/api/admin/contact-messages?' + params.toString());
      if (!Array.isArray(messages)) {
        throw new Error(typeof messages?.error === 'string' ? messages.error : 'Ogiltigt svar från servern');
      }
      lastLoadedMessages = messages;
      window.allMessages = messages;

      const unreadCount = messages.filter((m) => m.status === 'new' || !m.is_read).length;
      const unreadEl = document.getElementById('unreadMessagesCount');
      if (unreadEl) {
        unreadEl.textContent = unreadCount;
        unreadEl.style.color = unreadCount > 0 ? '#E53E3E' : '#1B2340';
      }
      if (typeof updateMessagesBadge === 'function') updateMessagesBadge(unreadCount);

      renderMessagesList(messages);

      const hash = window.location.hash || '';
      const ticketMatch = hash.match(/[?&]ticket=(\d+)/);
      if (ticketMatch && !selectedTicketId) {
        await selectArendeTicket(ticketMatch[1]);
      } else if (selectedTicketId) {
        const still = messages.find((m) => String(m.id) === String(selectedTicketId));
        if (still) renderTicketDetail(still);
      }
    } catch (e) {
      console.error('[INBOX]', e);
      const detail = e?.message ? ': ' + e.message : '';
      listPanel.innerHTML = '<div class="text-center text-red-500 py-8">Kunde inte ladda ärenden' + detail + '</div>';
    }
  }

  async function setMessageStatus(id, status) {
    await Auth.api('/api/admin/contact-messages/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadMessagesInbox();
    if (typeof loadStartSummary === 'function') loadStartSummary();
  }

  async function sendMessageReply(id) {
    const textarea = document.getElementById('reply-' + id);
    const body = textarea?.value?.trim() || '';
    if (body.length < 10) {
      alert('Svaret måste vara minst 10 tecken.');
      return;
    }
    if (!confirm('Skicka svar till användaren via e-post?')) return;

    try {
      const result = await Auth.api('/api/admin/contact-messages/' + id + '/reply', {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      if (textarea) textarea.value = '';
      alert(result.message || 'Svar skickat');
      loadMessagesInbox();
      if (typeof loadStartSummary === 'function') loadStartSummary();
    } catch (e) {
      alert(e?.message || 'Kunde inte skicka svar');
    }
  }

  async function linkMessageFamily(id) {
    const input = document.getElementById('link-family-' + id);
    const familyId = input?.value?.trim();
    if (!familyId) return alert('Ange family UUID');
    await Auth.api('/api/admin/contact-messages/' + id + '/family', {
      method: 'PATCH',
      body: JSON.stringify({ family_id: familyId }),
    });
    loadMessagesInbox();
  }

  function bindArendenFilters() {
    const search = document.getElementById('messagesSearch');
    if (search && !search.dataset.arendenBound) {
      search.dataset.arendenBound = '1';
      search.addEventListener('input', () => filterMessagesInbox());
    }
    ['messagesTypeFilter', 'messagesStatusFilter', 'messagesRootCauseFilter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.arendenBound) {
        el.dataset.arendenBound = '1';
        el.addEventListener('change', () => loadMessagesInbox());
      }
    });
  }

  function initMessagesInbox() {
    renderInboxTabs();
    bindArendenFilters();
    loadTaxonomy();
    loadSupportAnalytics();
    const hash = window.location.hash || '';
    if (hash.includes('inbox=unread')) activeInbox = 'unread';
    if (hash.includes('followup=1')) window._messagesFollowupFilter = true;
    const ticketMatch = hash.match(/[?&]ticket=(\d+)/);
    if (ticketMatch) selectedTicketId = ticketMatch[1];
  }

  window.loadMessagesInbox = loadMessagesInbox;
  window.filterMessagesInbox = filterMessagesInbox;
  window.selectArendeTicket = selectArendeTicket;
  window.setMessageStatus = setMessageStatus;
  window.sendMessageReply = sendMessageReply;
  window.linkMessageFamily = linkMessageFamily;
  window.saveMessageResolution = saveMessageResolution;
  window.archiveMessageWithResolution = archiveMessageWithResolution;
  window.loadMessageEvents = loadMessageEvents;
  window.initMessagesInbox = initMessagesInbox;

  document.addEventListener('DOMContentLoaded', initMessagesInbox);
})();
