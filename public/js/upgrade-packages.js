/**
 * /upgrade — package cards with mini-preview + link to full preview (§9.1).
 * Interest CTA lives on preview pages, not here.
 */
(function () {
  'use strict';

  const COMPONENTS = ['reporting', 'pedagog', 'teacch'];

  window.addEventListener('DOMContentLoaded', bootUpgradePackages);
  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('upgrade', bootUpgradePackages);
  }

  async function bootUpgradePackages() {
    if (!window.Auth || !Auth.isLoggedIn() || !window.PreviewShell) return;

    const params = new URLSearchParams(window.location.search);
    const deepLink = params.get('component');
    if (deepLink && PreviewShell.getPreviewPagePath) {
      const target = PreviewShell.getPreviewPagePath(deepLink);
      if (target) {
        window.location.replace(target);
        return;
      }
    }

    const host = document.getElementById('upgradePackagesHost');
    if (!host) return;

    try {
      const [access, previewData] = await Promise.all([
        PreviewShell.loadAccess(),
        PreviewShell.loadPreviewData(),
      ]);

      if (!access || access.rollout_mode === 'off') return;

      host.classList.remove('hidden');
      host.innerHTML =
        '<h2 class="text-2xl font-heading font-bold text-navy mb-2 text-center">Kommande paket</h2>' +
        '<p class="text-text-soft text-center mb-2">Se förhandsvisning och anmäl intresse för beta.</p>' +
        '<p class="text-text-soft text-center text-sm mb-6">' +
          '<a href="/pricing-info" class="text-navy font-semibold underline hover:no-underline">Läs om programmen och vad som ingår →</a>' +
        '</p>' +
        '<div class="upgrade-package-grid" id="upgradePackageCards"></div>';

      const grid = document.getElementById('upgradePackageCards');

      for (const slug of COMPONENTS) {
        const pkg = previewData[slug];
        if (!pkg) continue;

        const owned = access.components?.[slug]?.has;
        const interested = access.interest?.[slug];
        const previewPath = PreviewShell.getPreviewPagePath
          ? PreviewShell.getPreviewPagePath(slug)
          : null;

        const card = document.createElement('article');
        card.className = 'bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-left';

        card.innerHTML =
          '<span class="text-xs font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">' +
            pkg.badge +
          '</span>' +
          '<h3 class="text-xl font-bold text-navy mt-2">' + pkg.name + '</h3>' +
          '<p class="text-sm text-text-soft mt-1 mb-4">' + pkg.tagline + '</p>' +
          '<div class="upgrade-package-preview-mount mb-4"></div>';

        const mount = card.querySelector('.upgrade-package-preview-mount');
        if (mount && access.preview?.[slug]) {
          await PreviewShell.mountPreviewShell(mount, {
            component: slug,
            source: 'upgrade_page',
            fullPage: false,
            showCta: false,
            showBanner: false,
            compact: true,
          });
        }

        if (owned) {
          const badge = document.createElement('p');
          badge.className = 'text-sm font-semibold text-green-700';
          badge.textContent = '✓ Aktivt för er familj';
          card.appendChild(badge);
        } else if (previewPath) {
          const link = document.createElement('a');
          link.href = previewPath;
          link.className = 'preview-cta-btn block w-full text-center no-underline mt-2';
          link.textContent = interested ? 'Se förhandsvisning igen' : 'Se förhandsvisning';
          card.appendChild(link);

          if (interested) {
            const note = document.createElement('p');
            note.className = 'text-xs text-green-700 text-center mt-2 font-semibold';
            note.textContent = 'Intresse registrerat ✓';
            card.appendChild(note);
          }
        }

        grid.appendChild(card);
      }
    } catch (_) { /* keep founder page */ }
  }
})();
