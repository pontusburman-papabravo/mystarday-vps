/**
 * child-samling-present.js — Min samling vy (Fas B, gate: barnets_samling).
 * B2: stjärnglas · B3: trofévägg · B4: streak-kedja från stats.streak.
 */
(function () {
  'use strict';

  const GLASS_SCALE_MAX = 1000;
  const STAR_MEDALS = [
    { threshold: 1, label: '1', title: 'Första stjärnan' },
    { threshold: 25, label: '25', title: '25 stjärnor' },
    { threshold: 50, label: '50', title: '50 stjärnor' },
    { threshold: 100, label: '100', title: '100 stjärnor' },
    { threshold: 250, label: '250', title: '250 stjärnor' },
    { threshold: 500, label: '500', title: '500 stjärnor' },
    { threshold: 1000, label: '1000', title: '1000 stjärnor' },
  ];

  function esc(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function lifetimeStars(universe) {
    const raw = universe && universe.stats && universe.stats.lifetime_stars;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function glassFillPct(total) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((total / GLASS_SCALE_MAX) * 100));
  }

  function totalStarsLabel(total) {
    if (total === 1) return 'Totalt har du tjänat 1 stjärna';
    return 'Totalt har du tjänat ' + total + ' stjärnor';
  }

  function renderHeader() {
    return (
      '<header class="bsp-header" aria-label="Min samling">' +
        '<p class="bsp-kicker" aria-hidden="true">🏆</p>' +
        '<h2 class="bsp-title">Min samling</h2>' +
        '<p class="bsp-subtitle">Titta vad du har samlat</p>' +
      '</header>'
    );
  }

  function renderMedalLadder(total) {
    const items = STAR_MEDALS.map(function (medal) {
      const unlocked = total >= medal.threshold;
      return (
        '<li class="bsp-medal' + (unlocked ? ' is-unlocked' : ' is-locked') + '"' +
          ' title="' + esc(medal.title) + '"' +
          ' aria-label="' + esc(medal.title + (unlocked ? ' — upplåst' : '')) + '">' +
          '<span class="bsp-medal-disc" aria-hidden="true">🏅</span>' +
          '<span class="bsp-medal-label">' + esc(medal.label) + '</span>' +
        '</li>'
      );
    }).join('');

    return (
      '<div class="bsp-medal-ladder" aria-label="Stjärnmedaljer">' +
        '<p class="bsp-medal-kicker">Stjärnmedaljer</p>' +
        '<ul class="bsp-medal-row">' + items + '</ul>' +
      '</div>'
    );
  }

  function renderGlassSection(universe) {
    const total = lifetimeStars(universe);
    const fillPct = glassFillPct(total);

    return (
      '<section class="bsp-section bsp-glass" aria-label="Stjärnglas">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">✨</span>' +
          '<h3 class="bsp-section-title">Stjärnglaset</h3>' +
        '</div>' +
        '<p class="bsp-glass-total" aria-live="polite">' + esc(totalStarsLabel(total)) + '</p>' +
        '<p class="bsp-section-lead">' +
          esc('De här stjärnorna visar allt du har klarat — de minskar aldrig när du löser in belöningar.') +
        '</p>' +
        '<div class="bsp-glass-jar" role="img" aria-label="' +
          esc('Stjärnglas fyllt till ' + fillPct + ' procent') + '">' +
          '<div class="bsp-glass-fill" style="height:' + fillPct + '%"></div>' +
          '<span class="bsp-glass-count" aria-hidden="true">' + total + ' ⭐</span>' +
        '</div>' +
        renderMedalLadder(total) +
      '</section>'
    );
  }

  function formatTrophyDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }

  function renderWallSection(universe) {
    const achievements = (universe && universe.achievements) || [];

    if (!achievements.length) {
      return (
        '<section class="bsp-section bsp-wall" aria-label="Trofévägg">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🏅</span>' +
            '<h3 class="bsp-section-title">Trofévägg</h3>' +
          '</div>' +
          '<div class="bsp-wall-empty">' +
            '<span class="bsp-wall-empty-icon" aria-hidden="true">🏅</span>' +
            '<p class="bsp-wall-empty-lead">' +
              esc('Här kommer dina medaljer att synas när du samlar fler stjärnor.') +
            '</p>' +
            '<p class="bsp-wall-empty-hint">' +
              esc('Fortsätt med det du gör i ☀️ Idag — dina prestationer dyker upp här.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const cards = achievements.map(function (a, i) {
      const dateLabel = formatTrophyDate(a.unlocked_at);
      const desc = a.description || '';
      return (
        '<button type="button" class="bsp-trophy-card" style="--bsp-trophy-delay:' + (i * 50) + 'ms"' +
          ' aria-label="' + esc((a.name || 'Trofé') + (dateLabel ? ', ' + dateLabel : '')) + '">' +
          '<span class="bsp-trophy-emoji" aria-hidden="true">' + esc(a.emoji || '🏆') + '</span>' +
          '<span class="bsp-trophy-name">' + esc(a.name || '') + '</span>' +
          (dateLabel ? '<span class="bsp-trophy-date">' + esc(dateLabel) + '</span>' : '') +
          (desc ? '<span class="bsp-trophy-desc">' + esc(desc) + '</span>' : '') +
        '</button>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-wall" aria-label="Trofévägg">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🏅</span>' +
          '<h3 class="bsp-section-title">Trofévägg</h3>' +
          '<span class="bsp-wall-count" aria-label="' + esc(achievements.length + ' trofeer') + '">' +
            esc(String(achievements.length)) +
          '</span>' +
        '</div>' +
        '<p class="bsp-section-lead">' +
          esc('Riktiga prestationer du har klarat — inte bara poäng.') +
        '</p>' +
        '<div class="bsp-trophy-wall">' +
          '<div class="bsp-trophy-grid">' + cards + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function bindTrophyCards(root) {
    if (!root) return;
    const peekMs = 600;
    root.querySelectorAll('.bsp-trophy-card').forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.add('is-peek');
        window.setTimeout(function () {
          card.classList.remove('is-peek');
        }, peekMs);
      });
    });
  }

  function bindInteractions(root) {
    bindTrophyCards(root);
  }

  const STREAK_GOLD_DAYS = 30;
  const STREAK_CHAIN_CAP = 10;

  function currentStreak(universe) {
    const raw = universe && universe.stats && universe.stats.streak;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function streakHeadline(days) {
    if (days === 1) return 'Du har varit aktiv 1 dag i rad';
    return 'Du har varit aktiv ' + days + ' dagar i rad';
  }

  function renderStreakChain(days) {
    const visible = Math.min(days, STREAK_CHAIN_CAP);
    let html = '';
    for (let i = 0; i < visible; i++) {
      html += '<span class="bsp-streak-link" aria-hidden="true">🔥</span>';
    }
    if (days > STREAK_CHAIN_CAP) {
      html += '<span class="bsp-streak-more" aria-hidden="true">+' + (days - STREAK_CHAIN_CAP) + '</span>';
    }
    return html;
  }

  function renderStreakSection(universe) {
    const days = currentStreak(universe);
    const isGold = days >= STREAK_GOLD_DAYS;

    if (days <= 0) {
      return (
        '<section class="bsp-section bsp-streak" aria-label="Dagar i rad">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🔥</span>' +
            '<h3 class="bsp-section-title">Dagar i rad</h3>' +
          '</div>' +
          '<div class="bsp-streak-empty">' +
            '<div class="bsp-streak-chain bsp-streak-chain--seed" aria-hidden="true">' +
              '<span class="bsp-streak-link bsp-streak-link--dim">🔥</span>' +
            '</div>' +
            '<p class="bsp-section-lead">' +
              esc('Här växer din kedja när du är aktiv.') +
            '</p>' +
            '<p class="bsp-streak-hint">' +
              esc('Varje dag du gör något i ☀️ Idag kan lägga till en länk.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const goldNote = isGold
      ? '<p class="bsp-streak-gold-note">' + esc('Din kedja lyser guld — vad duktigt!') + '</p>'
      : '';

    return (
      '<section class="bsp-section bsp-streak' + (isGold ? ' bsp-streak--gold' : '') + '" aria-label="Dagar i rad">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🔥</span>' +
          '<h3 class="bsp-section-title">Dagar i rad</h3>' +
        '</div>' +
        '<p class="bsp-streak-headline" aria-live="polite">' + esc(streakHeadline(days)) + '</p>' +
        '<div class="bsp-streak-chain" role="img" aria-label="' + esc(streakHeadline(days)) + '">' +
          renderStreakChain(days) +
        '</div>' +
        goldNote +
      '</section>'
    );
  }

  function render(universe) {
    return (
      '<div class="bsp-page">' +
        renderHeader() +
        renderGlassSection(universe) +
        renderWallSection(universe) +
        renderStreakSection(universe) +
      '</div>'
    );
  }

  window.ChildSamlingPresent = {
    render: render,
    bindInteractions: bindInteractions,
  };
})();
