/**
 * Meddelanden inbox — Fas 3B (status tabs, family link).
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

  let activeInbox = 'unread';
  let lastLoadedMessages = [];
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

  function renderMessagesList(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (!messages.length) {
      container.innerHTML = '<div class="text-center text-text-soft py-8 bg-sky rounded-2xl">Inga meddelanden i denna vy</div>';
      return;
    }

    container.innerHTML = messages.map((m) => {
      const date = new Date(m.created_at).toLocaleString('sv-SE');
      const isUnread = m.status === 'new';
      return `<div class="bg-white rounded-2xl border-2 ${isUnread ? 'border-red-300' : 'border-lavender'} p-6">
          <div class="flex flex-wrap justify-between gap-2 mb-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-navy">${esc(m.name || m.email || 'Okänd')}</span>
                ${statusBadge(m.status)}
                ${resolutionBadge(m)}
              </div>
              <p class="text-xs text-text-soft">${esc(m.email || '')} · ${date}</p>
              ${familyBlock(m)}
            </div>
            <div class="flex flex-wrap gap-1">
              ${m.status !== 'answered' ? `<button type="button" onclick="setMessageStatus('${m.id}','answered')" class="px-2 py-1 text-xs font-bold bg-gold rounded">Besvarad</button>` : ''}
              ${m.status === 'new' ? `<button type="button" onclick="toggleRead('${m.id}', true)" class="px-2 py-1 text-xs font-bold bg-sky rounded">Markera läst</button>` : ''}
            </div>
          </div>
          <p class="text-sm text-navy bg-sky rounded-lg p-3 mb-3">${esc(m.message)}</p>
          ${renderReplyHistory(m.internal_note)}
          ${m.internal_note && !extractReplyHistory(m.internal_note).length ? `<p class="text-xs text-text-soft mb-2">Anteckning: ${esc(m.internal_note)}</p>` : ''}
          ${canReplyToMessage(m) ? `<div class="mb-3 p-3 rounded-xl border border-gold/40 bg-gold/5">
            <label class="block text-xs font-bold text-navy mb-2" for="reply-${m.id}">Svara användaren via e-post</label>
            <textarea id="reply-${m.id}" rows="5" placeholder="Skriv ditt svar här…" class="w-full px-3 py-2 rounded-xl border border-lavender text-sm mb-2"></textarea>
            <button type="button" onclick="sendMessageReply('${m.id}')" class="px-4 py-2 bg-gold hover:bg-yellow-500 text-navy text-sm font-bold rounded-xl">Skicka svar</button>
          </div>` : '<p class="text-xs text-coral mb-3">Kan inte svara — meddelandet saknar e-postadress.</p>'}
          ${renderResolutionBlock(m)}
          ${renderEventHistoryBlock(m)}
          <div class="flex gap-2">
            <input type="text" id="note-${m.id}" value="${esc(extractManualNote(m.internal_note))}" placeholder="Intern anteckning..." class="flex-1 px-3 py-1.5 rounded-lg border border-lavender text-sm">
            <button type="button" onclick="saveNote('${m.id}')" class="px-3 py-1.5 bg-mint text-xs font-bold rounded">Spara</button>
            <button type="button" onclick="deleteMessage('${m.id}')" class="px-3 py-1.5 bg-coral text-xs font-bold rounded">Ta bort</button>
          </div>
        </div>`;
    }).join('');
  }

  function filterMessagesInbox(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      renderMessagesList(lastLoadedMessages);
      return;
    }
    const filtered = lastLoadedMessages.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const message = (m.message || '').toLowerCase();
      return name.includes(q) || email.includes(q) || message.includes(q);
    });
    renderMessagesList(filtered);
  }

  async function loadSupportAnalytics() {
    try {
      supportAnalytics = await Auth.api('/api/admin/contact-messages/analytics');
      await renderSupportStats();
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
    } catch (e) {
      container.innerHTML = '<div class="text-coral">Kunde inte ladda historik</div>';
    }
  }

  async function loadMessagesInbox() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-center text-text-soft py-8">Laddar...</div>';

    try {
      const typeFilter = document.getElementById('messagesTypeFilter')?.value || '';
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (window._messagesFollowupFilter) params.set('followup', '1');
      else if (activeInbox !== 'all') params.set('inbox', activeInbox);

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

      const searchVal = document.getElementById('messagesSearch')?.value?.trim() || '';
      if (searchVal) filterMessagesInbox(searchVal);
      else renderMessagesList(messages);
    } catch (e) {
      console.error('[INBOX]', e);
      const detail = e?.message ? ': ' + e.message : '';
      container.innerHTML = '<div class="text-center text-red-500 py-8">Kunde inte ladda meddelanden' + detail + '</div>';
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

  function initMessagesInbox() {
    renderInboxTabs();
    loadTaxonomy();
    loadSupportAnalytics();
    const hash = window.location.hash || '';
    if (hash.includes('inbox=unread')) activeInbox = 'unread';
    if (hash.includes('followup=1')) window._messagesFollowupFilter = true;
  }

  window.loadMessagesInbox = loadMessagesInbox;
  window.filterMessagesInbox = filterMessagesInbox;
  window.setMessageStatus = setMessageStatus;
  window.sendMessageReply = sendMessageReply;
  window.linkMessageFamily = linkMessageFamily;
  window.saveMessageResolution = saveMessageResolution;
  window.archiveMessageWithResolution = archiveMessageWithResolution;
  window.loadMessageEvents = loadMessageEvents;
  window.initMessagesInbox = initMessagesInbox;

  document.addEventListener('DOMContentLoaded', initMessagesInbox);
})();
