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
              </div>
              <p class="text-xs text-text-soft">${esc(m.email || '')} · ${date}</p>
              ${familyBlock(m)}
            </div>
            <div class="flex flex-wrap gap-1">
              ${m.status !== 'answered' ? `<button type="button" onclick="setMessageStatus('${m.id}','answered')" class="px-2 py-1 text-xs font-bold bg-gold rounded">Besvarad</button>` : ''}
              ${m.status !== 'archived' ? `<button type="button" onclick="setMessageStatus('${m.id}','archived')" class="px-2 py-1 text-xs font-bold bg-lavender rounded">Arkivera</button>` : ''}
              ${m.status === 'new' ? `<button type="button" onclick="toggleRead('${m.id}', true)" class="px-2 py-1 text-xs font-bold bg-sky rounded">Markera läst</button>` : ''}
            </div>
          </div>
          <p class="text-sm text-navy bg-sky rounded-lg p-3 mb-3">${esc(m.message)}</p>
          ${m.internal_note ? `<p class="text-xs text-text-soft mb-2">Anteckning: ${esc(m.internal_note)}</p>` : ''}
          <div class="flex gap-2">
            <input type="text" id="note-${m.id}" value="${esc(m.internal_note || '')}" placeholder="Intern anteckning..." class="flex-1 px-3 py-1.5 rounded-lg border border-lavender text-sm">
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
    const hash = window.location.hash || '';
    if (hash.includes('inbox=unread')) activeInbox = 'unread';
    if (hash.includes('followup=1')) window._messagesFollowupFilter = true;
  }

  window.loadMessagesInbox = loadMessagesInbox;
  window.filterMessagesInbox = filterMessagesInbox;
  window.setMessageStatus = setMessageStatus;
  window.linkMessageFamily = linkMessageFamily;
  window.initMessagesInbox = initMessagesInbox;

  document.addEventListener('DOMContentLoaded', initMessagesInbox);
})();
