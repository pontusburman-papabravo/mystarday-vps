// Admin: Subscription Settings section (Prenumeration)
// Handles: basic pricing, trial days, add-ons, payment toggle, v1.2 rollout + intresse.

let subscriptionData = null;
let packageRolloutMode = 'off';

const PACKAGE_LABELS = {
  reporting: 'Rapportering',
  pedagog: 'Pedagog',
  teacch: 'Extra stöd',
};

const SOURCE_LABELS = {
  bottom_nav_preview: 'Bottom nav',
  upgrade_page: 'Uppgradering',
  contextual_trigger: 'Kontextuell',
};

async function loadSubscriptionSettings() {
  try {
    const [sub, rollout] = await Promise.all([
      Auth.api('/api/admin/subscription-settings'),
      Auth.api('/api/admin/package-rollout/rollout').catch(() => ({ rollout_mode: 'off' })),
    ]);
    subscriptionData = sub;
    packageRolloutMode = rollout.rollout_mode || 'off';
    renderSubscriptionSettings();
    renderRolloutUI(rollout);
    await Promise.all([loadPackageStats(), loadPackageInterest()]);
  } catch (err) {
    console.error('[Admin:subscription] Load failed:', err);
  }
}

function renderRolloutUI(rollout) {
  const mode = rollout.rollout_mode || 'off';
  document.querySelectorAll('.rollout-mode-btn').forEach((btn) => {
    const active = btn.dataset.rollout === mode;
    btn.classList.toggle('bg-gold', active);
    btn.classList.toggle('border-gold', active);
    btn.classList.toggle('text-navy', active);
  });
  const derived = document.getElementById('rolloutDerived');
  if (derived) {
    derived.innerHTML = `
      <span>Preview: <strong>${mode !== 'off' ? 'PÅ' : 'AV'}</strong></span>
      <span>Intresse-CTA: <strong>${mode === 'interest' ? 'PÅ' : 'AV'}</strong></span>
      <span>IAP-köp: <strong>${mode === 'purchase' ? 'PÅ' : 'AV'}</strong></span>
      <span>Priser i UI: <strong>${rollout.show_prices ? 'PÅ' : 'AV'}</strong></span>
    `;
  }
}

async function saveRolloutMode(mode) {
  if (mode === 'purchase') {
    alert('Köp-live (IAP) är inte aktiverat ännu. Använd Intressefas för att mäta efterfrågan.');
    return;
  }
  if (mode !== 'off' && !confirm('Detta påverkar alla familjer utan köpt komponent. Fortsätta?')) return;
  const msg = document.getElementById('rolloutMsg');
  try {
    const data = await Auth.api('/api/admin/package-rollout/rollout', {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    });
    packageRolloutMode = data.rollout_mode;
    renderRolloutUI(data);
    msg.textContent = '✓ ' + (data.message || 'Sparat');
    msg.className = 'text-sm text-green-600';
  } catch (err) {
    msg.textContent = 'Fel: ' + (err.message || err);
    msg.className = 'text-sm text-red-500';
  }
}

async function loadPackageStats() {
  const period = document.getElementById('packageStatsPeriod')?.value || '30d';
  const summaryEl = document.getElementById('packageStatsSummary');
  const barsEl = document.getElementById('packageStatsBars');
  if (!summaryEl || !barsEl) return;

  try {
    const stats = await Auth.api('/api/admin/subscription-stats?period=' + encodeURIComponent(period));
    summaryEl.innerHTML = `
      <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Intresse totalt</span><strong class="text-lg">${stats.summary.interest_families_total}</strong></div>
      <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Aktiva paket</span><strong class="text-lg">${stats.summary.active_package_families}</strong></div>
      <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Arkiverade</span><strong class="text-lg">${stats.summary.archived_package_families}</strong></div>
      <div class="bg-lavender/20 rounded-xl p-3"><span class="block text-xs text-text-soft">Lifetime free</span><strong class="text-lg">${stats.summary.lifetime_free_families}</strong></div>
    `;

    const maxInterest = Math.max(1, ...stats.by_component.map((c) => c.interest_families));
    barsEl.innerHTML = stats.by_component.map((c) => {
      const pct = Math.round((c.interest_families / maxInterest) * 100);
      const conv = c.conversion_pct != null ? c.conversion_pct + '% preview→intresse' : '—';
      return `<div>
        <div class="flex justify-between text-xs mb-1"><span>${PACKAGE_LABELS[c.component] || c.component}</span><span>${c.interest_families} intresse · ${conv}</span></div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-gold rounded-full" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } catch (err) {
    barsEl.innerHTML = '<p class="text-sm text-red-500">Kunde inte ladda statistik</p>';
  }
}

async function loadPackageInterest() {
  const tbody = document.getElementById('packageInterestTableBody');
  const countEl = document.getElementById('packageInterestCount');
  if (!tbody) return;

  const component = document.getElementById('interestFilterComponent')?.value || '';
  const source = document.getElementById('interestFilterSource')?.value || '';
  const params = new URLSearchParams();
  if (component) params.set('component', component);
  if (source) params.set('source', source);

  try {
    const data = await Auth.api('/api/admin/package-interest?' + params.toString());
    if (!data.rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-text-soft">Inga intresseanmälningar ännu</td></tr>';
    } else {
      tbody.innerHTML = data.rows.map((row) => {
        const date = row.created_at ? new Date(row.created_at).toLocaleDateString('sv-SE') : '—';
        return `<tr class="border-b border-lavender/40">
          <td class="py-2 pr-3 whitespace-nowrap">${esc(date)}</td>
          <td class="py-2 pr-3">${esc(row.family_name || '—')}</td>
          <td class="py-2 pr-3">${esc(row.component_label || row.component)}</td>
          <td class="py-2 pr-3">${esc(SOURCE_LABELS[row.source] || row.source)}</td>
        </tr>`;
      }).join('');
    }
    if (countEl) countEl.textContent = `Visar ${data.rows.length} av ${data.total}`;
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-red-500">Kunde inte ladda intresse</td></tr>';
  }
}

function renderSubscriptionSettings() {
  if (!subscriptionData) return;

  // Basic
  document.getElementById('basicPriceInput').value = subscriptionData.basic_price_sek ?? 59;
  document.getElementById('basicTrialInput').value = subscriptionData.basic_trial_days ?? 14;
  document.getElementById('founderLimitInput').value = subscriptionData.founder_family_limit ?? 200;

  // IAP status — web Stripe removed; subscriptions via Apple/Google (RevenueCat)
  const label = document.getElementById('stripeStatusLabel');
  const hint = document.getElementById('stripeStatusHint');
  if (label) {
    label.textContent = 'IAP: Apple / Google Play';
    label.className = 'text-sm font-semibold text-navy';
  }
  if (hint) {
    hint.textContent = 'Webb-Stripe är borttagen. Prenumeration sköts via RevenueCat i mobilapparna.';
    hint.className = 'text-xs text-text-soft mt-0.5';
  }

  // Payment toggle (legacy — web payment disabled)
  const toggle = document.getElementById('paymentEnabledToggle');
  toggle.checked = !!subscriptionData.payment_enabled;
  document.getElementById('paymentToggleLabel').textContent = subscriptionData.payment_enabled ? 'PÅ' : 'AV';

  // Add-ons
  renderAddons(subscriptionData.addons || []);
}

function renderAddons(addons) {
  const list = document.getElementById('addonsList');
  const emptyMsg = document.getElementById('addonsEmptyMsg');

  if (!addons.length) {
    emptyMsg.classList.remove('hidden');
    list.querySelectorAll('.addon-card').forEach(el => el.remove());
    return;
  }

  emptyMsg.classList.add('hidden');
  // Remove existing cards
  list.querySelectorAll('.addon-card').forEach(el => el.remove());

  addons.forEach(addon => {
    const card = document.createElement('div');
    card.className = 'addon-card bg-lavender/20 rounded-xl p-4';
    card.dataset.id = addon.id;

    const activeBadge = addon.is_active
      ? '<span class="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Aktiverad</span>'
      : '<span class="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inaktiverad</span>';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-bold text-navy">${esc(addon.name)}</p>
          <p class="text-sm text-text-soft">${esc(addon.description || '')}</p>
          <p class="text-sm font-semibold text-navy mt-1">${addon.price_sek} kr/månad</p>
          <div class="mt-1">${activeBadge}</div>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button class="edit-addon-btn px-3 py-1 bg-gold hover:bg-yellow-500 text-navy rounded-lg text-xs font-bold transition-colors">Redigera</button>
          <button class="delete-addon-btn px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors">Ta bort</button>
        </div>
      </div>
    `;

    card.querySelector('.edit-addon-btn').addEventListener('click', () => openEditAddonForm(addon));
    card.querySelector('.delete-addon-btn').addEventListener('click', () => deleteAddon(addon.id));

    list.appendChild(card);
  });
}

function openEditAddonForm(addon) {
  const form = document.getElementById('addAddonForm');
  document.getElementById('addonName').value = addon.name;
  document.getElementById('addonPrice').value = addon.price_sek;
  document.getElementById('addonDesc').value = addon.description || '';
  document.getElementById('addonActive').checked = !!addon.is_active;
  form.dataset.editId = addon.id;
  form.classList.remove('hidden');
  document.getElementById('showAddAddonFormBtn').classList.add('hidden');
  document.getElementById('addAddonMsg').textContent = '';
}

async function deleteAddon(id) {
  if (!confirm('Ta bort denna add-on?')) return;
  try {
    await Auth.api(`/api/admin/subscription-settings/addons/${id}`, { method: 'DELETE' });
    // Reload
    await loadSubscriptionSettings();
  } catch (err) {
    alert('Kunde inte ta bort: ' + (err.message || err));
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  // Basic settings form
  document.getElementById('basicSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const price = document.getElementById('basicPriceInput').value;
    const trial = document.getElementById('basicTrialInput').value;
    const founderLimit = document.getElementById('founderLimitInput').value;
    const msg = document.getElementById('basicSettingsMsg');
    try {
      const data = await Auth.api('/api/admin/subscription-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          basic_price_sek: parseInt(price, 10),
          basic_trial_days: parseInt(trial, 10),
          founder_family_limit: parseInt(founderLimit, 10),
        }),
      });
      msg.textContent = '✓ Sparat!';
      msg.className = 'text-sm text-green-600';
      setTimeout(() => { msg.textContent = ''; msg.className = 'text-sm min-h-[1.4em]'; }, 3000);
    } catch (err) {
      msg.textContent = 'Fel: ' + (err.message || err);
      msg.className = 'text-sm text-red-500';
    }
  });

  // Show add-on form
  document.getElementById('showAddAddonFormBtn').addEventListener('click', () => {
    const form = document.getElementById('addAddonForm');
    delete form.dataset.editId;
    form.classList.remove('hidden');
    document.getElementById('showAddAddonFormBtn').classList.add('hidden');
    form.reset();
    document.getElementById('addAddonMsg').textContent = '';
  });

  // Cancel add-on form
  document.getElementById('cancelAddAddonBtn').addEventListener('click', () => {
    document.getElementById('addAddonForm').classList.add('hidden');
    document.getElementById('showAddAddonFormBtn').classList.remove('hidden');
  });

  // Add/edit add-on form
  document.getElementById('addAddonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const editId = form.dataset.editId;
    const payload = {
      name: document.getElementById('addonName').value.trim(),
      price_sek: parseInt(document.getElementById('addonPrice').value, 10),
      description: document.getElementById('addonDesc').value.trim(),
      is_active: document.getElementById('addonActive').checked,
    };
    const msg = document.getElementById('addAddonMsg');

    if (!payload.name) { msg.textContent = 'Namn krävs'; msg.className = 'text-sm text-red-500'; return; }
    if (isNaN(payload.price_sek) || payload.price_sek < 0) { msg.textContent = 'Ogiltigt pris'; msg.className = 'text-sm text-red-500'; return; }

    try {
      if (editId) {
        await Auth.api(`/api/admin/subscription-settings/addons/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        msg.textContent = '✓ Uppdaterad!';
      } else {
        await Auth.api('/api/admin/subscription-settings/addons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        msg.textContent = '✓ Tillagd!';
      }
      msg.className = 'text-sm text-green-600';
      form.classList.add('hidden');
      document.getElementById('showAddAddonFormBtn').classList.remove('hidden');
      delete form.dataset.editId;
      form.reset();
      await loadSubscriptionSettings();
      setTimeout(() => { msg.textContent = ''; msg.className = 'text-sm'; }, 3000);
    } catch (err) {
      msg.textContent = 'Fel: ' + (err.message || err);
      msg.className = 'text-sm text-red-500';
    }
  });

  // Payment toggle
  document.getElementById('paymentEnabledToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    document.getElementById('paymentToggleLabel').textContent = enabled ? 'PÅ' : 'AV';
    const msg = document.getElementById('paymentToggleMsg');
    try {
      await Auth.api('/api/admin/subscription-settings/payment-enabled', {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      msg.textContent = enabled ? '✓ Betalning aktiverad' : '✓ Betalning avaktiverad';
      msg.className = 'text-sm text-green-600 mt-2';
    } catch (err) {
      msg.textContent = 'Fel: ' + (err.message || err);
      msg.className = 'text-sm text-red-500 mt-2';
      // Revert toggle on error
      e.target.checked = !enabled;
      document.getElementById('paymentToggleLabel').textContent = !enabled ? 'PÅ' : 'AV';
    }
  });

  document.querySelectorAll('.rollout-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      saveRolloutMode(btn.dataset.rollout);
    });
  });

  document.getElementById('packageStatsPeriod')?.addEventListener('change', loadPackageStats);
  document.getElementById('reloadPackageInterestBtn')?.addEventListener('click', loadPackageInterest);
  document.getElementById('interestFilterComponent')?.addEventListener('change', loadPackageInterest);
  document.getElementById('interestFilterSource')?.addEventListener('change', loadPackageInterest);

  // Initialize on section show (called from admin-core.js showSection)
  // We also need to ensure data is loaded on first navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSubscriptionSettings);
  } else {
    loadSubscriptionSettings();
  }
});