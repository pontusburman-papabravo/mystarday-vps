/**
 * Samarbete hub — preview (intressefas) or redirect to pedagog tools.
 */
window.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login?next=' + encodeURIComponent('/samarbete');
    return;
  }

  const main = document.getElementById('samarbeteMain');
  if (!main || !window.PreviewShell) return;

  try {
    const access = await PreviewShell.loadAccess();
    if (access.components?.pedagog?.has) {
      main.innerHTML = '<div class="py-12 text-center"><p class="text-text-soft mb-4">Öppnar pedagogverktyg…</p></div>';
      window.location.href = '/pedagog-note';
      return;
    }

    await PreviewShell.takeOverPage({
      component: 'pedagog',
      source: 'bottom_nav_preview',
      container: main,
    });
  } catch (_) {
    main.innerHTML = '<p class="text-center text-text-soft py-12">Kunde inte ladda sidan.</p>';
  }
});
