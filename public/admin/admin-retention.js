// Admin Retention: retention data, template usage stats
    let retentionLoaded = false;

    function formatRelativeTime(isoString) {
      if (!isoString) return 'Aldrig';
      const diff = Date.now() - new Date(isoString).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return minutes + ' min sedan';
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) return hours + ' tim sedan';
      const days = Math.floor(diff / 86400000);
      return days + ' dagar sedan';
    }

    function statusBadge(status) {
      if (status === 'green') return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700"><span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Aktiv</span>';
      if (status === 'yellow') return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><span class="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>Varnande</span>';
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Risk</span>';
    }

    async function loadRetentionData() {
      if (retentionLoaded) return;
      try {
        const [families, { used, unused }] = await Promise.all([
          Auth.api('/api/admin/retention'),
          Auth.api('/api/admin/stats/templates'),
        ]);

        // Summary counts
        const red = families.filter(f => f.status === 'red').length;
        const yellow = families.filter(f => f.status === 'yellow').length;
        const green = families.filter(f => f.status === 'green').length;
        document.getElementById('retentionRedCount').textContent = red;
        document.getElementById('retentionYellowCount').textContent = yellow;
        document.getElementById('retentionGreenCount').textContent = green;

        // Retention table
        const tbody = document.getElementById('retentionTableBody');
        if (families.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-text-soft py-8">Inga familjer hittades</td></tr>';
        } else {
          const rowBg = { red: 'bg-red-50', yellow: 'bg-yellow-50', green: '' };
          tbody.innerHTML = families.map(f => `
            <tr class="border-t border-lavender ${rowBg[f.status] || ''}">
              <td class="px-4 py-3">${statusBadge(f.status)}</td>
              <td class="px-4 py-3 font-semibold text-navy">${escapeHtml(f.family_name)}</td>
              <td class="px-4 py-3 text-text-soft">${formatRelativeTime(f.last_activity)}</td>
              <td class="px-4 py-3 text-right font-semibold text-navy">${f.activity_index}</td>
            </tr>
          `).join('');
        }

        // Template usage table
        const usedBody = document.getElementById('templatesUsedBody');
        const TEMPLATE_EMOJI = { forskola: '🏫', skola: '📚', morgon: '🌅', dag: '☀️', kvall: '🌙', helg: '🎉' };
        if (used.length === 0) {
          usedBody.innerHTML = '<tr><td colspan="2" class="text-center text-text-soft py-6">Inga aktiviteter används ännu</td></tr>';
        } else {
          const maxCount = used[0].usage_count || 1;
          usedBody.innerHTML = used.map((t, i) => `
            <tr class="border-t border-lavender">
              <td class="px-4 py-3">
                <span class="font-semibold">${i + 1}. ${TEMPLATE_EMOJI[t.key] || '📋'} ${escapeHtml(t.name)}</span>
                <div class="mt-1 h-1.5 rounded-full bg-lavender overflow-hidden">
                  <div class="h-full bg-gold rounded-full" style="width:${Math.round((t.usage_count/maxCount)*100)}%"></div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-bold text-navy">${t.usage_count}</td>
            </tr>
          `).join('');
        }

        // Unused templates
        const unusedContainer = document.getElementById('templatesUnusedContainer');
        if (unused.length === 0) {
          unusedContainer.innerHTML = '<p class="text-green-700 font-semibold text-center py-4">✅ Alla aktiviteter används!</p>';
        } else {
          unusedContainer.innerHTML = `
            <p class="text-text-soft text-xs mb-3">Dessa aktiviteter kan rensas ur biblioteket om de inte behövs.</p>
            <ul class="space-y-2">
              ${unused.map(t => `<li class="flex items-center gap-2 text-sm text-text-soft"><span class="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>${TEMPLATE_EMOJI[t.key] || '📋'} ${escapeHtml(t.name)}</li>`).join('')}
            </ul>
          `;
        }

        retentionLoaded = true;
      } catch (err) {
        console.error('[Retention] Load error:', err);
        document.getElementById('retentionTableBody').innerHTML =
          '<tr><td colspan="4" class="text-center text-red-500 py-8">Fel vid laddning av retention-data</td></tr>';
      }
    }

    async function exportRetentionCSV() {
      try {
        const res = await fetch('/api/admin/retention/export', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `retention-export-${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[Retention] Export error:', err);
        alert('Kunde inte exportera retention-data. Försök igen.');
      }
    }

    function escapeHtml(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

