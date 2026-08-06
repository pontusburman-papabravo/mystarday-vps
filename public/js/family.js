
    function fpt(key, params) {
      return (typeof window.pt === 'function') ? window.pt(key, params) : key;
    }

    function roleLabel(value) {
      const map = {
        'förälder': 'family.roles.parent',
        'mamma': 'family.roles.mamma',
        'pappa': 'family.roles.pappa',
        'bonusförälder': 'family.roles.bonusParent',
        'annan': 'family.roles.other',
      };
      return map[value] ? fpt(map[value]) : value;
    }

    function sectionLabel(section) {
      const map = {
        morgon: 'sections.morgon',
        dag: 'sections.dag',
        kvall: 'sections.kvall',
      };
      return map[section] ? fpt(map[section]) : section;
    }

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
    const drawerChildData = null;
    let drawerEmojiSelected = '';
    let familyCache = null;
    let inflightFamily = null;
    let initInFlight = null;

    const ROLES = [
      { value: 'förälder', labelKey: 'family.roles.parent' },
      { value: 'mamma', labelKey: 'family.roles.mamma' },
      { value: 'pappa', labelKey: 'family.roles.pappa' },
      { value: 'bonusförälder', labelKey: 'family.roles.bonusParent' },
      { value: 'annan', labelKey: 'family.roles.other' },
    ];
    function roleOptionLabel(role) {
      return role.labelKey ? fpt(role.labelKey) : role.label || role.value;
    }

    function applyWarmFamilyData() {
      if (!familyCache && window.__familyWarmData) {
        familyCache = window.__familyWarmData;
      }
    }

    function setFamilyLoading(loading) {
      const skeleton = document.getElementById('familyLoadingSkeleton');
      const dataSections = document.getElementById('familyDataSections');
      if (skeleton) skeleton.classList.toggle('hidden', !loading);
      if (dataSections) dataSections.classList.toggle('hidden', loading);
      const summary = document.getElementById('familyHubSummary');
      if (summary && loading && !familyCache) summary.textContent = fpt('family.shell.loading');
    }

    function fetchFamily() {
      if (inflightFamily) return inflightFamily;
      if (window.__familyWarmFetch) {
        inflightFamily = window.__familyWarmFetch
          .then(function (data) {
            familyCache = data;
            window.__familyWarmFetch = null;
            inflightFamily = null;
            return data;
          })
          .catch(function (err) {
            window.__familyWarmFetch = null;
            inflightFamily = null;
            throw err;
          });
        return inflightFamily;
      }
      inflightFamily = Auth.api('/api/family')
        .then(function (data) {
          familyCache = data;
          window.__familyWarmData = data;
          inflightFamily = null;
          return data;
        })
        .catch(function (err) {
          inflightFamily = null;
          throw err;
        });
      return inflightFamily;
    }

    function prefetchFamily() {
      if (familyCache || inflightFamily || window.__familyWarmFetch) return;
      if (!window.Auth || typeof Auth.api !== 'function') return;
      window.__familyWarmFetch = Auth.api('/api/family')
        .then(function (data) {
          familyCache = data;
          window.__familyWarmData = data;
          return data;
        })
        .catch(function () {
          window.__familyWarmFetch = null;
          return null;
        });
    }

    function rerenderFamilyI18n() {
      if (!familyData) return;
      renderAll(familyData);
      if (window.FamilyMuseum) FamilyMuseum.mount('familyMuseumMount');
    }

    // ─── Init ────────────────────────────────────────────
    async function init() {
      if (initInFlight) return initInFlight;
      initInFlight = (async function () {
        try {
          if (window.I18n && typeof I18n.init === 'function') {
            await I18n.init();
          }
          applyWarmFamilyData();
          if (familyCache) {
            renderAll(familyCache);
            setFamilyLoading(false);
          } else {
            setFamilyLoading(true);
          }
          familyData = await fetchFamily();
          renderAll(familyData);
          initFamilyDnD();
          if (window.FamilyMuseum) FamilyMuseum.mount('familyMuseumMount');

          const urlParams = new URLSearchParams(window.location.search);
          const childParam = urlParams.get('child');
          const tabParam = urlParams.get('tab');
          if (childParam && familyChildren.some(c => c.id === childParam)) {
            const q = tabParam ? '?tab=' + encodeURIComponent(tabParam) : '';
            window.location.replace('/family/child/' + encodeURIComponent(childParam) + q);
            return;
          }
        } catch (err) {
          showToast(fpt('family.errors.loadFamily') + ' ' + err.message, true);
        } finally {
          setFamilyLoading(false);
          initInFlight = null;
        }
      })();
      return initInFlight;
    }

    var _domRenderChildAvatar = window.renderChildAvatar;
    function childAvatarHtml(child, size) {
      if (typeof _domRenderChildAvatar === 'function') {
        return _domRenderChildAvatar(child, size || 32);
      }
      size = size || 32;
      const emoji = (child && child.emoji) || '⭐';
      const safe = String(emoji)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return '<span style="display:inline-flex;align-items:center;font-size:' +
        Math.round(size * 0.8) + 'px;line-height:1;">' + safe + '</span>';
    }

    if (typeof initBirthdayPicker === 'function') initBirthdayPicker('drawerEditBirthday');

    function renderAll(data) {
      if (!data) return;
      familyData = data;
      const chestSection = document.getElementById('familyChestSection');
      const nameSection = document.getElementById('familyNameSection');
      if (chestSection) chestSection.classList.remove('hidden');
      if (nameSection) nameSection.classList.remove('hidden');
      document.getElementById('familyNameInput').value = data.name || '';
      if (window.FamilyChestSetting) FamilyChestSetting.init(data);

      const children = data.children || [];
      familyChildren = children;
      window.familyChildren = children;
      if (window.CustodySettings) CustodySettings.reload();

      const parents = data.parents || [];
      const summaryParts = [];
      if (children.length) {
        summaryParts.push(children.length === 1
          ? fpt('family.summary.childrenOne')
          : fpt('family.summary.childrenMany', { count: children.length }));
      }
      if (parents.length) {
        summaryParts.push(parents.length === 1
          ? fpt('family.summary.oneParent')
          : fpt('family.summary.parentsMany', { count: parents.length }));
      }
      const summaryText = summaryParts.join(' · ');
      ['familySummary', 'familyHubSummary'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = summaryText;
      });
      const noChildren = document.getElementById('noChildrenState');
      const childrenGrid = document.getElementById('childrenGrid');
      if (children.length === 0) {
        noChildren.classList.remove('hidden');
        childrenGrid.classList.add('hidden');
      } else {
        noChildren.classList.add('hidden');
        childrenGrid.classList.remove('hidden');
        childrenGrid.innerHTML = children.map(c => renderChildCard(c)).join('');
      }

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
              <span class="ml-2 text-xs text-text-soft italic">${fpt('family.shell.waiting')}</span>
            </div>
            <button onclick="withdrawInvite('${escapeHtml(inv.id)}')" class="text-xs text-red-500 hover:text-red-600 font-semibold">${fpt('family.shell.withdrawInvite')}</button>
          </div>
        `).join('');
      } else {
        pendingSection.classList.add('hidden');
      }

      if (window.ParentMagicPageHub && window.ParentMagicShell && ParentMagicShell.isMagic()) {
        ParentMagicPageHub.refresh('family', true);
      }
      if (window.FamilyHub && typeof FamilyHub.afterRender === 'function') {
        void FamilyHub.afterRender();
      }
    }

    // ─── Child card (compact clickable summary) ──────────
    function renderChildCard(child) {
      const ageText = child.birthday ? calculateAge(child.birthday) : fpt('family.child.ageUnknown');
      const href = '/family/child/' + encodeURIComponent(child.id);
      return `
        <div class="child-card-wrap relative fade-in" data-child-id="${child.id}">
          <span class="drag-handle text-gray-300 text-lg select-none cursor-grab absolute top-3 right-3 z-10"
                title="${fpt('family.child.dragReorder')}"
                onclick="event.preventDefault(); event.stopPropagation()">⠿</span>
          <a href="${href}" class="family-child-card flex items-center gap-3 p-4 bg-sky dark:bg-navy-soft rounded-2xl card-hover no-underline min-h-[72px]">
            ${childAvatarHtml(child, 48)}
            <div class="flex-1 min-w-0 pr-6">
              <p class="font-heading font-bold text-navy dark:text-white truncate">${escHtml(child.name)}</p>
              <p class="text-sm text-text-soft">${escHtml(ageText)}</p>
            </div>
            <span class="text-text-soft text-xl flex-shrink-0" aria-hidden="true">→</span>
          </a>
        </div>
      `;
    }

    // Legacy drawer → barnprofil (Familj 10/10)
    function openChildDrawer(childId, initialTab) {
      if (!childId) return;
      let url = '/family/child/' + encodeURIComponent(childId);
      if (initialTab) url += '?tab=' + encodeURIComponent(initialTab);
      window.location.href = url;
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
            const sectionLabels = sections.map(sectionLabel).join(', ');
            const activityLabel = itemCount === 1
              ? fpt('family.schedule.activitiesOne')
              : fpt('family.schedule.activitiesMany', { count: itemCount });
            html += `
              <div class="bg-white dark:bg-navy rounded-xl px-4 py-3 border border-gray-100 dark:border-navy-soft">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-navy dark:text-white">${escHtml(sched.name)}</p>
                    <p class="text-xs text-text-soft mt-0.5">${activityLabel} · ${sectionLabels || fpt('family.schedule.sectionsDefault')}</p>
                  </div>
                  <button onclick="applySchedulePackage('standard', '${sched.id}', '${escHtml(sched.name)}', '${childId}')"
                    class="flex-shrink-0 px-4 py-2 bg-gold hover:bg-yellow-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ml-3">
                    ${fpt('family.drawer.select')}
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
                    <p class="text-xs text-text-soft mt-0.5">${fpt('family.schedule.activitiesMany', { count: tpl.item_count || 0 })}</p>
                  </div>
                  <button onclick="applySchedulePackage('family', '${tpl.id}', '${escHtml(tpl.name)}', '${childId}')"
                    class="flex-shrink-0 px-4 py-2 bg-navy hover:bg-navy-soft dark:bg-gold dark:hover:bg-yellow-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ml-3">
                    ${fpt('family.drawer.select')}
                  </button>
                </div>
              </div>`;
          }
          html += '</div></div>';
        }

        if (!html) {
          html = '<p class="text-sm text-text-soft italic">' + fpt('family.drawer.noPackages') + '</p>';
        }

        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = '<p class="text-sm text-red-500">' + fpt('family.errors.loadPackages') + '</p>';
      }
    }

    // ─── Apply a selected schema package to the child ─────
    async function applySchedulePackage(type, scheduleId, scheduleName, childId) {
      const child = familyChildren.find(c => c.id === childId);
      const name = child?.name || 'barnet';
      if (!confirm(fpt('family.drawer.applyConfirm', { schedule: scheduleName, name }))) return;
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
        showToast(fpt('family.toasts.scheduleApplied', { name: scheduleName, child: name }));
      } catch (err) {
        showToast(fpt('family.errors.applySchedule') + ' ' + err.message, true);
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
        if (goalBadgeEl) goalBadgeEl.textContent = fpt('family.drawer.activeGoal');
      } else {
        goalInfoEl.innerHTML = '<p class="text-xs text-text-soft italic">' + fpt('family.errors.noGoalSet') + '</p>';
        if (goalBadgeEl) goalBadgeEl.textContent = fpt('family.drawer.noGoal');
      }

      // ── Populate goal select ──────────────────────────
      const rewards = rewardsData.rewards || [];
      const goalSelect = document.getElementById('goalRewardSelect');
      if (goalSelect) {
        goalSelect.innerHTML = '<option value="">' + fpt('family.drawer.chooseReward') + '</option>' +
          rewards.filter(r => r.is_active).map(r =>
            `<option value="${r.id}" ${childGoal && childGoal.reward_id === r.id ? 'selected' : ''}>${r.icon || '🎁'} ${escHtml(r.name)} — ${r.star_cost} ⭐</option>`
          ).join('');
      }

      // ── Reward visibility ─────────────────────────────
      const rewardsContainer = document.getElementById('rewardsList');
      if (rewards.length === 0) {
        rewardsContainer.innerHTML = '<p class="text-sm text-text-soft italic">' + fpt('family.drawer.noRewardsYet') + ' <a href="/library" class="text-gold underline">' + fpt('family.drawer.goToLibrary') + '</a></p>';
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
        histEl.innerHTML = '<p class="text-xs text-text-soft italic">' + fpt('family.drawer.noRedemptions') + '</p>';
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
        showToast(fpt('family.toasts.redemptionApproved'));
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
        // Trigger confetti badge update on parent dashboard
        loadPendingBadge();
      } catch (err) {
        showToast(err.message || fpt('family.errors.approveRedemption'), true);
      }
    }

    async function denyRedemption(id) {
      try {
        await Auth.api('/api/rewards/redemptions/' + id + '/deny', { method: 'PUT' });
        showToast(fpt('family.toasts.redemptionDenied'));
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
        loadPendingBadge();
      } catch (err) {
        showToast(err.message || fpt('family.errors.deny'), true);
      }
    }

    // ─── Approve / Deny goal change ───────────────────────
    async function approveGoalChange(id) {
      try {
        await Auth.api('/api/rewards/goal-change-requests/' + id + '/approve', { method: 'PUT' });
        showToast(fpt('family.toasts.goalChangeApproved'));
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || fpt('family.errors.approveRedemption'), true);
      }
    }

    async function denyGoalChange(id) {
      try {
        await Auth.api('/api/rewards/goal-change-requests/' + id + '/deny', { method: 'PUT' });
        showToast(fpt('family.toasts.goalChangeDenied'));
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || fpt('family.errors.deny'), true);
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
        showToast(fpt('family.toasts.goalSet'));
        const child = familyChildren.find(c => c.id === drawerChildId);
        loadRewards(drawerChildId, child);
      } catch (err) {
        showToast(err.message || fpt('family.errors.setGoal'), true);
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
      msgEl.textContent = fpt('family.giveStars.uploading');
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
        if (!res.ok) throw new Error(data.error || fpt('family.errors.upload'));
        urlInput.value = data.url;
        preview.src = data.url;
        preview.classList.remove('hidden');
        msgEl.textContent = fpt('family.giveStars.uploadSuccess');
        msgEl.className = 'text-xs text-green-600';
      } catch (err) {
        msgEl.textContent = fpt('family.giveStars.uploadFailed') + ' ' + err.message;
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
        msgEl.textContent = fpt('family.giveStars.reasonRequired');
        msgEl.className = 'text-xs text-red-500';
        return;
      }
      if (!star_count || star_count < 1) {
        msgEl.textContent = fpt('family.giveStars.minStars');
        msgEl.className = 'text-xs text-red-500';
        return;
      }
      const btn = document.getElementById('manualStarSubmitBtn');
      btn.disabled = true;
      btn.textContent = fpt('family.giveStars.sending');
      try {
        await Auth.api('/api/rewards/manual-stars', {
          method: 'POST',
          body: JSON.stringify({ child_id: _manualStarChildId, star_count, reason, image_url }),
        });
        showToast(fpt('family.toasts.starsGiven', { count: star_count }));
        closeManualStarModal();
        const child = familyChildren.find(c => c.id === _manualStarChildId);
        loadRewards(_manualStarChildId, child);
      } catch (err) {
        msgEl.textContent = err.message || fpt('family.errors.giveStars');
        msgEl.className = 'text-xs text-red-500';
      } finally {
        btn.disabled = false;
        btn.textContent = fpt('family.giveStars.submit');
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
        showToast(fpt('family.errors.updateVisibility') + ' ' + err.message, true);
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
        showToast(fpt('family.errors.save') + ' ' + err.message, true);
      }
    }

    async function saveNnlMode(enabled) {
      if (!drawerChildId) return;
      try {
        await Auth.api(`/api/children/${drawerChildId}`, {
          method: 'PUT',
          body: JSON.stringify({
            show_now_next: enabled,
            require_sequential_completion: enabled,
          }),
        });
        const child = familyChildren.find(c => c.id === drawerChildId);
        if (child) {
          child.show_now_next = enabled;
          child.require_sequential_completion = enabled;
        }
        showToast(enabled ? fpt('family.toasts.nnlEnabled') : fpt('family.toasts.nnlDisabled'));
      } catch (err) {
        showToast(fpt('family.errors.save') + ' ' + err.message, true);
        const cb = document.getElementById('setting-show_now_next');
        if (cb) cb.checked = !enabled;
      }
    }
    window.saveNnlMode = saveNnlMode;

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
            showToast(fpt('family.toasts.pinLength'), true);
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
        showToast(fpt('family.errors.save') + ' ' + err.message, true);
      }
    }

    function confirmDeleteDrawerChild() {
      const child = familyChildren.find(c => c.id === drawerChildId);
      if (!child) return;
      pendingDeleteType = 'child';
      pendingDeleteId = drawerChildId;
      document.getElementById('deleteTargetName').textContent = child.name;
      document.getElementById('deleteTargetMessage').textContent = fpt('family.delete.childMessage');
      document.getElementById('confirmDeleteBtn').onclick = executeDelete;
      document.getElementById('deleteModal').classList.remove('hidden');
    }

    // ─── Adult card ─────────────────────────────────────
    function renderAdultCard(parent, children) {
      const isSelf = parent.id === user?.id;
      const isOnlyAdult = (familyData?.parents || []).length === 1;
      const canDelete = !isOnlyAdult && !isSelf;
      const roleOptions = ROLES.map(r =>
        `<option value="${r.value}" ${parent.family_role === r.value ? 'selected' : ''}>${roleOptionLabel(r)}</option>`
      ).join('');

      return `
        <div class="bg-sky dark:bg-navy-soft rounded-2xl p-4 card-hover fade-in">
          <div class="flex items-start gap-3 mb-3">
            <div class="flex-shrink-0">${typeof window.renderParentAvatar === 'function' ? renderParentAvatar(parent, 48) : ''}</div>
            <div class="flex-1 min-w-0">
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
          ${(() => {
            const manageable = (familyData?.children && familyData.children.length)
              ? familyData.children
              : (familyData?.allChildren || []);
            return manageable.length > 0;
          })() ? `
            <div class="mb-3">
              <label class="block text-xs text-text-soft mb-1">Ser dessa barn</label>
              <div class="space-y-1">
                ${(() => {
                  const manageable = (familyData?.children && familyData.children.length)
                    ? familyData.children
                    : (familyData?.allChildren || []);
                  return manageable.map(c => {
                  const linked = (parent.linked_child_ids || []).includes(c.id);
                  return `<label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" class="pc-cb w-4 h-4 rounded border-lavender text-gold focus:ring-gold"
                      data-parent-id="${parent.id}" data-child-id="${c.id}" ${linked ? 'checked' : ''}
                      onchange="updateParentChildren('${parent.id}')">
                    ${childAvatarHtml(c, 20)} ${escHtml(c.name)}
                  </label>`;
                }).join('');
                })()}
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
        showToast(fpt('family.errors.save') + ' ' + err.message, true);
      }
    }

    async function updateParentChildren(parentId) {
      const checkboxes = document.querySelectorAll(`.pc-cb[data-parent-id="${parentId}"]`);
      const childIds = [...checkboxes].filter(cb => cb.checked).map(cb => cb.dataset.childId);
      if (childIds.length === 0) {
        showToast(fpt('family.errors.selectChild'), true);
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
      btn.textContent = fpt('family.giveStars.sending');
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
        showToast(fpt('family.toasts.inviteWithdrawn'));
        init();
      } catch (err) {
        showToast(fpt('family.errors.withdrawInvite') + ' ' + err.message, true);
      }
    }

    // Delete child / member
    let pendingDeleteType = null;
    let pendingDeleteId = null;

    function confirmDeleteChild(id, name) {
      pendingDeleteType = 'child';
      pendingDeleteId = id;
      document.getElementById('deleteTargetName').textContent = name;
      document.getElementById('deleteTargetMessage').textContent = fpt('family.delete.childMessage');
      document.getElementById('confirmDeleteBtn').onclick = executeDelete;
      document.getElementById('deleteModal').classList.remove('hidden');
    }

    function confirmDeleteMember(id, name) {
      pendingDeleteType = 'member';
      pendingDeleteId = id;
      document.getElementById('deleteTargetName').textContent = name;
      document.getElementById('deleteTargetMessage').textContent = fpt('family.delete.memberMessage');
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
          showToast(fpt('family.errors.sessionExpired'), true, 3000);
          setTimeout(() => { Auth.clearAuth(); window.location.href = '/login'; }, 2000);
          return;
        }
        showToast(fpt('family.errors.addChild') + ' ' + err.message, true);
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
            showToast(fpt('family.errors.saveOrder'), true);
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
        return fpt('family.child.monthsMany', { count: months });
      }
      return years === 1
        ? fpt('family.child.yearsOne', { count: years })
        : fpt('family.child.yearsMany', { count: years });
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

if (window.ParentMagicPageBoot) {
  ParentMagicPageBoot.register('family', init);
}

(async function familyI18nBoot() {
  if (typeof window.authGuard === 'function') {
    const user = await window.authGuard();
    if (!user) return;
    if (typeof window.initParentAppI18n === 'function') {
      await window.initParentAppI18n(user.preferred_locale);
    }
  }
  init();
  if (window.ParentMagicShell) ParentMagicShell.init('family');
})();

window.FamilyPage = { prefetch: prefetchFamily, rerenderI18n: rerenderFamilyI18n };

window.addEventListener('stjarndag-magic-navigated', function (e) {
  if (!e.detail || e.detail.pageId !== 'family') return;
  init();
});

document.addEventListener('parent-i18n-ready', rerenderFamilyI18n);
document.addEventListener('locale-changed', rerenderFamilyI18n);
