/**
 * Dashboard warmth — positive daily summary, warmer copy, child card highlights.
 * Called from dashboard.js after dashboard-stats load.
 */
(function () {
  'use strict';

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function capName(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function timeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return pt('home.greeting.morning');
    if (h >= 11 && h < 17) return pt('home.greeting.afternoon');
    if (h >= 17 && h < 22) return pt('home.greeting.evening');
    return pt('home.greeting.default');
  }

  function starGapLabel(gap) {
    return gap === 1 ? pt('home.summary.starOne') : pt('home.summary.starMany', { count: gap });
  }

  function taskCountLabel(done) {
    return done === 1 ? pt('home.summary.taskOne') : pt('home.summary.taskMany', { count: done });
  }

  function pickSummary(stats) {
    const children = stats && stats.children ? stats.children : [];
    if (!children.length) return null;

    const totalStarsToday = children.reduce(function (s, c) { return s + (c.stars_today || 0); }, 0);
    const totalPending = stats.total_pending_redemptions || 0;
    const totalDoneToday = children.reduce(function (s, c) { return s + (c.today_completed || 0); }, 0);

    if (totalPending > 0) {
      const pendingChild = children.find(function (c) {
        return (c.pending_redemptions || 0) + (c.pending_goal_changes || 0) > 0;
      });
      const pName = pendingChild ? capName(pendingChild.name) : pt('home.summary.defaultChild');
      return {
        emoji: '🎁',
        headline: pt('home.summary.pendingRewardHeadline', { name: pName }),
        sub: totalPending === 1
          ? pt('home.summary.pendingRewardSubOne')
          : pt('home.summary.pendingRewardSubMany', { count: totalPending }),
        action: pendingChild ? {
          label: pt('home.summary.showRequest'),
          handler: function () {
            if (typeof window.openRequestPanel === 'function') {
              window.openRequestPanel(pendingChild.id, pendingChild.name);
            }
          },
        } : null,
        tone: 'reward',
      };
    }

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
      return {
        emoji: '🌟',
        headline: pt('home.summary.closeToReward', { name: crName, gap: starGapLabel(closeReward.gap) }),
        sub: (closeReward.child.nearest_reward.icon || '🎁') + ' ' + (closeReward.child.nearest_reward.display_name || closeReward.child.nearest_reward.name),
        action: { label: pt('home.summary.seeRewards'), href: '/library#rewards' },
        tone: 'gold',
      };
    }

    if (totalStarsToday > 0) {
      const starLabel = starGapLabel(totalStarsToday);
      const childCount = children.filter(function (c) { return (c.stars_today || 0) > 0; }).length;
      const sub = childCount === 1
        ? pt('home.summary.starsTodaySubOne', { name: capName(children.find(function (c) { return c.stars_today > 0; }).name) })
        : pt('home.summary.starsTodaySubMany');
      return {
        emoji: '🎉',
        headline: pt('home.summary.starsTodayHeadline', { count: starLabel }),
        sub: sub,
        action: totalDoneToday > 0 ? { label: pt('home.summary.seeSchedule'), href: '/schedule' } : null,
        tone: 'celebrate',
      };
    }

    const activeChild = children
      .filter(function (c) { return (c.today_completed || 0) > 0 && !c.today_is_paused; })
      .sort(function (a, b) { return (b.today_completed || 0) - (a.today_completed || 0); })[0];

    if (activeChild) {
      const done = activeChild.today_completed || 0;
      return {
        emoji: '🔥',
        headline: pt('home.summary.tasksDoneHeadline', { name: capName(activeChild.name), count: taskCountLabel(done) }),
        sub: activeChild.today_total > done
          ? pt('home.summary.tasksRemaining', { count: activeChild.today_total - done })
          : pt('home.summary.allActivitiesDone'),
        action: { label: pt('home.summary.seeSchedule'), href: '/schedule?child=' + activeChild.id },
        tone: 'progress',
      };
    }

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
        headline: pt('home.summary.nextActivityHeadline', { name: capName(readyChild.child.name), activity: readyChild.item.display_name || readyChild.item.name }),
        sub: (readyChild.item.icon || '') + ' ' + (readyChild.item.display_name || readyChild.item.name),
        action: { label: pt('home.summary.openToday'), href: '/daily-log?childId=' + readyChild.child.id },
        tone: 'progress',
      };
    }

    return {
      emoji: '🌟',
      headline: pt('home.summary.greetingFallback', { greeting: timeGreeting() }),
      sub: children.length === 1
        ? pt('home.summary.followChild', { name: capName(children[0].name) })
        : pt('home.summary.followChildren'),
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
    if (totalStarsToday > 0) return pt('home.summary.pageTitleStars');
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return pt('home.summary.pageTitleWelcome');
    return pt('home.summary.pageTitleProgress');
  }

  function updatePageTitles(stats) {
    const pageTitle = document.getElementById('dashboardPageTitle');
    if (pageTitle) pageTitle.textContent = getPageTitle(stats);

    const sectionTitle = document.getElementById('dashboardSectionTitle');
    if (sectionTitle) sectionTitle.classList.add('hidden');

    const sectionSub = document.getElementById('dashboardSectionSub');
    if (sectionSub) sectionSub.classList.add('hidden');
  }

  function totalStarsHtml(count) {
    return pt('home.childStats.totalStars', { count: count });
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
      primaryHtml = '<div class="dash-stat-primary text-text-soft">' + pt('home.childStats.paused') + '</div>';
      secondaryHtml = '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
    } else if (allDone) {
      cardClass = 'has-today-win';
      primaryHtml = '<div class="dash-stat-primary dash-stat-win">' + pt('home.childStats.allDone') + '</div>';
      secondaryHtml = '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
    } else if (done > 0) {
      cardClass = 'has-today-progress';
      primaryHtml = '<div class="dash-stat-primary dash-stat-hot">' + (done === 1
        ? pt('home.childStats.tasksDoneOne')
        : pt('home.childStats.tasksDoneMany', { count: done })) + '</div>';
      if (total > done) {
        secondaryHtml = '<div class="dash-stat-secondary">' + pt('home.childStats.remaining', { count: total - done, done: done, total: total }) + '</div>';
      }
      secondaryHtml += '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
    } else if (total === 0) {
      primaryHtml = '<div class="dash-stat-primary text-text-soft">' + pt('home.childStats.noSchedule') + '</div>';
      secondaryHtml = '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
    } else {
      primaryHtml = '<div class="dash-stat-primary">' + pt('home.childStats.todayProgress', { done: done, total: total }) + '</div>';
      secondaryHtml = '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
    }

    if (starsToday > 0 && !isPaused) {
      const stLabel = starsToday === 1
        ? pt('home.childStats.starsTodayOne')
        : pt('home.childStats.starsTodayMany', { count: starsToday });
      secondaryHtml = '<div class="dash-stat-today-stars">' + stLabel + '</div>' + secondaryHtml;
    }

    if (nearest && !isPaused) {
      const gap = nearest.star_cost - stars;
      if (gap > 0 && gap <= 8) {
        const rewardHint = gap === 1
          ? pt('home.childStats.rewardGapOne')
          : pt('home.childStats.rewardGapMany', { count: gap });
        if (done === 0 && gap <= 5) {
          primaryHtml = '<div class="dash-stat-primary dash-stat-reward-primary">' + rewardHint + '</div>';
          secondaryHtml = '<div class="dash-stat-stars">' + totalStarsHtml(stars) + '</div>';
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
