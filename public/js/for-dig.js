/**
 * for-dig.js — För dig page: goals, activation, feedback.
 */
(function () {
  'use strict';

  const INTENT_OPTIONS = [
    { value: 'mindre_tjat', label: 'Mindre tjat' },
    { value: 'tydligare_rutiner', label: 'Tydligare rutiner' },
    { value: 'sjalvstandighet', label: 'Självständighet' },
    { value: 'mindre_stress', label: 'Mindre stress' },
    { value: 'annat', label: 'Annat' },
  ];

  let goals = [];
  let children = [];
  let installs = [];
  let popular = [];
  let favorites = { goals: [], activities: [], rewards: [], schedules: [] };
  let goalFavoriteSlugs = new Set();
  let expandedSlug = null;
  let showAllFavorites = false;

  const FAVORITES_VISIBLE_MAX = 12;

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function track(eventType, metadata) {
    fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(() => {});
  }

  function calcAge(birthday) {
    if (!birthday) return null;
    const b = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
  }

  function parentFirstName() {
    try {
      const user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
      const email = user && user.email;
      if (!email) return 'där';
      const local = email.split('@')[0] || '';
      if (!local || local.length < 2) return 'där';
      return local.charAt(0).toUpperCase() + local.slice(1).split(/[._+-]/)[0];
    } catch (_) {
      return 'där';
    }
  }

  function isInstalled(slug, childId) {
    return installs.some((i) => i.goal_slug === slug && i.child_id === childId);
  }

  function topPopularSlugs() {
    return new Set(popular.slice(0, 3).map((p) => p.goal_slug));
  }

  function popularSlugs() {
    return new Set(popular.map((p) => p.goal_slug));
  }

  function allFavoriteItems() {
    const items = [];
    for (const g of favorites.goals || []) {
      items.push({ type: 'goal', key: 'goal:' + g.goal_slug, label: g.title, icon: g.icon || '⭐', slug: g.goal_slug });
    }
    for (const s of favorites.schedules || []) {
      items.push({ type: 'schedule', key: 'schedule:' + s.id, label: s.name, icon: '📅', id: s.id });
    }
    for (const r of favorites.rewards || []) {
      items.push({ type: 'reward', key: 'reward:' + r.id, label: r.name, icon: r.icon || '🏆', id: r.id });
    }
    for (const a of favorites.activities || []) {
      items.push({ type: 'activity', key: 'activity:' + a.id, label: a.name, icon: a.icon || '📋', id: a.id });
    }
    return items;
  }

  function renderFavorites() {
    const mount = document.getElementById('forDigFavorites');
    if (!mount) return;

    const items = allFavoriteItems();
    if (items.length === 0) {
      mount.innerHTML = `
        <div class="for-dig-favorites">
          <p class="font-semibold text-navy text-sm mb-1">Mina favoriter</p>
          <p class="text-sm text-text-soft">Spara favoriter med stjärnan — då hittar du dem här.</p>
        </div>`;
      return;
    }

    const visible = showAllFavorites ? items : items.slice(0, FAVORITES_VISIBLE_MAX);
    mount.innerHTML = `
      <div class="for-dig-favorites">
        <p class="font-semibold text-navy text-sm mb-3">Mina favoriter</p>
        <div class="space-y-0">
          ${visible.map((item) => `
            <div class="for-dig-favorites-item">
              <span class="text-sm text-navy truncate">${item.icon} ${esc(item.label)}</span>
              ${renderFavoriteAction(item)}
            </div>
          `).join('')}
        </div>
        ${items.length > FAVORITES_VISIBLE_MAX && !showAllFavorites
          ? `<button type="button" class="text-sm text-gold underline mt-3" data-action="show-all-favorites">Visa alla favoriter (${items.length})</button>`
          : ''}
      </div>`;
  }

  function renderFavoriteAction(item) {
    if (item.type === 'goal') {
      const goal = goals.find((g) => g.slug === item.slug);
      const label = goal ? (goal.activateLabel || 'Aktivera') : 'Aktivera';
      return `<button type="button" class="text-xs font-semibold text-gold whitespace-nowrap" data-action="activate" data-slug="${esc(item.slug)}">${esc(label)}</button>`;
    }
    if (item.type === 'schedule') {
      return `<a href="/schedule?view=template&amp;template=${esc(item.id)}" class="text-xs font-semibold text-gold whitespace-nowrap">Öppna schema</a>`;
    }
    if (item.type === 'reward') {
      return `<a href="/skattkammaren" class="text-xs font-semibold text-gold whitespace-nowrap">Skattkammaren</a>`;
    }
    return `<a href="/library" class="text-xs font-semibold text-gold whitespace-nowrap">Bibliotek</a>`;
  }

  function renderMostInstalled() {
    const mount = document.getElementById('forDigMostInstalled');
    if (!mount) return;

    if (popular.length < 3) {
      mount.innerHTML = '';
      return;
    }

    mount.innerHTML = `
      <div class="for-dig-most-installed">
        <p class="font-semibold text-navy text-sm mb-2">Mest installerade just nu</p>
        <ol class="text-sm space-y-1">
          ${popular.map((p, i) => `
            <li>${p.rank || i + 1}. ${esc(p.icon)} ${esc(p.title)} <span class="text-text-soft">— ${p.install_count} familjer</span></li>
          `).join('')}
        </ol>
      </div>`;
  }

  function sortGoalsForDisplay() {
    const pop = popularSlugs();
    const fav = goalFavoriteSlugs;
    return [...goals].sort((a, b) => {
      const aFav = fav.has(a.slug) ? 2 : 0;
      const bFav = fav.has(b.slug) ? 2 : 0;
      if (aFav !== bFav) return bFav - aFav;
      const aPop = pop.has(a.slug) ? 1 : 0;
      const bPop = pop.has(b.slug) ? 1 : 0;
      if (aPop !== bPop) return bPop - aPop;
      return 0;
    });
  }

  function scheduleLabel(goal) {
    if (goal.activateLabel && goal.activateLabel.toLowerCase().startsWith('aktivera ')) {
      const rest = goal.activateLabel.slice(9);
      return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return goal.title;
  }

  function confirmActivationText(goal, child) {
    if (goal.scheduleName) {
      return `<strong>${esc(scheduleLabel(goal))}</strong> kommer att läggas till för <strong>${esc(child.name)}</strong>. Rutinen kan ersätta befintligt innehåll i veckoschemat.`;
    }
    return `Material för <strong>${esc(goal.title)}</strong> läggs till i biblioteket.`;
  }

  function renderRecommendations() {
    const mount = document.getElementById('forDigRecommendations');
    if (!mount) return;

    const withBirthday = children.filter((c) => c.birthday);
    if (withBirthday.length === 0) {
      mount.innerHTML = '';
      return;
    }

    let html = '';
    const sorted = [...withBirthday].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 3);

    for (const child of sorted) {
      const age = calcAge(child.birthday);
      if (age == null) continue;
      const relevant = goals.filter((g) => age >= g.ageMin && age <= g.ageMax).slice(0, 3);
      if (relevant.length === 0) continue;
      html += `
        <div class="for-dig-recommend mb-3">
          <p class="font-semibold text-navy text-sm mb-2">För ${esc(child.name)} (${age} år) — Rekommenderat just nu</p>
          <div class="space-y-2">
            ${relevant.map((g) => {
              const done = isInstalled(g.slug, child.id);
              return `
              <div class="for-dig-recommend-row">
                <span class="text-sm text-navy">${g.icon} ${esc(g.title)}</span>
                ${done
                  ? '<span class="for-dig-recommend-done">Aktiverad ✓</span>'
                  : `<button type="button" class="for-dig-recommend-activate" data-action="activate" data-slug="${esc(g.slug)}" data-child-id="${esc(child.id)}">Aktivera</button>`}
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }
    mount.innerHTML = html;
  }

  function renderPopular() {
    renderMostInstalled();
  }

  function renderGoalCard(goal) {
    const isExplore = goal.primaryAction === 'explore';
    const expanded = expandedSlug === goal.slug;
    const installedAny = children.some((c) => isInstalled(goal.slug, c.id));
    const isPop = topPopularSlugs().has(goal.slug);
    const isFav = goalFavoriteSlugs.has(goal.slug);

    return `
      <article class="for-dig-goal-card${installedAny ? ' is-installed' : ''}" data-slug="${esc(goal.slug)}">
        <div class="flex items-start gap-3">
          <span class="text-3xl" aria-hidden="true">${goal.icon}</span>
          <div class="flex-1 min-w-0">
            <h3 class="font-heading font-bold text-navy text-lg">
              ${esc(goal.title)}
              ${installedAny ? '<span class="for-dig-badge">Aktiverad</span>' : ''}
              ${isPop ? '<span class="for-dig-badge for-dig-popular-badge">Populärt</span>' : ''}
            </h3>
            <p class="text-sm text-text-soft mt-0.5">${esc(goal.tagline)}</p>
            <p class="text-xs text-text-soft mt-1">För barn ${goal.ageMin}–${goal.ageMax} år</p>
          </div>
          <button type="button" class="for-dig-fav-star${isFav ? ' is-on' : ''}" data-action="toggle-favorite" data-slug="${esc(goal.slug)}" aria-label="${isFav ? 'Ta bort favorit' : 'Spara som favorit'}">${isFav ? '★' : '☆'}</button>
        </div>

        ${expanded ? renderGoalDetail(goal) : ''}

        <div class="mt-4 flex flex-col gap-2">
          ${isExplore && !expanded
            ? `<button type="button" class="for-dig-cta for-dig-cta-secondary" data-action="expand" data-slug="${esc(goal.slug)}">Utforska</button>`
            : ''}
          ${!isExplore || expanded
            ? `<button type="button" class="for-dig-cta for-dig-cta-primary" data-action="activate" data-slug="${esc(goal.slug)}">${esc(goal.activateLabel || 'Aktivera')}</button>`
            : ''}
          <button type="button" class="for-dig-suggestion-link" data-action="suggest" data-slug="${esc(goal.slug)}">💡 Föreslå förbättring</button>
        </div>
      </article>`;
  }

  function renderGoalDetail(goal) {
    return `
      <div class="for-dig-detail">
        <p class="text-sm font-semibold text-navy mb-2">Hjälper barnet att:</p>
        <ul class="text-sm text-text-soft space-y-1 mb-3">
          ${(goal.outcomes || []).map((o) => `<li>✓ ${esc(o)}</li>`).join('')}
        </ul>
        <p class="text-sm text-text-soft mb-2">Barn brukar tjäna ${esc(goal.starsHint || 'stjärnor per vecka')}</p>
        <div class="flex flex-wrap gap-2 mb-3">
          ${(goal.rewardExamples || []).map((r) => `
            <span class="text-sm bg-gold-light px-2 py-1 rounded-lg">${r.icon} ${esc(r.label)}</span>
          `).join('')}
        </div>
        <a href="/library" class="text-sm text-gold underline" data-action="library-link">Anpassa själv i biblioteket →</a>
      </div>`;
  }

  function renderGoals() {
    const mount = document.getElementById('forDigGoals');
    if (!mount) return;
    mount.innerHTML = sortGoalsForDisplay().map(renderGoalCard).join('');
  }

  function showModal(html, onMount) {
    const backdrop = document.createElement('div');
    backdrop.className = 'for-dig-modal-backdrop';
    backdrop.innerHTML = `<div class="for-dig-modal" role="dialog">${html}</div>`;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
    document.body.appendChild(backdrop);
    if (onMount) onMount(backdrop);
    return backdrop;
  }

  function buildActivationModalHtml(goal, phase, selectedChild) {
    if (phase === 'pick') {
      return `
        <h3 class="font-heading font-bold text-navy text-lg mb-3">Välj barn</h3>
        <p class="text-sm text-text-soft mb-4">Vem ska det gälla?</p>
        <div class="space-y-2" id="forDigChildPicker">
          ${children.map((c) => `
            <button type="button" class="for-dig-intent-option" data-child-id="${esc(c.id)}">
              ${esc(c.emoji || '⭐')} ${esc(c.name)}
            </button>
          `).join('')}
        </div>
        <button type="button" class="mt-3 text-sm text-text-soft underline w-full" data-action="activate-cancel">Avbryt</button>
      `;
    }

    return `
      <h3 class="font-heading font-bold text-navy text-lg mb-3">Aktivera</h3>
      <p class="text-sm text-text-soft mb-5">${confirmActivationText(goal, selectedChild)}</p>
      <div class="flex gap-2">
        <button type="button" class="for-dig-cta for-dig-cta-secondary flex-1" data-action="activate-cancel">Avbryt</button>
        <button type="button" class="for-dig-cta for-dig-cta-primary flex-1" data-action="activate-confirm">Aktivera</button>
      </div>
    `;
  }

  async function confirmActivation(goal, preselectedChild) {
    if (children.length === 0) {
      window.showToast && showToast('Lägg till ett barn först under Familjen.', true);
      return null;
    }

    // Guard: don't stack multiple activation modals on rapid double-clicks.
    if (document.querySelector('.for-dig-modal-backdrop[data-activation]')) {
      return null;
    }

    const initialChild = preselectedChild || (children.length === 1 ? children[0] : null);

    return new Promise((resolve) => {
      let phase = initialChild ? 'confirm' : 'pick';
      let selectedChild = initialChild;

      const backdrop = document.createElement('div');
      backdrop.className = 'for-dig-modal-backdrop';
      backdrop.setAttribute('data-activation', '1');
      backdrop.innerHTML = `<div class="for-dig-modal" role="dialog">${buildActivationModalHtml(goal, phase, selectedChild)}</div>`;
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.remove();
          resolve(null);
        }
      });
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (ev) => {
        const cancelBtn = ev.target.closest('[data-action="activate-cancel"]');
        if (cancelBtn) {
          backdrop.remove();
          resolve(null);
          return;
        }

        if (phase === 'pick') {
          const pickBtn = ev.target.closest('[data-child-id]');
          if (!pickBtn) return;
          selectedChild = children.find((c) => c.id === pickBtn.dataset.childId) || null;
          if (!selectedChild) return;
          phase = 'confirm';
          backdrop.querySelector('.for-dig-modal').innerHTML = buildActivationModalHtml(goal, phase, selectedChild);
          return;
        }

        const confirmBtn = ev.target.closest('[data-action="activate-confirm"]');
        if (confirmBtn && selectedChild) {
          backdrop.remove();
          resolve(selectedChild);
        }
      });
    });
  }

  async function activateGoal(slug, preselectedChildId) {
    const goal = goals.find((g) => g.slug === slug);
    if (!goal) return;

    const preselectedChild = preselectedChildId
      ? children.find((c) => c.id === preselectedChildId) || null
      : null;

    const child = await confirmActivation(goal, preselectedChild);
    if (!child) return;

    // Note: the server records `for_dig_activate_click` (and `_success`/`_fail`)
    // on the activate route — do not also track client-side or it double-counts.

    // The same goal can have an Aktivera button in favorites, recommendations
    // and the goal card. Disable them all and restore each to its own label.
    const btns = Array.from(
      document.querySelectorAll(`[data-action="activate"][data-slug="${CSS.escape(slug)}"]`)
    );
    const originalLabels = btns.map((b) => b.textContent);
    btns.forEach((b) => {
      b.disabled = true;
      b.textContent = 'Aktiverar…';
    });

    try {
      const res = await window.apiFetch(`/api/for-dig/${slug}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, overwrite: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktivering misslyckades');

      window.showToast && showToast(data.message || 'Klart!');
      await loadInstalls();
      renderGoals();
      renderRecommendations();
      showIntentModal(slug, child.id, goal.title);
    } catch (err) {
      window.showToast && showToast(err.message || 'Något gick fel', true);
    } finally {
      // renderGoals()/renderRecommendations() may have replaced some buttons;
      // restore only those still attached to the DOM.
      btns.forEach((b, i) => {
        if (!b.isConnected) return;
        b.disabled = false;
        b.textContent = originalLabels[i];
      });
    }
  }

  function showIntentModal(goalSlug, childId, goalTitle) {
    const html = `
      <h3 class="font-heading font-bold text-navy text-lg mb-2">Vi är nyfikna</h3>
      <p class="text-sm text-text-soft mb-4">Vad hoppas du att <strong>${esc(goalTitle)}</strong> ska hjälpa med?</p>
      <div id="forDigIntentOptions">
        ${INTENT_OPTIONS.map((o) => `
          <button type="button" class="for-dig-intent-option" data-reason="${o.value}">${esc(o.label)}</button>
        `).join('')}
      </div>
    `;
    showModal(html, (backdrop) => {
      backdrop.querySelector('#forDigIntentOptions').addEventListener('click', async (ev) => {
        const btn = ev.target.closest('[data-reason]');
        if (!btn) return;
        try {
          await window.apiFetch('/api/for-dig/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goal_slug: goalSlug,
              child_id: childId,
              phase: 'intent',
              intent_reason: btn.dataset.reason,
            }),
          });
          // Server records `for_dig_feedback_intent` on successful insert.
        } catch (_) { /* non-blocking */ }
        backdrop.remove();
      });
    });
  }

  function showSuggestionModal(goalSlug) {
    const goal = goals.find((g) => g.slug === goalSlug);
    const html = `
      <h3 class="font-heading font-bold text-navy text-lg mb-2">Föreslå förbättring</h3>
      <p class="text-sm text-text-soft mb-3">Vad saknar du i ${esc(goal ? goal.title : 'detta mål')}?</p>
      <textarea id="forDigSuggestionText" rows="4" maxlength="500" class="w-full border-2 border-lavender rounded-xl p-3 text-sm mb-3" placeholder="Berätta kort…"></textarea>
      <button type="button" id="forDigSuggestionSubmit" class="for-dig-cta for-dig-cta-primary">Skicka</button>
      <button type="button" id="forDigSuggestionCancel" class="mt-2 text-sm text-text-soft underline w-full">Avbryt</button>
    `;
    showModal(html, (backdrop) => {
      backdrop.querySelector('#forDigSuggestionCancel').addEventListener('click', () => backdrop.remove());
      backdrop.querySelector('#forDigSuggestionSubmit').addEventListener('click', async () => {
        const text = backdrop.querySelector('#forDigSuggestionText').value.trim();
        if (!text) return;
        try {
          await window.apiFetch('/api/for-dig/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_slug: goalSlug, phase: 'suggestion', free_text: text }),
          });
          // Server records `for_dig_feedback_suggestion` on successful insert.
          window.showToast && showToast('Tack för ditt förslag!');
        } catch (_) {
          window.showToast && showToast('Kunde inte skicka', true);
        }
        backdrop.remove();
      });
    });
  }

  async function loadGoals() {
    const res = await window.apiFetch('/api/for-dig/goals');
    if (!res.ok) throw new Error('Kunde inte ladda mål');
    const data = await res.json();
    goals = data.goals || [];
  }

  async function loadChildren() {
    const res = await window.apiFetch('/api/children');
    if (!res.ok) return;
    children = await res.json();
    if (!Array.isArray(children)) children = children.children || [];
  }

  async function loadInstalls() {
    const res = await window.apiFetch('/api/for-dig/installs');
    if (!res.ok) return;
    const data = await res.json();
    installs = data.installs || [];
  }

  async function loadPopular() {
    const res = await window.apiFetch('/api/for-dig/popular?min_count=5');
    if (!res.ok) return;
    const data = await res.json();
    popular = data.goals || [];
  }

  async function loadFavorites() {
    const res = await window.apiFetch('/api/for-dig/favorites');
    if (!res.ok) return;
    favorites = await res.json();
    goalFavoriteSlugs = new Set((favorites.goals || []).map((g) => g.goal_slug));
  }

  async function toggleGoalFavorite(slug) {
    try {
      const res = await window.apiFetch('/api/for-dig/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_slug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara favorit');
      if (data.is_favorite) {
        goalFavoriteSlugs.add(slug);
      } else {
        goalFavoriteSlugs.delete(slug);
      }
      // Server records `for_dig_favorite_toggle` on the favorites route.
      await loadFavorites();
      renderFavorites();
      renderGoals();
    } catch (err) {
      window.showToast && showToast(err.message || 'Kunde inte spara favorit', true);
    }
  }

  function bindEvents() {
    const favMount = document.getElementById('forDigFavorites');
    if (favMount) {
      favMount.addEventListener('click', (ev) => {
        const showAll = ev.target.closest('[data-action="show-all-favorites"]');
        if (showAll) {
          showAllFavorites = true;
          renderFavorites();
          return;
        }
        const activate = ev.target.closest('[data-action="activate"]');
        if (activate) {
          activateGoal(activate.dataset.slug);
        }
      });
    }

    const recMount = document.getElementById('forDigRecommendations');
    if (recMount) {
      recMount.addEventListener('click', (ev) => {
        const activate = ev.target.closest('[data-action="activate"]');
        if (activate) {
          activateGoal(activate.dataset.slug, activate.dataset.childId);
        }
      });
    }

    const mount = document.getElementById('forDigGoals');
    if (!mount) return;

    mount.addEventListener('click', (ev) => {
      const lib = ev.target.closest('[data-action="library-link"]');
      if (lib) {
        track('for_dig_library_link', {});
        return;
      }

      const expand = ev.target.closest('[data-action="expand"]');
      if (expand) {
        expandedSlug = expand.dataset.slug;
        track('for_dig_goal_expand', { goal_slug: expandedSlug });
        renderGoals();
        return;
      }

      const activate = ev.target.closest('[data-action="activate"]');
      if (activate) {
        activateGoal(activate.dataset.slug);
        return;
      }

      const suggest = ev.target.closest('[data-action="suggest"]');
      if (suggest) {
        showSuggestionModal(suggest.dataset.slug);
        return;
      }

      const fav = ev.target.closest('[data-action="toggle-favorite"]');
      if (fav) {
        toggleGoalFavorite(fav.dataset.slug);
      }
    });

    const libFooter = document.getElementById('forDigLibraryLink');
    if (libFooter) {
      libFooter.addEventListener('click', () => track('for_dig_library_link', {}));
    }
  }

  const WINBACK_STORAGE_KEY = 'stjarndag_winback_utm';

  function captureWinbackUtmEarly() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    if (utmSource !== 'winback') return null;
    const payload = {
      utm_source: utmSource,
      utm_medium: params.get('utm_medium') || 'email',
      captured_at: Date.now(),
    };
    try {
      sessionStorage.setItem(WINBACK_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* private mode */ }
    return payload;
  }

  function getStoredWinbackUtm() {
    try {
      const raw = sessionStorage.getItem(WINBACK_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.utm_source !== 'winback') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function trackWinbackLanding() {
    const utm = getStoredWinbackUtm() || captureWinbackUtmEarly();
    if (!utm) return;
    track('win_back_landing', {
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
    });
  }

  async function ensureParentAuth() {
    try {
      const res = await window.apiFetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        if (user && (user.type === 'parent' || user.isAdmin || user.is_admin)) {
          return user;
        }
      }
    } catch (_) { /* fall through to login */ }
    const returnPath = window.location.pathname + window.location.search;
    window.location.href = '/login?next=' + encodeURIComponent(returnPath);
    return null;
  }

  async function init() {
    captureWinbackUtmEarly();

    const user = await ensureParentAuth();
    if (!user) return;

    document.getElementById('forDigGreeting').textContent = `Hej ${parentFirstName()} 👋`;

    try {
      await Promise.all([loadGoals(), loadChildren(), loadInstalls(), loadPopular(), loadFavorites()]);
      renderFavorites();
      renderRecommendations();
      renderPopular();
      renderGoals();
      bindEvents();
      trackWinbackLanding();
      const utm = getStoredWinbackUtm();
      track('for_dig_page_view', {
        child_count: children.length,
        ...(utm ? { utm_source: utm.utm_source, utm_medium: utm.utm_medium } : {}),
      });
    } catch (err) {
      const mount = document.getElementById('forDigGoals');
      if (mount) {
        mount.innerHTML = `<p class="text-red-500 text-center py-8">${esc(err.message)}</p>`;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (window.ParentMagicPageBoot) {
    ParentMagicPageBoot.register('for-dig', init);
  }
})();
