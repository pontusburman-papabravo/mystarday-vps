/**
 * Family kontrollcenter modal — Fas 3D + Premium grant/revoke.
 */
(function () {
  const SOURCE_LABELS = {
    grandfathered: 'Lifetime',
    intro_year: 'Intro-år',
    apple: 'Apple',
    google: 'Google',
    admin: 'Admin',
    gift: 'Gift',
  };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function formatUntil(iso) {
    if (!iso) return 'utan slutdatum';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'utan slutdatum';
    return d.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function effectiveAdminLine(premium, sources) {
    const adminRow = (sources || []).find((s) => s.source === 'admin' && s.active);
    if (premium && premium.active && premium.source === 'admin') {
      if (adminRow && (adminRow.permanent || !adminRow.expires_at)) {
        return 'Admin – utan slutdatum';
      }
      return 'Admin – till ' + formatUntil(premium.expires_at);
    }
    if (premium && premium.active) {
      const label = SOURCE_LABELS[premium.source] || premium.source;
      if (premium.source === 'grandfathered') return 'Lifetime';
      if (premium.expires_at) return label + ' – till ' + formatUntil(premium.expires_at);
      return label;
    }
    return 'Ingen';
  }

  function sourcesHtml(sources) {
    const rows = (sources || []).filter((s) => SOURCE_LABELS[s.source]);
    if (!rows.length) return '<p class="text-sm text-text-soft">Inga entitlement-rader</p>';
    return rows.map((s) => {
      const name = SOURCE_LABELS[s.source] || s.source;
      const until = s.source === 'grandfathered' || (s.source === 'admin' && (s.permanent || !s.expires_at))
        ? 'utan slutdatum'
        : (s.expires_at ? 'till ' + formatUntil(s.expires_at) : '—');
      const state = s.effective ? 'Gällande' : (s.active ? 'Aktiv' : 'Inaktiv');
      return `<p class="text-sm mb-1"><span class="font-semibold">${esc(name)}</span> · ${esc(until)} · ${esc(state)}</p>`;
    }).join('');
  }

  function renderHub(body, data, familyId) {
    const f = data.family;
    const parents = Array.isArray(f.parents) ? f.parents : JSON.parse(f.parents || '[]');
    const children = Array.isArray(f.children) ? f.children : JSON.parse(f.children || '[]');
    const premium = data.premium || {};
    const sources = data.entitlements || [];
    const grandfathered = sources.some((s) => s.source === 'grandfathered' && s.active)
      || premium.source === 'grandfathered';
    const activeAdmin = sources.find((s) => s.source === 'admin' && s.active);
    const premiumActive = premium.active === true;

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
        <div class="mb-4 rounded-xl border-2 border-lavender p-4">
          <p class="text-xs font-bold uppercase text-text-soft mb-2">Premium &amp; rättigheter</p>
          <p class="text-sm mb-1"><span class="font-semibold">Premium:</span> ${premiumActive ? 'Aktiv' : 'Inaktiv'}</p>
          <p class="text-sm mb-3"><span class="font-semibold">Aktiv källa:</span> ${esc(effectiveAdminLine(premium, sources))}</p>
          <p class="text-xs font-bold uppercase text-text-soft mb-1">Källor</p>
          ${sourcesHtml(sources)}
          ${grandfathered ? '<p class="text-sm text-text-soft mt-3">Lifetime/grandfather är låst. Admin-grant skapas inte.</p>' : ''}
          ${grandfathered ? '' : `
          <div class="mt-4 space-y-3">
            <p class="text-xs font-bold uppercase text-text-soft">Ge Premium</p>
            <label class="block text-sm">Slutdatum
              <input id="hubPremiumExpires" type="date" class="mt-1 w-full border border-lavender rounded-xl px-3 py-2 min-h-[44px]">
            </label>
            <label class="block text-sm">Anledning
              <textarea id="hubPremiumReason" rows="2" maxlength="500" class="mt-1 w-full border border-lavender rounded-xl px-3 py-2" placeholder="Varför ges Premium?"></textarea>
            </label>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="hubGrantTemporary" class="px-4 py-2 min-h-[44px] bg-gold rounded-xl text-sm font-bold">Tillfälligt Premium</button>
              <button type="button" id="hubGrantPermanent" class="px-4 py-2 min-h-[44px] bg-lavender rounded-xl text-sm font-bold">Premium utan slutdatum</button>
            </div>
          </div>`}
          ${activeAdmin ? `
          <div class="mt-4">
            <button type="button" id="hubRevokeAdmin" class="px-4 py-2 min-h-[44px] bg-white border-2 border-navy rounded-xl text-sm font-bold">Återkalla admin-grant</button>
          </div>` : ''}
          <p id="hubPremiumStatus" class="text-sm mt-3 hidden"></p>
        </div>
        <div class="mb-4">
          <p class="text-xs font-bold uppercase text-text-soft mb-2">Senaste ärenden</p>
          ${(data.messages || []).slice(0, 5).map((m) => `<p class="text-sm mb-1"><span class="font-semibold">${esc(m.status)}</span> — ${esc((m.message_type || '').slice(0, 40))}</p>`).join('') || '<p class="text-sm text-text-soft">Inga kopplade ärenden</p>'}
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="closeFamilyHub()" class="px-4 py-2 min-h-[44px] bg-lavender rounded-xl text-sm font-bold">Stäng</button>
          <a href="#meddelanden" onclick="closeFamilyHub(); return adminNavClick(event)" class="px-4 py-2 min-h-[44px] bg-sky rounded-xl text-sm font-bold">Meddelanden</a>
          <a href="#incidenter" onclick="closeFamilyHub(); return adminNavClick(event)" class="px-4 py-2 min-h-[44px] bg-lavender rounded-xl text-sm font-bold">Incidenter</a>
          <a href="#paketintresse" onclick="closeFamilyHub(); return adminNavClick(event)" class="px-4 py-2 min-h-[44px] bg-gold rounded-xl text-sm font-bold">Paketintresse</a>
        </div>`;

    bindPremiumActions(body, familyId);
  }

  function setStatus(body, text, isError) {
    const el = body.querySelector('#hubPremiumStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.toggle('text-red-500', Boolean(isError));
  }

  function bindPremiumActions(body, familyId) {
    const reasonEl = body.querySelector('#hubPremiumReason');
    const dateEl = body.querySelector('#hubPremiumExpires');
    const tempBtn = body.querySelector('#hubGrantTemporary');
    const permBtn = body.querySelector('#hubGrantPermanent');
    const revokeBtn = body.querySelector('#hubRevokeAdmin');

    async function refresh() {
      const data = await Auth.api('/api/admin/families/' + familyId + '/overview');
      renderHub(body, data, familyId);
    }

    async function postGrant(payload) {
      return Auth.api('/api/admin/families/' + familyId + '/premium-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (tempBtn) {
      tempBtn.addEventListener('click', async () => {
        const reason = (reasonEl && reasonEl.value || '').trim();
        const dateVal = dateEl && dateEl.value;
        if (!reason || reason.length < 3) {
          setStatus(body, 'Ange en anledning (minst 3 tecken).', true);
          return;
        }
        if (!dateVal) {
          setStatus(body, 'Ange ett slutdatum.', true);
          return;
        }
        tempBtn.disabled = true;
        try {
          const result = await postGrant({
            type: 'temporary',
            expiresAt: new Date(dateVal + 'T23:59:59.000Z').toISOString(),
            reason,
          });
          if (result.skipped) {
            await refresh();
            return;
          }
          await refresh();
        } catch (_e) {
          setStatus(body, 'Kunde inte ge tillfälligt Premium.', true);
          tempBtn.disabled = false;
        }
      });
    }

    if (permBtn) {
      permBtn.addEventListener('click', async () => {
        const reason = (reasonEl && reasonEl.value || '').trim();
        if (!reason || reason.length < 3) {
          setStatus(body, 'Ange en anledning (minst 3 tecken).', true);
          return;
        }
        const ok = window.confirm(
          'Detta ger familjen Premium utan slutdatum. Det påverkar inte eventuell Apple- eller Google-prenumeration.'
        );
        if (!ok) return;
        permBtn.disabled = true;
        try {
          const result = await postGrant({
            type: 'permanent',
            reason,
          });
          if (result.skipped) {
            await refresh();
            return;
          }
          await refresh();
        } catch (_e) {
          setStatus(body, 'Kunde inte ge Premium utan slutdatum.', true);
          permBtn.disabled = false;
        }
      });
    }

    if (revokeBtn) {
      revokeBtn.addEventListener('click', async () => {
        const ok = window.confirm(
          'Den manuella Premium-granten återkallas. Familjen kan fortfarande ha Premium via lifetime, intro-år eller Apple/Google.'
        );
        if (!ok) return;
        revokeBtn.disabled = true;
        try {
          await Auth.api('/api/admin/families/' + familyId + '/premium-grant/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'manual_revoke' }),
          });
          await refresh();
        } catch (_e) {
          setStatus(body, 'Kunde inte återkalla admin-grant.', true);
          revokeBtn.disabled = false;
        }
      });
    }
  }

  async function openFamilyHub(familyId) {
    const modal = document.getElementById('familyHubModal');
    const body = document.getElementById('familyHubBody');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = '<p class="text-text-soft text-sm">Laddar...</p>';

    try {
      const data = await Auth.api('/api/admin/families/' + familyId + '/overview');
      renderHub(body, data, familyId);
    } catch (_e) {
      body.innerHTML = '<p class="text-red-500 text-sm">Kunde inte ladda familj</p>';
    }
  }

  function closeFamilyHub() {
    document.getElementById('familyHubModal')?.classList.add('hidden');
  }

  window.openFamilyHub = openFamilyHub;
  window.closeFamilyHub = closeFamilyHub;
})();
