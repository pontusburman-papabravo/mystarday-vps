
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

    function setFamilyPeopleSurface(state) {
      const skeleton = document.getElementById('familyLoadingSkeleton');
      const dataSections = document.getElementById('familyDataSections');
      const errorBanner = document.getElementById('familyLoadError');
      const showLoading = state === 'loading';
      const showPeople = state === 'ok_items' || state === 'ok_empty';
      if (skeleton) skeleton.classList.toggle('hidden', !showLoading);
      if (dataSections) {
        dataSections.classList.toggle('hidden', !showPeople);
        dataSections.setAttribute('data-people-state', state);
      }
      if (errorBanner && state !== 'error') errorBanner.classList.add('hidden');
      const summary = document.getElementById('familyHubSummary');
      if (summary && showLoading && !familyCache) summary.textContent = fpt('family.shell.loading');
    }

    function setFamilyLoading(loading) {
      setFamilyPeopleSurface(loading ? 'loading' : (familyData ? 'ok_items' : 'ok_empty'));
    }

    function fetchFamily() {
      if (inflightFamily) return inflightFamily;
      const apiFn = (window.SharedFamilyFetch && SharedFamilyFetch.fetch)
        ? function () { return SharedFamilyFetch.fetch(Auth.api.bind(Auth)); }
        : function () { return Auth.api('/api/family'); };
      inflightFamily = apiFn()
        .then(function (data) {
          familyCache = data;
          inflightFamily = null;
          return data;
        })
        .catch(function (err) {
          inflightFamily = null;
          throw err;
        });
      return inflightFamily;
    }

    function rerenderFamilyI18n() {
      if (!familyData) return;
      renderAll(familyData);
      if (window.FamilyMuseum) FamilyMuseum.mount('familyMuseumMount');
    }

    function showFamilyLoadError(err, onRetry) {
      const banner = document.getElementById('familyLoadError');
      if (!banner) return;
      const ApiErr = window.ApiErrorClassification || {};
      const retryMs = ApiErr.getRetryAfterMs ? ApiErr.getRetryAfterMs(err) : null;
      const retrySec = retryMs ? Math.ceil(retryMs / 1000) : null;
      const message = (err && err.message) ? String(err.message) : fpt('family.errors.loadFamily');

      while (banner.firstChild) banner.removeChild(banner.firstChild);

      const title = document.createElement('p');
      title.className = 'font-semibold text-navy dark:text-white mb-1';
      title.textContent = fpt('family.errors.rateLimitTitle');

      const body = document.createElement('p');
      body.className = 'text-sm text-text-soft mb-3';
      body.textContent = message;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'familyLoadRetryBtn';
      btn.className = 'min-h-[44px] px-4 py-2 rounded-xl bg-gold text-navy font-semibold';
      btn.textContent = retrySec
        ? fpt('family.errors.rateLimitRetryIn', { seconds: retrySec })
        : fpt('family.errors.rateLimitRetry');

      banner.appendChild(title);
      banner.appendChild(body);
      banner.appendChild(btn);
      banner.classList.remove('hidden');
      banner.setAttribute('aria-live', 'polite');

      if (typeof onRetry !== 'function') return;
      btn.disabled = !!retryMs;
      if (retryMs) {
        window.setTimeout(function () {
          btn.disabled = false;
          btn.textContent = fpt('family.errors.rateLimitRetry');
        }, retryMs);
      }
      btn.onclick = function () {
        if (btn.disabled) return;
        banner.classList.add('hidden');
        onRetry();
      };
    }

    function hideFamilyLoadError() {
      const banner = document.getElementById('familyLoadError');
      if (banner) banner.classList.add('hidden');
    }

    // ─── Init ────────────────────────────────────────────
    async function init(options) {
      options = options || {};
      if (initInFlight) return initInFlight;
      initInFlight = (async function () {
        try {
          if (window.I18n && typeof I18n.init === 'function') {
            await I18n.init();
          }
          setFamilyLoading(true);
          hideFamilyLoadError();
          familyData = await fetchFamily();
          renderAll(familyData);
          hideFamilyLoadError();
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
          if (familyCache) {
            renderAll(familyCache);
            showToast(fpt('family.errors.loadFamily') + ' ' + err.message, true);
            setFamilyPeopleSurface('ok_items');
          } else {
            showFamilyLoadError(err, function () { init({ force: true }); });
            setFamilyPeopleSurface('error');
          }
        } finally {
          if (familyData || familyCache) {
            setFamilyLoading(false);
          } else {
            setFamilyPeopleSurface('error');
          }
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
      if (pending.length > 0) {
        pendingSection.classList.remove('hidden');
        pendingList.innerHTML = pending.map(inv => {
          const Access = window.FamilyPeopleAccess || {};
          const cap = Access.inviteAccessCaption
            ? Access.inviteAccessCaption(inv.child_ids || inv.childIds, children)
            : { kind: 'unspecified', names: [] };
          let accessNote = '';
          if (cap.kind === 'child_specific') {
            accessNote = '<p class="text-xs text-text-soft mt-0.5">' +
              fpt('family.access.pendingForChildren') + ' ' +
              cap.names.map(function (n) { return escHtml(n); }).join(', ') + '</p>';
          } else if (cap.kind === 'child_specific_hidden') {
            accessNote = '<p class="text-xs text-text-soft mt-0.5">' +
              fpt('family.access.pendingChildSpecific') + '</p>';
          }
          return `
          <div class="flex items-center justify-between bg-lavender dark:bg-navy-soft rounded-xl px-4 py-3" data-invite-state="pending">
            <div>
              <span class="font-medium text-navy dark:text-white">${escapeHtml(inv.email)}</span>
              <span class="ml-2 text-xs text-text-soft italic">${fpt('family.shell.waiting')}</span>
              ${accessNote}
            </div>
            <button onclick="withdrawInvite('${escapeHtml(inv.id)}')" class="text-xs text-red-500 hover:text-red-600 font-semibold">${fpt('family.shell.withdrawInvite')}</button>
          </div>`;
        }).join('');
      } else {
        pendingSection.classList.add('hidden');
      }

      renderPedagogPeople(data);

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

    // ─── Adult card ─────────────────────────────────────
    function renderAdultCard(parent, children) {
      const Access = window.FamilyPeopleAccess || {};
      const isSelf = parent.id === user?.id;
      const isOnlyAdult = (familyData?.parents || []).length === 1;
      const viewerHasPrimary = familyData && familyData.viewer_has_primary != null
        ? !!familyData.viewer_has_primary
        : !!(Access.viewerHasPrimaryRole && Access.viewerHasPrimaryRole(children));
      const canDelete = Access.canDeleteMember
        ? Access.canDeleteMember({
          viewerHasPrimary: viewerHasPrimary,
          viewerIsAdmin: !!(user && user.isAdmin),
          isSelf: isSelf,
          isOnlyAdult: isOnlyAdult,
          targetIsAdmin: !!parent.is_admin,
        })
        : (!isOnlyAdult && !isSelf && viewerHasPrimary);
      const canEditLinks = Access.canEditMemberAccess
        ? Access.canEditMemberAccess({ viewerHasPrimary: viewerHasPrimary })
        : viewerHasPrimary;
      const roleOptions = ROLES.map(r =>
        `<option value="${r.value}" ${parent.family_role === r.value ? 'selected' : ''}>${roleOptionLabel(r)}</option>`
      ).join('');

      return `
        <div class="bg-sky dark:bg-navy-soft rounded-2xl p-4 card-hover fade-in">
          <div class="flex items-start gap-3 mb-3">
            <div class="flex-shrink-0">${typeof window.renderParentAvatar === 'function' ? renderParentAvatar(parent, 48) : ''}</div>
            <div class="flex-1 min-w-0">
              <p class="font-heading font-bold text-navy dark:text-white">${parent.name || fpt('family.roles.parent')}</p>
              <p class="text-sm text-text-soft">${parent.email}</p>
              ${isSelf ? '<span class="inline-block mt-1 text-xs bg-gold-light text-gold px-2 py-0.5 rounded-full font-medium">' + fpt('family.shell.you') + '</span>' : ''}
            </div>
          </div>

          <!-- Role -->
          <div class="mb-3">
            <label class="block text-xs text-text-soft mb-1">${fpt('family.shell.roleLabel')}</label>
            <select onchange="updateMemberRole('${parent.id}', this.value)"
              class="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-navy dark:text-white text-sm font-body">
              ${roleOptions}
            </select>
          </div>

          <!-- Child visibility: only the caller's accessible children (never allChildren). -->
          ${(() => {
            const scoped = familyData?.children || [];
            const shown = Access.accessPresentation
              ? Access.accessPresentation({ scopedChildren: scoped, parent: parent, canEdit: canEditLinks })
              : { kind: canEditLinks ? 'edit' : 'readonly-none', children: scoped, visible: [] };
            if (shown.kind === 'readonly-none') {
              return '<p class="text-xs text-text-soft mb-3" data-access-readonly="1">' + fpt('family.access.noneVisible') + '</p>';
            }
            if (shown.kind === 'readonly-names') {
              return '<div class="mb-3" data-access-readonly="1"><p class="text-xs text-text-soft mb-1">' +
                fpt('family.access.seesThese') + '</p><p class="text-sm text-navy">' +
                shown.visible.map(function (c) {
                  const roleBit = c.role === 'primary' ? ' (' + fpt('family.access.rolePrimary') + ')'
                    : (c.role === 'shared' ? ' (' + fpt('family.access.roleShared') + ')' : '');
                  return escHtml(c.name) + roleBit;
                }).join(', ') +
                '</p></div>';
            }
            return `
            <div class="mb-3">
              <label class="block text-xs text-text-soft mb-1">${fpt('family.access.seesThese')}</label>
              <div class="space-y-1">
                ${scoped.map(c => {
                  const linked = (parent.linked_child_ids || []).map(String).indexOf(String(c.id)) >= 0;
                  return `<label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" class="pc-cb w-4 h-4 rounded border-lavender text-gold focus:ring-gold"
                      data-parent-id="${parent.id}" data-child-id="${c.id}" ${linked ? 'checked' : ''}
                      onchange="updateParentChildren('${parent.id}')">
                    ${childAvatarHtml(c, 20)} ${escHtml(c.name)}
                  </label>`;
                }).join('')}
              </div>
            </div>`;
          })()}

          <!-- Delete -->
          ${canDelete ? `
            <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <button onclick="confirmDeleteMember('${parent.id}', '${(parent.name || fpt('family.roles.parent')).replace(/'/g, "\\'")}')"
                class="w-full px-3 py-1.5 bg-coral hover:bg-red-100 text-red-600 text-xs rounded-lg font-medium transition-colors">
                ${fpt('family.delete.removeFromFamily')}
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    function renderPedagogPeople(data) {
      const mount = document.getElementById('familyPedagogPeople');
      if (!mount) return;
      const pedagogs = data.pedagogs || [];
      const pendingPed = data.pendingPedagogInvites || [];
      if (!pedagogs.length && !pendingPed.length) {
        mount.classList.add('hidden');
        mount.innerHTML = '';
        return;
      }
      const children = data.children || [];
      const canManage = !!(data.viewer_has_primary);
      const cards = pedagogs.map(function (p) {
        const names = children.filter(function (c) {
          return (p.childIds || []).map(String).indexOf(String(c.id)) >= 0;
        }).map(function (c) { return escHtml(c.name); }).join(', ');
        const revoke = canManage
          ? '<button type="button" class="text-xs text-red-500 font-semibold mt-2" data-revoke-pedagog="' +
            escHtml(p.parentId) + '" data-child-id="' + escHtml((p.childIds || [])[0] || '') + '">' +
            fpt('family.access.revokePedagog') + '</button>'
          : '';
        return '<div class="bg-sky dark:bg-navy-soft rounded-2xl p-4" data-people-role="pedagog">' +
          '<p class="font-heading font-bold text-navy dark:text-white">' + escHtml(p.name || p.email || '') + '</p>' +
          '<p class="text-xs text-text-soft">' + fpt('family.access.rolePedagog') +
          (names ? ' · ' + names : '') + '</p>' + revoke + '</div>';
      }).join('');
      const pendingHtml = pendingPed.map(function (inv) {
        return '<div class="flex items-center justify-between bg-lavender dark:bg-navy-soft rounded-xl px-4 py-3" data-invite-state="pending" data-invite-kind="pedagog">' +
          '<span class="font-medium text-navy dark:text-white">' + escHtml(inv.email) +
          ' <span class="text-xs italic text-text-soft">' + fpt('family.shell.waiting') + '</span></span></div>';
      }).join('');
      mount.classList.remove('hidden');
      mount.innerHTML = '<h3 class="text-lg font-heading font-bold text-navy dark:text-white mb-3">' +
        fpt('family.shell.pedagogsHeading') + '</h3><div class="space-y-3">' + cards + pendingHtml + '</div>';
      mount.querySelectorAll('[data-revoke-pedagog]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          try {
            await Auth.api('/api/family/pedagog-access/revoke', {
              method: 'POST',
              body: JSON.stringify({
                pedagogParentId: btn.getAttribute('data-revoke-pedagog'),
                childId: btn.getAttribute('data-child-id'),
              }),
            });
            init({ force: true });
          } catch (err) {
            showToast(fpt('family.errors.save') + ' ' + err.message, true);
          }
        });
      });
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
        msg.textContent = fpt('family.toasts.savedShort');
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
        showToast(fpt('family.toasts.childLinksUpdated'));
      } catch (err) {
        showToast(fpt('family.errors.updateFailed') + ' ' + err.message, true);
        init();
      }
    }

    async function updateMemberRole(parentId, familyRole) {
      try {
        await Auth.api(`/api/family/members/${parentId}`, {
          method: 'PUT',
          body: JSON.stringify({ family_role: familyRole }),
        });
        showToast(fpt('family.toasts.roleUpdated'));
      } catch (err) {
        showToast(fpt('family.errors.updateRoleFailed') + ' ' + err.message, true);
      }
    }

    async function scanAndAddAdult() {
      if (!window.FamilyInviteScan) {
        openCoParentInviteModal();
        return;
      }
      const raw = await FamilyInviteScan.scanAdultQrInteractive();
      if (!raw) return;
      const parsed = FamilyInviteScan.parseQrPayload(raw);
      if (!parsed.email && !parsed.inviteToken) {
        showToast(fpt('family.scanQr.invalid'), true);
        return;
      }
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
          msg.textContent = (typeof window.apiErrorMessage === 'function'
            ? window.apiErrorMessage({
              code: check.adult.code || check.adult.status,
              details: { name: check.adult.existingName },
            })
            : '') || fpt('family.errors.memberAlreadyExists');
          msg.className = 'text-sm text-red-500 font-medium';
          return;
        }
        await Auth.api('/api/family/invite', {
          method: 'POST',
          body: JSON.stringify({ name, email, family_role }),
        });
        msg.textContent = fpt('family.invites.sentTo', { email: email });
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
        btn.textContent = fpt('family.invites.sendBtn');
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
        msg.textContent = fpt('family.invites.sent');
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
        showToast(fpt('family.toasts.deleted'));
        init();
      } catch (err) {
        showToast(fpt('family.errors.deleteFailed') + ' ' + err.message, true);
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
          window.location.href = `/child-wizard?id=${data.id}&name=${encodeURIComponent(data.name)}&schedule=${encodeURIComponent(data.default_schedule_name || '')}`;
          return;
        }
        const toastKey = data && data.pin ? 'family.toasts.childAddedWithPin' : 'family.toasts.childAdded';
        const toastParams = data && data.pin ? { name, pin: data.pin } : { name };
        showToast(fpt(toastKey, toastParams), false, data && data.pin ? 6000 : 3000);
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

    // Capture ownership at module execution — do not re-read the global after
    // await. Soft-nav loads family.js after ParentMagicPageBoot exists; hard
    // /family documents execute family.js before the injected page-boot script.
    var pageBootOwnsThisLoad = !!(window.ParentMagicPageBoot
      && typeof window.ParentMagicPageBoot.register === 'function');

    function registerFamilyInitWithPageBoot() {
      if (window.ParentMagicPageBoot && typeof ParentMagicPageBoot.register === 'function') {
        ParentMagicPageBoot.register('family', init);
        return true;
      }
      return false;
    }

    if (pageBootOwnsThisLoad) {
      registerFamilyInitWithPageBoot();
    }

(async function familyI18nBoot() {
  if (typeof window.authGuard === 'function') {
    const user = await window.authGuard();
    if (!user) return;
    if (typeof window.initParentAppI18n === 'function') {
      await window.initParentAppI18n(user.preferred_locale);
    }
  }
  if (!pageBootOwnsThisLoad) {
    await init();
    registerFamilyInitWithPageBoot();
  }
  if (window.ParentMagicShell) ParentMagicShell.init('family');
})();

window.FamilyPage = { rerenderI18n: rerenderFamilyI18n };

if (typeof window !== 'undefined' && window.__exposeFamilyRuntimeForTests) {
  window.__FamilyRuntimeTestHooks = {
    init: init,
    fetchFamily: fetchFamily,
    showFamilyLoadError: showFamilyLoadError,
    pageBootOwnsThisLoad: pageBootOwnsThisLoad,
    getState: function () {
      return { familyData: familyData, familyCache: familyCache };
    },
  };
}

document.addEventListener('parent-i18n-ready', rerenderFamilyI18n);
document.addEventListener('locale-changed', rerenderFamilyI18n);
