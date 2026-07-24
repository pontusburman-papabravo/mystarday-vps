/**
 * child-samling-present.js — Min samling vy (Fas B–D, gate: barnets_samling).
 * B5: NPF-copy · D2–D4: minneskort, hylla, diplom.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

  const GLASS_SCALE_MAX = 1000;
  const STAR_MEDALS = [
    { threshold: 1, label: '1', titleKey: 'firstStar' },
    { threshold: 25, label: '25', titleKey: 'medal25' },
    { threshold: 50, label: '50', titleKey: 'medal50' },
    { threshold: 100, label: '100', titleKey: 'medal100' },
    { threshold: 250, label: '250', titleKey: 'medal250' },
    { threshold: 500, label: '500', titleKey: 'medal500' },
    { threshold: 1000, label: '1000', titleKey: 'medal1000' },
  ];

  function medalTitle(medal) {
    return t('samling.' + medal.titleKey);
  }

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
    if (total === 0) return t('samling.starGlassEmpty');
    if (total === 1) return t('samling.starGlassOne');
    return t('samling.starGlassMany', { count: total });
  }

  function glassLeadCopy(total) {
    return total === 0 ? t('samling.glassLeadEmpty') : t('samling.glassLeadFilled');
  }

  function renderHeroPanel(universe) {
    const total = lifetimeStars(universe);
    const fillPct = glassFillPct(total);
    const jarAria = total === 0
      ? t('samling.jarAriaEmpty')
      : t('samling.jarAriaFilled', { percent: fillPct });

    return (
      '<section class="bsp-hero-panel" aria-label="' + esc(t('samling.title')) + '">' +
        '<p class="bsp-kicker" aria-hidden="true">🏆</p>' +
        '<h2 class="bsp-title">' + esc(t('samling.title')) + '</h2>' +
        '<p class="bsp-subtitle">' + esc(t('samling.subtitle')) + '</p>' +
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
      const title = medalTitle(medal);
      return (
        '<li class="bsp-medal' + (unlocked ? ' is-unlocked' : ' is-locked') + '"' +
          ' title="' + esc(title) + '"' +
          ' aria-label="' + esc(title) + '">' +
          '<span class="bsp-medal-disc" aria-hidden="true">🏅</span>' +
          '<span class="bsp-medal-label">' + esc(medal.label) + '</span>' +
        '</li>'
      );
    }).join('');

    return (
      '<div class="bsp-medal-ladder" aria-label="' + esc(t('samling.medals')) + '">' +
        '<p class="bsp-medal-kicker">' + esc(t('samling.medals')) + '</p>' +
        '<ul class="bsp-medal-row">' + items + '</ul>' +
      '</div>'
    );
  }

  function renderPreviewStrip(universe, extras) {
    const achievements = (universe && universe.achievements) || [];
    const memories = getRewardMemories(extras);
    const streak = currentStreak(universe);
    const chips = [
      '<span class="bsp-preview-chip">🏅 ' + t('samling.previewTrophies', { count: achievements.length }) + '</span>',
      '<span class="bsp-preview-chip">🃏 ' + t('samling.previewMemories', { count: memories.length }) + '</span>',
    ];
    if (streak > 0) {
      chips.push('<span class="bsp-preview-chip">🔥 ' + t('samling.previewStreakDays', { count: streak }) + '</span>');
    }
    return (
      '<nav class="bsp-preview-strip" aria-label="' + esc(t('samling.previewOverview')) + '">' +
        chips.join('') +
      '</nav>'
    );
  }

  function renderMedalSection(universe) {
    const total = lifetimeStars(universe);
    return (
      '<section class="bsp-section bsp-medals" aria-label="' + esc(t('samling.medals')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">✨</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.medals')) + '</h3>' +
        '</div>' +
        renderMedalLadder(total) +
      '</section>'
    );
  }

  function childDateLocale() {
    return (typeof window.getChildUiLocale === 'function' && window.getChildUiLocale() === 'en-GB')
      ? 'en-GB' : 'sv-SE';
  }

  function formatMemoryDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(childDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
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
        '<section class="bsp-section bsp-memories" aria-label="' + esc(t('samling.memoryCards')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🃏</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.memoryCards')) + '</h3>' +
          '</div>' +
          '<div class="bsp-memories-empty">' +
            '<p class="bsp-section-lead">' +
              esc(t('samling.memoryEmptyLead')) +
            '</p>' +
            '<p class="bsp-memories-hint">' +
              esc(t('samling.memoryEmptyHint')) +
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
          ' aria-label="' + esc((m.reward_name || t('samling.memoryCardDefault')) + (dateLabel ? ', ' + dateLabel : '')) + '">' +
          '<span class="bsp-memory-icon" aria-hidden="true">' + esc(m.reward_icon || '🎁') + '</span>' +
          '<h4 class="bsp-memory-name">' + esc(m.reward_name || '') + '</h4>' +
          (dateLabel ? '<p class="bsp-memory-date">' + esc(dateLabel) + esc(cost) + '</p>' : '') +
          '<p class="bsp-memory-tag">' + esc(t('samling.memorySavedTag')) + '</p>' +
          '<p class="bsp-memory-note">' + esc(t('samling.memoryNote')) + '</p>' +
        '</article>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-memories" aria-label="' + esc(t('samling.memoryCards')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🃏</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.memoryCards')) + '</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc(t('samling.memoryLead')) + '</p>' +
        '<div class="bsp-memory-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderRewardShelfSection(memories) {
    if (!memories.length) {
      return (
        '<section class="bsp-section bsp-shelf" aria-label="' + esc(t('samling.rewardShelf')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📚</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.rewardShelf')) + '</h3>' +
          '</div>' +
          '<div class="bsp-shelf-empty">' +
            '<p class="bsp-section-lead">' + esc(t('samling.shelfEmptyLead')) + '</p>' +
            '<p class="bsp-shelf-hint">' + esc(t('samling.shelfEmptyHint')) + '</p>' +
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
      '<section class="bsp-section bsp-shelf" aria-label="' + esc(t('samling.rewardShelf')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📚</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.rewardShelf')) + '</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc(t('samling.shelfLead')) + '</p>' +
        '<div class="bsp-shelf-stage" role="img" aria-label="' + esc(t('samling.shelfAria', { count: memories.length })) + '">' +
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
        '<section class="bsp-section bsp-diplomas" aria-label="' + esc(t('samling.diplomas')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📜</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.diplomas')) + '</h3>' +
          '</div>' +
          '<div class="bsp-diplomas-empty">' +
            '<p class="bsp-section-lead">' +
              esc(t('samling.diplomaEmptyLead')) +
            '</p>' +
            '<p class="bsp-diplomas-hint">' +
              esc(t('samling.diplomaEmptyHint')) +
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
      '<section class="bsp-section bsp-diplomas" aria-label="' + esc(t('samling.diplomas')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📜</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.diplomas')) + '</h3>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc(t('samling.diplomaLead')) + '</p>' +
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
    return d.toLocaleDateString(childDateLocale(), { day: 'numeric', month: 'short' });
  }

  function renderWallSection(universe) {
    const achievements = (universe && universe.achievements) || [];

    if (!achievements.length) {
      return (
        '<section class="bsp-section bsp-wall" id="bsp-wall" aria-label="' + esc(t('samling.trophyWall')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🏅</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.trophyWall')) + '</h3>' +
          '</div>' +
          '<div class="bsp-wall-empty">' +
            '<span class="bsp-wall-empty-icon" aria-hidden="true">🏅</span>' +
            '<p class="bsp-wall-empty-lead">' + esc(t('samling.wallEmptyLead')) + '</p>' +
            '<p class="bsp-wall-empty-hint">' + esc(t('samling.wallEmptyHint')) + '</p>' +
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
          ' aria-label="' + esc((a.name || t('samling.trophyDefault')) + (dateLabel ? ', ' + dateLabel : '')) + '">' +
          '<span class="bsp-trophy-emoji" aria-hidden="true">' + esc(a.emoji || '🏆') + '</span>' +
          '<span class="bsp-trophy-name">' + esc(a.name || '') + '</span>' +
          (dateLabel ? '<span class="bsp-trophy-date">' + esc(dateLabel) + '</span>' : '') +
          (desc ? '<span class="bsp-trophy-desc">' + esc(desc) + '</span>' : '') +
        '</button>'
      );
    }).join('');

    return (
      '<section class="bsp-section bsp-wall" aria-label="' + esc(t('samling.trophyWall')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🏅</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.trophyWall')) + '</h3>' +
          '<span class="bsp-wall-count" aria-label="' + esc(t('samling.trophyCountAria', { count: achievements.length })) + '">' +
            esc(String(achievements.length)) +
          '</span>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc(t('samling.wallLead')) + '</p>' +
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
    if (days === 1) return t('samling.streakOne');
    return t('samling.streakMany', { count: days });
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
        '<section class="bsp-section bsp-streak" aria-label="' + esc(t('samling.streakTitle')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">🔥</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.streakTitle')) + '</h3>' +
          '</div>' +
          '<div class="bsp-streak-empty">' +
            '<div class="bsp-streak-chain bsp-streak-chain--seed" aria-hidden="true">' +
              '<span class="bsp-streak-link bsp-streak-link--dim">🔥</span>' +
            '</div>' +
            '<p class="bsp-section-lead">' +
              esc(t('samling.streakEmptyLead')) +
            '</p>' +
            '<p class="bsp-streak-hint">' +
              esc(t('samling.streakHint')) +
            '</p>' +
          '</div>' +
        '</section>'
      );
    }

    const goldNote = isGold
      ? '<p class="bsp-streak-gold-note">' + esc(t('samling.streakGold')) + '</p>'
      : '';

    return (
      '<section class="bsp-section bsp-streak' + (isGold ? ' bsp-streak--gold' : '') + '" aria-label="' + esc(t('samling.streakTitle')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">🔥</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.streakTitle')) + '</h3>' +
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
        '<section class="bsp-section bsp-yearbook" aria-label="' + esc(t('samling.yearbook')) + '">' +
          '<div class="bsp-section-head">' +
            '<span class="bsp-section-icon" aria-hidden="true">📖</span>' +
            '<h3 class="bsp-section-title">' + esc(t('samling.yearbook')) + '</h3>' +
          '</div>' +
          '<div class="bsp-yearbook-empty">' +
            '<p class="bsp-section-lead">' + esc(t('samling.yearbookEmptyLead')) + '</p>' +
            '<p class="bsp-yearbook-hint">' + esc(t('samling.yearbookLead')) + '</p>' +
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
      '<section class="bsp-section bsp-yearbook" aria-label="' + esc(t('samling.yearbook')) + '">' +
        '<div class="bsp-section-head">' +
          '<span class="bsp-section-icon" aria-hidden="true">📖</span>' +
          '<h3 class="bsp-section-title">' + esc(t('samling.yearbook')) + '</h3>' +
          '<span class="bsp-yearbook-year">' + esc(String(year)) + '</span>' +
        '</div>' +
        '<p class="bsp-section-lead">' + esc(t('samling.yearbookLead')) + '</p>' +
        '<div class="bsp-yearbook-book" role="group" aria-label="' + esc(t('samling.yearbookAria', { year: year })) + '">' +
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
