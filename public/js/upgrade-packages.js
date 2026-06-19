/**
 * /upgrade — fyra paket-kort vid rollout ≠ off (§9.1, intressefas).
 */
(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth || !Auth.isLoggedIn() || !window.PreviewShell) return;

    const host = document.getElementById('upgradePackagesHost');
    if (!host) return;

    try {
      const [access, previewData] = await Promise.all([
        PreviewShell.loadAccess(),
        PreviewShell.loadPreviewData(),
      ]);

      if (!access || access.rollout_mode === 'off') return;

      host.classList.remove('hidden');
      const components = ['reporting', 'pedagog', 'teacch'];
      host.innerHTML = '<h2 class="text-2xl font-heading font-bold text-navy mb-2 text-center">Kommande paket</h2>' +
        '<p class="text-text-soft text-center mb-8">Förhandsvisning — anmäl intresse för beta. Inga priser i denna fas.</p>' +
        '<div class="grid gap-4" id="upgradePackageCards"></div>';

      const grid = document.getElementById('upgradePackageCards');
      for (const slug of components) {
        const pkg = previewData[slug];
        if (!pkg) continue;
        const owned = access.components?.[slug]?.has;
        const interested = access.interest?.[slug];
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-left';
        card.innerHTML = `
          <span class="text-xs font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">${pkg.badge}</span>
          <h3 class="text-xl font-bold text-navy mt-2">${pkg.name}</h3>
          <p class="text-sm text-text-soft mt-1 mb-4">${pkg.tagline}</p>
          <p class="text-xs text-text-soft italic">${pkg.watermark}</p>
        `;

        if (owned) {
          const badge = document.createElement('p');
          badge.className = 'mt-4 text-sm font-semibold text-green-700';
          badge.textContent = '✓ Aktivt för er familj';
          card.appendChild(badge);
        } else if (access.rollout_mode === 'interest') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'preview-cta-btn mt-4 w-full';
          btn.textContent = interested ? 'Intresse registrerat ✓' : 'Jag är intresserad';
          btn.disabled = !!interested;
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
              const headers = { 'Content-Type': 'application/json' };
              const csrf = localStorage.getItem('csrf_token');
              if (csrf) headers['X-CSRF-Token'] = csrf;
              const res = await fetch('/api/subscription/interest', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ component: slug, source: 'upgrade_page' }),
              });
              const data = await res.json();
              btn.textContent = 'Intresse registrerat ✓';
              alert(data.message || 'Tack!');
            } catch (e) {
              btn.disabled = false;
              alert('Något gick fel');
            }
          });
          card.appendChild(btn);
        }

        grid.appendChild(card);
      }
    } catch (_) { /* keep founder page */ }
  });
})();
