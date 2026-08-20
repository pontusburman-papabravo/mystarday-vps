// Admin: staged market registration gates (P-EEA-LAUNCH-FRAMEWORK)
// Read-only summary + link to existing feature-flag writes via /api/admin/feature-flags/:key

async function loadMarketRegistrationStatus() {
  const container = document.getElementById('marketGatesTableBody');
  const hint = document.getElementById('marketGatesHint');
  if (!container) return;

  try {
    const data = await Auth.api('/api/admin/market-registration-status');
    const markets = data.markets || [];
    if (hint) {
      hint.textContent = 'Toggle via befintlig flagg-API: PUT /api/admin/feature-flags/:key med { enabled: true|false }. market_ie_open förblir OFF tills P-IE-LAUNCH.';
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
  } catch (err) {
    console.error('[Admin:market-gates] Load failed:', err);
    if (container) {
      container.innerHTML = '<tr><td colspan="5" class="py-4 text-sm text-red-500">Kunde inte ladda marknadsportar</td></tr>';
    }
  }
}

window.loadMarketRegistrationStatus = loadMarketRegistrationStatus;
