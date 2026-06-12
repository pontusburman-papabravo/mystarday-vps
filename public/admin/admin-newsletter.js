// Admin Newsletter: compose standalone newsletters, view history, manage subscribers.
// Loads data from /api/newsletter/* endpoints.
// Does NOT own: dagens_nyhet logic (admin-dagensnyhet.js).

    let newsletterData = [];
    let newsletterFilter = 'active';
    let newsletterSort = 'subscribed_at';
    let newsletterSortDir = 'desc';

    // ─── Section init ──────────────────────────────────────────
    async function loadNewsletterSubscribers() {
      // Load count stats
      try {
        const counts = await Auth.api('/api/newsletter/subscribers/count');
        document.getElementById('newsletterActiveCount').textContent   = counts.active   ?? 0;
        document.getElementById('newsletterInactiveCount').textContent = counts.inactive ?? 0;
        document.getElementById('newsletterTotalCount').textContent    = counts.total    ?? 0;
      } catch (_) {}

      await reloadNewsletterTable();
      await loadNewsletterHistory();
    }

    // ─── Newsletter history ────────────────────────────────────
    async function loadNewsletterHistory() {
      const container = document.getElementById('newsletterHistoryContainer');
      if (!container) return;
      try {
        const newsletters = await Auth.api('/api/newsletter/newsletters');
        renderNewsletterHistory(newsletters, container);
      } catch (err) {
        container.innerHTML = `<p class="text-red-500 text-sm">Kunde inte ladda historik: ${esc(err.message)}</p>`;
      }
    }

    function renderNewsletterHistory(newsletters, container) {
      if (!newsletters || newsletters.length === 0) {
        container.innerHTML = '<p class="text-text-soft text-sm">Inga nyhetsbrev har skickats ännu.</p>';
        return;
      }
      container.innerHTML = newsletters.map(nl => {
        const sentDate = nl.sent_at
          ? new Date(nl.sent_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })
          : null;
        const createdDate = new Date(nl.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });

        let statusBadge = '';
        if (nl.status === 'sent') {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Skickat</span>`;
        } else if (nl.status === 'failed') {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">❌ Misslyckades</span>`;
        } else {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">📝 Utkast</span>`;
        }

        const sentInfo = nl.sent_at
          ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">📧 ${nl.sent_count || 0} mottagare · ${sentDate}</span>
             <span id="nl-stats-${nl.id}" class="text-xs text-sky-700 font-semibold hidden"></span>`
          : '';

        // Truncate body preview to 120 chars
        const preview = (nl.body || '').replace(/\*\*/g, '').substring(0, 120) + ((nl.body || '').length > 120 ? '...' : '');

        return `
          <div class="bg-white rounded-xl border-2 ${nl.status === 'sent' ? 'border-green-200' : nl.status === 'failed' ? 'border-red-200' : 'border-lavender'} p-4">
            <div class="flex items-start justify-between gap-3 mb-1">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  ${statusBadge}
                  ${sentInfo}
                </div>
                <p class="font-semibold text-navy text-sm">${esc(nl.subject)}</p>
                <p class="text-text-soft text-xs mt-0.5 leading-relaxed">${esc(preview)}</p>
              </div>
              <div class="text-right flex-shrink-0 text-xs text-text-soft whitespace-nowrap">
                ${createdDate}
              </div>
            </div>
          </div>`;
      }).join('');

      newsletters.filter(nl => nl.sent_at).forEach(nl => {
        const el = document.getElementById('nl-stats-' + nl.id);
        if (el && window.AdminEmailStats) {
          AdminEmailStats.loadBadge(
            el,
            `/api/newsletter/newsletters/${nl.id}/stats`,
            `/api/newsletter/newsletters/${nl.id}/recipients-tracking`,
            nl.subject || 'Nyhetsbrev'
          );
        }
      });
    }

    // ─── Compose form ──────────────────────────────────────────
    // Wire up body character counter
    const newsletterBodyEl = document.getElementById('newsletterBody');
    if (newsletterBodyEl) {
      newsletterBodyEl.addEventListener('input', () => {
        const counter = document.getElementById('newsletterBodyCount');
        if (counter) counter.textContent = newsletterBodyEl.value.length;
      });
    }

    const newsletterComposeForm = document.getElementById('newsletterComposeForm');
    if (newsletterComposeForm) {
      newsletterComposeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('newsletterComposeBtn');
        const label = document.getElementById('newsletterComposeLabel');
        const msg = document.getElementById('newsletterComposeMsg');

        const subject = document.getElementById('newsletterSubject').value.trim();
        const body = document.getElementById('newsletterBody').value.trim();

        if (!subject) {
          msg.textContent = 'Ämnesrad krävs.';
          msg.className = 'text-sm text-red-500';
          return;
        }
        if (body.length < 10) {
          msg.textContent = 'Brödtexten är för kort (minst 10 tecken).';
          msg.className = 'text-sm text-red-500';
          return;
        }

        btn.disabled = true;
        label.textContent = '⏳ Sparar...';
        msg.textContent = '';
        msg.className = 'text-sm text-text-soft';

        try {
          const data = await Auth.api('/api/newsletter/newsletters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
            body: JSON.stringify({ subject, body }),
          });

          if (data.newsletter && data.newsletter.id) {
            // Reset form
            newsletterComposeForm.reset();
            document.getElementById('newsletterBodyCount').textContent = '0';
            msg.textContent = '';
            // Open recipient modal to send
            showNewsletterRecipientModal(data.newsletter.id, data.newsletter.subject);
            // Refresh history after modal closes (will reload on send)
          } else {
            msg.textContent = data.error || 'Fel vid skapande';
            msg.className = 'text-sm text-red-500';
          }
        } catch (err) {
          msg.textContent = err.message || 'Nätverksfel. Försök igen.';
          msg.className = 'text-sm text-red-500';
        } finally {
          btn.disabled = false;
          label.textContent = '📋 Spara utkast & välj mottagare';
        }
      });
    }

    // ─── Recipient modal (standalone newsletter) ───────────────
    function showNewsletterRecipientModal(newsletterId, subject) {
      Auth.api('/api/newsletter/recipients')
        .then(recipients => {
          if (!recipients || !recipients.length) {
            // Check if it's an array (empty) vs error response
            if (Array.isArray(recipients) && recipients.length === 0) {
              alert('Inga aktiva prenumeranter hittades. Kontrollera att föräldrar har aktiverat nyhetsbrevsprenumeration i sina kontoinställningar.');
            } else {
              alert('Kunde inte ladda prenumerantlista. Nyhetsbrevet sparades som utkast.');
            }
            loadNewsletterHistory();
            return;
          }
          renderNewsletterModal(newsletterId, subject, recipients);
        })
        .catch(() => {
          alert('Kunde inte ladda prenumerantlista. Nyhetsbrevet sparades som utkast.');
          loadNewsletterHistory();
        });
    }

    function renderNewsletterModal(newsletterId, subject, recipients) {
      // Remove any existing modal
      const existing = document.getElementById('newsletterSendModal');
      if (existing) existing.remove();

      const total = recipients.length;
      const modal = document.createElement('div');
      modal.id = 'newsletterSendModal';
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="closeNewsletterModalOnBackdrop(event)">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden" onclick="event.stopPropagation()">
            <div class="bg-gradient-to-r from-gold to-yellow-500 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 class="font-heading font-bold text-navy text-lg leading-tight">📧 Välj mottagare</h3>
                <p class="text-navy/70 text-xs mt-0.5 truncate max-w-xs">${esc(subject)}</p>
              </div>
              <button onclick="closeNewsletterModal()" class="text-navy/60 hover:text-navy text-2xl leading-none font-bold">&times;</button>
            </div>
            <div class="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
              <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-navy">
                <input type="checkbox" id="nlSelectAll" checked
                  class="w-4 h-4 rounded accent-gold"
                  onchange="toggleAllNlRecipients(this.checked)">
                Välj alla
              </label>
              <span id="nlRecipientCount" class="text-xs text-text-soft">0 av ${total} valda</span>
            </div>
            <div id="nlRecipientsList" class="flex-1 overflow-y-auto px-4 py-3 space-y-1 max-h-72">
              ${recipients.map(r => `
                <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer nl-recipient-row">
                  <input type="checkbox" class="nl-recipient-check w-4 h-4 rounded accent-gold"
                    value="${r.parent_id}" checked
                    onchange="updateNlRecipientCount()">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-semibold text-navy block truncate">${esc(r.name)}</span>
                    <span class="text-xs text-text-soft truncate block">${esc(r.email || '')}</span>
                  </div>
                </label>
              `).join('')}
            </div>
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
              <span id="nlSendSummary" class="text-xs text-text-soft"></span>
              <div class="flex items-center gap-3">
                <button onclick="closeNewsletterModal()" class="px-4 py-2 rounded-xl border-2 border-gray-200 text-text-soft hover:bg-gray-100 font-semibold text-sm transition-colors">
                  Avbryt
                </button>
                <button id="nlSendBtn" onclick="sendStandaloneNewsletter('${esc(newsletterId)}')"
                  class="px-5 py-2 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                  Skicka till <span id="nlSendCount">${total}</span> mottagare
                </button>
              </div>
            </div>
          </div>
        </div>`;

      document.body.appendChild(modal);
      updateNlRecipientCount();
    }

    window.closeNewsletterModal = function() {
      const modal = document.getElementById('newsletterSendModal');
      if (modal) modal.remove();
    };

    window.closeNewsletterModalOnBackdrop = function(event) {
      if (event.target === event.currentTarget) closeNewsletterModal();
    };

    window.toggleAllNlRecipients = function(checked) {
      document.querySelectorAll('.nl-recipient-check').forEach(cb => { cb.checked = checked; });
      updateNlRecipientCount();
    };

    window.updateNlRecipientCount = function() {
      const checks = document.querySelectorAll('.nl-recipient-check:checked');
      const total = document.querySelectorAll('.nl-recipient-check').length;
      const countEl = document.getElementById('nlRecipientCount');
      const summaryEl = document.getElementById('nlSendSummary');
      const sendCountEl = document.getElementById('nlSendCount');
      const sendBtn = document.getElementById('nlSendBtn');
      if (countEl) countEl.textContent = `${checks.length} av ${total} valda`;
      if (sendCountEl) sendCountEl.textContent = checks.length;
      if (sendBtn) {
        sendBtn.disabled = checks.length === 0;
        sendBtn.classList.toggle('opacity-50', checks.length === 0);
        sendBtn.classList.toggle('cursor-not-allowed', checks.length === 0);
      }
      if (summaryEl) {
        if (checks.length === 0) {
          summaryEl.textContent = '⚠️ Välj minst en mottagare';
        } else if (checks.length === total) {
          summaryEl.textContent = `Alla ${total} prenumeranter valda`;
        } else {
          summaryEl.textContent = `${total - checks.length} prenumeranter avmarkerade`;
        }
      }
    };

    window.sendStandaloneNewsletter = async function(newsletterId) {
      const checks = Array.from(document.querySelectorAll('.nl-recipient-check:checked'));
      if (checks.length === 0) {
        alert('Välj minst en mottagare.');
        return;
      }
      const recipientIds = checks.map(cb => cb.value);
      const btn = document.getElementById('nlSendBtn');
      btn.disabled = true;
      btn.innerHTML = '⏳ Skickar...';

      try {
        const data = await Auth.api(`/api/newsletter/newsletters/${newsletterId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ recipientIds }),
        });
        closeNewsletterModal();
        if (data.sent > 0) {
          alert(`✅ Nyhetsbrev skickat till ${data.sent} mottagare!`);
        } else {
          // Show the backend's detailed message (now includes API errors vs missing subscribers)
          alert(data.message || 'Inga e-postmeddelanden skickades.');
        }
        await loadNewsletterHistory();
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `Skicka till <span id="nlSendCount">${checks.length}</span> mottagare`;
        const detail = err.body?.detail || err.body?.message || err.message || 'Försök igen.';
        alert(`Fel vid utskick: ${detail}`);
      }
    };

    // ─── Subscriber table ──────────────────────────────────────
    async function reloadNewsletterTable() {
      const tbody = document.getElementById('newsletterTableBody');
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-text-soft">Laddar...</td></tr>';

      try {
        const url = `/api/newsletter/subscribers?status=${newsletterFilter}&sort=${newsletterSort}`;
        newsletterData = await Auth.api(url);
        renderNewsletterTable();
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-500">Fel vid laddning: ${esc(err.message)}</td></tr>`;
      }
    }

    function renderNewsletterTable() {
      const tbody = document.getElementById('newsletterTableBody');
      if (!tbody) return;

      if (newsletterData.length === 0) {
        const emptyMsg = newsletterFilter === 'active'
          ? 'Inga aktiva prenumeranter ännu.'
          : newsletterFilter === 'inactive'
          ? 'Inga avslutade prenumerationer.'
          : 'Inga prenumeranter ännu.';
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-text-soft">${emptyMsg}</td></tr>`;
        return;
      }

      // Sort the data
      const sorted = [...newsletterData].sort((a, b) => {
        let va = a[newsletterSort];
        let vb = b[newsletterSort];
        if (newsletterSort === 'name') {
          va = (va || '').toLowerCase();
          vb = (vb || '').toLowerCase();
        }
        if (va < vb) return newsletterSortDir === 'asc' ? -1 : 1;
        if (va > vb) return newsletterSortDir === 'asc' ? 1 : -1;
        return 0;
      });

      tbody.innerHTML = sorted.map(row => {
        const date = row.subscribed_at
          ? new Date(row.subscribed_at).toLocaleDateString('sv-SE')
          : '—';
        const statusLabel = row.subscribed ? 'Aktiv' : 'Avslutad';
        const statusClass = row.subscribed
          ? 'bg-mint text-green-700'
          : 'bg-coral text-red-700';
        return `<tr class="border-b border-lavender/50 hover:bg-sky/30 transition-colors">
          <td class="py-3 pr-4 font-medium text-navy">${esc(row.name || '(inget namn)')}</td>
          <td class="py-3 pr-4 text-text-soft">${esc(row.email || '')}</td>
          <td class="py-3 pr-4 text-text-soft">${date}</td>
          <td class="py-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}">${statusLabel}</span>
          </td>
        </tr>`;
      }).join('');
    }

    function filterNewsletterSubs(filter) {
      newsletterFilter = filter;

      // Update active filter button
      ['Active', 'Inactive', 'All'].forEach(f => {
        const btn = document.getElementById('newsletterFilter' + f);
        if (!btn) return;
        if (f.toLowerCase() === filter) {
          btn.className = 'px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy';
        } else {
          btn.className = 'px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-text-soft hover:bg-gray-200';
        }
      });

      reloadNewsletterTable();
    }

    function sortNewsletterSubs(col) {
      if (newsletterSort === col) {
        newsletterSortDir = newsletterSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        newsletterSort = col;
        newsletterSortDir = 'desc';
      }
      renderNewsletterTable();

      // Update sort indicator in header
      document.querySelectorAll('#nyhetsbrevSection th').forEach(th => {
        if (th.textContent.includes('↕')) {
          const base = th.textContent.replace(' ↕', '').replace(' ↑', '').replace(' ↓', '').trim();
          th.textContent = base + ' ↕';
          th.className = 'pb-3 pr-4 font-semibold text-text-soft cursor-pointer select-none';
        }
      });
      // Find the clicked header and update it
      const headers = document.querySelectorAll('#nyhetsbrevSection th');
      headers.forEach(th => {
        const txt = th.textContent || '';
        if (txt.includes('Prenumererar sedan') && col === 'subscribed_at') {
          th.textContent = 'Prenumererar sedan ' + (newsletterSortDir === 'asc' ? '↑' : '↓');
        } else if (txt.includes('Namn') && col === 'name') {
          th.textContent = 'Namn ' + (newsletterSortDir === 'asc' ? '↑' : '↓');
        }
      });
    }

    // ─── CSV export ────────────────────────────────────────────
    document.getElementById('newsletterExportBtn').addEventListener('click', async () => {
      const btn = document.getElementById('newsletterExportBtn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Exporterar...';

      try {
        const response = await fetch('/api/newsletter/subscribers/export', { credentials: 'include' });
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] || 'mystarday-prenumeranter.csv';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '<span>✅</span> Nerladdad!';
        btn.className = 'px-5 py-2.5 bg-green-500 text-white rounded-xl font-heading font-bold text-sm flex items-center gap-2';
        setTimeout(() => {
          btn.innerHTML = '<span>⬇️</span> Exportera e-postlista (CSV)';
          btn.className = 'px-5 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold text-sm transition-colors flex items-center gap-2';
          btn.disabled = false;
        }, 3000);
      } catch (err) {
        btn.innerHTML = '<span>⬇️</span> Exportera e-postlista (CSV)';
        btn.className = 'px-5 py-2.5 bg-red-500 text-white rounded-xl font-heading font-bold text-sm flex items-center gap-2';
        setTimeout(() => {
          btn.className = 'px-5 py-2.5 bg-gold hover:bg-yellow-500 text-navy rounded-xl font-heading font-bold text-sm transition-colors flex items-center gap-2';
          btn.disabled = false;
        }, 3000);
      }
    });
