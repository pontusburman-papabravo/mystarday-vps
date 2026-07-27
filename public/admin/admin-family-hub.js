/**
 * Family kontrollcenter modal — Fas 3D.
 */
(function () {
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  async function openFamilyHub(familyId) {
    const modal = document.getElementById('familyHubModal');
    const body = document.getElementById('familyHubBody');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = '<p class="text-text-soft text-sm">Laddar...</p>';

    try {
      const data = await Auth.api('/api/admin/families/' + familyId + '/overview');
      const f = data.family;
      const parents = Array.isArray(f.parents) ? f.parents : JSON.parse(f.parents || '[]');
      const children = Array.isArray(f.children) ? f.children : JSON.parse(f.children || '[]');

      body.innerHTML = `
        <h3 class="text-xl font-heading font-bold text-navy mb-2">${esc(f.name || 'Familj')}</h3>
        <p class="text-xs text-text-soft mb-4">ID: ${esc(f.id)} · Prenumeration: ${esc(f.subscription_status || '—')}</p>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-sky rounded-xl p-4">
            <p class="text-xs font-bold uppercase text-text-soft mb-2">Föräldrar</p>
            ${parents.map((p) => `<p class="text-sm">${esc(p.name || p.email)}</p>`).join('') || '<p class="text-sm text-text-soft">—</p>'}
          </div>
          <div class="bg-mint rounded-xl p-4">
            <p class="text-xs font-bold uppercase text-text-soft mb-2">Barn</p>
            ${children.map((c) => `<p class="text-sm">${esc(c.emoji || '')} ${esc(c.name)}</p>`).join('') || '<p class="text-sm text-text-soft">—</p>'}
          </div>
        </div>
        <div class="mb-4">
          <p class="text-xs font-bold uppercase text-text-soft mb-2">Senaste ärenden</p>
          ${(data.messages || []).slice(0, 5).map((m) => `<p class="text-sm mb-1"><span class="font-semibold">${esc(m.status)}</span> — ${esc((m.message_type || '').slice(0, 40))}</p>`).join('') || '<p class="text-sm text-text-soft">Inga kopplade ärenden</p>'}
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="closeFamilyHub()" class="px-4 py-2 bg-lavender rounded-xl text-sm font-bold">Stäng</button>
          <a href="#arenden" onclick="closeFamilyHub(); return adminNavClick(event)" class="px-4 py-2 bg-sky rounded-xl text-sm font-bold">Ärenden</a>
          <a href="#paketintresse" onclick="closeFamilyHub(); return adminNavClick(event)" class="px-4 py-2 bg-gold rounded-xl text-sm font-bold">Paketintresse</a>
        </div>`;
    } catch (e) {
      body.innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda familj</p>';
    }
  }

  function closeFamilyHub() {
    document.getElementById('familyHubModal')?.classList.add('hidden');
  }

  window.openFamilyHub = openFamilyHub;
  window.closeFamilyHub = closeFamilyHub;
})();
