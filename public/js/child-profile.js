/**
 * child-profile.js — Barnprofil /family/child/:id (vuxenmeny v2 Sprint 3).
 */
(function () {
  'use strict';

  const TABS = [
    { id: 'overview', label: 'Översikt' },
    { id: 'log', label: 'Daglig logg' },
    { id: 'schema', label: 'Schema' },
    { id: 'rewards', label: 'Belöningar' },
    { id: 'progress', label: 'Framsteg' },
    { id: 'setup', label: 'Inställningar' },
    { id: 'child-view', label: 'Barnvy' },
  ];

  let childId = null;
  let child = null;
  let dashRow = null;
  let goalRow = null;
  let pinBuffer = '';

  function trackTab(tab) {
    if (typeof window.analytics !== 'undefined' && analytics.track) {
      analytics.track(null, 'child_profile_section', { tab: tab, child_id: childId });
    }
  }

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function parseChildId() {
    const parts = (window.location.pathname || '').split('/').filter(Boolean);
    const idx = parts.indexOf('child');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return null;
  }

  function currentTab() {
    const p = new URLSearchParams(window.location.search);
    return p.get('tab') || 'overview';
  }

  function setTab(tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
    render();
    window.requestAnimationFrame(function () {
      const mount = document.getElementById('childProfileMount');
      if (mount) mount.scrollIntoView({ block: 'start', behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  async function loadData() {
    childId = parseChildId();
    if (!childId) throw new Error('Saknar barn-id');

    const statsRes = await window.apiFetch('/api/family/dashboard-stats');
    if (!statsRes.ok) throw new Error('Kunde inte ladda status');
    const stats = await statsRes.json();
    dashRow = (stats.children || []).find(function (c) { return c.id === childId; });

    const childRes = await window.apiFetch('/api/children/' + encodeURIComponent(childId));
    if (!childRes.ok) throw new Error('Barn hittades inte');
    child = await childRes.json();

    try {
      const vcRes = await window.apiFetch('/api/children/' + encodeURIComponent(childId) + '/view-config');
      if (vcRes.ok) child.child_view_config = await vcRes.json();
    } catch (_) { /* optional */ }

    const goalsRes = await window.apiFetch('/api/rewards/goals');
    if (goalsRes.ok) {
      const goalsData = await goalsRes.json();
      goalRow = (goalsData.goals || []).find(function (g) { return g.child_id === childId; });
    }
  }

  function formatAge(birthday) {
    if (!birthday) return null;
    const bday = new Date(birthday);
    if (Number.isNaN(bday.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
    if (age < 0) return null;
    return age + ' år';
  }

  function profileSubtitle(child) {
    const ageText = formatAge(child && child.birthday);
    return ageText ? ('Barnprofil · ' + ageText) : 'Barnprofil';
  }

  function pinSetupHtml() {
    return '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4" id="profilePinBlock">' +
      '<p class="font-semibold text-navy mb-2">PIN-kod (4 siffror)</p>' +
      '<div class="flex gap-2 justify-center mb-3" id="profilePinDots">' +
      [0, 1, 2, 3].map(function () {
        return '<span class="w-3 h-3 rounded-full bg-lavender inline-block profile-pin-dot"></span>';
      }).join('') +
      '</div>' +
      '<div class="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-3" id="profilePinPad">' +
      ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(function (d) {
        if (d === '') return '<span></span>';
        return '<button type="button" class="p-3 bg-sky rounded-xl font-bold text-navy min-h-[48px]" data-pin-digit="' + d + '">' + d + '</button>';
      }).join('') +
      '</div>' +
      '<button type="button" id="profilePinSave" class="w-full p-3 bg-gold text-navy rounded-xl font-bold" disabled>Spara PIN</button>' +
      '</div>';
  }

  function renderPinDots() {
    const dots = document.querySelectorAll('.profile-pin-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('bg-gold', i < pinBuffer.length);
      dot.classList.toggle('bg-lavender', i >= pinBuffer.length);
    });
    const save = document.getElementById('profilePinSave');
    if (save) save.disabled = pinBuffer.length !== 4;
  }

  async function rewardsTabHtml() {
    let html = quickActionsHtml();
    if (window.PendingApprovals) {
      try {
        const pending = await PendingApprovals.fetchPending();
        const block = PendingApprovals.renderList(pending, {
          childId: childId,
          childName: child.name,
          heading: 'Väntar på godkännande',
        });
        if (block.indexOf('Inga väntande') === -1) html += '<div class="mb-4">' + block + '</div>';
      } catch (_) { /* silent */ }
    }
    if (goalRow && goalRow.reward_name) {
      const pct = goalRow.progress_pct != null ? Math.min(100, goalRow.progress_pct) : 0;
      html +=
        '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
        '<p class="text-sm text-text-soft">Aktuellt mål</p>' +
        '<p class="font-bold text-navy">' + esc(goalRow.reward_icon || '🎁') + ' ' + esc(goalRow.reward_name) + '</p>' +
        '<div class="h-2 bg-lavender rounded-full mt-2 overflow-hidden"><div class="h-full bg-gold" style="width:' + pct + '%"></div></div>' +
        '<p class="text-xs text-text-soft mt-1">' + (goalRow.stars_toward_goal || 0) + ' / ' + (goalRow.star_cost || '?') + ' ⭐</p>' +
        '</div>';
    } else {
      html += '<p class="text-text-soft text-sm mb-3">Inget aktivt mål — välj i biblioteket.</p>';
    }
    html += '<a href="/library#rewards" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Hantera belöningar →</a>';
    return html;
  }

  function quickActionsHtml() {
    const paused = dashRow && dashRow.today_is_paused;
    const logId = dashRow && dashRow.today_log_id;
    return '<div class="grid grid-cols-2 gap-2 mb-6">' +
      '<button type="button" data-action="pause" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">' +
      (paused ? '▶ Återuppta dag' : '⏸ Pausa idag') + '</button>' +
      '<button type="button" data-action="stars" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">⭐ Extra stjärnor</button>' +
      '<a href="/daily-log?childId=' + encodeURIComponent(childId) + '&date=' + encodeURIComponent(new Date().toISOString().slice(0, 10)) + '" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px] flex items-center justify-center col-span-2">📅 Fyll i i efterhand</a>' +
      '<button type="button" data-action="once" class="p-3 bg-white border border-lavender rounded-xl font-semibold text-sm text-navy min-h-[52px]">📋 Engångsaktivitet</button>' +
      '</div>';
  }

  function incompleteDaysCount() {
    if (!dashRow || !dashRow.history) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return dashRow.history.filter(function (d) {
      return d.date < today && d.total > 0 && d.completed < d.total && !d.is_paused;
    }).length;
  }

  function overviewAlertsHtml() {
    let html = '';
    const incomplete = incompleteDaysCount();
    if (incomplete > 0) {
      html +=
        '<a href="/daily-log?childId=' + encodeURIComponent(childId) + '" class="block p-4 mb-4 bg-coral/10 border border-coral rounded-2xl">' +
        '<p class="font-semibold text-navy">📅 ' + incomplete + ' ofullständig' + (incomplete === 1 ? ' dag' : 'a dagar') + '</p>' +
        '<p class="text-sm text-text-soft">Fyll i i efterhand i daglig logg</p></a>';
    }
    return html;
  }

  async function progressTabHtml() {
    const res = await window.apiFetch('/api/family/star-history');
    if (!res.ok) {
      return '<p class="text-text-soft">Kunde inte ladda stjärnhistorik.</p>';
    }
    const data = await res.json();
    const weeks = data.weeks || [];
    if (!weeks.length) {
      return '<p class="text-text-soft mb-4">Ingen stjärnhistorik ännu.</p>' +
        '<a href="/reports?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Öppna rapporter →</a>';
    }
    const totals = weeks.map(function (w) { return (w.child_totals && w.child_totals[childId]) || 0; });
    const max = Math.max.apply(null, totals.concat([1]));
    const bars = weeks.map(function (w, i) {
      const val = totals[i] || 0;
      const h = Math.max(val > 0 ? 8 : 0, Math.round((val / max) * 100));
      return '<div class="flex-1 flex flex-col items-center gap-1 min-w-[36px]">' +
        '<span class="text-[10px] font-bold text-gold">' + val + '⭐</span>' +
        '<div class="w-full bg-lavender rounded-t-lg relative" style="height:80px">' +
        '<div class="absolute bottom-0 left-0 right-0 bg-gold rounded-t-lg" style="height:' + h + '%"></div></div>' +
        '<span class="text-[10px] text-text-soft">' + esc(w.week_label || '') + '</span></div>';
    }).join('');
    return '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4 overflow-hidden">' +
      '<p class="text-sm text-text-soft mb-3">Stjärnor per vecka (8 veckor)</p>' +
      '<div class="max-w-full overflow-x-auto pb-1"><div class="flex gap-1 items-end">' + bars + '</div></div></div>' +
      '<a href="/reports?child=' + encodeURIComponent(childId) + '" class="block p-4 bg-white border border-lavender rounded-xl font-semibold text-center">Se utveckling i rapporter →</a>';
  }

  function tabContent(tab) {
    if (tab === 'overview') {
      const stars = dashRow ? (dashRow.stars_today || 0) : '—';
      const paused = dashRow && dashRow.today_is_paused;
      return quickActionsHtml() +
        overviewAlertsHtml() +
        '<div class="bg-white rounded-2xl border border-lavender p-4 mb-4">' +
        '<p class="text-sm text-text-soft">Idag</p>' +
        '<p class="text-2xl font-heading font-bold text-navy">' + stars + ' ⭐</p>' +
        (paused ? '<p class="text-sm text-coral font-semibold mt-1">⏸ Pausad idag</p>' : '') +
        '</div>';
    }
    if (tab === 'log') {
      return '<a href="/daily-log?childId=' + encodeURIComponent(childId) + '" class="block p-4 bg-gold text-white rounded-xl font-bold text-center">Öppna daglig logg →</a>';
    }
    if (tab === 'schema') {
      return '<div id="profileSchemaBody">Laddar schema…</div>';
    }
    if (tab === 'rewards') {
      return '<div id="profileRewardsBody">Laddar…</div>';
    }
    if (tab === 'progress') {
      return '<div id="profileProgressBody">Laddar…</div>';
    }
    if (tab === 'setup') {
      return '<div id="childProfileSetupBody">Laddar…</div>';
    }
    if (tab === 'child-view') {
      return '<p class="text-text-soft mb-4">Låt barnet logga in på denna enhet.</p>' +
        '<button type="button" id="childHandoffBtn" class="w-full p-4 bg-gold text-white rounded-xl font-bold">Barnet loggar in</button>';
    }
    return '';
  }

  function render() {
    const mount = document.getElementById('childProfileMount');
    if (!mount || !child) return;
    const tab = currentTab();
    const tabsHtml = TABS.map(function (t) {
      const active = t.id === tab;
      return '<button type="button" data-tab="' + t.id + '" class="child-profile-tab px-2 py-2 rounded-xl text-xs sm:text-sm font-semibold text-center min-h-[44px]' + (active ? ' is-active' : '') + '">' + t.label + '</button>';
    }).join('');

    mount.innerHTML =
      '<a href="/family" class="text-sm text-gold font-semibold mb-4 inline-block">← Familj</a>' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<span class="text-4xl">' + esc(child.emoji || '⭐') + '</span>' +
      '<div><h1 class="text-2xl font-heading font-bold text-navy">' + esc(child.name) + '</h1>' +
      '<p class="text-sm text-text-soft child-profile-subtitle">' + esc(profileSubtitle(child)) + '</p></div></div>' +
      '<div id="childProfileTabBar" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6 sticky top-0 z-20 -mx-4 px-4 py-2 bg-sky/95 backdrop-blur-sm border-b border-lavender/40">' + tabsHtml + '</div>' +
      '<div id="childProfileTabBody">' + tabContent(tab) + '</div>';

    mount.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const t = btn.getAttribute('data-tab');
        trackTab(t);
        setTab(t);
      });
    });

    if (tab === 'rewards') {
      rewardsTabHtml().then(function (html) {
        const el = document.getElementById('profileRewardsBody');
        if (el) el.innerHTML = html;
        if (window.PendingApprovals) PendingApprovals.bindRowActions(mount);
        mount.querySelectorAll('[data-action]').forEach(function (btn) {
          btn.addEventListener('click', onQuickAction);
        });
      }).catch(function () {
        const el = document.getElementById('profileRewardsBody');
        if (el) el.innerHTML = '<p class="text-coral text-sm">Kunde inte ladda belöningar.</p>';
      });
    }

    if (tab === 'progress') {
      progressTabHtml().then(function (html) {
        const el = document.getElementById('profileProgressBody');
        if (el) el.innerHTML = html;
      }).catch(function () {
        const el = document.getElementById('profileProgressBody');
        if (el) el.innerHTML = '<p class="text-coral text-sm">Kunde inte ladda framsteg.</p>';
      });
    }

    if (tab === 'schema') {
      if (window.ChildProfileSetup) {
        ChildProfileSetup.schemaSummaryHtml(childId, child.name).then(function (html) {
          const el = document.getElementById('profileSchemaBody');
          if (el) el.innerHTML = html;
        }).catch(function () {
          const el = document.getElementById('profileSchemaBody');
          if (el) el.innerHTML = '<p class="text-coral text-sm">Kunde inte ladda schema.</p>';
        });
      }
    }

    if (tab === 'setup') {
      pinBuffer = '';
      const viewConfig = child.child_view_config || child.view_config || {};
      function wirePin() {
        mount.querySelectorAll('[data-pin-digit]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const d = btn.getAttribute('data-pin-digit');
            if (d === '⌫') pinBuffer = pinBuffer.slice(0, -1);
            else if (pinBuffer.length < 4) pinBuffer += d;
            renderPinDots();
          });
        });
        const pinSave = document.getElementById('profilePinSave');
        if (pinSave) {
          pinSave.addEventListener('click', async function () {
            if (pinBuffer.length !== 4) return;
            const res = await window.apiFetch('/api/children/' + encodeURIComponent(childId) + '/pin', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin: pinBuffer }),
            });
            if (!res.ok) {
              let e = {};
              try { e = await res.json(); } catch (_) { /* non-json */ }
              showToast(e.error || 'Kunde inte spara PIN', true);
              return;
            }
            showToast('PIN sparad!');
            pinBuffer = '';
            renderPinDots();
          });
        }
      }
      if (window.ChildProfileSetup) {
        ChildProfileSetup.wireSetup(child, viewConfig, pinSetupHtml(), wirePin);
        wireDeleteChild(child);
      } else {
        mount.innerHTML = pinSetupHtml();
        wirePin();
      }
    }

    mount.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', onQuickAction);
    });

    const handoff = document.getElementById('childHandoffBtn');
    if (handoff) {
      handoff.addEventListener('click', function () {
        if (window.Auth && Auth.logout) Auth.logout({ childFlow: true });
      });
    }
  }

  function wireDeleteChild(childRow) {
    const btn = document.getElementById('profileDeleteChildBtn');
    const modal = document.getElementById('deleteChildModal');
    const nameEl = document.getElementById('deleteChildTargetName');
    const cancelBtn = document.getElementById('deleteChildCancelBtn');
    const confirmBtn = document.getElementById('deleteChildConfirmBtn');
    if (!btn || !modal || !nameEl || !confirmBtn) return;

    function closeDeleteModal() {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    btn.onclick = function () {
      nameEl.textContent = childRow.name || 'barnet';
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };

    if (cancelBtn) cancelBtn.onclick = closeDeleteModal;

    confirmBtn.onclick = async function () {
      confirmBtn.disabled = true;
      try {
        const res = await window.apiFetch('/api/family/children/' + encodeURIComponent(childRow.id), {
          method: 'DELETE',
        });
        if (!res.ok) {
          let err = {};
          try { err = await res.json(); } catch (_) { /* non-json */ }
          showToast(err.error || 'Kunde inte ta bort barnet', true);
          return;
        }
        closeDeleteModal();
        showToast('Barnet är borttaget');
        window.location.href = '/family';
      } catch (err) {
        showToast('Kunde inte ta bort: ' + (err.message || 'okänt fel'), true);
      } finally {
        confirmBtn.disabled = false;
      }
    };
  }

  async function onQuickAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    if (action === 'pause') {
      const logId = dashRow && dashRow.today_log_id;
      if (!logId) { showToast('Inget schema idag', true); return; }
      const paused = dashRow.today_is_paused;
      const ep = paused ? 'unpause' : 'pause';
      const res = await window.apiFetch('/api/daily-logs/' + logId + '/' + ep, { method: 'PUT' });
      if (!res.ok) { showToast('Kunde inte uppdatera', true); return; }
      showToast(paused ? 'Dagen återupptagen' : 'Dagen pausad');
      await loadData();
      render();
    }
    if (action === 'stars') {
      document.getElementById('manualStarModal').classList.remove('hidden');
    }
    if (action === 'once') {
      window.location.href = '/schedule?child=' + encodeURIComponent(childId) + '&once=1';
    }
  }

  async function submitManualStar() {
    const count = parseInt(document.getElementById('manualStarCount').value, 10) || 1;
    const reason = document.getElementById('manualStarReason').value.trim();
    if (!reason) { showToast('Skriv en anledning', true); return; }
    const res = await window.apiFetch('/api/rewards/manual-stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, star_count: count, reason: reason }),
    });
    if (!res.ok) { showToast('Kunde inte ge stjärnor', true); return; }
    document.getElementById('manualStarModal').classList.add('hidden');
    showToast('Stjärnor givna!');
    await loadData();
    render();
  }

    async function boot() {
    try {
      Auth.requireAuth();
      await loadData();
      render();
      document.getElementById('manualStarCancel')?.addEventListener('click', function () {
        document.getElementById('manualStarModal').classList.add('hidden');
      });
      document.getElementById('manualStarSubmit')?.addEventListener('click', submitManualStar);
    } catch (err) {
      const mount = document.getElementById('childProfileMount');
      if (mount) mount.innerHTML = '<p class="text-coral text-center py-8">' + esc(err.message) + '</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
