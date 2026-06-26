/**
 * Dashboard warmth — positive daily summary, warmer copy, child card highlights.
 * Called from dashboard.js after dashboard-stats load.
 */
(function () {
  'use strict';

  function capName(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function timeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'God morgon!';
    if (h >= 11 && h < 17) return 'Hej!';
    if (h >= 17 && h < 22) return 'God kväll!';
    return 'Hej!';
  }

  function pickSummary(stats) {
    const children = stats && stats.children ? stats.children : [];
    if (!children.length) return null;

    const totalStarsToday = children.reduce(function (s, c) { return s + (c.stars_today || 0); }, 0);
    const totalPending = stats.total_pending_redemptions || 0;
    const totalDoneToday = children.reduce(function (s, c) { return s + (c.today_completed || 0); }, 0);

    // Pending reward requests — actionable
    if (totalPending > 0) {
      const pendingChild = children.find(function (c) {
        return (c.pending_redemptions || 0) + (c.pending_goal_changes || 0) > 0;
      });
      const pName = pendingChild ? capName(pendingChild.name) : 'Barnet';
      return {
        emoji: '🎁',
        headline: pName + ' vill lösa in en belöning',
        sub: totalPending === 1 ? 'En förfrågan väntar på dig' : totalPending + ' förfrågningar väntar på dig',
        action: pendingChild ? {
          label: 'Visa förfrågan',
          handler: function () {
            if (typeof window.openRequestPanel === 'function') {
              window.openRequestPanel(pendingChild.id, pendingChild.name);
            }
          },
        } : null,
        tone: 'reward',
      };
    }

    // Close to next reward
    let closeReward = null;
    let closestGap = Infinity;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (!c.nearest_reward) continue;
      const gap = c.nearest_reward.star_cost - (c.star_balance || 0);
      if (gap > 0 && gap <= 5 && gap < closestGap) {
        closestGap = gap;
        closeReward = { child: c, gap: gap };
      }
    }
    if (closeReward) {
      const crName = capName(closeReward.child.name);
      const gapLabel = closeReward.gap === 1 ? '1 stjärna' : closeReward.gap + ' stjärnor';
      return {
        emoji: '🌟',
        headline: crName + ' är bara ' + gapLabel + ' från nästa belöning',
        sub: (closeReward.child.nearest_reward.icon || '🎁') + ' ' + closeReward.child.nearest_reward.name,
        action: { label: 'Se belöningar', href: '/library#rewards' },
        tone: 'gold',
      };
    }

    // Stars earned today (family)
    if (totalStarsToday > 0) {
      const starLabel = totalStarsToday === 1 ? '1 stjärna' : totalStarsToday + ' stjärnor';
      const childCount = children.filter(function (c) { return (c.stars_today || 0) > 0; }).length;
      const sub = childCount === 1
        ? capName(children.find(function (c) { return c.stars_today > 0; }).name) + ' har tjänat dem idag'
        : 'Barnen har tjänat dem idag';
      return {
        emoji: '🎉',
        headline: 'Barnen har tjänat ' + starLabel + ' idag',
        sub: sub,
        action: totalDoneToday > 0 ? { label: 'Se dagens schema', href: '/schedule' } : null,
        tone: 'celebrate',
      };
    }

    // Tasks completed today
    const activeChild = children
      .filter(function (c) { return (c.today_completed || 0) > 0 && !c.today_is_paused; })
      .sort(function (a, b) { return (b.today_completed || 0) - (a.today_completed || 0); })[0];

    if (activeChild) {
      const done = activeChild.today_completed || 0;
      const taskLabel = done === 1 ? '1 uppgift' : done + ' uppgifter';
      return {
        emoji: '🔥',
        headline: capName(activeChild.name) + ' har redan klarat ' + taskLabel + ' idag',
        sub: activeChild.today_total > done
          ? (activeChild.today_total - done) + ' kvar av dagens schema'
          : 'Alla aktiviteter klara — bra jobbat!',
        action: { label: 'Se schema', href: '/schedule?child=' + activeChild.id },
        tone: 'progress',
      };
    }

    // Next activity ready
    let readyChild = null;
    for (let j = 0; j < children.length; j++) {
      const ch = children[j];
      if (ch.today_is_paused || !(ch.today_items || []).length) continue;
      const nu = ch.today_items.find(function (it) { return it.status === 'NU' && !it.completed; });
      if (nu) {
        readyChild = { child: ch, item: nu };
        break;
      }
    }
    if (readyChild) {
      return {
        emoji: '👋',
        headline: capName(readyChild.child.name) + ' är redo för nästa aktivitet',
        sub: (readyChild.item.icon || '') + ' ' + readyChild.item.name,
        action: { label: 'Öppna schema', href: '/schedule?child=' + readyChild.child.id },
        tone: 'progress',
      };
    }

    // Fallback greeting
    return {
      emoji: '🌟',
      headline: timeGreeting() + ' Så går det idag',
      sub: children.length === 1
        ? 'Följ ' + capName(children[0].name) + 's framsteg här'
        : 'Följ barnens framsteg här',
      action: null,
      tone: 'neutral',
    };
  }

  function getBannerMount() {
    const useHub = window.DashboardHomeHub && typeof DashboardHomeHub.shouldUse === 'function' && DashboardHomeHub.shouldUse();
    if (useHub) {
      return document.getElementById('parentHubDailySummaryMount') || document.getElementById('dashboardDailySummary');
    }
    return document.getElementById('dashboardDailySummary');
  }

  function renderBanner(summary) {
    const el = getBannerMount();
    const legacy = document.getElementById('dashboardDailySummary');
    if (!el) return;
    if (!summary) {
      el.classList.add('hidden');
      el.innerHTML = '';
      if (legacy && legacy !== el) legacy.classList.add('hidden');
      return;
    }

    let actionHtml = '';
    if (summary.action) {
      if (summary.action.href) {
        actionHtml = '<a href="' + summary.action.href + '" class="dash-summary-action">' + summary.action.label + ' →</a>';
      } else if (summary.action.handler || summary.action.onclick) {
        actionHtml = '<button type="button" class="dash-summary-action" data-summary-action="1">' + summary.action.label + ' →</button>';
      }
    }

    el.className = (el.id === 'parentHubDailySummaryMount' ? 'parent-hub-daily-summary ' : '') + 'dash-daily-summary dash-summary-' + summary.tone;
    el.innerHTML =
      '<span class="dash-summary-emoji" aria-hidden="true">' + summary.emoji + '</span>' +
      '<div class="dash-summary-text">' +
        '<p class="dash-summary-headline">' + summary.headline + '</p>' +
        (summary.sub ? '<p class="dash-summary-sub">' + summary.sub + '</p>' : '') +
      '</div>' +
      actionHtml;
    el.classList.remove('hidden');

    if (legacy && legacy !== el) {
      legacy.classList.add('hidden');
      legacy.innerHTML = '';
    }

    const actionBtn = el.querySelector('[data-summary-action]');
    if (actionBtn) {
      if (summary.action.handler) {
        actionBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          summary.action.handler();
        });
      } else if (summary.action.onclick) {
        actionBtn.setAttribute('onclick', summary.action.onclick);
      }
    }
  }

  function getPageTitle(stats) {
    const children = stats && stats.children ? stats.children : [];
    const totalStarsToday = children.reduce(function (s, c) { return s + (c.stars_today || 0); }, 0);
    if (totalStarsToday > 0) return '🌟 Dagens stjärnor';
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '👋 Välkommen tillbaka';
    return '🌟 Familjens framsteg idag';
  }

  function updatePageTitles(stats) {
    const pageTitle = document.getElementById('dashboardPageTitle');
    if (pageTitle) pageTitle.textContent = getPageTitle(stats);

    const sectionTitle = document.getElementById('dashboardSectionTitle');
    if (sectionTitle) sectionTitle.classList.add('hidden');

    const sectionSub = document.getElementById('dashboardSectionSub');
    if (sectionSub) sectionSub.classList.add('hidden');
  }

  /**
   * Build highlight lines for compact child card stats.
   * @returns {{ primaryHtml: string, secondaryHtml: string, cardClass: string }}
   */
  function buildChildStats(c) {
    const name = capName(c.name);
    const done = c.today_completed || 0;
    const total = c.today_total || 0;
    const stars = c.star_balance || 0;
    const starsToday = c.stars_today || 0;
    const nearest = c.nearest_reward || null;
    const isPaused = c.today_is_paused || false;
    const allDone = total > 0 && done === total;
    let cardClass = '';

    let primaryHtml = '';
    let secondaryHtml = '';

    if (isPaused) {
      primaryHtml = '<div class="dash-stat-primary text-text-soft">⏸ Pausad idag</div>';
      secondaryHtml = '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
    } else if (allDone) {
      cardClass = 'has-today-win';
      primaryHtml = '<div class="dash-stat-primary dash-stat-win">🌟 Alla klara idag!</div>';
      secondaryHtml = '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
    } else if (done > 0) {
      cardClass = 'has-today-progress';
      const taskLabel = done === 1 ? '1 uppgift' : done + ' uppgifter';
      primaryHtml = '<div class="dash-stat-primary dash-stat-hot">🔥 ' + taskLabel + ' klara idag</div>';
      if (total > done) {
        secondaryHtml = '<div class="dash-stat-secondary">' + (total - done) + ' kvar · ' + done + '/' + total + '</div>';
      }
      secondaryHtml += '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
    } else if (total === 0) {
      primaryHtml = '<div class="dash-stat-primary text-text-soft">Inget schema idag</div>';
      secondaryHtml = '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
    } else {
      primaryHtml = '<div class="dash-stat-primary">Idag <strong>' + done + '/' + total + '</strong></div>';
      secondaryHtml = '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
    }

    if (starsToday > 0 && !isPaused) {
      const stLabel = starsToday === 1 ? '+1 stjärna' : '+' + starsToday + ' stjärnor';
      secondaryHtml = '<div class="dash-stat-today-stars">' + stLabel + ' idag</div>' + secondaryHtml;
    }

    if (nearest && !isPaused) {
      const gap = nearest.star_cost - stars;
      if (gap > 0 && gap <= 8) {
        const gapLabel = gap === 1 ? '1 stjärna' : gap + ' stjärnor';
        const rewardHint = '🎁 Bara ' + gapLabel + ' kvar till nästa belöning';
        if (done === 0 && gap <= 5) {
          primaryHtml = '<div class="dash-stat-primary dash-stat-reward-primary">' + rewardHint + '</div>';
          secondaryHtml = '<div class="dash-stat-stars">⭐ <span class="dash-stars-num">' + stars + '</span> totalt</div>';
        } else {
          secondaryHtml += '<div class="dash-stat-reward-hint">' + rewardHint + '</div>';
        }
      }
    }

    return { primaryHtml: primaryHtml, secondaryHtml: secondaryHtml, cardClass: cardClass };
  }

  function update(stats) {
    updatePageTitles(stats);
    renderBanner(pickSummary(stats));
  }

  window.DashboardDailySummary = {
    update: update,
    buildChildStats: buildChildStats,
  };
})();
