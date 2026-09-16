/**
 * admin-journey-rollout.js — Family Journey rollout wave status (admin Produktanalys).
 */
(function () {
  'use strict';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  const PHASE_SV = {
    DISCOVERING: 'Upptäcker appen',
    SETTING_UP: 'Sätter upp',
    FIRST_USE: 'Första användningen',
    BUILDING_ROUTINE: 'Bygger rutin',
    ESTABLISHED_ROUTINE: 'Rutin på plats',
    EXPANDING: 'Fler barn',
    INDEPENDENCE: 'Barnet klarar mer själv',
    AT_RISK: 'Risk att sluta',
    CHURNED: 'Har slutat',
  };

  function phaseSv(phase) {
    return PHASE_SV[phase] || phase || 'Okänd fas';
  }

  function waveBadge(status) {
    if (status === 'active') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'next') return 'bg-gold-light text-navy border-gold';
    return 'bg-lavender text-text-soft border-sky';
  }

  function statusWord(w) {
    if (w.status === 'active' && w.complete) return 'På';
    if (w.status === 'next') return 'Nästa';
    if (w.complete) return 'Klar';
    return 'Väntar';
  }

  function renderPanel(data) {
    const active = data.active_wave || 0;
    const next = data.next_wave;
    const healthOk = data.health?.ok !== false;

    const wavesHtml = (data.waves || []).map((w) => `
      <div class="flex items-start gap-3 py-3 border-b border-sky last:border-0">
        <span class="text-xs font-bold px-2 py-1 rounded-lg border ${waveBadge(w.status)}">Steg ${w.wave}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-navy">${esc(w.label)}</p>
          ${w.meaning ? `<p class="text-xs text-text-soft mt-0.5">${esc(w.meaning)}</p>` : ''}
          ${w.flags_missing?.length ? `<details class="mt-1"><summary class="text-xs text-amber-700 cursor-pointer">Saknas tekniskt (${w.flags_missing.length})</summary><p class="text-xs text-amber-700 mt-1">${esc(w.flags_missing.join(', '))}</p></details>` : ''}
          ${w.flags_should_be_off?.length ? `<details class="mt-1"><summary class="text-xs text-red-600 cursor-pointer">Ska vara av (${w.flags_should_be_off.length})</summary><p class="text-xs text-red-600 mt-1">${esc(w.flags_should_be_off.join(', '))}</p></details>` : ''}
        </div>
        <span class="text-xs font-bold ${w.complete ? 'text-green-600' : 'text-text-soft'}">${statusWord(w)}</span>
      </div>
    `).join('');

    const phases = (data.phase_distribution || []).map((p) =>
      `<span class="text-xs bg-white border border-sky rounded-lg px-2 py-1">${esc(phaseSv(p.phase))}: ${p.n}</span>`
    ).join(' ');

    const headline = active === 0
      ? 'Inte påslagen än'
      : `Steg ${active} av 5 är på`;

    return `
      <details class="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border-2 border-indigo-200 p-5 mb-6">
        <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-indigo-600 mb-1">Ny hem-upplevelse — stegvis lansering</p>
              <p class="text-xl font-heading font-bold text-navy">${esc(headline)}
                ${next ? `<span class="text-base font-semibold text-text-soft"> · nästa: steg ${next}</span>` : ''}
              </p>
              <p class="text-sm text-text-soft mt-1">Vi släpper den nya vägen i appen i fem steg, så att vi kan stoppa om något strular.</p>
              ${data.wave_enabled_at ? `<p class="text-xs text-text-soft mt-1">Senast ändrad: ${esc(new Date(data.wave_enabled_at).toLocaleString('sv-SE'))}</p>` : ''}
            </div>
            <span class="text-sm font-semibold text-gold">Visa detaljer ▾</span>
          </div>
        </summary>
        <div class="mt-4 pt-4 border-t border-indigo-100">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p class="text-xs ${healthOk ? 'text-green-700' : 'text-red-600'}">
            ${healthOk ? 'Tekniska kontroller: allt ser bra ut' : 'Tekniska kontroller flaggar problem — se loggar'}
          </p>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="journeyRolloutRefreshBtn" class="px-3 py-2 text-sm font-semibold rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50">↺ Uppdatera</button>
            ${active < 5 ? `<button type="button" id="journeyRolloutAdvanceBtn" class="px-3 py-2 text-sm font-semibold rounded-xl bg-gold text-white hover:bg-yellow-500">Slå på steg ${next || active + 1}</button>` : ''}
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-white/80 rounded-xl p-3 border border-indigo-100">${wavesHtml}</div>
          <div>
            <p class="text-xs font-bold text-text-soft uppercase mb-2">Hur många familjer är var</p>
            <p class="text-xs text-text-soft mb-2">Var familjen befinner sig i appen just nu — från att sätta upp till att barnet klarar mer själv.</p>
            <div class="flex flex-wrap gap-1">${phases || '<span class="text-xs text-text-soft">Ingen data</span>'}</div>
          </div>
        </div>
        </div>
      </details>
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
      mount.innerHTML = `<p class="text-red-500 text-sm">Kunde inte ladda lanseringsläget: ${esc(err.message)}</p>`;
    }
  }

  window.loadJourneyRolloutPanel = loadJourneyRolloutPanel;
})();
