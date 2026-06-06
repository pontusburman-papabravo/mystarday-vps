// Admin Dagens Nyhet: news publishing, drafts, history, Facebook integration.
// Owns: compose form (publish/draft/edit), history list, unpublish, newsletter modal, FB setup.
// Does NOT own: escapeHtml (declared in parent page), getCsrfToken (declared here).
    // ─── Dagens nyhet ─────────────────────────────────────────

    // Edit-mode state: when non-null, the form is editing an existing draft
    let editingNyhetId = null;

    const nyhetBodyEl = document.getElementById('nyhetBody');
    if (nyhetBodyEl) {
      nyhetBodyEl.addEventListener('input', () => {
        document.getElementById('nyhetBodyCount').textContent = nyhetBodyEl.value.length;
      });
    }

    // Check Facebook integration status on load
    (async function checkFbStatus() {
      try {
        const res = await fetch('/api/dagens-nyhet/facebook-status', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const statusEl = document.getElementById('nyhetFbStatus');
        if (!statusEl) return;
        if (data.configured) {
          const fbInfo = `(Konfigurerad — Sid-ID: ${data.pageId}`;
          const graphInfo = data.graphApiVersion ? ` · Graph ${data.graphApiVersion}` : '';
          statusEl.textContent = `${fbInfo}${graphInfo})`;
          statusEl.className = 'ml-1 text-xs font-normal text-green-600';
        } else {
          statusEl.textContent = '(Ej konfigurerad — se Facebook-inställningar nedan)';
          statusEl.className = 'ml-1 text-xs font-normal text-orange-500';
          document.getElementById('nyhetPostToFacebook').disabled = true;
        }
      } catch {
        // Non-critical
      }
    })();

    let nyhetHistoryLoaded = false;

    async function loadNyheter() {
      if (nyhetHistoryLoaded) return;
      try {
        const [nyheterRes, countRes] = await Promise.all([
          fetch('/api/dagens-nyhet', { credentials: 'include' }),
          fetch('/api/dagens-nyhet/recipients-count', { credentials: 'include' }),
        ]);
        if (!nyheterRes.ok) throw new Error(`HTTP ${nyheterRes.status}`);
        const nyheter = await nyheterRes.json();
        const totalSubscribers = countRes.ok ? (await countRes.json()).total : null;
        renderNyhetHistory(nyheter, totalSubscribers);
        nyhetHistoryLoaded = true;
      } catch (err) {
        document.getElementById('nyhetHistoryContainer').innerHTML =
          '<p class="text-red-500 text-sm">Kunde inte ladda historik</p>';
      }
    }

    // Status badge config
    const NYHET_STATUS = {
      published:   { icon: '✅', label: 'Publicerad',   cls: 'bg-green-100 text-green-700' },
      scheduled:   { icon: '⏰', label: 'Schemalagd',   cls: 'bg-blue-100 text-blue-700' },
      unpublished: { icon: '❌', label: 'Avpublicerad', cls: 'bg-gray-100 text-gray-500' },
      draft:       { icon: '📝', label: 'Utkast',       cls: 'bg-yellow-100 text-yellow-700' },
    };

    function nyhetStatusBadge(status) {
      const s = NYHET_STATUS[status] || { icon: '?', label: status, cls: 'bg-gray-100 text-gray-500' };
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}">${s.icon} ${s.label}</span>`;
    }

    function renderNyhetHistory(nyheter, totalSubscribers = null) {
      const container = document.getElementById('nyhetHistoryContainer');
      if (!nyheter.length) {
        container.innerHTML = '<p class="text-text-soft text-sm">Inga nyheter publicerade ännu.</p>';
        return;
      }
      container.innerHTML = nyheter.map(n => {
        const status = n.status || (new Date(n.expires_at) > new Date() ? 'published' : 'unpublished');
        const isPublished = status === 'published';
        const isScheduled = status === 'scheduled';
        const isDraft = status === 'draft';
        const dateLabel = isScheduled && n.publish_at
          ? new Date(n.publish_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })
          : new Date(n.created_at || n.published_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });

        const flags = [];
        if (n.show_landing) flags.push('<span class="px-2 py-0.5 bg-sky text-navy text-xs rounded-full font-semibold">🌐 Landning</span>');
        if (n.send_push) flags.push('<span class="px-2 py-0.5 bg-gold-light text-navy text-xs rounded-full font-semibold">📲 Push' + (n.push_sent_at ? ' ✓' : '') + '</span>');
        // Email newsletter indicator (X av Y prenumeranter)
        if (n.email_sent_at) {
          const emailCount = n.email_sent_count || 0;
          if (n.email_failed && emailCount === 0) {
            flags.push('<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">📧 E-post misslyckades</span>');
          } else if (totalSubscribers !== null && emailCount > 0) {
            flags.push(`<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">📧 Skickat till ${emailCount} av ${totalSubscribers} prenumeranter</span>`);
          } else {
            flags.push(`<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">📧 Skickat till ${emailCount} prenumerant${emailCount !== 1 ? 'er' : ''}</span>`);
          }
        }
        if (n.post_to_facebook) {
          if (n.facebook_post_id) {
            flags.push(`<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">📘 Facebook ✓</span>`);
          } else {
            flags.push('<span class="px-2 py-0.5 bg-blue-50 text-blue-400 text-xs rounded-full font-semibold">📘 Facebook (ej postad)</span>');
          }
        }
        if (n.unpublish_at) {
          const uAt = new Date(n.unpublish_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
          flags.push(`<span class="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-semibold">🔕 ${uAt}</span>`);
        }

        const unpublishBtn = (isPublished || isScheduled)
          ? `<button onclick="confirmUnpublish('${escapeHtml(n.id)}', '${escapeHtml(n.title)}')"
               class="text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors border border-red-200">
               Avpublicera
             </button>`
          : '';

        const emailBtn = isPublished
          ? `<button type="button" onclick="showEmailRecipientModal('${escapeHtml(n.id)}', '${escapeHtml(n.title || '')}')"
               class="text-xs px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition-colors border border-emerald-200">
               📧 ${n.email_sent_at ? 'Skicka e-post igen' : 'Skicka e-post'}
             </button>`
          : '';

        // Draft actions: edit + quick-publish
        const draftBtns = isDraft
          ? `<button onclick="startEditNyhet('${escapeHtml(n.id)}')"
               class="text-xs px-2 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-semibold transition-colors border border-yellow-300">
               ✏️ Redigera
             </button>
             <button onclick="quickPublishDraft('${escapeHtml(n.id)}', '${escapeHtml(n.title)}')"
               class="text-xs px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold transition-colors border border-green-300">
               🚀 Publicera nu
             </button>`
          : '';

        const borderCls = isPublished ? 'border-gold' : isScheduled ? 'border-blue-300' : isDraft ? 'border-yellow-300' : 'border-lavender';

        return `
          <div class="bg-white rounded-xl border-2 ${borderCls} p-4">
            <div class="flex items-start justify-between gap-3 mb-1">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  ${nyhetStatusBadge(status)}
                  ${unpublishBtn}
                  ${emailBtn}
                  ${draftBtns}
                </div>
                <p class="font-semibold text-navy text-sm">${escapeHtml(n.title || '(ingen titel)')}</p>
                <p class="text-text-soft text-xs mt-0.5">${escapeHtml(n.body || '(ingen text)')}</p>
              </div>
              <div class="text-right flex-shrink-0 text-xs text-text-soft">
                ${isDraft ? '📝 Skapad ' : isScheduled ? '⏰ ' : ''}${dateLabel}
              </div>
            </div>
            ${flags.length ? `<div class="flex flex-wrap gap-2 mt-2">${flags.join('')}</div>` : ''}
          </div>`;
      }).join('');
    }

    // ─── Draft: save as draft ────────────────────────────────
    window.saveNyhetAsDraft = async function() {
      const msg = document.getElementById('nyhetMsg');
      const draftBtn = document.getElementById('nyhetDraftBtn');

      const title = document.getElementById('nyhetTitle').value.trim();
      const body = document.getElementById('nyhetBody').value.trim();
      const show_landing = document.getElementById('nyhetShowLanding').checked;
      const send_push = document.getElementById('nyhetSendPush').checked;
      const post_to_facebook = document.getElementById('nyhetPostToFacebook').checked;
      const publishAtRaw = document.getElementById('nyhetPublishAt').value;
      const unpublishAtRaw = document.getElementById('nyhetUnpublishAt').value;
      const publish_at = publishAtRaw || null;
      const unpublish_at = unpublishAtRaw || null;

      draftBtn.disabled = true;
      draftBtn.textContent = '⏳ Sparar...';
      msg.textContent = '';
      msg.className = 'text-sm text-text-soft';

      try {
        // If editing an existing draft, use PATCH; otherwise create new
        const isEdit = !!editingNyhetId;
        const url = isEdit ? `/api/dagens-nyhet/${editingNyhetId}` : '/api/dagens-nyhet';
        const method = isEdit ? 'PATCH' : 'POST';
        const payload = isEdit
          ? { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at }
          : { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at, save_as_draft: true };

        const res = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          msg.textContent = data.error || 'Kunde inte spara utkast';
          msg.className = 'text-sm text-red-500';
        } else {
          msg.textContent = '📝 ' + (data.message || 'Utkast sparat');
          msg.className = 'text-sm text-green-600';
          exitEditMode();
          nyhetHistoryLoaded = false;
          loadNyheter();
        }
      } catch (err) {
        msg.textContent = 'Nätverksfel. Försök igen.';
        msg.className = 'text-sm text-red-500';
      } finally {
        draftBtn.disabled = false;
        draftBtn.textContent = '📝 Spara som utkast';
      }
    };

    // ─── Draft: edit existing draft ─────────────────────────
    window.startEditNyhet = async function(id) {
      try {
        // Fetch all nyheter and find the one to edit (reuses list endpoint)
        const res = await fetch('/api/dagens-nyhet', { credentials: 'include' });
        if (!res.ok) throw new Error('Kunde inte hämta nyhet');
        const nyheter = await res.json();
        const nyhet = nyheter.find(n => n.id === id);
        if (!nyhet) { alert('Nyhet hittades inte'); return; }

        // Populate form
        document.getElementById('nyhetTitle').value = nyhet.title || '';
        document.getElementById('nyhetBody').value = nyhet.body || '';
        document.getElementById('nyhetBodyCount').textContent = (nyhet.body || '').length;
        document.getElementById('nyhetShowLanding').checked = !!nyhet.show_landing;
        document.getElementById('nyhetSendPush').checked = !!nyhet.send_push;
        document.getElementById('nyhetPostToFacebook').checked = !!nyhet.post_to_facebook;

        // Restore datetime fields (convert ISO to local datetime-local format)
        if (nyhet.publish_at) {
          const dt = new Date(nyhet.publish_at);
          document.getElementById('nyhetPublishAt').value = toLocalDatetimeString(dt);
        } else {
          document.getElementById('nyhetPublishAt').value = '';
        }
        if (nyhet.unpublish_at) {
          const dt = new Date(nyhet.unpublish_at);
          document.getElementById('nyhetUnpublishAt').value = toLocalDatetimeString(dt);
        } else {
          document.getElementById('nyhetUnpublishAt').value = '';
        }

        // Enter edit mode
        editingNyhetId = id;
        document.getElementById('nyhetSubmitLabel').textContent = '🚀 Publicera utkast';
        document.getElementById('nyhetDraftBtn').textContent = '📝 Spara ändringar';
        document.getElementById('nyhetCancelEditBtn').classList.remove('hidden');

        // Scroll to form
        document.getElementById('nyhetForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        alert('Kunde inte ladda utkastet. Försök igen.');
      }
    };

    // Quick-publish a draft directly from the history list
    window.quickPublishDraft = async function(id, title) {
      if (!confirm(`Vill du publicera utkastet?\n\n"${title}"`)) return;
      try {
        const res = await fetch(`/api/dagens-nyhet/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ status: 'published' }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Kunde inte publicera');
          return;
        }
        const msg = document.getElementById('nyhetMsg');
        msg.textContent = '✅ ' + (data.message || 'Publicerad!');
        msg.className = 'text-sm text-green-600';
        nyhetHistoryLoaded = false;
        loadNyheter();
        if (confirm('Vill du skicka nyheten som e-post till prenumeranter?')) {
          showEmailRecipientModal(id, title);
        }
      } catch (err) {
        alert('Nätverksfel. Försök igen.');
      }
    };

    window.cancelNyhetEdit = function() {
      exitEditMode();
    };

    function exitEditMode() {
      editingNyhetId = null;
      const form = document.getElementById('nyhetForm');
      if (form) form.reset();
      document.getElementById('nyhetBodyCount').textContent = '0';
      document.getElementById('nyhetSubmitLabel').textContent = '🚀 Publicera';
      document.getElementById('nyhetDraftBtn').textContent = '📝 Spara som utkast';
      document.getElementById('nyhetCancelEditBtn').classList.add('hidden');
    }

    // Convert Date to datetime-local input value (YYYY-MM-DDTHH:MM)
    function toLocalDatetimeString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d}T${h}:${min}`;
    }

    // Unpublish confirmation
    function confirmUnpublish(id, title) {
      if (!confirm(`Vill du avpublicera nyheten?\n\n"${title}"\n\nNyheten försvinner omedelbart för alla föräldrar.`)) return;
      doUnpublish(id);
    }

    async function doUnpublish(id) {
      try {
        const res = await fetch(`/api/dagens-nyhet/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Kunde inte avpublicera nyheten');
          return;
        }
        // Force refresh history
        nyhetHistoryLoaded = false;
        loadNyheter();
      } catch (err) {
        alert('Nätverksfel. Försök igen.');
      }
    }

    const nyhetForm = document.getElementById('nyhetForm');
    if (nyhetForm) {
      nyhetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('nyhetSubmitBtn');
        const label = document.getElementById('nyhetSubmitLabel');
        const msg = document.getElementById('nyhetMsg');

        const title = document.getElementById('nyhetTitle').value.trim();
        const body = document.getElementById('nyhetBody').value.trim();
        const show_landing = document.getElementById('nyhetShowLanding').checked;
        const send_push = document.getElementById('nyhetSendPush').checked;
        const post_to_facebook = document.getElementById('nyhetPostToFacebook').checked;
        const publishAtRaw = document.getElementById('nyhetPublishAt').value;
        const unpublishAtRaw = document.getElementById('nyhetUnpublishAt').value;

        // publish_at and unpublish_at are local datetime strings — send as-is.
        // Backend uses new Date(string) which parses in server local time (Europe/Stockholm),
        // matching the user's intended local time.
        const publish_at = publishAtRaw || null;
        const unpublish_at = unpublishAtRaw || null;

        if (!show_landing && !send_push && !post_to_facebook) {
          msg.textContent = 'Välj minst ett distributionsalternativ.';
          msg.className = 'text-sm text-red-500';
          return;
        }

        btn.disabled = true;
        label.textContent = '⏳ Publicerar...';
        msg.textContent = '';
        msg.className = 'text-sm text-text-soft';

        try {
          // If editing a draft → PATCH with status promotion; otherwise POST
          const isEdit = !!editingNyhetId;
          const publishAt = publish_at ? new Date(publish_at) : null;
          const isScheduled = publishAt && publishAt > new Date();
          const newStatus = isScheduled ? 'scheduled' : 'published';

          const url = isEdit ? `/api/dagens-nyhet/${editingNyhetId}` : '/api/dagens-nyhet';
          const method = isEdit ? 'PATCH' : 'POST';
          const payload = isEdit
            ? { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at, status: newStatus }
            : { title, body, show_landing, send_push, post_to_facebook, publish_at, unpublish_at };

          const res = await fetch(url, {
            method,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) {
            msg.textContent = data.error || 'Fel vid publicering';
            msg.className = 'text-sm text-red-500';
          } else {
            msg.textContent = '✅ ' + (data.message || 'Publicerad!');
            msg.className = 'text-sm text-green-600';
            const savedEditId = editingNyhetId;
            const offerEmail = document.getElementById('nyhetSendEmail')?.checked;
            exitEditMode();
            nyhetHistoryLoaded = false;
            loadNyheter();
            const nyhetId = data.nyhet?.id || data.id || savedEditId;
            if (offerEmail && newStatus === 'published' && nyhetId) {
              setTimeout(function () {
                showEmailRecipientModal(nyhetId, title);
              }, 400);
            }
          }
        } catch (err) {
          msg.textContent = 'Nätverksfel. Försök igen.';
          msg.className = 'text-sm text-red-500';
        } finally {
          btn.disabled = false;
          label.textContent = editingNyhetId ? '🚀 Publicera utkast' : '🚀 Publicera';
        }
      });
    }

    function getCsrfToken() {
      // Auth.js sets the CSRF token cookie; double-submit pattern
      const match = document.cookie.match(/(?:^|;)\s*csrf_token=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    }

    // ─── Facebook token setup ──────────────────────────────
    async function doFbSetup() {
      const tokenInput = document.getElementById('fbUserToken');
      const resultEl = document.getElementById('fbSetupResult');
      const btn = document.getElementById('fbSetupBtn');
      const userToken = tokenInput.value.trim();

      if (!userToken) {
        resultEl.textContent = '⚠️ Klistra in ett User Access Token först.';
        resultEl.className = 'bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700';
        resultEl.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ Hämtar...';
      resultEl.classList.add('hidden');

      try {
        const res = await fetch('/api/dagens-nyhet/facebook-setup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ user_token: userToken }),
        });
        const data = await res.json();

        if (!res.ok) {
          resultEl.textContent = '❌ ' + (data.error || 'Okänt fel');
          resultEl.className = 'bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-mono whitespace-pre-wrap break-all';
        } else {
          const instructions = data.instructions ? data.instructions.join('\n') : '';
          resultEl.textContent = `✅ Token hämtad!\n\nSid: ${data.pageName} (${data.pageId})\n\n${instructions}\n\nSätt dessa i Render Environment Variables och redeploya.`;
          resultEl.className = 'bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 font-mono whitespace-pre-wrap break-all';
        }
        resultEl.classList.remove('hidden');
      } catch (err) {
        resultEl.textContent = '❌ Nätverksfel: ' + err.message;
        resultEl.className = 'bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-mono';
        resultEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Hämta Page Access Token';
      }
    }

    // ─── Newsletter email recipient modal ───────────────────
    // Shows after publish if "Skicka nyhetsbrev" was checked.
    // Step 2 of 2: admin selects recipients, then confirms send.

    window.showEmailRecipientModal = showEmailRecipientModal;

    function showEmailRecipientModal(nyhetId, nyhetTitle) {
      fetch('/api/newsletter/recipients', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(recipients => {
          if (!recipients.length) {
            alert('Inga aktiva prenumeranter hittades. Nyheten är publicerad men inget mail skickades.');
            return;
          }
          renderEmailModal(nyhetId, nyhetTitle, recipients);
        })
        .catch(() => {
          alert('Kunde inte ladda prenumerantlista.');
        });
    }

    function renderEmailModal(nyhetId, nyhetTitle, recipients) {
      // Remove any existing modal
      const existing = document.getElementById('emailRecipientModal');
      if (existing) existing.remove();

      // Build modal HTML
      const total = recipients.length;
      const modal = document.createElement('div');
      modal.id = 'emailRecipientModal';
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="closeEmailModalOnBackdrop(event)">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden" onclick="event.stopPropagation()">
            <div class="bg-gradient-to-r from-gold to-yellow-500 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 class="font-heading font-bold text-navy text-lg leading-tight">📧 Välj mottagare</h3>
                <p class="text-navy/70 text-xs mt-0.5">Nyhet: ${escapeHtml(nyhetTitle)}</p>
              </div>
              <button onclick="closeEmailModal()" class="text-navy/60 hover:text-navy text-2xl leading-none font-bold">&times;</button>
            </div>
            <div class="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
              <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-navy">
                <input type="checkbox" id="emailSelectAll" checked
                  class="w-4 h-4 rounded accent-gold"
                  onchange="toggleAllRecipients(this.checked)">
                Välj alla
              </label>
              <span id="emailRecipientCount" class="text-xs text-text-soft">0 av ${total} valda</span>
            </div>
            <div id="emailRecipientsList" class="flex-1 overflow-y-auto px-4 py-3 space-y-1 max-h-72">
              ${recipients.map(r => `
                <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer email-recipient-row">
                  <input type="checkbox" class="email-recipient-check w-4 h-4 rounded accent-gold"
                    value="${r.parent_id}" checked
                    onchange="updateEmailRecipientCount()">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-semibold text-navy block truncate">${escapeHtml(r.name)}</span>
                    <span class="text-xs text-text-soft truncate block">${escapeHtml(r.email || '')}</span>
                  </div>
                </label>
              `).join('')}
            </div>
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
              <span id="emailSendSummary" class="text-xs text-text-soft"></span>
              <div class="flex items-center gap-3">
                <button onclick="closeEmailModal()" class="px-4 py-2 rounded-xl border-2 border-gray-200 text-text-soft hover:bg-gray-100 font-semibold text-sm transition-colors">
                  Avbryt
                </button>
                <button id="emailSendBtn" onclick="sendEmailNewsletter('${escapeHtml(nyhetId)}')"
                  class="px-5 py-2 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                  Skicka nyhetsbrev till <span id="emailSendCount">${total}</span> mottagare
                </button>
              </div>
            </div>
          </div>
        </div>`;

      document.body.appendChild(modal);
      updateEmailRecipientCount();
    }

    window.closeEmailModal = function() {
      const modal = document.getElementById('emailRecipientModal');
      if (modal) modal.remove();
    };

    window.closeEmailModalOnBackdrop = function(event) {
      if (event.target.id === 'emailRecipientModal') closeEmailModal();
    };

    window.toggleAllRecipients = function(checked) {
      document.querySelectorAll('.email-recipient-check').forEach(cb => { cb.checked = checked; });
      updateEmailRecipientCount();
    };

    window.updateEmailRecipientCount = function() {
      const checks = document.querySelectorAll('.email-recipient-check:checked');
      const total = document.querySelectorAll('.email-recipient-check').length;
      const countEl = document.getElementById('emailRecipientCount');
      const summaryEl = document.getElementById('emailSendSummary');
      const sendCountEl = document.getElementById('emailSendCount');
      const sendBtn = document.getElementById('emailSendBtn');
      if (countEl) countEl.textContent = `${checks.length} av ${total} valda`;
      if (sendCountEl) sendCountEl.textContent = checks.length;
      if (sendBtn) {
        sendBtn.disabled = checks.length === 0;
        sendBtn.classList.toggle('opacity-50', checks.length === 0);
        sendBtn.classList.toggle('cursor-not-allowed', checks.length === 0);
      }
      if (summaryEl) {
        if (checks.length === 0) {
          summaryEl.textContent = '⚠️ Välj minst en mottagare för att kunna skicka';
        } else if (checks.length === total) {
          summaryEl.textContent = `Alla ${total} prenumeranter valda`;
        } else {
          summaryEl.textContent = `${total - checks.length} prenumeranter avmarkerade`;
        }
      }
    };

    window.sendEmailNewsletter = function(nyhetId) {
      const checks = Array.from(document.querySelectorAll('.email-recipient-check:checked'));
      if (checks.length === 0) {
        alert('Välj minst en mottagare.');
        return;
      }
      const recipientIds = checks.map(cb => cb.value);
      const btn = document.getElementById('emailSendBtn');
      const sendCountEl = document.getElementById('emailSendCount');

      btn.disabled = true;
      btn.innerHTML = '⏳ Skickar...';

      fetch(`/api/dagens-nyhet/${nyhetId}/send-newsletter`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ recipientIds }),
      })
        .then(r => r.json())
        .then(data => {
          closeEmailModal();
          if (data.sent > 0) {
            alert(`✅ Nyhetsbrev skickat till ${data.sent} mottagare!`);
          } else {
            alert('Inga e-postmeddelanden skickades (inga aktiva prenumeranter).');
          }
          // Refresh history to show updated email badge
          nyhetHistoryLoaded = false;
          loadNyheter();
        })
        .catch(err => {
          btn.disabled = false;
          btn.innerHTML = `Skicka nyhetsbrev till <span id="emailSendCount">${checks.length}</span> mottagare`;
          alert('Nätverksfel vid e-postutskick. Försök igen.');
        });
    };
