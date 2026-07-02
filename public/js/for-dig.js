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
  let _forDigClickBound = false;
  let _forDigInitGen = 0;

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

  function installedChildren(slug) {
    return children.filter((c) => isInstalled(slug, c.id));
  }

  function installedBadgeHtml(goal) {
    const installed = installedChildren(goal.slug);
    if (installed.length === 0) return '';
    if (installed.length === 1) {
      return `<span class="for-dig-badge for-dig-badge--child">För ${esc(installed[0].name)}</span>`;
    }
    if (installed.length === children.length && children.length > 1) {
      return '<span class="for-dig-badge for-dig-badge--child">Alla barn</span>';
    }
    return `<span class="for-dig-badge for-dig-badge--child">${installed.length} barn</span>`;
  }

  function goalStarsLine(goal) {
    if (!goal.starsHint || goal.starsHint.includes('tempo')) {
      return 'Belöningar och stjärnor som passar barnets tempo.';
    }
    return `Barn brukar tjäna ${esc(goal.starsHint)}.`;
  }

  function recommendationHighlights(goal) {
    const highlights = goal.highlightActivities || [];
    if (highlights.length > 0) return highlights.slice(0, 3).join(' · ');
    return goal.tagline || '';
  }

  function shouldSkipChildPicker(preselectedChildId) {
    if (children.length === 1) return true;
    return Boolean(preselectedChildId);
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
        <div class="for-dig-favorites for-dig-favorites--empty">
          <p class="font-semibold text-navy text-sm mb-2">Mina favoriter</p>
          <p class="text-sm text-text-soft">Spara favoriter med stjärnan ☆ på mål, scheman eller belöningar — de samlas här.</p>
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
      const label = goal ? goalCtaLabel(goal) : 'Aktivera';
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

  function childAges() {
    return children
      .map((c) => ({ child: c, age: calcAge(c.birthday) }))
      .filter((x) => x.age != null);
  }

  function goalMatchesFamilyAge(goal) {
    const ages = childAges();
    if (ages.length === 0) return true;
    return ages.some((x) => x.age >= goal.ageMin && x.age <= goal.ageMax);
  }

  function goalsForDisplay() {
    return sortGoalsForDisplay().filter(goalMatchesFamilyAge);
  }

  function sortRecommendationsForChild(child, relevantGoals) {
    return [...relevantGoals].sort((a, b) => {
      const aDone = isInstalled(a.slug, child.id) ? 1 : 0;
      const bDone = isInstalled(b.slug, child.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const pop = popularSlugs();
      const aPop = pop.has(a.slug) ? 1 : 0;
      const bPop = pop.has(b.slug) ? 1 : 0;
      return bPop - aPop;
    }).slice(0, 3);
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

  function goalHeadline(goal) {
    return goal.headline || goal.title;
  }

  function goalCtaLabel(goal) {
    if (goal.confirmCtaLabel) return goal.confirmCtaLabel;
    if (goal.scheduleName) {
      return `Lägg in ${scheduleLabel(goal).toLowerCase()}`;
    }
    if (goal.activityNames && goal.activityNames.length > 0) {
      return 'Lägg till aktiviteterna';
    }
    if (goal.rewardNames && goal.rewardNames.length > 0) {
      return 'Lägg till belöningarna';
    }
    return goal.activateLabel || 'Aktivera';
  }

  function decisionSignalIcon(signal) {
    if (signal === 'replace') return '⚠️';
    if (signal === 'child') return '👧';
    return '✓';
  }

  function renderPlanDetails(plan, goal) {
    const details = plan && plan.details;
    if (!details) return '';

    const meta = [];
    if (details.days_label) meta.push(`Dagar: ${details.days_label}`);
    if (details.section_label) meta.push(`Sektion: ${details.section_label}`);
    if (plan.child_names && plan.child_names.length > 0) {
      meta.push(`Gäller: ${plan.child_names.join(', ')}`);
    }

    const items = details.items || [];
    const itemType = details.type === 'rewards' ? 'belöning' : 'aktivitet';
    const starWord = details.type === 'rewards' ? 'stjärnor' : 'stjärnor';

    return `
      <div class="for-dig-details-panel mb-4">
        ${meta.length > 0 ? `<p class="text-xs text-text-soft mb-2">${meta.map((m) => esc(m)).join(' · ')}</p>` : ''}
        ${items.length > 0 ? `
          <ul class="for-dig-details-list">
            ${items.map((item) => `
              <li class="text-sm text-text-soft py-1">
                ${item.icon || '📋'} ${esc(item.name)}
                ${item.star_value ? `<span class="text-xs"> · ${item.star_value} ${starWord}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        ` : ''}
        ${goal && (goal.scheduleName || (goal.activityNames && goal.activityNames.length > 0))
          ? `<p class="text-xs text-text-soft mt-2">Justera stjärnor under <strong>Anpassa</strong>.</p>`
          : ''}
        ${details.type === 'rewards'
          ? '<p class="text-xs text-text-soft mt-2">Belöningarna läggs till i Skattkammaren.</p>'
          : ''}
        ${items.length === 0 && details.item_count > 0
          ? `<p class="text-xs text-text-soft">${details.item_count} ${itemType}${details.item_count === 1 ? '' : 'er'} ingår.</p>`
          : ''}
      </div>`;
  }

  function buildDecisionScreenHtml(goal, plan, showDetails, loading) {
    if (loading || !plan) {
      return `
        <div class="for-dig-decision for-dig-decision--loading" style="${goalAccentStyle(goal)}">
          <p class="text-sm text-text-soft text-center py-6">Förbereder…</p>
        </div>`;
    }

    const decisions = plan.decisions || [];
    return `
      <div class="for-dig-decision" style="${goalAccentStyle(goal)}">
        <h3 class="for-dig-decision__headline font-heading font-bold text-navy text-lg leading-tight mb-2">${esc(plan.headline || goalHeadline(goal))}</h3>
        <p class="for-dig-decision__promise text-sm text-navy mb-3">✓ ${esc(plan.promise)}</p>
        ${decisions.length > 0 ? `
          <p class="for-dig-decision__label text-xs font-semibold text-text-soft uppercase tracking-wide mb-2">Det här händer</p>
          <ul class="for-dig-decision__points mb-3">
            ${decisions.map((d) => `
              <li class="for-dig-decision__point">${decisionSignalIcon(d.signal)} ${esc(d.text)}</li>
            `).join('')}
          </ul>
        ` : ''}
        <button type="button" class="for-dig-details-toggle text-sm text-gold font-semibold mb-3" data-action="toggle-details">${showDetails ? 'Dölj detaljer' : 'Visa detaljer'}</button>
        ${showDetails ? renderPlanDetails(plan, goal) : ''}
        <div class="for-dig-activate-actions">
          <button type="button" class="for-dig-cta for-dig-cta-primary" data-action="activate-confirm" style="background:var(--fdg-accent); color:#1B2340">${esc(plan.cta_label || goalCtaLabel(goal))}</button>
          <button type="button" class="for-dig-cta for-dig-cta-secondary" data-action="activate-customize">Anpassa</button>
          <button type="button" class="text-sm text-text-soft underline w-full" data-action="activate-cancel">Avbryt</button>
        </div>
      </div>`;
  }

  function scheduleLabel(goal) {
    if (goal.activateLabel && goal.activateLabel.toLowerCase().startsWith('aktivera ')) {
      const rest = goal.activateLabel.slice(9);
      return rest.charAt(0).toUpperCase() + rest.slice(1);
    }
    return goal.title;
  }

  function renderRecommendations() {
    const mount = document.getElementById('forDigRecommendations');
    if (!mount) return;

    const withBirthday = children.filter((c) => c.birthday);
    if (children.length > 0 && withBirthday.length === 0) {
      mount.innerHTML = `
        <div class="for-dig-recommend mb-2">
          <p class="for-dig-section-title">Personliga tips</p>
          <p class="text-sm text-text-soft mb-2">Lägg till barnets födelsedag under Familj så kan vi föreslå rätt mål.</p>
          <a href="/family" class="text-sm text-gold font-semibold no-underline">Gå till Familjen →</a>
        </div>`;
      return;
    }

    if (withBirthday.length === 0) {
      mount.innerHTML = '';
      return;
    }

    let html = '';
    const sorted = [...withBirthday].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 3);

    for (const child of sorted) {
      const age = calcAge(child.birthday);
      if (age == null) continue;
      const relevant = sortRecommendationsForChild(
        child,
        goals.filter((g) => age >= g.ageMin && age <= g.ageMax)
      );
      if (relevant.length === 0) continue;
      html += `
        <div class="for-dig-recommend mb-3">
          <p class="for-dig-section-title">Rekommenderat för ${esc(child.name)}</p>
          <div class="space-y-2">
            ${relevant.map((g) => {
              const done = isInstalled(g.slug, child.id);
              return `
              <div class="for-dig-recommend-row">
                <span class="text-sm text-navy min-w-0">
                  ${g.icon} ${esc(goalHeadline(g))}
                  <span class="for-dig-recommend-highlight">${esc(g.tagline || '')}</span>
                </span>
                ${done
                  ? '<span class="for-dig-recommend-done">Aktiverad ✓</span>'
                  : `<button type="button" class="for-dig-recommend-activate" data-action="activate" data-slug="${esc(g.slug)}" data-child-id="${esc(child.id)}">${esc(goalCtaLabel(g))}</button>`}
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
    const expanded = expandedSlug === goal.slug;
    const installedAny = installedChildren(goal.slug).length > 0;
    const isPop = topPopularSlugs().has(goal.slug);
    const isFav = goalFavoriteSlugs.has(goal.slug);

    return `
      <article class="for-dig-goal-card${installedAny ? ' is-installed' : ''}" data-slug="${esc(goal.slug)}">
        <div class="flex items-start gap-3">
          <span class="text-3xl" aria-hidden="true">${goal.icon}</span>
          <div class="flex-1 min-w-0">
            <h3 class="font-heading font-bold text-navy text-lg">
              ${esc(goalHeadline(goal))}
              ${installedBadgeHtml(goal)}
              ${isPop ? '<span class="for-dig-badge for-dig-popular-badge">Populärt</span>' : ''}
            </h3>
            <p class="text-sm text-text-soft mt-0.5">${esc(goal.tagline)}</p>
            <p class="text-xs text-text-soft mt-1">För barn ${goal.ageMin}–${goal.ageMax} år</p>
          </div>
          <button type="button" class="for-dig-fav-star${isFav ? ' is-on' : ''}" data-action="toggle-favorite" data-slug="${esc(goal.slug)}" aria-label="${isFav ? 'Ta bort favorit' : 'Spara som favorit'}">${isFav ? '★' : '☆'}</button>
        </div>

        ${expanded ? renderGoalDetail(goal) : ''}

        <div class="mt-4 flex flex-col gap-2">
          <button type="button" class="for-dig-cta for-dig-cta-primary" data-action="activate" data-slug="${esc(goal.slug)}">${esc(goalCtaLabel(goal))}</button>
          ${!expanded && (goal.outcomes || []).length > 0
            ? `<button type="button" class="text-sm text-gold font-semibold" data-action="expand" data-slug="${esc(goal.slug)}">Visa mer</button>`
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
        <p class="text-sm text-text-soft mb-2">${goalStarsLine(goal)}</p>
        <div class="flex flex-wrap gap-2 mb-1">
          ${(goal.rewardExamples || []).map((r) => `
            <span class="text-sm bg-gold-light px-2 py-1 rounded-lg">${r.icon} ${esc(r.label)}</span>
          `).join('')}
        </div>
      </div>`;
  }

  function renderGoals() {
    const mount = document.getElementById('forDigGoals');
    if (!mount) return;
    mount.innerHTML = `
      <div class="for-dig-section">
        <h2 class="for-dig-section-title">Utvecklingsmål</h2>
        <p class="for-dig-section-sub">Välj ett problem — vi sätter upp rutinen åt dig.</p>
      </div>
      ${goalsForDisplay().map(renderGoalCard).join('')}
    `;
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

  function goalAccentStyle(goal) {
    const color = (goal && goal.accentColor) || '#F5A623';
    const bg = (goal && goal.accentBg) || '#FFF3D6';
    return `--fdg-accent:${color};--fdg-bg:${bg}`;
  }

  function renderGoalHeader(goal) {
    return `
      <div class="for-dig-activate-header" style="${goalAccentStyle(goal)}">
        <span class="for-dig-activate-header__icon" aria-hidden="true">${goal.icon}</span>
        <div>
          <p class="for-dig-activate-header__title font-heading text-lg leading-tight">${esc(goalHeadline(goal))}</p>
          <p class="for-dig-activate-header__tagline">${esc(goal.tagline || '')}</p>
        </div>
      </div>`;
  }

  function customizeStarLabel(previewType) {
    if (previewType === 'rewards') return 'stjärnor';
    return 'stjärnor';
  }

  function buildCustomizeHtml(goal, preview, starOverrides) {
    const items = (preview && preview.items) || [];
    const type = preview && preview.type;
    const starWord = customizeStarLabel(type);
    return `
      ${renderGoalHeader(goal)}
      <h3 class="font-heading font-bold text-navy text-lg mb-2">Anpassa</h3>
      <p class="text-sm text-text-soft mb-4">Välj hur många ${starWord} varje ${type === 'rewards' ? 'belöning' : 'aktivitet'} ska ge.</p>
      <div class="mb-4 max-h-64 overflow-y-auto" style="${goalAccentStyle(goal)}">
        ${items.map((item, idx) => {
          const current = starOverrides[item.name] || item.star_value || 1;
          return `
          <div class="for-dig-customize-row">
            <span class="text-sm text-navy min-w-0">${item.icon || '📋'} ${esc(item.name)}</span>
            <div class="for-dig-star-picker">
              ${[1, 2, 3, 4, 5].map((n) => `
                <button type="button" class="for-dig-star-opt${current === n ? ' is-on' : ''}" data-star-index="${idx}" data-stars="${n}">${n}⭐</button>
              `).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="for-dig-activate-actions">
        <button type="button" class="for-dig-cta for-dig-cta-primary" data-action="activate-confirm" style="background:var(--fdg-accent); border-color:var(--fdg-accent)">${esc(goalCtaLabel(goal))}</button>
        <button type="button" class="text-sm text-text-soft underline w-full" data-action="customize-back">Tillbaka</button>
        <button type="button" class="text-sm text-text-soft underline w-full" data-action="activate-cancel">Avbryt</button>
      </div>`;
  }

  function buildActivationModalHtml(goal, phase, plan, preview, starOverrides, selectedChildIds, showDetails, planLoading) {
    if (phase === 'pick') {
      const ids = selectedChildIds || new Set();
      return `
        ${renderGoalHeader(goal)}
        <h3 class="font-heading font-bold text-navy text-lg mb-2">Välj barn</h3>
        <p class="text-sm text-text-soft mb-4">Välj ett eller flera barn.</p>
        <div class="space-y-2" id="forDigChildPicker" style="${goalAccentStyle(goal)}">
          ${children.map((c) => `
            <button type="button" class="for-dig-intent-option${ids.has(c.id) ? ' is-selected' : ''}" data-child-id="${esc(c.id)}">
              ${ids.has(c.id) ? '✓ ' : ''}${esc(c.emoji || '⭐')} ${esc(c.name)}
            </button>
          `).join('')}
        </div>
        <div class="for-dig-activate-actions mt-4">
          <button type="button" class="for-dig-cta for-dig-cta-primary" data-action="pick-continue" style="background:var(--fdg-accent); color:#1B2340" ${ids.size === 0 ? 'disabled' : ''}>Fortsätt</button>
          <button type="button" class="text-sm text-text-soft underline w-full" data-action="activate-cancel">Avbryt</button>
        </div>`;
    }

    if (phase === 'customize') {
      return buildCustomizeHtml(goal, preview, starOverrides || {});
    }

    return buildDecisionScreenHtml(goal, plan, showDetails, planLoading);
  }

  async function fetchActivationPlan(goal, childIds) {
    const res = await window.apiFetch(`/api/for-dig/${goal.slug}/preview-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_ids: childIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte ladda planen');
    return data;
  }

  async function confirmActivation(goal, preselectedChildId) {
    if (children.length === 0) {
      window.showToast && showToast('Lägg till ett barn först under Familjen.', true);
      return null;
    }

    if (document.querySelector('.for-dig-modal-backdrop[data-activation]')) {
      return null;
    }

    const initialIds = new Set();
    if (preselectedChildId) initialIds.add(preselectedChildId);
    else if (children.length === 1) initialIds.add(children[0].id);

    return new Promise((resolve) => {
      let phase = shouldSkipChildPicker(preselectedChildId) ? 'confirm' : 'pick';
      let selectedChildIds = initialIds;
      let preview = null;
      let plan = null;
      let planLoading = false;
      let showDetails = false;
      let starOverrides = null;

      const backdrop = document.createElement('div');
      backdrop.className = 'for-dig-modal-backdrop';
      backdrop.setAttribute('data-activation', '1');

      const renderModal = () => {
        backdrop.querySelector('.for-dig-modal').innerHTML = buildActivationModalHtml(
          goal,
          phase,
          plan,
          preview,
          starOverrides,
          selectedChildIds,
          showDetails,
          planLoading
        );
      };

      const loadPlan = async () => {
        if (selectedChildIds.size === 0) return;
        planLoading = true;
        renderModal();
        try {
          plan = await fetchActivationPlan(goal, Array.from(selectedChildIds));
        } catch (err) {
          window.showToast && showToast(err.message || 'Kunde inte ladda planen', true);
          backdrop.remove();
          resolve(null);
          return;
        } finally {
          planLoading = false;
          renderModal();
        }
      };

      backdrop.innerHTML = `<div class="for-dig-modal" role="dialog"></div>`;
      renderModal();
      if (phase === 'confirm') loadPlan();

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.remove();
          resolve(null);
        }
      });
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', async (ev) => {
        const cancelBtn = ev.target.closest('[data-action="activate-cancel"]');
        if (cancelBtn) {
          backdrop.remove();
          resolve(null);
          return;
        }

        const toggleDetails = ev.target.closest('[data-action="toggle-details"]');
        if (toggleDetails) {
          showDetails = !showDetails;
          renderModal();
          return;
        }

        if (phase === 'pick') {
          const pickBtn = ev.target.closest('[data-child-id]');
          if (pickBtn) {
            const id = pickBtn.dataset.childId;
            if (selectedChildIds.has(id)) selectedChildIds.delete(id);
            else selectedChildIds.add(id);
            renderModal();
            return;
          }
          const continueBtn = ev.target.closest('[data-action="pick-continue"]');
          if (continueBtn && selectedChildIds.size > 0) {
            phase = 'confirm';
            plan = null;
            await loadPlan();
            return;
          }
          return;
        }

        const customizeBtn = ev.target.closest('[data-action="activate-customize"]');
        if (customizeBtn && selectedChildIds.size > 0) {
          try {
            const res = await window.apiFetch(`/api/for-dig/${goal.slug}/preview`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Kunde inte ladda anpassning');
            preview = data;
            if (!preview.items || preview.items.length === 0) {
              window.showToast && showToast('Inget att anpassa för detta mål just nu.', true);
              return;
            }
            starOverrides = {};
            for (const item of preview.items || []) {
              starOverrides[item.name] = item.star_value || 1;
            }
            phase = 'customize';
            renderModal();
          } catch (err) {
            window.showToast && showToast(err.message || 'Kunde inte ladda anpassning', true);
          }
          return;
        }

        if (phase === 'customize') {
          const backBtn = ev.target.closest('[data-action="customize-back"]');
          if (backBtn) {
            phase = 'confirm';
            starOverrides = null;
            renderModal();
            return;
          }
          const starBtn = ev.target.closest('[data-stars]');
          if (starBtn) {
            const idx = parseInt(starBtn.dataset.starIndex, 10);
            const item = (preview.items || [])[idx];
            if (item) starOverrides[item.name] = parseInt(starBtn.dataset.stars, 10);
            renderModal();
            return;
          }
        }

        const confirmBtn = ev.target.closest('[data-action="activate-confirm"]');
        if (confirmBtn && selectedChildIds.size > 0 && plan && !planLoading) {
          backdrop.remove();
          resolve({
            childIds: Array.from(selectedChildIds),
            starOverrides: phase === 'customize' ? starOverrides : null,
          });
        }
      });
    });
  }

  async function activateGoal(slug, preselectedChildId) {
    const goal = goals.find((g) => g.slug === slug);
    if (!goal) return;

    const activation = await confirmActivation(goal, preselectedChildId || null);
    if (!activation) return;

    const selectedChildren = children.filter((c) => activation.childIds.includes(c.id));
    const starOverrides = activation.starOverrides;

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
        body: JSON.stringify({
          child_ids: activation.childIds,
          overwrite: true,
          star_overrides: starOverrides,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktivering misslyckades');

      window.showToast && showToast(data.message || 'Klart!');
      await loadInstalls();
      renderGoals();
      renderRecommendations();
      await showPostActivationModal(data, slug, selectedChildren, goalHeadline(goal));
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

  function showPostActivationModal(data, goalSlug, selectedChildren, goalTitle) {
    const step = data && data.next_step;
    const firstChild = selectedChildren[0];
    const childId = firstChild ? firstChild.id : null;

    const html = `
      <h3 class="font-heading font-bold text-navy text-lg mb-2">Klart!</h3>
      <p class="text-sm text-text-soft mb-3">${esc(data.message || '')}</p>
      ${step ? `
        <p class="text-sm text-text-soft mb-3">${esc(step.hint || '')}</p>
        <a href="${esc(step.href)}" class="for-dig-cta for-dig-cta-primary block text-center no-underline mb-4">${esc(step.label)}</a>
      ` : ''}
      <div class="border-t border-lavender pt-4 mt-2">
        <p class="text-sm text-text-soft mb-3">Vad hoppas du att <strong>${esc(goalTitle)}</strong> ska hjälpa med?</p>
        <div id="forDigIntentOptions">
          ${INTENT_OPTIONS.map((o) => `
            <button type="button" class="for-dig-intent-option" data-reason="${o.value}">${esc(o.label)}</button>
          `).join('')}
        </div>
      </div>
    `;

    return new Promise((resolve) => {
      let intentRecorded = false;
      const backdrop = showModal(html, (root) => {
        const dismiss = () => {
          root.remove();
          resolve();
        };

        root.querySelector('a.for-dig-cta')?.addEventListener('click', () => {
          root.remove();
          resolve();
        });

        root.querySelector('#forDigIntentOptions')?.addEventListener('click', async (ev) => {
          const btn = ev.target.closest('[data-reason]');
          if (!btn || !childId || intentRecorded) return;
          intentRecorded = true;
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
          } catch (_) { /* non-blocking */ }
          dismiss();
        });
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
    if (_forDigClickBound) return;
    _forDigClickBound = true;

    document.addEventListener('click', (ev) => {
      if (!document.getElementById('forDigGoals')) return;

      const favMount = document.getElementById('forDigFavorites');
      if (favMount && favMount.contains(ev.target)) {
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
        return;
      }

      const recMount = document.getElementById('forDigRecommendations');
      if (recMount && recMount.contains(ev.target)) {
        const activate = ev.target.closest('[data-action="activate"]');
        if (activate) {
          activateGoal(activate.dataset.slug, activate.dataset.childId);
        }
        return;
      }

      const mount = document.getElementById('forDigGoals');
      if (mount && mount.contains(ev.target)) {
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
        return;
      }

      const libFooter = document.getElementById('forDigLibraryLink');
      if (libFooter && (ev.target === libFooter || libFooter.contains(ev.target))) {
        track('for_dig_library_link', {});
      }
    });
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
    if (typeof window.apiFetch !== 'function') return null;
    try {
      const res = await window.apiFetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        if (user && (user.type === 'parent' || user.isAdmin || user.is_admin)) {
          return user;
        }
      }
      if (res.status === 401 || res.status === 403) {
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = '/login?next=' + encodeURIComponent(returnPath);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async function init() {
    if (!document.getElementById('forDigGoals')) return;

    const gen = ++_forDigInitGen;
    captureWinbackUtmEarly();

    const user = await ensureParentAuth();
    if (!user || gen !== _forDigInitGen) return;

    const greetingEl = document.getElementById('forDigGreeting');
    const greeting = `Hej ${parentFirstName()} 👋`;
    const focus = 'Vad vill du fokusera på just nu?';
    if (greetingEl) {
      greetingEl.textContent = greeting;
    }
    if (window.ParentMagicPageHub && ParentMagicPageHub.updateForDigHero) {
      ParentMagicPageHub.updateForDigHero({ greeting, focus });
    }

    try {
      await Promise.all([loadGoals(), loadChildren(), loadInstalls(), loadPopular(), loadFavorites()]);
      if (gen !== _forDigInitGen) return;
      renderRecommendations();
      renderGoals();
      renderFavorites();
      renderPopular();
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

  function registerPageBoot() {
    if (!window.ParentMagicPageBoot) return false;
    ParentMagicPageBoot.register('for-dig', init);
    return true;
  }

  // Register for soft navigation. page-boot.js is injected near </body> by the
  // server, so it may load *after* this script — poll briefly to register once
  // it appears.
  if (!registerPageBoot()) {
    let bootAttempts = 0;
    var bootTimer = setInterval(function () {
      bootAttempts += 1;
      if (registerPageBoot() || bootAttempts >= 40) {
        clearInterval(bootTimer);
      }
    }, 50);
  }

  // Hard-load boot: run init() directly once the DOM is ready. init() is
  // idempotent (guarded by _forDigInitGen), so this is safe even if the magic
  // shell's bootstrap also triggers it via ParentMagicPageBoot.run. This
  // guarantees the page boots even when the magic boot chain is unavailable
  // (e.g. SW-served static HTML on the native app / PWA, where page-boot.js is
  // never injected). The earlier reload loop came from ensureParentAuth
  // redirecting on transient errors — already fixed there, so a direct init is
  // safe again.
  function hardLoadInit() {
    if (document.getElementById('forDigGoals')) init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hardLoadInit);
  } else {
    hardLoadInit();
  }

  window.addEventListener('stjarndag-magic-navigated', function (e) {
    if (e.detail && e.detail.pageId === 'for-dig') init();
  });
})();
