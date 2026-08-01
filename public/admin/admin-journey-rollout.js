/**
 * admin-journey-rollout.js — Family Journey rollout wave status (admin Produktanalys).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function waveBadge(status) {
    if (status === 'active') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'next') return 'bg-gold-light text-navy border-gold';
    return 'bg-lavender text-text-soft border-sky';
  }

  function renderPanel(data) {
    const active = data.active_wave || 0;
    const next = data.next_wave;
    const healthOk = data.health?.ok !== false;

    const wavesHtml = (data.waves || []).map((w) => `
      <div class="flex items-start gap-3 py-2 border-b border-sky last:border-0">
        <span class="text-xs font-bold px-2 py-1 rounded-lg border ${waveBadge(w.status)}">W${w.wave}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-navy">${esc(w.label)}</p>
          ${w.flags_missing?.length ? `<p class="text-xs text-amber-700 mt-0.5">Saknas: ${esc(w.flags_missing.join(', '))}</p>` : ''}
          ${w.flags_should_be_off?.length ? `<p class="text-xs text-red-600 mt-0.5">Ska vara AV: ${esc(w.flags_should_be_off.join(', '))}</p>` : ''}
        </div>
        <span class="text-xs font-bold ${w.complete ? 'text-green-600' : 'text-text-soft'}">${w.complete ? '✓' : '—'}</span>
      </div>
    `).join('');

    const phases = (data.phase_distribution || []).map((p) =>
      `<span class="text-xs bg-white border border-sky rounded-lg px-2 py-1">${esc(p.phase)}: ${p.n}</span>`
    ).join(' ');

    return `
      <div class="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border-2 border-indigo-200 p-5 mb-6">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-1">Family Journey Rollout</p>
            <p class="text-2xl font-heading font-bold text-navy">
              ${active === 0 ? 'Inte startad' : `Wave ${active} aktiv`}
              ${next ? `<span class="text-base font-semibold text-text-soft"> → nästa: Wave ${next}</span>` : ''}
            </p>
            ${data.wave_enabled_at ? `<p class="text-xs text-text-soft mt-1">Senast ändrad: ${esc(new Date(data.wave_enabled_at).toLocaleString('sv-SE'))}</p>` : ''}
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="journeyRolloutRefreshBtn" class="px-3 py-2 text-sm font-semibold rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50">↺ Uppdatera</button>
            ${active < 5 ? `<button type="button" id="journeyRolloutAdvanceBtn" class="px-3 py-2 text-sm font-semibold rounded-xl bg-gold text-white hover:bg-yellow-500">Aktivera Wave ${next || active + 1}</button>` : ''}
          </div>
        </div>
        <p class="text-xs mb-3 ${healthOk ? 'text-green-700' : 'text-red-600'}">
          ${healthOk ? '✓ Hälsokontroller OK' : '⚠ Hälsokontroller flaggar problem — se loggar'}
        </p>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-white/80 rounded-xl p-3 border border-indigo-100">${wavesHtml}</div>
          <div>
            <p class="text-xs font-bold text-text-soft uppercase mb-2">Familjer per journey_phase</p>
            <div class="flex flex-wrap gap-1">${phases || '<span class="text-xs text-text-soft">Ingen data</span>'}</div>
          </div>
        </div>
      </div>
    `;
  }

  async function loadJourneyRolloutPanel() {
    const mount = document.getElementById('journeyRolloutPanel');
    if (!mount || typeof Auth === 'undefined' || !Auth.api) return;

    try {
      const data = await Auth.api('/api/admin/journey-rollout/status');
      mount.innerHTML = renderPanel(data);

      mount.querySelector('#journeyRolloutRefreshBtn')?.addEventListener('click', loadJourneyRolloutPanel);
      mount.querySelector('#journeyRolloutAdvanceBtn')?.addEventListener('click', async () => {
        const btn = mount.querySelector('#journeyRolloutAdvanceBtn');
        if (btn) btn.disabled = true;
        try {
          const res = await Auth.api('/api/admin/journey-rollout/advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ min_observation_hours: 0 }),
          });
          if (res.ok === false && res.error) {
            alert(res.error === 'observation_period'
              ? `Observationsperiod: vänta ${res.hours_remaining}h till`
              : (res.error || 'Kunde inte aktivera'));
          }
          await loadJourneyRolloutPanel();
        } catch (e) {
          alert(e.message || 'Fel vid aktivering');
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    } catch (err) {
      mount.innerHTML = `<p class="text-red-500 text-sm">Kunde inte ladda Journey rollout: ${esc(err.message)}</p>`;
    }
  }

  window.loadJourneyRolloutPanel = loadJourneyRolloutPanel;
})();
