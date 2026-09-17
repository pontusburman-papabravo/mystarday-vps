/**
 * Parent Samarbete view when pedagog package is active (E12 §4.2).
 */
window.addEventListener('DOMContentLoaded', async () => {
  const isMarketing = window.PreviewBack && PreviewBack.isMarketingVisit();

  if (!Auth.isLoggedIn()) {
    if (isMarketing && window.PreviewShell) {
      const tookOver = await PreviewShell.takeOverPublicPage({
        component: 'pedagog',
        source: 'landing_preview',
        container: document.getElementById('samarbeteMain'),
        injectBackLink: true,
      });
      if (tookOver) return;
    }
    window.location.href = '/login?next=' + encodeURIComponent(
      (typeof sanitizeReturnUrl === 'function')
        ? sanitizeReturnUrl('/samarbete' + window.location.search)
        : '/samarbete'
    );
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

    const spt = function (key) { return (typeof window.pt === 'function') ? window.pt(key) : key; };
    main.innerHTML = '<div class="py-6 space-y-4">'
      + '<h1 class="text-2xl font-heading font-bold">' + spt('family.samarbete.title') + '</h1>'
      + '<p class="text-text-soft text-sm">' + spt('family.samarbete.lead') + '</p>'
      + '<div class="space-y-3" id="samarbeteNotesList"></div>'
      + '<a href="/pedagog-note" class="inline-block text-sm text-navy underline">' + spt('family.samarbete.openTools') + '</a></div>';

    const list = document.getElementById('samarbeteNotesList');
    if (!data.notes?.length) {
      list.innerHTML = '<p class="text-text-soft text-sm">' + ((typeof window.pt === 'function') ? pt('family.samarbete.empty') : 'No published notes yet.') + '</p>';
      return;
    }

    list.innerHTML = data.notes.map((n) => `
      <article class="bg-white rounded-2xl border border-lavender p-4">
        <p class="text-xs text-text-soft">${n.date} · ${n.child_name} · ${n.pedagog_name || ((typeof window.pt === 'function') ? pt('family.samarbete.pedagogFallback') : 'Educator')}</p>
        <p class="text-sm text-navy mt-2">${(n.notes || '').replace(/</g, '&lt;')}</p>
      </article>
    `).join('');
  } catch (_) {
    main.innerHTML = '<p class="text-center text-text-soft py-12">' + ((typeof window.pt === 'function') ? pt('family.samarbete.loadError') : 'Could not load Collaboration.') + '</p>';
  }
});
