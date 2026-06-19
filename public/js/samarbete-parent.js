/**
 * Parent Samarbete view when pedagog package is active (E12 §4.2).
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
    if (!access.components?.pedagog?.has) {
      await PreviewShell.takeOverPage({ component: 'pedagog', source: 'bottom_nav_preview', container: main });
      return;
    }

    const res = await Auth.api('/api/pedagog/day-comments/samarbete/notes');
    const data = res || { notes: [] };

    main.innerHTML = `
      <div class="py-6 space-y-4">
        <h1 class="text-2xl font-heading font-bold">Samarbete</h1>
        <p class="text-text-soft text-sm">Publicerade pedagoganteckningar från er skola/förskola.</p>
        <div class="space-y-3" id="samarbeteNotesList"></div>
        <a href="/pedagog-note" class="inline-block text-sm text-navy underline">Öppna pedagogverktyg</a>
      </div>`;

    const list = document.getElementById('samarbeteNotesList');
    if (!data.notes?.length) {
      list.innerHTML = '<p class="text-text-soft text-sm">Inga publicerade anteckningar ännu.</p>';
      return;
    }

    list.innerHTML = data.notes.map((n) => `
      <article class="bg-white rounded-2xl border border-lavender p-4">
        <p class="text-xs text-text-soft">${n.date} · ${n.child_name} · ${n.pedagog_name || 'Pedagog'}</p>
        <p class="text-sm text-navy mt-2">${(n.notes || '').replace(/</g, '&lt;')}</p>
      </article>
    `).join('');
  } catch (_) {
    main.innerHTML = '<p class="text-center text-text-soft py-12">Kunde inte ladda Samarbete.</p>';
  }
});
