/**
 * child-samling-present.js — Min samling vy (Fas B–D, gate: barnets_samling).
 * B5: NPF-copy · D2–D4: minneskort, hylla, diplom.
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
    if (total === 0) return 'Ditt stjärnglas fylls när du samlar stjärnor';
    if (total === 1) return 'Totalt har du tjänat 1 stjärna';
    return 'Totalt har du tjänat ' + total + ' stjärnor';
  }

  function glassLeadCopy(total) {
    if (total === 0) {
      return 'Här samlas alla stjärnor du tjänar — de visar vad du klarat och minskar aldrig.';
    }
    return 'De här stjärnorna visar allt du har klarat — de minskar aldrig när du löser in belöningar.';
  }

  function renderHeroPanel(universe) {
    const total = lifetimeStars(universe);
    const fillPct = glassFillPct(total);
    const jarAria = total === 0
      ? 'Stjärnglas som väntar på dina stjärnor'
      : 'Stjärnglas fyllt till ' + fillPct + ' procent';

    return (
      '<section class="bsp-hero-panel" aria-label="Min samling">' +
        '<p class="bsp-kicker" aria-hidden="true">🏆</p>' +
        '<h2 class="bsp-title">Min samling</h2>' +
        '<p class="bsp-subtitle">Titta vad du har samlat</p>' +
        '<div class="bsp-hero-glass-row">' +
          '<div class="bsp-glass-jar bsp-glass-jar--hero' + (total === 0 ? ' bsp-glass-jar--empty' : '') +
            '" role="img" aria-label="' + esc(jarAria) + '">' +
            '<div class="bsp-glass-fill" style="height:' + fillPct + '%"></div>' +
            '<span class="bsp-glass-count" aria-hidden="true">' + total + ' ⭐</span>' +
          '</div>' +
          '<div class="bsp-hero-glass-copy">' +
            '<p class="bsp-glass-total" aria-live="polite">' + esc(totalStarsLabel(total)) + '</p>' +
            '<p class="bsp-hero-glass-lead">' + esc(glassLeadCopy(total)) + '</p>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderMedalLadder(total) {
    const items = STAR_MEDALS.map(function (medal) {
      const unlocked = total >= medal.threshold;
      return (
        '<li class="bsp-medal' + (unlocked ? ' is-unlocked' : ' is-locked') + '"' +
          ' title="' + esc(medal.title) + '"' +
          ' aria-label="' + esc(medal.title) + '">' +
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

  function renderPreviewStrip(universe, extras) {
    const achievements = (universe && universe.achievements) || [];
    const memories = getRewardMemories(extras);
    const streak = currentStreak(universe);
    const chips = [
      '<span class="bsp-preview-chip">🏅 ' + achievements.length + ' troféer</span>',
      '<span class="bsp-preview-chip">🃏 ' + memories.length + ' minnen</span>',
    ];
    if (streak > 0) {
      chips.push('<span class="bsp-preview-chip">🔥 ' + streak + ' dagar</span>');
    }
    return (
      '<nav class="bsp-preview-strip" aria-label="Överblick">' +
        chips.join('') +
      '</nav>'
    );
  }

  function renderMedalSection(universe) {
    const total = lifetimeStars(universe);
    return (
      '<section class="bsp-section bsp-medals" aria-label="Stjärnmedaljer">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">✨</span>' +
          '<h3 class="bsp-section-title">Stjärnmedaljer</h3>' +
        '</div>' +
        renderMedalLadder(total) +
      '</section>'
    );
  }

  function formatMemoryDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getRewardMemories(extras) {
    if (window.ChildSamlingMemory && typeof window.ChildSamlingMemory.rewardMemories === 'function') {
      return window.ChildSamlingMemory.rewardMemories((extras && extras.redemptions) || []);
    }
    return [];
  }

  function renderMemoryCardsSection(memories) {
    if (!memories.length) {
      return (
        '<section class="bsp-section bsp-memories" aria-label="Mina minneskort">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🃏</span>' +
            '<h3 class="bsp-section-title">Mina minneskort</h3>' +
          '</div>' +
          '<div class="bsp-memories-empty">' +
            '<p class="bsp-section-lead">' +
              esc('Här kommer minnen från belöningar du har sparat ihop till.') +
            '</p>' +
            '<p class="bsp-memories-hint">' +
              esc('När du löser in något i 🎁 Skattkammaren dyker det upp här.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const cards = memories.map(function (m, i) {
      const dateLabel = formatMemoryDate(m.created_at);
      const cost = m.stars_saved ? ' · ⭐ ' + m.stars_saved : '';
      return (
        '<article class="bsp-memory-card" style="--bsp-memory-delay:' + (i * 40) + 'ms"' +
          ' aria-label="' + esc((m.reward_name || 'Minneskort') + (dateLabel ? ', ' + dateLabel : '')) + '">' +
          '<span class="bsp-memory-icon" aria-hidden="true">' + esc(m.reward_icon || '🎁') + '</span>' +
          '<h4 class="bsp-memory-name">' + esc(m.reward_name || '') + '</h4>' +
          (dateLabel ? '<p class="bsp-memory-date">' + esc(dateLabel) + esc(cost) + '</p>' : '') +
          '<p class="bsp-memory-tag">Sparad som minne</p>' +
          '<p class="bsp-memory-note">Det här klarade du.</p>' +
        '</article>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-memories" aria-label="Mina minneskort">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🃏</span>' +
          '<h3 class="bsp-section-title">Mina minneskort</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc('Saker jag har sparat ihop till.') + '</p>' +
        '<div class="bsp-memory-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderRewardShelfSection(memories) {
    if (!memories.length) {
      return (
        '<section class="bsp-section bsp-shelf" aria-label="Min belöningshylla">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📚</span>' +
            '<h3 class="bsp-section-title">Min belöningshylla</h3>' +
          '</div>' +
          '<div class="bsp-shelf-empty">' +
            '<p class="bsp-section-lead">' +
              esc('Här står belöningar du har klarat och fått.') +
            '</p>' +
            '<p class="bsp-shelf-hint">' +
              esc('Hylla växer fram när du sparat ihop till något.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const items = memories.slice(0, 8).map(function (m) {
      return (
        '<div class="bsp-shelf-item" title="' + esc(m.reward_name || '') + '">' +
          '<span class="bsp-shelf-emoji" aria-hidden="true">' + esc(m.reward_icon || '🎁') + '</span>' +
          '<span class="bsp-shelf-label">' + esc(m.reward_name || '') + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-shelf" aria-label="Min belöningshylla">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📚</span>' +
          '<h3 class="bsp-section-title">Min belöningshylla</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc('Belöningar jag har sparat ihop till.') + '</p>' +
        '<div class="bsp-shelf-stage" role="img" aria-label="Belöningshylla med ' + memories.length + ' föremål">' +
          '<div class="bsp-shelf-board"></div>' +
          '<div class="bsp-shelf-items">' + items + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderDiplomasSection(universe, memories) {
    const earned = (window.ChildSamlingMemory && window.ChildSamlingMemory.earnedDiplomas)
      ? window.ChildSamlingMemory.earnedDiplomas(universe, memories)
      : [];

    if (!earned.length) {
      return (
        '<section class="bsp-section bsp-diplomas" aria-label="Diplom">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📜</span>' +
            '<h3 class="bsp-section-title">Diplom</h3>' +
          '</div>' +
          '<div class="bsp-diplomas-empty">' +
            '<p class="bsp-section-lead">' +
              esc('Här kommer diplom när du samlat fina minnen.') +
            '</p>' +
            '<p class="bsp-diplomas-hint">' +
              esc('Utmärkelser för saker du har klarat — inget att stressa över.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const cards = earned.map(function (d, i) {
      return (
        '<div class="bsp-diploma-card" style="--bsp-diploma-delay:' + (i * 50) + 'ms"' +
          ' aria-label="' + esc(d.title + ': ' + d.subtitle) + '">' +
          '<span class="bsp-diploma-emoji" aria-hidden="true">' + esc(d.emoji) + '</span>' +
          '<p class="bsp-diploma-title">' + esc(d.title) + '</p>' +
          '<p class="bsp-diploma-sub">' + esc(d.subtitle) + '</p>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-diplomas" aria-label="Diplom">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📜</span>' +
          '<h3 class="bsp-section-title">Diplom</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc('Utmärkelser för saker du har klarat.') + '</p>' +
        '<div class="bsp-diploma-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  function bindMemoryCards(root) {
    if (!root) return;
    const peekMs = 600;
    root.querySelectorAll('.bsp-memory-card').forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.add('is-peek');
        window.setTimeout(function () {
          card.classList.remove('is-peek');
        }, peekMs);
      });
    });
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
        '<section class="bsp-section bsp-wall" id="bsp-wall" aria-label="Trofévägg">' +
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
              esc('Fortsätt med det du gör i ☀️ Idag — det du klarar dyker upp här.') +
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
          ' aria-expanded="false"' +
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
          esc('Trofeer från saker du har klarat på riktigt.') +
        '</p>' +
        '<div class="bsp-trophy-wall">' +
          '<div class="bsp-trophy-grid">' + cards + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function bindTrophyCards(root) {
    if (!root) return;
    root.querySelectorAll('.bsp-trophy-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        const wasSelected = card.classList.contains('is-selected');
        root.querySelectorAll('.bsp-trophy-card').forEach(function (c) {
          c.classList.remove('is-selected');
          c.setAttribute('aria-expanded', 'false');
        });
        if (!wasSelected) {
          card.classList.add('is-selected');
          card.setAttribute('aria-expanded', 'true');
        }
      });
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('.bsp-trophy-card')) return;
      root.querySelectorAll('.bsp-trophy-card.is-selected').forEach(function (c) {
        c.classList.remove('is-selected');
        c.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function bindInteractions(root) {
    bindTrophyCards(root);
    bindMemoryCards(root);
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
      ? '<p class="bsp-streak-gold-note">' + esc('Din kedja lyser guld.') + '</p>'
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

  function renderYearbookSection(universe) {
    const yb = window.ChildSamlingYearbook;
    const story = universe && universe.year_story;
    const spreads = yb ? yb.monthSpreads(story) : [];
    const year = (story && story.year) || new Date().getFullYear();
    const hasActivity = spreads.some(function (s) {
      return s.stars > 0 || s.active_days > 0;
    });

    if (!hasActivity) {
      return (
        '<section class="bsp-section bsp-yearbook" aria-label="Min årsbok">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📖</span>' +
            '<h3 class="bsp-section-title">Min årsbok</h3>' +
          '</div>' +
          '<div class="bsp-yearbook-empty">' +
            '<p class="bsp-section-lead">' +
              esc('Här kommer månadsuppslag när du samlat minnen under året.') +
            '</p>' +
            '<p class="bsp-yearbook-hint">' +
              esc('Bläddra mellan månader — ett uppslag i taget.') +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const pages = spreads.map(function (s, i) {
      const title = yb.monthTitle(s.month);
      const stars = yb.starLine(s.stars);
      const phrase = yb.spreadPhrase(s.active_days, s.stars);
      const days = yb.daysLabel(s.active_days);
      return (
        '<article class="bsp-yearbook-page" style="--bsp-page-delay:' + (i * 40) + 'ms"' +
          ' aria-label="' + esc(title + ' ' + year) + '">' +
          '<p class="bsp-yearbook-month">' + esc(title) + '</p>' +
          (stars ? '<p class="bsp-yearbook-stars" aria-hidden="true">' + esc(stars) + '</p>' : '') +
          '<p class="bsp-yearbook-phrase">' + esc(phrase) + '</p>' +
          (days ? '<p class="bsp-yearbook-days">' + esc(days) + '</p>' : '') +
        '</article>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-yearbook" aria-label="Min årsbok">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📖</span>' +
          '<h3 class="bsp-section-title">Min årsbok</h3>' +
          '<span class="bsp-yearbook-year">' + esc(String(year)) + '</span>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc('Bläddra mellan månaderna — ett uppslag i taget.') + '</p>' +
        '<div class="bsp-yearbook-book" role="group" aria-label="Årsbok ' + esc(String(year)) + '">' +
          pages +
        '</div>' +
      '</section>'
    );
  }

  function render(universe, extras) {
    const memories = getRewardMemories(extras);
    return (
      '<div class="bsp-page">' +
        renderHeroPanel(universe) +
        renderPreviewStrip(universe, extras) +
        renderMedalSection(universe) +
        renderWallSection(universe) +
        renderStreakSection(universe) +
        renderMemoryCardsSection(memories) +
        renderRewardShelfSection(memories) +
        renderDiplomasSection(universe, memories) +
        renderYearbookSection(universe) +
      '</div>'
    );
  }

  window.ChildSamlingPresent = {
    render: render,
    bindInteractions: bindInteractions,
  };
})();
