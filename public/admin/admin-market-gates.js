// Admin: staged market registration gates (P-EEA-LAUNCH-FRAMEWORK)
// Read + write via the existing generic feature-flag endpoint:
//   GET /api/admin/market-registration-status  (server truth for the table)
//   PUT /api/admin/feature-flags/:key           (the only write path — no parallel endpoint)
//
// Each row toggles exactly the gate key the server returns for that country.
// market_eu_open is never rendered and never written.

const MARKET_GATE_LABELS_SV = {
  SE: 'Sverige',
  IE: 'Irland',
  CA: 'Kanada',
  FI: 'Finland',
  NO: 'Norge',
  DK: 'Danmark',
  GB: 'Storbritannien',
  US: 'USA',
  ZZ: 'Övrigt',
  AT: 'Österrike',
  BE: 'Belgien',
  BG: 'Bulgarien',
  HR: 'Kroatien',
  CY: 'Cypern',
  CZ: 'Tjeckien',
  EE: 'Estland',
  FR: 'Frankrike',
  DE: 'Tyskland',
  GR: 'Grekland',
  HU: 'Ungern',
  IS: 'Island',
  IT: 'Italien',
  LV: 'Lettland',
  LI: 'Liechtenstein',
  LT: 'Litauen',
  LU: 'Luxemburg',
  MT: 'Malta',
  NL: 'Nederländerna',
  PL: 'Polen',
  PT: 'Portugal',
  RO: 'Rumänien',
  SK: 'Slovakien',
  SI: 'Slovenien',
  ES: 'Spanien',
  CH: 'Schweiz',
};

let marketGatesToggleInFlight = false;

function marketGateCountryLabel(code, serverLabel) {
  return MARKET_GATE_LABELS_SV[code] || serverLabel || code;
}

function renderMarketGatesRow(m) {
  const countryLabel = marketGateCountryLabel(m.code, m.label);
  const disabledAttr = marketGatesToggleInFlight ? 'disabled' : '';
  return `
    <tr>
      <td class="py-2 pr-3">
        <div class="text-sm font-semibold text-navy">${countryLabel}</div>
        <div class="text-xs text-text-soft font-mono">${m.gateKey}</div>
      </td>
      <td class="py-2 pr-3">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}">
          ${m.open ? 'Öppen' : 'Stängd'}
        </span>
      </td>
      <td class="py-2 pr-3">
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            class="w-5 h-5 accent-gold"
            data-gate-key="${m.gateKey}"
            data-country-code="${m.code}"
            data-country-label="${countryLabel}"
            data-current-enabled="${m.open ? 'true' : 'false'}"
            ${m.open ? 'checked' : ''}
            ${disabledAttr}
            onchange="window.handleMarketGateToggle(this)"
          >
          <span class="text-xs text-text-soft">${m.open ? 'Registrering tillåten' : 'Registrering blockerad'}</span>
        </label>
      </td>
    </tr>
  `;
}

async function loadMarketRegistrationStatus() {
  const container = document.getElementById('marketGatesTableBody');
  const hint = document.getElementById('marketGatesHint');
  const countryStats = document.getElementById('marketCountryStatsBody');
  if (!container) return;

  try {
    const [data, analytics] = await Promise.all([
      Auth.api('/api/admin/market-registration-status'),
      Auth.api('/api/admin/locale-analytics').catch(() => null),
    ]);
    const markets = data.markets || [];
    if (hint) {
      hint.textContent = 'Toggla registrering land för land. Varje land styr endast sin egen flagga (ingen påverkar market_eu_open eller betalningsflaggor).';
    }
    container.innerHTML = markets.map(renderMarketGatesRow).join('');

    if (countryStats && analytics && Array.isArray(analytics.families_by_country)) {
      const highlight = new Set(['SE', 'IE', 'CA', 'FI', 'NO', 'DK', 'GB', 'US']);
      const rows = analytics.families_by_country
        .filter((row) => highlight.has(row.country_code))
        .sort((a, b) => b.count - a.count);
      countryStats.innerHTML = rows.length
        ? rows.map((row) => `
          <tr>
            <td class="py-2 pr-3 font-mono text-sm">${row.country_code}</td>
            <td class="py-2 pr-3 text-sm">${row.market_region}</td>
            <td class="py-2 pr-3 text-sm font-semibold">${row.count}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="3" class="py-4 text-sm text-text-soft">Inga familjer ännu</td></tr>';
    }
  } catch (err) {
    console.error('[Admin:market-gates] Load failed:', err);
    if (container) {
      container.innerHTML = '<tr><td colspan="3" class="py-4 text-sm text-red-500">Kunde inte ladda marknadsportar</td></tr>';
    }
  }
}

/**
 * Fired on checkbox change. The checkbox has already flipped to the desired new value
 * by the time this runs — `wasEnabled` (the pre-click server-confirmed state) is read
 * from the data attribute set when the row was last rendered from the server.
 */
async function handleMarketGateToggle(checkboxEl) {
  const gateKey = checkboxEl.dataset.gateKey;
  const countryLabel = checkboxEl.dataset.countryLabel;
  const wasEnabled = checkboxEl.dataset.currentEnabled === 'true';
  const nextEnabled = checkboxEl.checked;

  if (marketGatesToggleInFlight) {
    // Guard against overlapping writes — revert this click and let the in-flight one finish.
    checkboxEl.checked = wasEnabled;
    return;
  }

  const action = nextEnabled ? 'ÖPPNA' : 'STÄNGA';
  const confirmed = confirm(
    `Vill du ${action} registrering för ${countryLabel}?\n\nFlagga: ${gateKey}\n\nDetta påverkar endast ${countryLabel} — ingen annan marknad eller betalningsinställning ändras.`
  );
  if (!confirmed) {
    checkboxEl.checked = wasEnabled;
    return;
  }

  marketGatesToggleInFlight = true;
  checkboxEl.disabled = true;

  try {
    await Auth.api(`/api/admin/feature-flags/${encodeURIComponent(gateKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    // Clear the in-flight guard BEFORE the reload renders — otherwise every row would
    // re-render with disabled="" baked in and stay disabled until a manual page refresh.
    marketGatesToggleInFlight = false;
    // Never trust the optimistic client state — always reload the full table from the
    // server so the UI shows exactly what the database now says for every row.
    await loadMarketRegistrationStatus();
  } catch (err) {
    console.error('[Admin:market-gates] Toggle failed:', err);
    marketGatesToggleInFlight = false;
    alert(`Kunde inte uppdatera ${countryLabel} (${gateKey}): ${err.message || 'okänt fel'}\n\nÅterställer till aktuell serverstatus.`);
    // Reload from server rather than a local revert — guarantees no half-saved state,
    // even if the PUT partially succeeded server-side before the error surfaced.
    await loadMarketRegistrationStatus();
  }
}

window.loadMarketRegistrationStatus = loadMarketRegistrationStatus;
window.handleMarketGateToggle = handleMarketGateToggle;
