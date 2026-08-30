/**
 * Barn/Stöd hub — preview (intressefas) or child shortcuts when teacch active.
 */
window.addEventListener('DOMContentLoaded', async () => {
  const isMarketing = window.PreviewBack && PreviewBack.isMarketingVisit();

  if (!Auth.isLoggedIn()) {
    if (isMarketing && window.PreviewShell) {
      const tookOver = await PreviewShell.takeOverPublicPage({
        component: 'teacch',
        source: 'landing_preview',
        container: document.getElementById('barnStodMain'),
        injectBackLink: true,
      });
      if (tookOver) return;
    }
    window.location.href = '/login?next=' + encodeURIComponent(
      (typeof sanitizeReturnUrl === 'function')
        ? sanitizeReturnUrl('/barn-stod' + window.location.search)
        : '/barn-stod'
    );
    return;
  }

  const main = document.getElementById('barnStodMain');
  if (!main || !window.PreviewShell) return;

  try {
    const access = await PreviewShell.loadAccess();
    if (access.components?.teacch?.has) {
      main.innerHTML = `
        <div class="py-8 space-y-4">
          <h1 class="text-2xl font-heading font-bold">Barn &amp; stöd</h1>
          <p class="text-text-soft text-sm">Extra stöd är aktivt för er familj.</p>
          <a href="/child/today" class="block p-4 bg-white rounded-2xl border border-lavender font-semibold">Öppna barnvy</a>
          <a href="/library" class="block p-4 bg-white rounded-2xl border border-lavender font-semibold">Aktivitetsbibliotek</a>
          <a href="/skattkammaren" class="block p-4 bg-white rounded-2xl border border-lavender font-semibold">Skattkammaren</a>
        </div>`;
      return;
    }

    await PreviewShell.takeOverPage({
      component: 'teacch',
      source: 'bottom_nav_preview',
      container: main,
    });
  } catch (_) {
    main.innerHTML = '<p class="text-center text-text-soft py-12">Kunde inte ladda sidan.</p>';
  }
});
