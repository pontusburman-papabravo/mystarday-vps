// Admin: Subscription Settings section (Prenumeration)
// Handles: basic pricing, trial days, add-ons, payment toggle.

let subscriptionData = null;

async function loadSubscriptionSettings() {
  try {
    subscriptionData = await Auth.api('/api/admin/subscription-settings');
    renderSubscriptionSettings();
  } catch (err) {
    console.error('[Admin:subscription] Load failed:', err);
  }
}

function renderSubscriptionSettings() {
  if (!subscriptionData) return;

  // Basic
  document.getElementById('basicPriceInput').value = subscriptionData.basic_price_sek ?? 59;
  document.getElementById('basicTrialInput').value = subscriptionData.basic_trial_days ?? 14;

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
    const msg = document.getElementById('basicSettingsMsg');
    try {
      const data = await Auth.api('/api/admin/subscription-settings', {
        method: 'PATCH',
        body: JSON.stringify({ basic_price_sek: parseInt(price, 10), basic_trial_days: parseInt(trial, 10) }),
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

  // Initialize on section show (called from admin-core.js showSection)
  // We also need to ensure data is loaded on first navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSubscriptionSettings);
  } else {
    loadSubscriptionSettings();
  }
});