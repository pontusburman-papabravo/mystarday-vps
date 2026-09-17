// library-treasury.js — Skattkammaren (treasury) parent read-only view
// Owns: loading child list for treasury selector, rendering the child picker,
//       loading and rendering reward cards per child with star balance.
// Does NOT own: reward management (library.js), standard library (library-standard.js).

// ─── Skattkammaren (parent read-only view of child's rewards) ─────────────────
function tpt(key, params) {
  return (typeof window.pt === 'function') ? window.pt(key, params) : key;
}

let _treasuryChildsLoaded = false;
let _treasuryChildren = [];
let _treasurySelectedChild = null;

async function loadTreasuryChildren() {
  try {
    const res = await window.apiFetch('/api/children');
    if (res.ok) {
      _treasuryChildren = await res.json();
    }
    _treasuryChildsLoaded = true;
    renderTreasuryChildSelector();
    // Auto-select first child if only one
    if (_treasuryChildren.length === 1) {
      loadTreasuryForChild(_treasuryChildren[0].id);
    }
  } catch {
    document.getElementById('treasuryChildSelector').innerHTML =
      '<p class="text-red-500 text-sm">' + tpt('family.treasury.loadChildrenFailed') + '</p>';
  }
}

function renderTreasuryChildSelector() {
  const container = document.getElementById('treasuryChildSelector');
  if (_treasuryChildren.length === 0) {
    container.innerHTML = '<div class="text-center py-8 bg-sky/40 rounded-2xl border-2 border-dashed border-lavender w-full">'
      + '<p class="text-2xl mb-2">👶</p>'
      + '<p class="font-heading font-bold text-navy mb-1">' + tpt('family.treasury.noChildren') + '</p>'
      + '<p class="text-sm text-text-soft">' + tpt('family.treasury.addHint') + '</p></div>';
    return;
  }
  container.innerHTML = _treasuryChildren.map(child => `
    <button id="treasury-child-btn-${child.id}"
      onclick="loadTreasuryForChild('${child.id}')"
      class="treasury-child-btn flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-lavender bg-white hover:border-gold transition-all font-semibold text-sm text-navy min-h-[44px]">
      <span class="text-xl">${child.emoji || '⭐'}</span>
      <span>${escHtml(child.name)}</span>
    </button>
  `).join('');
}

async function loadTreasuryForChild(childId) {
  _treasurySelectedChild = childId;
  // Highlight selected child button
  document.querySelectorAll('.treasury-child-btn').forEach(btn => {
    btn.classList.toggle('border-gold', btn.id === `treasury-child-btn-${childId}`);
    btn.classList.toggle('bg-gold-light', btn.id === `treasury-child-btn-${childId}`);
    btn.classList.toggle('border-lavender', btn.id !== `treasury-child-btn-${childId}`);
  });

  const loading = document.getElementById('treasuryLoading');
  const grid = document.getElementById('treasuryGrid');
  const empty = document.getElementById('treasuryEmpty');
  const balanceBar = document.getElementById('treasuryBalanceBar');

  loading.classList.remove('hidden');
  grid.classList.add('hidden');
  empty.classList.add('hidden');
  balanceBar.classList.add('hidden');

  try {
    const res = await window.apiFetch(`/api/rewards/child-view/${childId}`);
    if (!res.ok) throw new Error('Fetch error');
    const data = await res.json();
    loading.classList.add('hidden');

    // Update balance bar
    balanceBar.classList.remove('hidden');
    document.getElementById('treasuryBalanceNum').textContent = `⭐ ${data.starBalance}`;

    const { rewards, redemptions, child } = data;

    if (rewards.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    // Update header
    document.getElementById('treasuryChildName').textContent = `${child.emoji || ''} ${child.name}`;
    document.getElementById('treasuryRewardCount').textContent = tpt('family.treasury.rewardCount', { count: rewards.length });

    // Render grid
    const gridInner = document.getElementById('treasuryGridInner');
    gridInner.innerHTML = rewards.map(r => {
      const isRedeemed = redemptions.some(rd => rd.reward_id === r.id && (rd.status === 'approved' || rd.status === 'auto'));
      const hasPending = redemptions.some(rd => rd.reward_id === r.id && rd.status === 'pending');
      const canAfford = data.starBalance >= r.star_cost;
      const isLocked = !canAfford && !isRedeemed && !hasPending;
      const pct = Math.min(100, Math.round((data.starBalance / r.star_cost) * 100));

      let badge = '';
      if (isRedeemed) badge = `<span class="trg-badge">✅</span>`;
      else if (hasPending) badge = `<span class="trg-badge">⏳</span>`;
      else if (canAfford) badge = `<span class="trg-badge">🌟</span>`;
      else badge = `<span class="trg-badge">🔒</span>`;

      const cardClass = isRedeemed ? 'earned' : hasPending ? 'pending' : canAfford ? 'affordable' : 'locked';

      return `<div class="trg-item ${cardClass}">
        ${badge}
        <div class="trg-icon">${r.icon || '🎁'}</div>
        <div class="trg-name">${escHtml(r.name)}</div>
        <div class="trg-cost">⭐ ${r.star_cost}</div>
        ${isLocked ? `<div class="trg-bar"><div class="trg-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
    }).join('');

    grid.classList.remove('hidden');
  } catch {
    loading.classList.add('hidden');
    empty.classList.remove('hidden');
  }
}
