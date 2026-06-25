
    // initBirthdayPicker and updateBirthdayDays are now in /js/birthday-picker.js
    function updateBirthdayHidden(prefix) {
      const y = document.getElementById(prefix + 'Year').value;
      const m = document.getElementById(prefix + 'Month').value;
      const d = document.getElementById(prefix + 'Day').value;
      document.getElementById(prefix).value = (y && m && d) ? `${y}-${m}-${d}` : '';
    }
    function setBirthdayPicker(prefix, dateStr) {
      if (!dateStr) {
        document.getElementById(prefix + 'Year').value = '';
        document.getElementById(prefix + 'Month').value = '';
        document.getElementById(prefix + 'Day').value = '';
        document.getElementById(prefix).value = '';
        return;
      }
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length < 3) return;
      document.getElementById(prefix + 'Year').value = parts[0];
      document.getElementById(prefix + 'Month').value = parts[1];
      updateBirthdayDays(prefix);
      document.getElementById(prefix + 'Day').value = parts[2];
      updateBirthdayHidden(prefix);
    }

    // ─── Auth guard ───────────────────────────────────────
    if (!Auth.requireAuth()) { /* redirected */ }
    const user = Auth.getUser();
    document.getElementById('userEmail').textContent = user?.email || '';
    if (user?.isAdmin) {
      document.querySelector('a[href="/admin"]') || (document.querySelector('.space-y-2').innerHTML +=
        '<li><a href="/admin" class="block px-4 py-2 text-white hover:bg-navy-soft rounded-lg transition-colors">Admin</a></li>');
      document.getElementById('inviteBtn').classList.remove('hidden');
    }

    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

    // ─── State ───────────────────────────────────────────
    let familyData = null;
    let familyChildren = [];
    let drawerChildId = null;
    let drawerChildData = null;
    let drawerEmojiSelected = '';

    var _domRenderChildAvatar = window.renderChildAvatar;
    function childAvatarHtml(child, size) {
      if (typeof _domRenderChildAvatar === 'function') {
        return _domRenderChildAvatar(child, size || 32);
      }
      size = size || 32;
      var emoji = (child && child.emoji) || '⭐';
      var safe = String(emoji)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return '<span style="display:inline-flex;align-items:center;font-size:' +
        Math.round(size * 0.8) + 'px;line-height:1;">' + safe + '</span>';
    }

    // ─── Init ────────────────────────────────────────────
    async function init() {
      try {
        familyData = await Auth.api('/api/family');
        renderAll(familyData);
        initFamilyDnD();
        if (window.FamilyMuseum) FamilyMuseum.mount('familyMuseumMount');

        // Handle URL params: ?child=ID&tab=rewards opens the child drawer on that tab
        const urlParams = new URLSearchParams(window.location.search);
        const childParam = urlParams.get('child');
        const tabParam = urlParams.get('tab');
        if (childParam && familyChildren.some(c => c.id === childParam)) {
          openChildDrawer(childParam, tabParam || undefined);
        }
      } catch (err) {
        showToast('Kunde inte ladda familjeinformation: ' + err.message, true);
      }
    }
    initBirthdayPicker('drawerEditBirthday');
    init();
    if (window.ParentMagicShell) ParentMagicShell.init('family');

    function renderAll(data) {
      var chestSection = document.getElementById('familyChestSection');
      var nameSection = document.getElementById('familyNameSection');
      if (chestSection) chestSection.classList.remove('hidden');
      if (nameSection) nameSection.classList.remove('hidden');
      document.getElementById('familyNameInput').value = data.name || '';
      if (window.FamilyChestSetting) FamilyChestSetting.init(data);

      const children = data.children || [];
      familyChildren = children;
      window.familyChildren = children;
      if (window.CustodySettings) CustodySettings.reload();

      const summaryEl = document.getElementById('familySummary');
      if (summaryEl) {
        const parents = data.parents || [];
        const parts = [];
        if (children.length) parts.push(children.length === 1 ? '1 barn' : children.length + ' barn');
        if (parents.length) parts.push(parents.length === 1 ? '1 förälder' : parents.length + ' föräldrar');
        summaryEl.textContent = parts.join(' · ');
      }
      const noChildren = document.getElementById('noChildrenState');
      const childrenGrid = document.getElementById('childrenGrid');
      const switcher = document.getElementById('childSwitcherTabs');
      if (children.length === 0) {
        noChildren.classList.remove('hidden');
        childrenGrid.classList.add('hidden');
        switcher.classList.add('hidden');
      } else {
        noChildren.classList.add('hidden');
        childrenGrid.classList.remove('hidden');
        childrenGrid.innerHTML = children.map(c => renderChildCard(c)).join('');
        if (children.length >= 2) {
          switcher.classList.remove('hidden');
          switcher.innerHTML = children.map(c => `
            <button onclick="openChildDrawer('${c.id}')"
              class="flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-colors border-lavender text-navy hover:border-gold hover:bg-gold-light dark:text-white dark:border-navy-soft dark:hover:border-gold">
              ${childAvatarHtml(c, 24)} ${escHtml(c.name)}
            </button>`).join('');
        } else {
          switcher.classList.add('hidden');
        }
      }

      const parents = data.parents || [];
      const pending = data.pendingInvites || [];
      const noAdults = document.getElementById('noAdultsState');
      const adultsGrid = document.getElementById('adultsGrid');
      if (parents.length === 0) {
        noAdults.classList.remove('hidden');
        adultsGrid.classList.add('hidden');
      } else {
        noAdults.classList.add('hidden');
        adultsGrid.classList.remove('hidden');
        adultsGrid.innerHTML = parents.map(p => renderAdultCard(p, children)).join('');
      }

      const pendingSection = document.getElementById('pendingInvitesSection');
      const pendingList = document.getElementById('pendingInvitesList');
      if (user?.isAdmin && pending.length > 0) {
        pendingSection.classList.remove('hidden');
        pendingList.innerHTML = pending.map(inv => `
          <div class="flex items-center justify-between bg-lavender dark:bg-navy-soft rounded-xl px-4 py-3">
            <div>
              <span class="font-medium text-navy dark:text-white">${escapeHtml(inv.email)}</span>
              <span class="ml-2 text-xs text-text-soft italic">Väntar...</span>
            </div>
            <button onclick="withdrawInvite('${escapeHtml(inv.id)}')" class="text-xs text-red-500 hover:text-red-600 font-semibold">Återkalla</button>
          </div>
        `).join('');
      } else {
        pendingSection.classList.add('hidden');
      }

      if (window.ParentMagicPageHub && window.ParentMagicShell && ParentMagicShell.isMagic()) {
        ParentMagicPageHub.refresh('family', true);
      }
    }

    // ─── Child card (compact clickable summary) ──────────
    function renderChildCard(child) {
      const ageText = child.birthday ? calculateAge(child.birthday) : null;
      // Build mini status badges for active toggles
      const badges = [];
      if (child.lock_schedule) badges.push('<span class="text-xs bg-lavender dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded-full">🔒 Låst</span>');
      if (child.hide_clock) badges.push('<span class="text-xs bg-sky dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded-full">🕐 Dold klocka</span>');

      return `
        <div class="bg-sky dark:bg-navy-soft rounded-2xl p-4 card-hover fade-in child-card-wrap relative"
             data-child-id="${child.id}">
          <span class="drag-handle text-gray-300 text-lg select-none cursor-grab absolute top-3 right-10"
                title="Dra för att ändra ordning"
                onclick="event.stopPropagation()">⠿</span>

          <div class="flex items-center gap-3 mb-3">
            ${childAvatarHtml(child, 48)}
            <div class="flex-1 min-w-0">
              <p class="font-heading font-bold text-navy dark:text-white">${escHtml(child.name)}</p>
              <p class="text-xs text-text-soft">${ageText || 'Ålder okänd'}</p>
            </div>
            ${child.has_pin
              ? '<span class="text-xs bg-mint text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0" title="PIN kod inställd">PIN ✅</span>'
              : '<span class="text-xs bg-coral text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0" title="Ingen PIN kod">PIN ❌</span>'}
          </div>

          ${badges.length > 0 ? `<div class="flex gap-1.5 flex-wrap mb-3">${badges.join('')}</div>` : ''}

          <div class="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <a href="/family/child/${child.id}?tab=setup"
               class="family-child-settings-btn flex w-full items-center justify-center gap-2 px-4 py-3.5 bg-gold hover:bg-yellow-500 text-navy text-sm font-bold rounded-xl transition-colors min-h-[48px]">
              ⚙️ Inställningar
            </a>
            <div class="grid grid-cols-2 gap-2">
              <a href="/family/child/${child.id}"
                 class="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/80 dark:bg-navy border border-lavender dark:border-navy-soft text-navy dark:text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px]">
                🌟 Profil
              </a>
              <a href="/schedule?child=${child.id}"
                 class="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-navy hover:bg-navy-soft dark:bg-gold dark:hover:bg-yellow-500 text-white dark:text-navy text-xs font-semibold rounded-xl transition-colors min-h-[44px]">
                📅 Schema
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // ─── Child settings drawer ────────────────────────────
    async function openChildDrawer(childId, initialTab) {
      drawerChildId = childId;
      const child = familyChildren.find(c => c.id === childId) || {};

      // Update header
      document.getElementById('drawerChildEmoji').innerHTML = childAvatarHtml(child, 40);
      document.getElementById('drawerChildName').textContent = child.name || '';
      document.getElementById('drawerChildAge').textContent = child.birthday ? calculateAge(child.birthday) + ' — klicka för att ändra' : '⚠️ Ange födelsedatum — klicka här';

      // Pre-populate settings tab
      document.getElementById('setting-show_now_next').checked = child.show_now_next !== false;
      document.getElementById('setting-show_mood_rating').checked = child.show_mood_rating !== false;
      document.getElementById('setting-allow_child_reorder').checked = !!child.allow_child_reorder;
      document.getElementById('setting-hide_clock').checked = !!child.hide_clock;
      document.getElementById('setting-lock_schedule').checked = !!child.lock_schedule;
      document.getElementById('setting-dopamin_animation').checked = child.dopamin_animation !== false;
      document.getElementById('setting-visual_timer').checked = child.visual_timer !== false;
      document.getElementById('setting-time_adjustment').checked = child.time_adjustment !== false;
      document.getElementById('setting-color_coding').checked = child.color_coding !== false;

      // Pre-populate edit tab
      document.getElementById('drawerEditChildId').value = child.id || '';
      document.getElementById('drawerEditName').value = child.name || '';
      setBirthdayPicker('drawerEditBirthday', child.birthday || '');
      document.getElementById('drawerEditPin').value = '';
      drawerEmojiSelected = child.emoji || '';
      document.getElementById('drawerEditEmoji').value = drawerEmojiSelected;
      document.querySelectorAll('.drawer-emoji-opt').forEach(b => {
        b.classList.remove('border-gold', 'bg-gold-light');
        if (b.dataset.emoji === drawerEmojiSelected) b.classList.add('border-gold', 'bg-gold-light');
      });

      // Update edit schema link with child ID
      const editSchemaLink = document.getElementById('editSchemaLink');
      if (editSchemaLink) editSchemaLink.href = `/schedule?child=${childId}`;

      // Switch to requested tab (or schema by default)
      const tabName = initialTab || 'schema';
      const tabButtons = document.querySelectorAll('.drawer-tab');
      const tabBtn = Array.from(tabButtons).find(b => {
        const paneId = 'drawer-pane-' + tabName;
        return b.getAttribute('onclick')?.includes("'" + tabName + "'");
      }) || tabButtons[0];
      switchDrawerTab(tabName, tabBtn);

      // Show drawer
      const drawer = document.getElementById('childDrawer');
      drawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // Load schema packages & rewards async
      loadSchemaPackages(childId);
      loadRewards(childId, child);
    }

    function closeChildDrawer() {
      document.getElementById('childDrawer').classList.add('hidden');
      document.body.style.overflow = '';
      drawerChildId = null;
    }

    function switchDrawerTab(tabName, btn) {
      document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.drawer-pane').forEach(p => p.classList.remove('active'));
      if (btn) btn.classList.add('active');
      const pane = document.getElementById('drawer-pane-' + tabName);
      if (pane) pane.classList.add('active');
    }

    // ─── Schema tab: load schema packages (standard + family) ─────
    async function loadSchemaPackages(childId) {
      const container = document.getElementById('schemaPackages');
      try {
        // Fetch standard schedules and family schedule templates in parallel
        const [standardSchedules, familyTemplates] = await Promise.all([
          Auth.api('/api/standard-library/schedules'),
          Auth.api('/api/schedule-templates'),
        ]);

        let html = '';

        // Standard schedules section
        if (standardSchedules && standardSchedules.length > 0) {
          html += `<div>
            <p class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-3">📋 Standardscheman</p>
            <div class="space-y-2">`;
          for (const sched of standardSchedules) {
            const itemCount = sched.items ? sched.items.length : 0;
            const sections = sched.items ? [...new Set(sched.items.map(i => i.section))].filter(Boolean) : [];
            const sectionLabels = sections.map(s => s === 'morgon' ? 'Morgon' : s === 'dag' ? 'Dag' : s === 'kvall' ? 'Kväll' : s).join(', ');
            html += `
              <div class="bg-white dark:bg-navy rounded-xl px-4 py-3 border border-gray-100 dark:border-navy-soft">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(sched.name)}</p>
                    <p class="text-xs text-text-soft mt-0.5">${itemCount} aktiviteter · ${sectionLabels || 'Morgon, Dag, Kväll'}</p>
                  </div>
                  <button onclick="applySchedulePackage('standard', '${sched.id}', '${escHtml(sched.name)}', '${childId}')"
                    class="flex-shrink-0 px-4 py-2 bg-gold hover:bg-yellow-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ml-3">
                    Välj
                  </button>
                </div>
              </div>`;
          }
          html += '</div></div>';
        }

        // Family templates section
        if (familyTemplates && familyTemplates.length > 0) {
          html += `<div>
            <p class="text-xs font-semibold text-text-soft uppercase tracking-wide mb-3">👨‍👩‍👧 Familjens scheman</p>
            <div class="space-y-2">`;
          for (const tpl of familyTemplates) {
            html += `
              <div class="bg-white dark:bg-navy rounded-xl px-4 py-3 border border-gray-100 dark:border-navy-soft">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(tpl.name)}</p>
                    <p class="text-xs text-text-soft mt-0.5">${tpl.item_count || 0} aktiviteter</p>
                  </div>
                  <button onclick="applySchedulePackage('family', '${tpl.id}', '${escHtml(tpl.name)}', '${childId}')"
                    class="flex-shrink-0 px-4 py-2 bg-navy hover:bg-navy-soft dark:bg-gold dark:hover:bg-yellow-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ml-3">
                    Välj
                  </button>
                </div>
              </div>`;
          }
          html += '</div></div>';
        }

        if (!html) {
          html = '<p class="text-sm text-text-soft italic">Inga schemapaket tillgängliga ännu.</p>';
        }

        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = '<p class="text-sm text-red-500">Kunde inte ladda schemapaket.</p>';
      }
    }

    // ─── Apply a selected schema package to the child ─────
    async function applySchedulePackage(type, scheduleId, scheduleName, childId) {
      const child = familyChildren.find(c => c.id === childId);
      const name = child?.name || 'barnet';
      if (!confirm(`Applicera "${scheduleName}" på ${name}? Detta ersätter barnets nuvarande veckoschema (mån–fre).`)) return;
      try {
        if (type === 'standard') {
          // Use standard-library copy endpoint (applies to weekdays by default)
          await Auth.api(`/api/standard-library/schedules/${scheduleId}/copy`, {
            method: 'POST',
            body: JSON.stringify({ child_id: childId, days: [1, 2, 3, 4, 5], overwrite: true }),
          });
        } else {
          // Use family schedule template apply endpoint
          await Auth.api(`/api/schedule-templates/${scheduleId}/apply`, {
            method: 'POST',
            body: JSON.stringify({ child_id: childId, days: [1, 2, 3, 4, 5], overwrite: true }),
          });
        }
        showToast(`"${scheduleName}" applicerat på ${name}! ✓`);
      } catch (err) {
        showToast('Kunde inte applicera: ' + err.message, true);
      }
    }

    // ─── Rewards tab (full parent panel) ─────────────────
    async function loadRewards(childId, child) {
      const [rewardsData, pendingData, goalData, historyData] = await Promise.all([
        Auth.api('/api/rewards').catch(() => ({ rewards: [], children: [] })),
        Auth.api('/api/rewards/pending-requests').catch(() => ({ pending_redemptions: [], pending_goal_changes: [] })),
        Auth.api('/api/rewards/goals').catch(() => ({ goals: [] })),
        Auth.api('/api/rewards/redemption-history').catch(() => ({ history: [] })),
      ]);

      // ── Pending requests banner ───────────────────────
      const bannerEl = document.getElementById('pendingRequestsBanner');
      const pendingRedemptions = pendingData.pending_redemptions || [];
      const pendingGoalChanges = pendingData.pending_goal_changes || [];
      const childRedemptions = pendingRedemptions.filter(r => r.child_id === childId);
      const childGoalChanges = pendingGoalChanges.filter(r => r.child_id === childId);

      if (childRedemptions.length > 0 || childGoalChanges.length > 0) {
        bannerEl.classList.remove('hidden');
        let bannerHtml = '';
        for (const req of childRedemptions) {
          bannerHtml += `
          <div class="bg-gold-light border-2 border-gold rounded-xl p-3 mb-2 flex items-center gap-3" id="redeem-req-${req.id}">
            <span class="text-2xl">${req.reward_icon || '🎁'}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-heading font-bold text-navy">${childAvatarHtml(child, 24)} ${escHtml(child.name || '')} vill lösa in ${escHtml(req.reward_name)}</p>
              <p class="text-xs text-text-soft">⭐ ${req.star_cost} stjärnor</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button onclick="approveRedemption('${req.id}')" class="min-h-[44px] bg-mint hover:bg-green-200 text-green-700 font-bold px-3 py-1 rounded-xl text-xs transition-colors">✓</button>
              <button onclick="denyRedemption('${req.id}')" class="min-h-[44px] bg-coral hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded-xl text-xs transition-colors">✕</button>
            </div>
          </div>`;
        }
        for (const req of childGoalChanges) {
          bannerHtml += `
          <div class="bg-lavender border-2 border-purple-200 rounded-xl p-3 mb-2 flex items-center gap-3" id="goal-req-${req.id}">
            <span class="text-2xl">${req.to_reward_icon || '🎯'}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-heading font-bold text-navy">${childAvatarHtml(child, 24)} ${escHtml(child.name || '')} vill byta mål till ${escHtml(req.to_reward_name)}</p>
              <p class="text-xs text-text-soft">Målbytebegäran</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button onclick="approveGoalChange('${req.id}')" class="min-h-[44px] bg-mint hover:bg-green-200 text-green-700 font-bold px-3 py-1 rounded-xl text-xs transition-colors">✓</button>
              <button onclick="denyGoalChange('${req.id}')" class="min-h-[44px] bg-coral hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded-xl text-xs transition-colors">✕</button>
            </div>
          </div>`;
        }
        bannerEl.innerHTML = bannerHtml;
      } else {
        bannerEl.classList.add('hidden');
        bannerEl.innerHTML = '';
      }

      // ── Goal info ─────────────────────────────────────
      const goals = goalData.goals || [];
      const childGoal = goals.find(g => g.child_id === childId);
      const goalInfoEl = document.getElementById('childGoalInfo');
      const goalBadgeEl = document.getElementById('childGoalBadge');
      if (childGoal && childGoal.reward_id) {
        goalInfoEl.innerHTML = `<div class="flex items-center gap-2">
          <span class="text-xl">${childGoal.reward_icon || '🎁'}</span>
          <div>
            <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(childGoal.reward_name)}</p>
            <p class="text-xs text-text-soft">⭐ ${childGoal.star_cost}</p>
          </div>
        </div>
        ${childGoal.pending_change_request ? '<p class="text-xs text-gold mt-1">⏳ Bytebegäran väntar</p>' : ''}`;
        if (goalBadgeEl) goalBadgeEl.textContent = 'Aktivt mål';
      } else {
        goalInfoEl.innerHTML = '<p class="text-xs text-text-soft italic">Inget mål satt</p>';
        if (goalBadgeEl) goalBadgeEl.textContent = 'Inget mål';
      }

      // ── Populate goal select ──────────────────────────
      const rewards = rewardsData.rewards || [];
      const goalSelect = document.getElementById('goalRewardSelect');
      if (goalSelect) {
        goalSelect.innerHTML = '<option value="">– Välj belöning –</option>' +
          rewards.filter(r => r.is_active).map(r =>
            `<option value="${r.id}" ${childGoal && childGoal.reward_id === r.id ? 'selected' : ''}>${r.icon || '🎁'} ${escHtml(r.name)} — ${r.star_cost} ⭐</option>`
          ).join('');
      }

      // ── Reward visibility ─────────────────────────────
      const rewardsContainer = document.getElementById('rewardsList');
      if (rewards.length === 0) {
        rewardsContainer.innerHTML = '<p class="text-sm text-text-soft italic">Inga belöningar i biblioteket ännu. <a href="/library" class="text-gold underline">Gå till Bibliotek</a> för att lägga till belöningar.</p>';
      } else {
        rewardsContainer.innerHTML = rewards.map(reward => {
          const isVisible = reward.visible_to_children === null ||
            (Array.isArray(reward.visible_to_children) && reward.visible_to_children.includes(childId));
          return `
            <div class="bg-white dark:bg-navy-soft rounded-xl p-3 border border-gray-100 dark:border-navy-soft" id="reward-row-${reward.id}">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-xl flex-shrink-0">${reward.icon || '🎁'}</span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-navy dark:text-white truncate">${escHtml(reward.name)}</p>
                    <p class="text-xs text-text-soft">${reward.star_cost} ⭐</p>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                  <input type="checkbox" class="sr-only peer reward-visibility-cb"
                    data-reward-id="${reward.id}"
                    data-child-id="${childId}"
                    ${isVisible ? 'checked' : ''}
                    onchange="toggleRewardVisibility('${reward.id}', '${childId}', this.checked, ${JSON.stringify(reward.visible_to_children)})" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:bg-gold transition-colors"></div>
                  <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5 pointer-events-none"></div>
                </label>
              </div>
            </div>`;
        }).join('');
      }

      // ── Redemption history for this child ─────────────
      const allHistory = historyData.history || [];
      const childHistory = allHistory.filter(h => h.child_id === childId);
      const histEl = document.getElementById('redemptionHistoryList');
      if (childHistory.length === 0) {
        histEl.innerHTML = '<p class="text-xs text-text-soft italic">Inga inlösta belöningar ännu.</p>';
      } else {
        histEl.innerHTML = childHistory.slice(0, 10).map(h => {
          const d = new Date(h.created_at);
          const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
          return `<div class="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-navy-soft last:border-0">
            <span class="text-lg">${h.reward_icon || '🎁'}</span>
            <div class="flex-1">
              <p class="text-xs font-semibold text-navy dark:text-white">${escHtml(h.reward_name)}</p>
              <p class="text-xs text-text-soft">${dateStr} · ${h.star_cost} ⭐</p>
            </div>
            <span class="text-base">✅</span>
          </div>`;
        }).join('');
      }

      // ── Update drawer tab badge ────────────────────────
      const totalPending = childRedemptions.length + childGoalChanges.length;
      const tabBadge = document.getElementById('rewardsTabBadge');
      if (tabBadge) {
        tabBadge.textContent = totalPending > 0 ? totalPending : '';
        tabBadge.classList.toggle('hidden', totalPending === 0);
      }
    }

    // ─── Approve / Deny redemption ────────────────────────
    async function approveRedemption(id) {
      try {
        await Auth.api('/api/rewards/redemptions/' + id + '/approve', { method: 'PUT' });
        showToast('✓ Inlösning godkänd!');
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
        // Trigger confetti badge update on parent dashboard
        loadPendingBadge();
      } catch (err) {
        showToast(err.message || 'Kunde inte godkänna', true);
      }
    }

    async function denyRedemption(id) {
      try {
        await Auth.api('/api/rewards/redemptions/' + id + '/deny', { method: 'PUT' });
        showToast('Inlösning nekad.');
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
        loadPendingBadge();
      } catch (err) {
        showToast(err.message || 'Kunde inte neka', true);
      }
    }

    // ─── Approve / Deny goal change ───────────────────────
    async function approveGoalChange(id) {
      try {
        await Auth.api('/api/rewards/goal-change-requests/' + id + '/approve', { method: 'PUT' });
        showToast('✓ Målbyte godkänt!');
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || 'Kunde inte godkänna', true);
      }
    }

    async function denyGoalChange(id) {
      try {
        await Auth.api('/api/rewards/goal-change-requests/' + id + '/deny', { method: 'PUT' });
        showToast('Målbyte nekat.');
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || 'Kunde inte neka', true);
      }
    }

    // ─── Parent sets goal directly ────────────────────────
    async function parentSetGoal() {
      const rewardId = document.getElementById('goalRewardSelect').value;
      if (!rewardId || !drawerChildId) return;
      try {
        await Auth.api('/api/rewards/goals/' + drawerChildId, {
          method: 'PUT',
          body: JSON.stringify({ reward_id: rewardId }),
        });
        showToast('🎯 Mål satt!');
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || 'Kunde inte sätta mål', true);
      }
    }

    // ─── Manual star modal ────────────────────────────────
    let _manualStarChildId = null;

    function openManualStarModal() {
      _manualStarChildId = drawerChildId;
      const child = familyChildren.find(c => c.id === drawerChildId);
      const modal = document.getElementById('manualStarModal');
      if (!modal) return;
      document.getElementById('manualStarChildName').innerHTML = (child ? childAvatarHtml(child, 28) + ' ' + escHtml(child.name) : '');
      document.getElementById('manualStarCount').value = '1';
      document.getElementById('manualStarReason').value = '';
      document.getElementById('manualStarMsg').textContent = '';
      document.getElementById('manualStarImagePreview').classList.add('hidden');
      document.getElementById('manualStarImageUrl').value = '';
      document.getElementById('manualStarImageInput').value = '';
      modal.classList.remove('hidden');
    }

    function closeManualStarModal() {
      const modal = document.getElementById('manualStarModal');
      if (modal) modal.classList.add('hidden');
      _manualStarChildId = null;
    }

    async function handleManualStarImageUpload(input) {
      const file = input.files[0];
      if (!file) return;
      const preview = document.getElementById('manualStarImagePreview');
      const urlInput = document.getElementById('manualStarImageUrl');
      const msgEl = document.getElementById('manualStarMsg');
      msgEl.textContent = 'Laddar upp bild...';
      try {
        const fd = new FormData();
        fd.append('image', file);
        // Include CSRF header for image upload (auth via httpOnly cookie)
        await Auth.ensureCsrfToken();
        const uploadHeaders = {};
        const csrf = Auth.getCsrfToken();
        if (csrf) uploadHeaders['X-CSRF-Token'] = csrf;
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: uploadHeaders,
          body: fd,
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Uppladdning misslyckades');
        urlInput.value = data.url;
        preview.src = data.url;
        preview.classList.remove('hidden');
        msgEl.textContent = '✓ Bild uppladdad!';
        msgEl.className = 'text-xs text-green-600';
      } catch (err) {
        msgEl.textContent = 'Bild misslyckades: ' + err.message;
        msgEl.className = 'text-xs text-red-500';
      }
    }

    async function submitManualStar() {
      if (!_manualStarChildId) return;
      const star_count = parseInt(document.getElementById('manualStarCount').value);
      const reason = document.getElementById('manualStarReason').value.trim();
      const image_url = document.getElementById('manualStarImageUrl').value || null;
      const msgEl = document.getElementById('manualStarMsg');
      if (!reason) {
        msgEl.textContent = 'Anledning krävs!';
        msgEl.className = 'text-xs text-red-500';
        return;
      }
      if (!star_count || star_count < 1) {
        msgEl.textContent = 'Ange minst 1 stjärna';
        msgEl.className = 'text-xs text-red-500';
        return;
      }
      const btn = document.getElementById('manualStarSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Skickar...';
      try {
        await Auth.api('/api/rewards/manual-stars', {
          method: 'POST',
          body: JSON.stringify({ child_id: _manualStarChildId, star_count, reason, image_url }),
        });
        showToast(`⭐ ${star_count} stjärnor givna!`);
        closeManualStarModal();
        const child = familyChildren.find(c => c.id === _manualStarChildId);
        loadRewards(_manualStarChildId, child);
      } catch (err) {
        msgEl.textContent = err.message || 'Kunde inte ge stjärnor';
        msgEl.className = 'text-xs text-red-500';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Ge stjärnor ⭐';
      }
    }

    // ─── Load pending badge (for parent header notification) ─────
    async function loadPendingBadge() {
      try {
        const data = await Auth.api('/api/rewards/pending-requests');
        const badge = document.getElementById('pendingReqBadge');
        if (badge) {
          const total = data.total || 0;
          badge.textContent = total > 0 ? total : '';
          badge.classList.toggle('hidden', total === 0);
        }
      } catch (_) {}
    }

    async function toggleRewardVisibility(rewardId, childId, nowVisible, currentVisibleArr) {
      // Compute the new visible_to_children array
      // We need all children to figure out the toggle semantics:
      const allChildIds = familyChildren.map(c => c.id);

      let newVisible;
      if (currentVisibleArr === null) {
        // Was visible to all → now excluding this child
        if (nowVisible) {
          newVisible = null; // still all
        } else {
          // exclude this child: set to all except this one
          newVisible = allChildIds.filter(id => id !== childId);
        }
      } else if (!Array.isArray(currentVisibleArr)) {
        currentVisibleArr = [];
        newVisible = nowVisible ? [childId] : [];
      } else {
        if (nowVisible) {
          newVisible = [...new Set([...currentVisibleArr, childId])];
          // If now covers all children → reset to null (visible to all)
          if (newVisible.length >= allChildIds.length) newVisible = null;
        } else {
          newVisible = currentVisibleArr.filter(id => id !== childId);
        }
      }

      try {
        await Auth.api(`/api/rewards/${rewardId}`, {
          method: 'PUT',
          body: JSON.stringify({ visible_to_children: newVisible }),
        });
      } catch (err) {
        showToast('Kunde inte uppdatera synlighet: ' + err.message, true);
        // Revert toggle visually
        const child = familyChildren.find(c => c.id === childId);
        loadRewards(childId, child);
      }
    }

    // ─── Settings tab: toggle save ────────────────────────
    async function saveChildSetting(field, value) {
      if (!drawerChildId) return;
      try {
        await Auth.api(`/api/children/${drawerChildId}`, {
          method: 'PUT',
          body: JSON.stringify({ [field]: value }),
        });
        // Update local cache
        const child = familyChildren.find(c => c.id === drawerChildId);
        if (child) child[field] = value;
        // Refresh the card in the grid
        const card = document.querySelector(`.child-card-wrap[data-child-id="${drawerChildId}"]`);
        if (card && familyChildren.find(c => c.id === drawerChildId)) {
          const updatedChild = familyChildren.find(c => c.id === drawerChildId);
          card.outerHTML = renderChildCard(updatedChild);
        }
      } catch (err) {
        showToast('Kunde inte spara: ' + err.message, true);
      }
    }

    // ─── Edit tab ─────────────────────────────────────────
    document.querySelectorAll('.drawer-emoji-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.drawer-emoji-opt').forEach(b => b.classList.remove('border-gold', 'bg-gold-light'));
        btn.classList.add('border-gold', 'bg-gold-light');
        drawerEmojiSelected = btn.dataset.emoji;
        document.getElementById('drawerEditEmoji').value = drawerEmojiSelected;
      });
    });

    async function saveDrawerEdit(e) {
      e.preventDefault();
      const childId = document.getElementById('drawerEditChildId').value;
      const name = document.getElementById('drawerEditName').value.trim();
      const emoji = document.getElementById('drawerEditEmoji').value.trim() || drawerEmojiSelected;
      const birthday = document.getElementById('drawerEditBirthday').value;
      const pin = document.getElementById('drawerEditPin').value.trim();

      try {
        await Auth.api('/api/children/' + childId, {
          method: 'PUT',
          body: JSON.stringify({ name, emoji, birthday: birthday || undefined }),
        });

        if (pin) {
          if (!/^\d{4}$/.test(pin)) {
            showToast('PIN-koden måste vara exakt 4 siffror', true);
            return;
          }
          await Auth.api('/api/children/' + childId + '/pin', {
            method: 'PUT',
            body: JSON.stringify({ pin }),
          });
        }

        showToast('Sparat! ✓');
        closeChildDrawer();
        init();
      } catch (err) {
        showToast('Kunde inte spara: ' + err.message, true);
      }
    }

    function confirmDeleteDrawerChild() {
      const child = familyChildren.find(c => c.id === drawerChildId);
      if (!child) return;
      pendingDeleteType = 'child';
      pendingDeleteId = drawerChildId;
      document.getElementById('deleteTargetName').textContent = child.name;
      document.getElementById('deleteTargetMessage').textContent = 'Alla aktiviteter, scheman och belöningshistorik för detta barn kommer att raderas permanent.';
      document.getElementById('confirmDeleteBtn').onclick = executeDelete;
      document.getElementById('deleteModal').classList.remove('hidden');
    }

    // ─── Adult card ─────────────────────────────────────
    const ROLES = [
      { value: 'förälder', label: 'Förälder' },
      { value: 'mamma', label: 'Mamma' },
      { value: 'pappa', label: 'Pappa' },
      { value: 'bonusförälder', label: 'Bonusförälder' },
      { value: 'annan', label: 'Annan' },
    ];

    function renderAdultCard(parent, children) {
      const isSelf = parent.id === user?.id;
      const isOnlyAdult = (familyData.parents || []).length === 1;
      const canDelete = !isOnlyAdult && !isSelf;
      const roleOptions = ROLES.map(r =>
        `<option value="${r.value}" ${parent.family_role === r.value ? 'selected' : ''}>${r.label}</option>`
      ).join('');

      return `
        <div class="bg-sky dark:bg-navy-soft rounded-2xl p-4 card-hover fade-in">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="font-heading font-bold text-navy dark:text-white">${parent.name || 'Förälder'}</p>
              <p class="text-sm text-text-soft">${parent.email}</p>
              ${isSelf ? '<span class="inline-block mt-1 text-xs bg-gold-light text-gold px-2 py-0.5 rounded-full font-medium">Du</span>' : ''}
            </div>
          </div>

          <!-- Role -->
          <div class="mb-3">
            <label class="block text-xs text-text-soft mb-1">Roll</label>
            <select onchange="updateMemberRole('${parent.id}', this.value)"
              class="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-navy dark:text-white text-sm font-body">
              ${roleOptions}
            </select>
          </div>

          <!-- Child visibility -->
          ${(familyData.allChildren || []).length > 0 ? `
            <div class="mb-3">
              <label class="block text-xs text-text-soft mb-1">Ser dessa barn</label>
              <div class="space-y-1">
                ${(familyData.allChildren || []).map(c => {
                  const linked = (parent.linked_child_ids || []).includes(c.id);
                  return `<label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" class="pc-cb w-4 h-4 rounded border-lavender text-gold focus:ring-gold"
                      data-parent-id="${parent.id}" data-child-id="${c.id}" ${linked ? 'checked' : ''}
                      onchange="updateParentChildren('${parent.id}')">
                    ${childAvatarHtml(c, 20)} ${escHtml(c.name)}
                  </label>`;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Delete -->
          ${canDelete ? `
            <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onclick="confirmDeleteMember('${parent.id}', '${(parent.name || 'Förälder').replace(/'/g, "\\'")}')"
                class="w-full px-3 py-1.5 bg-coral hover:bg-red-100 text-red-600 text-xs rounded-lg font-medium transition-colors">
                Ta bort från familj
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    // ─── Actions ─────────────────────────────────────────
    async function saveFamily() {
      const name = document.getElementById('familyNameInput').value.trim();
      const msg = document.getElementById('familySaveMsg');
      try {
        await Auth.api('/api/family', {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        msg.textContent = '✓ Sparat!';
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 2000);
      } catch (err) {
        showToast('Kunde inte spara: ' + err.message, true);
      }
    }

    async function updateParentChildren(parentId) {
      const checkboxes = document.querySelectorAll(`.pc-cb[data-parent-id="${parentId}"]`);
      const childIds = [...checkboxes].filter(cb => cb.checked).map(cb => cb.dataset.childId);
      if (childIds.length === 0) {
        showToast('Minst ett barn måste väljas', true);
        checkboxes[0].checked = true;
        return;
      }
      try {
        await Auth.api(`/api/family/members/${parentId}/children`, {
          method: 'PUT',
          body: JSON.stringify({ childIds }),
        });
        showToast('Barnkopplingar uppdaterade!');
      } catch (err) {
        showToast('Kunde inte uppdatera: ' + err.message, true);
        init();
      }
    }

    async function updateMemberRole(parentId, familyRole) {
      try {
        await Auth.api(`/api/family/members/${parentId}`, {
          method: 'PUT',
          body: JSON.stringify({ family_role: familyRole }),
        });
        showToast('Roll uppdaterad!');
      } catch (err) {
        showToast('Kunde inte uppdatera roll: ' + err.message, true);
      }
    }

    async function scanAndAddAdult() {
      if (!window.FamilyInviteScan) {
        openCoParentInviteModal();
        return;
      }
      const raw = FamilyInviteScan.scanAdultQrInteractive();
      if (!raw) return;
      const parsed = FamilyInviteScan.parseQrPayload(raw);
      openFamilyModal('addAdultModal');
      const msg = document.getElementById('addAdultMsg');
      msg.textContent = '';
      msg.className = 'text-sm text-text-soft min-h-[1.2em]';
      if (parsed.email) {
        document.getElementById('addAdultEmailInput').value = parsed.email;
      }
      if (parsed.inviteToken) {
        try {
          const res = await fetch('/api/family/invite/' + encodeURIComponent(parsed.inviteToken));
          const info = await res.json();
          if (res.ok) {
            if (info.email) document.getElementById('addAdultEmailInput').value = info.email;
            if (info.inviteeName) document.getElementById('addAdultNameInput').value = info.inviteeName;
          }
        } catch {
          /* manual entry ok */
        }
      }
    }
    window.scanAndAddAdult = scanAndAddAdult;

    async function addAdult(e) {
      e.preventDefault();
      const name = document.getElementById('addAdultNameInput').value.trim();
      const email = document.getElementById('addAdultEmailInput').value.trim();
      const roleEl = document.getElementById('addAdultRoleInput');
      const family_role = roleEl && roleEl.value ? roleEl.value : null;
      const msg = document.getElementById('addAdultMsg');
      const btn = document.getElementById('addAdultSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Skickar...';
      try {
        const check = await Auth.api('/api/family/check-member', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        if (check.adult && check.adult.status !== 'available') {
          msg.textContent = check.adult.error || 'Personen finns redan i familjen eller har en väntande inbjudan.';
          msg.className = 'text-sm text-red-500 font-medium';
          return;
        }
        await Auth.api('/api/family/invite', {
          method: 'POST',
          body: JSON.stringify({ name, email, family_role }),
        });
        msg.textContent = '✓ Inbjudan skickad till ' + email + '!';
        msg.className = 'text-sm text-green-600 font-medium';
        document.getElementById('addAdultNameInput').value = '';
        document.getElementById('addAdultEmailInput').value = '';
        if (roleEl) roleEl.value = '';
        setTimeout(() => {
          closeModal('addAdultModal');
          init();
        }, 2000);
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'text-sm text-red-500 font-medium';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Skicka inbjudan';
      }
    }

    async function sendInvite(e) {
      e.preventDefault();
      const email = document.getElementById('inviteEmailInput').value.trim();
      const msg = document.getElementById('inviteMsg');
      try {
        await Auth.api('/api/family/invite', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        msg.textContent = '✓ Inbjudan skickad!';
        msg.className = 'text-sm text-green-600 font-medium';
        document.getElementById('inviteEmailInput').value = '';
        setTimeout(() => {
          closeModal('inviteModal');
          init();
        }, 1500);
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'text-sm text-red-500 font-medium';
      }
    }

    async function withdrawInvite(inviteId) {
      try {
        await Auth.api(`/api/family/invite/${inviteId}`, { method: 'DELETE' });
        showToast('Inbjudan återkallad');
        init();
      } catch (err) {
        showToast('Kunde inte återkalla: ' + err.message, true);
      }
    }

    // Delete child / member
    let pendingDeleteType = null;
    let pendingDeleteId = null;

    function confirmDeleteChild(id, name) {
      pendingDeleteType = 'child';
      pendingDeleteId = id;
      document.getElementById('deleteTargetName').textContent = name;
      document.getElementById('deleteTargetMessage').textContent = 'Alla aktiviteter, scheman och belöningshistorik för detta barn kommer att raderas permanent.';
      document.getElementById('confirmDeleteBtn').onclick = executeDelete;
      document.getElementById('deleteModal').classList.remove('hidden');
    }

    function confirmDeleteMember(id, name) {
      pendingDeleteType = 'member';
      pendingDeleteId = id;
      document.getElementById('deleteTargetName').textContent = name;
      document.getElementById('deleteTargetMessage').textContent = 'Denna person kommer att tas bort från din familj. De kan fortfarande logga in med sitt konto.';
      document.getElementById('confirmDeleteBtn').onclick = executeDelete;
      document.getElementById('deleteModal').classList.remove('hidden');
    }

    async function executeDelete() {
      try {
        if (pendingDeleteType === 'child') {
          await Auth.api(`/api/family/children/${pendingDeleteId}`, { method: 'DELETE' });
        } else {
          await Auth.api(`/api/family/members/${pendingDeleteId}`, { method: 'DELETE' });
        }
        closeModal('deleteModal');
        closeChildDrawer();
        showToast('Borttaget');
        init();
      } catch (err) {
        showToast('Kunde inte ta bort: ' + err.message, true);
      }
    }

    // ─── Emoji picker handlers (Add child modal) ─────────
    let addSelectedEmoji = '';

    document.querySelectorAll('.add-emoji-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.add-emoji-opt').forEach(b => b.classList.remove('border-gold', 'bg-gold-light'));
        btn.classList.add('border-gold', 'bg-gold-light');
        addSelectedEmoji = btn.dataset.emoji;
        document.getElementById('childEmojiInput').value = addSelectedEmoji;
        document.getElementById('addEmojiError').classList.add('hidden');
      });
    });

    // Add child
    async function addChild(e) {
      e.preventDefault();
      const name = document.getElementById('childNameInput').value.trim();
      const emoji = document.getElementById('childEmojiInput').value || addSelectedEmoji;
      const birthday = document.getElementById('childBirthdayInput').value;
      const pin = document.getElementById('childPinInput').value.trim();

      if (!emoji) {
        document.getElementById('addEmojiError').classList.remove('hidden');
        return;
      }

      try {
        const data = await Auth.api('/api/children', {
          method: 'POST',
          body: JSON.stringify({ name, emoji, birthday: birthday || undefined, pin: pin || undefined }),
        });
        closeModal('addChildModal');
        document.getElementById('addChildForm').reset();
        addSelectedEmoji = '';
        document.querySelectorAll('.add-emoji-opt').forEach(b => b.classList.remove('border-gold', 'bg-gold-light'));
        // Redirect to wizard onboarding so parent can review the seeded schedule
        if (data.wizard && data.id) {
          window.location.href = `/child-wizard?id=${data.id}&pin=${encodeURIComponent(data.pin)}&name=${encodeURIComponent(data.name)}&schedule=${encodeURIComponent(data.default_schedule_name || '')}`;
          return;
        }
        const pinMsg = data && data.pin ? ` PIN: ${data.pin}` : '';
        showToast(`${name} tillagd!${pinMsg}`, false, pinMsg ? 6000 : 3000);
        init();
      } catch (err) {
        // Shared-device guard: if the server says we lack parent auth,
        // the session was likely corrupted by a child login on the same device.
        if (err.message && err.message.includes('föräldrabehörighet')) {
          showToast('Din session har löpt ut. Du loggas in igen…', true, 3000);
          setTimeout(() => { Auth.clearAuth(); window.location.href = '/login'; }, 2000);
          return;
        }
        showToast('Kunde inte lägga till barn: ' + err.message, true);
      }
    }

    // ─── Helpers ─────────────────────────────────────────
    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }

    function openFamilyModal(id) {
      const drawer = document.getElementById('childDrawer');
      if (drawer && !drawer.classList.contains('hidden')) closeChildDrawer();
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    }
    window.openFamilyModal = openFamilyModal;

    // ─── Family Children Drag & Drop (sortablejs) ───────
    let familySortable = null;

    function initFamilyDnD() {
      if (typeof Sortable === 'undefined') return;
      const grid = document.getElementById('childrenGrid');
      if (!grid || familyChildren.length < 2) {
        if (familySortable) { familySortable.destroy(); familySortable = null; }
        return;
      }
      if (familySortable) familySortable.destroy();
      familySortable = Sortable.create(grid, {
        animation: 150,
        handle: '.drag-handle',
        forceFallback: true,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: async function(evt) {
          const order = [];
          grid.querySelectorAll('[data-child-id]').forEach((el, idx) => {
            order.push({ id: el.dataset.childId, sort_order: idx });
          });
          const prevChildren = familyChildren.slice();
          familyChildren = order.map(({ id, sort_order }) => {
            const c = prevChildren.find(x => x.id === id) || {};
            return { ...c, id, sort_order };
          });
          const children = familyChildren;
          const noChildren = document.getElementById('noChildrenState');
          const childrenGrid = document.getElementById('childrenGrid');
          if (children.length === 0) {
            noChildren.classList.remove('hidden');
            childrenGrid.classList.add('hidden');
          } else {
            noChildren.classList.add('hidden');
            childrenGrid.classList.remove('hidden');
            childrenGrid.innerHTML = children.map(c => renderChildCard(c)).join('');
            initFamilyDnD();
          }
          try {
            await Auth.api('/api/children/reorder', {
              method: 'PUT',
              body: JSON.stringify({ order }),
            });
          } catch (err) {
            familyChildren = prevChildren;
            renderAll({ ...familyData, children: prevChildren });
            initFamilyDnD();
            showToast('Kunde inte spara ordningen', true);
          }
        },
      });
    }

    // escHtml shim — delegates to escapeHtml() from /js/dom-utils.js
    function escHtml(str) { return escapeHtml(str); }

    function switchToChild(childId) {
      openChildDrawer(childId);
    }

    // showToast is now in /js/toast.js

    function calculateAge(birthday) {
      const birth = new Date(birthday);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) years--;
      if (years < 1) {
        const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
        return months + ' månader';
      }
      return years + ' år';
    }

    // ─── Keyboard: Escape closes drawer ──────────────────
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeChildDrawer();
    });

    // ─── Mobile sidebar toggle ────────────────────────────
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
      });
    }

    // ─── Today label ──────────────────────────────────────
    const today = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const todayLabel = document.getElementById('todayLabel');
    if (todayLabel) todayLabel.textContent = today.charAt(0).toUpperCase() + today.slice(1);

    // ─── PWA install guide ────────────────────────────────
    if (window.PWAInstall) {
      PWAInstall.render(document.getElementById('familyPwaInstallGuide'));
    }

if (window.ParentMagicPageBoot) {
  ParentMagicPageBoot.register('family', init);
}
