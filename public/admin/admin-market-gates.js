// Admin: staged market registration gates (P-EEA-LAUNCH-FRAMEWORK)
// Read-only summary + link to existing feature-flag writes via /api/admin/feature-flags/:key

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
      hint.textContent = 'Toggle via befintlig flagg-API: PUT /api/admin/feature-flags/:key med { enabled: true|false }. market_fi_open förblir OFF tills P-FI-LAUNCH.';
    }
    container.innerHTML = markets.map((m) => `
      <tr>
        <td class="py-2 pr-3 font-mono text-sm">${m.code}</td>
        <td class="py-2 pr-3 text-sm">${m.label}</td>
        <td class="py-2 pr-3 text-xs text-text-soft font-mono">${m.gateKey}</td>
        <td class="py-2 pr-3 text-sm">${m.marketRegion}</td>
        <td class="py-2 pr-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}">
            ${m.open ? 'Öppen' : 'Stängd'}
          </span>
        </td>
      </tr>
    `).join('');

    if (countryStats && analytics && Array.isArray(analytics.families_by_country)) {
      const highlight = new Set(['SE', 'IE', 'FI', 'NO', 'DK', 'GB', 'US']);
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
      container.innerHTML = '<tr><td colspan="5" class="py-4 text-sm text-red-500">Kunde inte ladda marknadsportar</td></tr>';
    }
  }
}

window.loadMarketRegistrationStatus = loadMarketRegistrationStatus;
