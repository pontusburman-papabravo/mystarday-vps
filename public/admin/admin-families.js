// Admin Families: family cards, impersonation, archive, contact messages, action handlers
    // ─── Families (Grouped Cards) ─────────────────────────────

    async function loadFamilies() {
      const container = document.getElementById('familiesContainer');
      container.innerHTML = '<div class="text-center text-text-soft py-8">Laddar...</div>';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const families = await Auth.api('/api/admin/families-grouped');
        clearTimeout(timeout);
        allFamilies = families || [];
        const searchVal = document.getElementById('familySearch')?.value?.trim() || '';
        if (searchVal) {
          filterFamilies(searchVal);
        } else {
          renderFamilyCards(families, container);
        }
      } catch (e) {
        clearTimeout(timeout);
        console.error('Failed to load families:', e);
        container.innerHTML = '<div class="text-center text-red-500 py-8">Kunde inte ladda familjer' + (e.name === 'AbortError' ? ' (timeout — servern är upptagen)' : '') + '</div>';
      }
    }

    function filterFamilies(query) {
      const container = document.getElementById('familiesContainer');
      if (!query || !query.trim()) {
        renderFamilyCards(allFamilies, container);
        return;
      }
      const q = query.toLowerCase().trim();
      const filtered = allFamilies.filter(family => {
        // Match family name
        if ((family.family_name || '').toLowerCase().includes(q)) return true;
        // Match parent name or email
        if ((family.parents || []).some(p =>
          (p.email || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q)
        )) return true;
        // Match child name
        if ((family.children || []).some(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q)
        )) return true;
        return false;
      });
      renderFamilyCards(filtered, container);
    }

    function renderFamilyCards(families, container) {
      if (!families || families.length === 0) {
        container.innerHTML = '<div class="text-center text-text-soft py-8 bg-sky rounded-2xl">Inga familjer än</div>';
        return;
      }

      // Sort alphabetically by family name (A-Ö), families without name go last
      families = families.slice().sort((a, b) => {
        const nameA = (a.family_name || '').toLowerCase();
        const nameB = (b.family_name || '').toLowerCase();
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, 'sv');
      });

      container.innerHTML = families.map((family, idx) => {
        const shortId = family.id ? family.id.substring(0, 8) : '?';
        const parentRows = (family.parents || []).map(p => {
          const verifiedBadge = p.verified
            ? '<span class="inline-block px-2 py-0.5 bg-mint text-green-700 text-xs rounded-full font-semibold">Verifierad</span>'
            : '<span class="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">Ej verifierad</span>';
          const adminBadge = p.is_admin
            ? ' <span class="inline-block px-2 py-0.5 bg-lavender text-purple-700 text-xs rounded-full font-semibold">Admin</span>'
            : '';
          const lockedBadge = p.locked
            ? ' <span class="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">Låst</span>'
            : '';

          const approveBtn = !p.verified
            ? `<button onclick="approveParent('${esc(p.id)}')" class="px-2 py-1 bg-gold hover:bg-yellow-500 text-navy text-xs rounded-lg font-semibold transition-colors">Godkänn</button>`
            : '';
          const lockBtn = p.locked
            ? `<button onclick="unlockParent('${esc(p.id)}')" class="px-2 py-1 bg-mint hover:bg-green-200 text-green-700 text-xs rounded-lg font-semibold transition-colors">Lås upp</button>`
            : `<button onclick="lockParent('${esc(p.id)}', '${esc(p.email)}')" class="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs rounded-lg font-semibold transition-colors">Lås</button>`;
          // Auth method badges (F1)
          const hasPassword = p.hasPassword;
          const hasAppleLinked = p.hasAppleLinked;
          const appleEmail = p.appleEmail || '';
          const isRelay = appleEmail.includes('privaterelay');
          const isAppleOnly = hasAppleLinked && !hasPassword;
          const authBadges = [
            hasPassword ? '<span class="text-xs" title="Lösenord">🔑</span>' : '',
            hasAppleLinked ? '<span class="text-xs" title="Apple">🍎</span>' : '',
            isAppleOnly ? '<span class="text-xs" title="Apple utan lösenord — risk">⚠️</span>' : '',
            isRelay ? '<span class="text-xs" title="Apple privaterelay">📧</span>' : '',
          ].filter(Boolean).join(' ');

          const resetPwBtn = `<button onclick="resetParentPassword('${esc(p.id)}', '${esc(p.email)}')" class="px-2 py-1 bg-sky hover:bg-lavender text-navy text-xs rounded-lg font-semibold transition-colors">Återställ lösenord</button>`;
          const changeEmailBtn = `<button onclick="openChangeEmailModal('${esc(p.id)}', '${esc(p.email)}')" class="px-2 py-1 bg-lavender hover:bg-purple-200 text-purple-700 text-xs rounded-lg font-semibold transition-colors">📧 Byt e-post</button>`;
          const unlinkAppleBtn = hasAppleLinked && hasPassword
            ? `<button onclick="openUnlinkAppleModal('${esc(p.id)}', '${esc(p.email)}')" class="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs rounded-lg font-semibold transition-colors">🍎 Koppla bort</button>`
            : '';
          const auditBtn = `<button onclick="toggleAuditLog('${family.id}')" class="px-2 py-1 bg-sky hover:bg-lavender text-navy text-xs rounded-lg font-semibold transition-colors">📋 Audit</button>`;
          const adminToggleBtn = p.is_admin
            ? `<button onclick="toggleAdmin('${esc(p.id)}', '${esc(p.email)}', false)" class="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs rounded-lg font-semibold transition-colors">Ta bort admin</button>`
            : `<button onclick="toggleAdmin('${esc(p.id)}', '${esc(p.email)}', true)" class="px-2 py-1 bg-lavender hover:bg-purple-200 text-purple-700 text-xs rounded-lg font-semibold transition-colors">Gör till admin</button>`;
          const deleteBtn = `<button onclick="deleteAccount('parent', '${esc(p.id)}', '${esc(p.email)}')" class="px-2 py-1 bg-coral hover:bg-red-200 text-red-700 text-xs rounded-lg font-semibold transition-colors">Ta bort</button>`;

          return `<div class="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-4 border-b border-lavender/50 hover:bg-sky/50 transition-colors">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-navy font-medium text-sm truncate">${esc(p.email)}</span>
                ${verifiedBadge}${adminBadge}${lockedBadge}
                ${authBadges ? `<span class="flex flex-wrap gap-0.5">${authBadges}</span>` : ''}
              </div>
              <p class="text-text-soft text-xs mt-0.5">${esc(p.name || '')}</p>
            </div>
            <div class="flex flex-wrap gap-1 shrink-0 action-btns">
              ${approveBtn}${lockBtn}${adminToggleBtn}${resetPwBtn}${changeEmailBtn}${unlinkAppleBtn}${auditBtn}${deleteBtn}
            </div>
          </div>`;
        }).join('');

        const childRows = (family.children || []).map(c => {
          const birthday = c.birthday ? new Date(c.birthday).toLocaleDateString('sv-SE') : '';
          const deleteChildBtn = `<button onclick="deleteAccount('child', '${esc(c.id)}', '${esc(c.name)}')" class="px-2 py-1 bg-coral hover:bg-red-200 text-red-700 text-xs rounded-lg font-semibold transition-colors">Ta bort</button>`;
          return `<div class="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-4 border-b border-lavender/50 hover:bg-sky/50 transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-lg">${esc(c.emoji || '')}</span>
              <div>
                <span class="text-navy font-medium text-sm">${esc(c.name)}</span>
                <span class="text-text-soft text-xs ml-1">(${esc(c.username)})</span>
                ${birthday ? `<span class="text-text-soft text-xs ml-2">${esc(birthday)}</span>` : ''}
              </div>
            </div>
            <div class="flex flex-wrap gap-1 shrink-0 action-btns">
              ${deleteChildBtn}
            </div>
          </div>`;
        }).join('');

        const noParents = (family.parents || []).length === 0
          ? '<p class="text-text-soft text-sm italic px-4 py-2">Inga föräldrar</p>'
          : '';
        const noChildren = (family.children || []).length === 0
          ? '<p class="text-text-soft text-sm italic px-4 py-2">Inga barn</p>'
          : '';

        const familyName = family.family_name || '';
        const familyLabel = familyName ? esc(familyName) : `Familj ${esc(shortId)}`;

        return `<div class="bg-white rounded-2xl border-2 border-lavender overflow-hidden">
          <button onclick="toggleFamilyCard(this)" class="w-full flex items-center justify-between px-4 md:px-6 py-4 bg-sky hover:bg-lavender/50 transition-colors text-left">
            <div class="flex items-center gap-3">
              <span class="text-lg">&#128104;&#8205;&#128105;&#8205;&#128103;</span>
              <div>
                <h4 class="font-heading font-bold text-navy">${familyLabel}</h4>
                <p class="text-text-soft text-xs">${(family.parents || []).length} föräldrar, ${(family.children || []).length} barn · ID: ${esc(shortId)}</p>
              </div>
            </div>
            <svg class="family-chevron w-5 h-5 text-navy transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transform:rotate(-90deg);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="family-content" style="display:none;">
            <div class="px-4 md:px-6 pt-4 pb-2 flex items-center gap-2 border-b border-lavender/50">
              <input type="text" id="fname-${family.id}" value="${esc(familyName)}" placeholder="Ange familjenamn..." class="flex-1 px-3 py-1.5 rounded-lg border border-lavender text-sm focus:border-gold outline-none">
              <button onclick="saveFamilyName('${family.id}')" class="px-3 py-1.5 bg-gold hover:bg-yellow-500 text-navy text-xs rounded-lg font-semibold transition-colors whitespace-nowrap">Spara namn</button>
            </div>
            <div class="px-4 md:px-6 pt-4 pb-2">
              <h5 class="text-xs font-heading font-bold text-text-soft uppercase tracking-wider mb-2">Föräldrar</h5>
              ${noParents}${parentRows}
            </div>
            <div class="px-4 md:px-6 pt-2 pb-4">
              <h5 class="text-xs font-heading font-bold text-text-soft uppercase tracking-wider mb-2">Barn</h5>
              ${noChildren}${childRows}
            </div>
            <!-- Direct notification panel (admin → family) -->
            <div class="px-4 md:px-6 py-3 border-t border-lavender" style="background:rgba(27,35,64,0.04);">
              <button onclick="toggleMsgPanel('${family.id}')" class="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-gold transition-colors">
                📣 Skicka direkt-notis <span id="msgChevron-${family.id}" style="display:inline-block;">▼</span>
              </button>
              <div id="msgPanel-${family.id}" style="display:none; margin-top:10px;">
                <textarea id="msgInput-${family.id}" placeholder="Skriv meddelande till familjen..." rows="2"
                  class="w-full px-3 py-2 rounded-lg border-2 border-lavender focus:border-gold outline-none text-sm resize-none"></textarea>
                <div class="flex items-center justify-between gap-3 mt-2">
                  <span id="msgStatus-${family.id}" class="text-xs font-semibold"></span>
                  <button onclick="sendSystemMessage('${family.id}')"
                    class="px-4 py-1.5 bg-gold hover:bg-yellow-500 text-navy text-xs rounded-lg font-bold transition-colors whitespace-nowrap">
                    Skicka 📤
                  </button>
                </div>
                <div id="msgHistory-${family.id}" class="mt-3 space-y-1.5"></div>
              </div>
            </div>
            <div class="px-4 md:px-6 py-3 border-t border-lavender flex flex-wrap gap-2 items-center justify-between bg-sky/30">
              <button onclick="openImpersonation('${family.id}', '${esc(familyLabel)}')" class="px-3 py-1.5 bg-sky hover:bg-lavender text-navy text-xs rounded-lg font-semibold transition-colors border border-lavender">👁️ Visa Dashboard</button>
              <div class="flex flex-wrap gap-2">
                <button onclick="archiveFamily('${family.id}', '${esc(familyLabel)}')" class="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs rounded-lg font-semibold transition-colors">📦 Arkivera</button>
                <button onclick="deleteFamilyPermanent('${family.id}', '${esc(familyLabel)}')" class="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg font-semibold transition-colors">🗑️ Ta bort permanent</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
    }

    async function saveFamilyName(familyId) {
      const input = document.getElementById('fname-' + familyId);
      if (!input) return;
      const name = input.value.trim();
      if (!name) { alert('Familjenamn kan inte vara tomt'); return; }
      try {
        await Auth.api(`/api/admin/families/${familyId}/name`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte spara Familienamn — kontrollera att namnet inte redan används');
      }
    }

    // ─── Admin Impersonation ───────────────────────────────────
    async function openImpersonation(familyId, familyLabel) {
      try {
        const data = await Auth.api(`/api/admin/impersonate/${familyId}`, { method: 'POST' });
        if (!data.token) throw new Error('Ingen token returnerades');
        // Open dashboard in new tab with impersonation token as query param
        const url = `/dashboard?impersonation_token=${encodeURIComponent(data.token)}&family_name=${encodeURIComponent(data.familyName || familyLabel)}`;
        window.open(url, '_blank');
      } catch (err) {
        alert(err.message || 'Kunde inte öppna support-läge');
      }
    }

    function toggleFamilyCard(btn) {
      const content = btn.nextElementSibling;
      const chevron = btn.querySelector('.family-chevron');
      if (content.style.display === 'none') {
        content.style.display = '';
        chevron.style.transform = '';
      } else {
        content.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
      }
    }

    // ─── Archive / Restore / Delete Family ─────────────────────

    async function archiveFamily(familyId, familyLabel) {
      if (!confirm(`Arkivera "${familyLabel}"? Familjen döljs från listan men all data bevaras.`)) return;
      try {
        await Auth.api(`/api/admin/families/${familyId}/archive`, { method: 'PUT' });
        loadFamilies();
        // Refresh archived list if visible
        if (!document.getElementById('archivedFamiliesWrapper').classList.contains('hidden')) {
          loadArchivedFamilies();
        }
      } catch (err) {
        alert(err.message || 'Kunde inte arkivera familjen');
      }
    }

    let _archivedLoaded = false;

    async function toggleArchivedSection() {
      const wrapper = document.getElementById('archivedFamiliesWrapper');
      const chevron = document.getElementById('archivedChevron');
      const isHidden = wrapper.classList.contains('hidden');
      if (isHidden) {
        wrapper.classList.remove('hidden');
        chevron.style.transform = '';
        if (!_archivedLoaded) {
          _archivedLoaded = true;
          await loadArchivedFamilies();
        }
      } else {
        wrapper.classList.add('hidden');
        chevron.style.transform = 'rotate(-90deg)';
      }
    }

    async function loadArchivedFamilies() {
      const container = document.getElementById('archivedFamiliesContainer');
      container.innerHTML = '<div class="text-center text-text-soft py-4">Laddar...</div>';
      try {
        const families = await Auth.api('/api/admin/families-grouped?archived=true');
        if (!families || families.length === 0) {
          container.innerHTML = '<div class="text-center text-text-soft py-4 bg-sky rounded-xl">Inga arkiverade familjer</div>';
          return;
        }
        container.innerHTML = families.map(family => {
          const shortId = family.id ? family.id.substring(0, 8) : '?';
          const familyName = family.family_name || '';
          const familyLabel = familyName ? esc(familyName) : `Familj ${esc(shortId)}`;
          const archivedDate = family.archived_at
            ? new Date(family.archived_at).toLocaleDateString('sv-SE')
            : '';
          return `
            <div class="bg-gray-50 rounded-xl border-2 border-gray-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h5 class="font-heading font-bold text-navy">${familyLabel}</h5>
                <p class="text-text-soft text-xs">${(family.parents||[]).length} föräldrar, ${(family.children||[]).length} barn · Arkiverad: ${esc(archivedDate)}</p>
              </div>
              <div class="flex gap-2 shrink-0">
                <button onclick="restoreFamily('${esc(family.id)}', '${familyLabel}')" class="px-3 py-1.5 bg-mint hover:bg-green-200 text-green-700 text-xs rounded-lg font-semibold transition-colors">↩️ Återställ</button>
                <button onclick="deleteFamilyPermanent('${esc(family.id)}', '${familyLabel}')" class="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg font-semibold transition-colors">🗑️ Ta bort</button>
              </div>
            </div>`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="text-center text-red-500 py-4">Kunde inte ladda arkiverade familjer</div>';
        console.error('Failed to load archived families:', err);
      }
    }

    async function restoreFamily(familyId, familyLabel) {
      if (!confirm(`Återställa "${familyLabel}" till aktiva familjer?`)) return;
      try {
        await Auth.api(`/api/admin/families/${familyId}/restore`, { method: 'PUT' });
        _archivedLoaded = false;
        await loadArchivedFamilies();
        _archivedLoaded = true;
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte återställa familjen');
      }
    }

    function deleteFamilyPermanent(familyId, familyLabel) {
      document.getElementById('familyDeleteTargetName').textContent = familyLabel;
      document.getElementById('familyDeleteModal').classList.remove('hidden');
      window._pendingFamilyDelete = familyId;
    }

    async function confirmFamilyDelete() {
      const familyId = window._pendingFamilyDelete;
      if (!familyId) return;
      document.getElementById('familyDeleteModal').classList.add('hidden');
      try {
        await Auth.api(`/api/admin/families/${familyId}`, { method: 'DELETE' });
        window._pendingFamilyDelete = null;
        loadFamilies();
        _archivedLoaded = false;
        if (!document.getElementById('archivedFamiliesWrapper').classList.contains('hidden')) {
          _archivedLoaded = true;
          await loadArchivedFamilies();
        }
      } catch (err) {
        alert(err.message || 'Kunde inte ta bort familjen');
      }
    }

    function cancelFamilyDelete() {
      document.getElementById('familyDeleteModal').classList.add('hidden');
      window._pendingFamilyDelete = null;
    }

    // ─── Contact Messages ─────────────────────────────────────

    function updateMessagesBadge(count) {
      const badge = document.getElementById('messagesBadge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    async function loadMessages() {
      const container = document.getElementById('messagesContainer');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const typeFilter = document.getElementById('messagesTypeFilter')?.value || '';
        const url = typeFilter
          ? `/api/admin/contact-messages?type=${encodeURIComponent(typeFilter)}`
          : '/api/admin/contact-messages';
        const messages = await Auth.api(url);
        clearTimeout(timeout);
        allMessages = messages;
        const unreadCount = messages.filter(m => !m.is_read).length;
        document.getElementById('unreadMessagesCount').textContent = unreadCount;
        document.getElementById('unreadMessagesCount').style.color = unreadCount > 0 ? '#E53E3E' : '#1B2340';
        document.getElementById('totalMessagesCount').textContent = messages.length;
        updateMessagesBadge(unreadCount);

        const sectionBadge = document.getElementById('sectionUnreadBadge');
        if (sectionBadge) {
          if (unreadCount > 0) {
            sectionBadge.textContent = unreadCount > 99 ? '99+' : unreadCount + ' olästa';
            sectionBadge.classList.remove('hidden');
          } else {
            sectionBadge.classList.add('hidden');
          }
        }

        renderMessages(messages);
      } catch (e) {
        clearTimeout(timeout);
        console.error('Failed to load contact messages:', e);
        container.innerHTML = '<div class="text-center text-red-500 py-8">Kunde inte ladda meddelanden' + (e.name === 'AbortError' ? ' (timeout)' : '') + '</div>';
      }
    }

    function filterMessages(query) {
      if (!query) return allMessages;
      return allMessages.filter(m => {
        const name = (m.name || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const message = (m.message || '').toLowerCase();
        return name.includes(query) || email.includes(query) || message.includes(query);
      });
    }

    function renderMessages(messages) {
      const container = document.getElementById('messagesContainer');
      if (messages.length > 0) {
        container.innerHTML = messages.map(m => {
          const date = new Date(m.created_at).toLocaleDateString('sv-SE', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          const noteDate = m.noted_at ? new Date(m.noted_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
          const isUnread = !m.is_read;
          const unreadBadge = isUnread
            ? `<span class="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Oläst</span>`
            : `<span class="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Läst</span>`;

          // Message type badge
          const msgType = m.message_type || 'contact';
          const typeBadgeMap = {
            bug:     { label: 'Buggrapport', bg: 'bg-red-100', color: 'text-red-700' },
            feedback: { label: 'Feedback', bg: 'bg-lavender', color: 'text-purple-700' },
            contact: { label: 'Kontakt', bg: 'bg-sky', color: 'text-navy' },
          };
          const typeInfo = typeBadgeMap[msgType] || typeBadgeMap.contact;
          const typeBadge = `<span class="inline-block px-2 py-0.5 ${typeInfo.bg} ${typeInfo.color} text-xs font-semibold rounded-full">${typeInfo.label}</span>`;

          const toggleLabel = isUnread ? 'Markera läst' : 'Markera oläst';
          const toggleBtnClass = isUnread
            ? 'px-3 py-1.5 bg-gold hover:bg-yellow-500 text-navy text-xs rounded-lg font-semibold transition-colors whitespace-nowrap'
            : 'px-3 py-1.5 bg-lavender hover:bg-purple-200 text-purple-700 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap';
          return `<div class="bg-white rounded-2xl border-2 ${isUnread ? 'border-red-300' : 'border-lavender'} p-6">
            <div class="flex justify-between items-start mb-3">
              <div class="flex flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-heading font-bold text-navy">${esc(m.name)}</p>
                  ${unreadBadge}
                  ${typeBadge}
                </div>
                <p class="text-text-soft text-sm">${esc(m.email)}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="text-text-soft text-xs">${esc(date)}</span>
                <button onclick="toggleRead('${esc(m.id)}', ${isUnread})" class="${toggleBtnClass}">${toggleLabel}</button>
              </div>
            </div>
            <p class="text-navy bg-sky rounded-lg p-4 text-sm leading-relaxed mb-3">${esc(m.message)}</p>
            ${m.internal_note ? `<div class="bg-gold-light rounded-lg p-3 mb-3 text-sm"><p class="text-xs text-text-soft font-semibold mb-1">Intern anteckning (${noteDate})</p><p class="text-navy">${esc(m.internal_note)}</p></div>` : ''}
            <div class="flex gap-2 items-center">
              <input type="text" id="note-${m.id}" value="${esc(m.internal_note || '')}" placeholder="Skriv intern anteckning..." class="flex-1 px-3 py-1.5 rounded-lg border border-lavender text-sm focus:border-gold outline-none">
              <button onclick="saveNote('${esc(m.id)}')" class="px-3 py-1.5 bg-mint hover:bg-green-200 text-green-700 text-xs rounded-lg font-semibold transition-colors whitespace-nowrap">Spara anteckning</button>
              <button onclick="deleteMessage('${esc(m.id)}')" class="px-3 py-1.5 bg-coral hover:bg-red-200 text-red-700 text-xs rounded-lg font-semibold transition-colors">Ta bort</button>
            </div>
          </div>`;
        }).join('');
      } else {
        container.innerHTML = '<div class="text-center text-text-soft py-8 bg-sky rounded-2xl">Inga meddelanden att visa</div>';
      }
    }

    async function saveNote(messageId) {
      const input = document.getElementById('note-' + messageId);
      if (!input) return;
      try {
        await Auth.api(`/api/admin/contact-messages/${messageId}/note`, {
          method: 'PUT',
          body: JSON.stringify({ note: input.value }),
        });
        loadMessages();
      } catch (err) {
        alert(err.message || 'Kunde inte spara anteckning');
      }
    }

    async function toggleRead(messageId, newReadState) {
      try {
        await Auth.api(`/api/admin/contact-messages/${messageId}/read`, {
          method: 'PUT',
          body: JSON.stringify({ is_read: newReadState }),
        });
        loadMessages();
      } catch (err) {
        alert(err.message || 'Kunde inte uppdatera läsläge');
      }
    }

    async function deleteMessage(id) {
      if (!confirm('Är du säker på att du vill ta bort detta meddelande?')) return;
      try {
        await Auth.api(`/api/admin/contact-messages/${id}`, { method: 'DELETE' });
        loadMessages();
        // Clear search field on reload
        document.getElementById('messagesSearch').value = '';
      } catch (err) {
        alert(err.message || 'Kunde inte ta bort meddelande');
      }
    }

    // ─── Admin Action Handlers ───────────────────────────────

    // Approve a parent account
    async function approveParent(parentId) {
      if (!confirm('Godkänna detta föräldrakonto?')) return;
      try {
        await Auth.api(`/api/admin/approve-parent/${parentId}`, { method: 'PUT' });
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte godkänna konto');
      }
    }

    // Toggle admin status for a parent account
    async function toggleAdmin(parentId, email, willMakeAdmin) {
      const action = willMakeAdmin ? 'ge admin-rättigheter till' : 'ta bort admin-rättigheter från';
      if (!confirm(`${action} ${email}?`)) return;
      try {
        await Auth.api(`/api/admin/parents/${parentId}/admin`, { method: 'PUT' });
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte ändra admin-rättigheter');
      }
    }

    // Lock parent account
    async function lockParent(parentId, email) {
      if (!confirm(`Låsa kontot för ${email}? Hen kan inte logga in tills kontot låses upp.`)) return;
      try {
        await Auth.api(`/api/admin/lock-parent/${parentId}`, { method: 'PUT' });
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte låsa konto');
      }
    }

    // Unlock parent account
    async function unlockParent(parentId) {
      try {
        await Auth.api(`/api/admin/unlock-parent/${parentId}`, { method: 'PUT' });
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte låsa upp konto');
      }
    }

    // Reset parent password (F2 — modal with auth context)
    window._resetPwParentId = null;
    window._resetPwParentEmail = null;

    async function resetParentPassword(parentId, email) {
      // Find auth info for this parent
      let parentData = null;
      for (const family of allFamilies || []) {
        const p = (family.parents || []).find(p => p.id === parentId);
        if (p) { parentData = p; break; }
      }

      const hasPassword = parentData && parentData.hasPassword;
      const hasAppleLinked = parentData && parentData.hasAppleLinked;
      const isRelay = parentData && parentData.appleEmail && parentData.appleEmail.includes('privaterelay');

      let warnings = '';
      if (!hasPassword) {
        warnings += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-yellow-700 text-xs mb-2">⚠️ Konto saknar lösenord — föräldern kan inte logga in utan Apple.</div>';
      }
      if (hasAppleLinked) {
        warnings += '<div class="bg-sky border border-lavender rounded-lg p-2 text-navy text-xs mb-2">🍎 Apple är kopplat — det nya lösenordet skickas via e-post.</div>';
      }
      if (isRelay) {
        warnings += '<div class="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs">📧 Apple relay — kontrollera att e-postadressen är korrekt innan du fortsätter.</div>';
      }

      window._resetPwParentId = parentId;
      window._resetPwParentEmail = email;
      document.getElementById('resetPwTargetEmail').textContent = email;
      document.getElementById('resetPwWarnings').innerHTML = warnings;
      document.getElementById('resetPwModal').classList.remove('hidden');
    }

    function closeResetPwModal() {
      document.getElementById('resetPwModal').classList.add('hidden');
      window._resetPwParentId = null;
      window._resetPwParentEmail = null;
    }

    async function confirmResetPw() {
      const parentId = window._resetPwParentId;
      const email = window._resetPwParentEmail;
      if (!parentId) return;
      closeResetPwModal();
      try {
        await Auth.api(`/api/admin/reset-parent-password/${parentId}`, { method: 'PUT' });
        alert(`Lösenord skickat till ${email}`);
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte återställa lösenord');
      }
    }

    // Delete account (parent or child) -- shows confirmation modal
    function deleteAccount(type, id, name) {
      document.getElementById('deleteTargetName').textContent = name;
      document.getElementById('deleteModal').classList.remove('hidden');
      window._pendingDelete = { type, id };
    }

    async function confirmDelete() {
      const { type, id } = window._pendingDelete || {};
      if (!type || !id) return;
      document.getElementById('deleteModal').classList.add('hidden');
      try {
        await Auth.api(`/api/admin/account/${type}/${id}`, { method: 'DELETE' });
        window._pendingDelete = null;
        loadFamilies();
      } catch (err) {
        alert(err.message || 'Kunde inte ta bort konto');
      }
    }

    function cancelDelete() {
      document.getElementById('deleteModal').classList.add('hidden');
      window._pendingDelete = null;
    }

    // ── Library Tab Switching ───────────────────────────────────
    let activeLibTab = 'activities'; // 'activities' | 'rewards'

    function switchLibTab(tab) {
      activeLibTab = tab;
      const btnA = document.getElementById('libTabActivities');
      const btnR = document.getElementById('libTabRewards');
      const btnS = document.getElementById('libTabSchedules');
      const panelA = document.getElementById('libActivitiesPanel');
      const panelR = document.getElementById('libRewardsPanel');
      const panelS = document.getElementById('libSchedulesPanel');

      const activeClass = 'px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-colors bg-gold text-navy';
      const inactiveClass = 'px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-colors bg-lavender text-text-soft hover:bg-sky';

      btnA.className = tab === 'activities' ? activeClass : inactiveClass;
      btnR.className = tab === 'rewards' ? activeClass : inactiveClass;
      btnS.className = tab === 'schedules' ? activeClass : inactiveClass;

      panelA.classList.toggle('hidden', tab !== 'activities');
      panelR.classList.toggle('hidden', tab !== 'rewards');
      panelS.classList.toggle('hidden', tab !== 'schedules');

      if (tab === 'activities') loadDefaultTemplates();
      else if (tab === 'rewards') loadDefaultRewards();
      else if (tab === 'schedules') loadDefaultSchedules();
    }

    // ─── F3: Change Email Modal ──────────────────────────────

    window._changeEmailParentId = null;

    function openChangeEmailModal(parentId, email) {
      window._changeEmailParentId = parentId;
      document.getElementById('changeEmailTargetEmail').textContent = email;
      document.getElementById('changeEmailInput').value = '';
      document.getElementById('changeEmailReason').value = '';
      document.getElementById('changeEmailError').classList.add('hidden');
      document.getElementById('changeEmailModal').classList.remove('hidden');
    }

    function closeChangeEmailModal() {
      document.getElementById('changeEmailModal').classList.add('hidden');
      window._changeEmailParentId = null;
    }

    async function confirmChangeEmail() {
      const parentId = window._changeEmailParentId;
      if (!parentId) return;

      const newEmail = document.getElementById('changeEmailInput').value.trim();
      const reason = document.getElementById('changeEmailReason').value.trim();
      const errEl = document.getElementById('changeEmailError');

      if (!newEmail || !/^[^\n\t@]+@[^\n\t@]+/.test(newEmail)) {
        errEl.textContent = 'Ange en giltig e-postadress';
        errEl.classList.remove('hidden');
        return;
      }
      if (!reason || reason.length < 10) {
        errEl.textContent = 'Ange en orsak (minst 10 tecken)';
        errEl.classList.remove('hidden');
        return;
      }

      try {
        await Auth.api(`/api/admin/parents/${parentId}/email`, {
          method: 'PUT',
          body: JSON.stringify({ newEmail, reason }),
        });
        closeChangeEmailModal();
        loadFamilies();
      } catch (err) {
        errEl.textContent = err.message || 'Kunde inte ändra e-postadress';
        errEl.classList.remove('hidden');
      }
    }

    // ─── F4: Unlink Apple Modal ──────────────────────────────

    window._unlinkAppleParentId = null;

    function openUnlinkAppleModal(parentId, email) {
      window._unlinkAppleParentId = parentId;
      document.getElementById('unlinkAppleTargetEmail').textContent = email;
      document.getElementById('unlinkAppleReason').value = '';
      document.getElementById('unlinkAppleError').classList.add('hidden');
      document.getElementById('unlinkAppleModal').classList.remove('hidden');
    }

    function closeUnlinkAppleModal() {
      document.getElementById('unlinkAppleModal').classList.add('hidden');
      window._unlinkAppleParentId = null;
    }

    async function confirmUnlinkApple() {
      const parentId = window._unlinkAppleParentId;
      if (!parentId) return;

      const reason = document.getElementById('unlinkAppleReason').value.trim();
      const errEl = document.getElementById('unlinkAppleError');

      if (!reason) {
        errEl.textContent = 'Ange en orsak';
        errEl.classList.remove('hidden');
        return;
      }

      try {
        await Auth.api(`/api/admin/parents/${parentId}/apple-link`, {
          method: 'DELETE',
          body: JSON.stringify({ reason }),
        });
        closeUnlinkAppleModal();
        loadFamilies();
      } catch (err) {
        errEl.textContent = err.message || 'Kunde inte koppla bort Apple';
        errEl.classList.remove('hidden');
      }
    }

    // ─── F5: Audit Log Panel ────────────────────────────────

    let _auditVisibleFamilyId = null;

    async function toggleAuditLog(familyId) {
      const panel = document.getElementById('auditLogPanel');
      const entries = document.getElementById('auditLogEntries');

      if (_auditVisibleFamilyId === familyId && !panel.classList.contains('hidden')) {
        closeAuditLog();
        return;
      }

      _auditVisibleFamilyId = familyId;
      panel.classList.remove('hidden');
      entries.innerHTML = '<div class="text-text-soft text-sm py-2">Laddar...</div>';

      try {
        const logs = await Auth.api(`/api/admin/families/${familyId}/audit-log`);
        if (!logs || logs.length === 0) {
          entries.innerHTML = '<div class="text-text-soft text-sm py-2">Inga admin-åtgärder än.</div>';
          return;
        }
        entries.innerHTML = logs.map(log => {
          const actionLabels = {
            admin_reset_password: 'Återställde lösenord',
            admin_change_email: 'Ändrade e-post',
            admin_unlink_apple: 'Kopplade bort Apple',
            impersonate_start: 'Startade support-läge',
          };
          const date = new Date(log.created_at).toLocaleString('sv-SE', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          const meta = log.metadata ? JSON.parse(log.metadata) : {};
          let metaNote = '';
          if (log.action === 'admin_change_email') {
            metaNote = ` → ${meta.old_email} → ${meta.target_email}`;
          } else if (log.action === 'admin_unlink_apple') {
            metaNote = ` (${meta.reason || ''})`;
          }
          return `<div class="flex items-start gap-3 py-2 border-b border-lavender/30 text-sm">
            <span class="text-text-soft text-xs shrink-0 mt-0.5">${date}</span>
            <span class="font-semibold text-navy">${actionLabels[log.action] || log.action}</span>
            <span class="text-text-soft text-xs">${esc(log.admin_email || 'admin')}${metaNote}</span>
          </div>`;
        }).join('');
      } catch (err) {
        entries.innerHTML = `<div class="text-red-600 text-sm py-2">Kunde inte ladda audit-log: ${esc(err.message || '')}</div>`;
      }
    }

    function closeAuditLog() {
      document.getElementById('auditLogPanel').classList.add('hidden');
      _auditVisibleFamilyId = null;
    }

