/**
 * Admin command palette — Fas 3E (Ctrl/Cmd+K).
 */
(function () {
  let paletteOpen = false;
  let debounceTimer = null;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function closePalette() {
    const el = document.getElementById('adminCommandPalette');
    if (el) el.classList.add('hidden');
    paletteOpen = false;
  }

  function openPalette() {
    const el = document.getElementById('adminCommandPalette');
    const input = document.getElementById('adminCommandInput');
    if (!el) return;
    el.classList.remove('hidden');
    paletteOpen = true;
    if (input) {
      input.value = '';
      input.focus();
      renderPaletteResults({ sections: [], families: [], messages: [], leads: [] });
    }
  }

  function navigate(route) {
    closePalette();
    if (typeof navigateToRoute === 'function') navigateToRoute(route);
  }

  function renderPaletteResults(data) {
    const results = document.getElementById('adminCommandResults');
    if (!results) return;
    const parts = [];

    (data.sections || []).forEach((s) => {
      parts.push(`<button type="button" class="w-full text-left px-4 py-2 hover:bg-sky rounded-lg" data-route="${esc(s.route)}"><span class="text-xs text-text-soft">Sektion</span><br><span class="font-semibold text-navy">${esc(s.label)}</span></button>`);
    });
    (data.families || []).forEach((f) => {
      parts.push(`<button type="button" class="w-full text-left px-4 py-2 hover:bg-sky rounded-lg family-result" data-family="${f.id}"><span class="text-xs text-text-soft">Familj</span><br><span class="font-semibold text-navy">${esc(f.name)}</span></button>`);
    });
    (data.messages || []).forEach((m) => {
      parts.push(`<button type="button" class="w-full text-left px-4 py-2 hover:bg-sky rounded-lg" data-route="#arenden"><span class="text-xs text-text-soft">Ärende</span><br><span class="font-semibold text-navy">${esc(m.name || m.email)}</span></button>`);
    });
    (data.leads || []).forEach((l) => {
      parts.push(`<button type="button" class="w-full text-left px-4 py-2 hover:bg-sky rounded-lg" data-route="#tillvaxt-pipeline"><span class="text-xs text-text-soft">Lead</span><br><span class="font-semibold text-navy">${esc(l.title)}</span></button>`);
    });

    results.innerHTML = parts.length
      ? parts.join('')
      : '<p class="px-4 py-3 text-text-soft text-sm">Inga träffar</p>';

    results.querySelectorAll('[data-route]').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.getAttribute('data-route')));
    });
    results.querySelectorAll('.family-result').forEach((btn) => {
      btn.addEventListener('click', () => {
        closePalette();
        if (typeof openFamilyHub === 'function') openFamilyHub(btn.getAttribute('data-family'));
      });
    });
  }

  async function searchPalette(q) {
    try {
      const data = await Auth.api('/api/admin/search?q=' + encodeURIComponent(q));
      renderPaletteResults(data);
    } catch (e) {
      console.error('[PALETTE]', e);
    }
  }

  function initCommandPalette() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      }
      if (e.key === 'Escape' && paletteOpen) closePalette();
    });

    const input = document.getElementById('adminCommandInput');
    if (input) {
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        debounceTimer = setTimeout(() => {
          if (q.length >= 2) searchPalette(q);
          else renderPaletteResults({ sections: [], families: [], messages: [], leads: [] });
        }, 200);
      });
    }

    document.getElementById('adminCommandPalette')?.addEventListener('click', (e) => {
      if (e.target.id === 'adminCommandPalette') closePalette();
    });
  }

  document.addEventListener('DOMContentLoaded', initCommandPalette);
  window.openAdminCommandPalette = openPalette;
})();
