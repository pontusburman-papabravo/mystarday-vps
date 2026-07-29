/**
 * Dashboard weekly star story — narrative summary above the 8-week chart.
 */
(function () {
  'use strict';

  function escHtml(str) {
    if (typeof window.escHtml === 'function') return window.escHtml(str);
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capName(name) {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function computeStory(data) {
    const ch = data.children || [];
    const weeks = data.weeks || [];
    if (!ch.length || !weeks.length) return null;

    const current = weeks[weeks.length - 1];
    const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;

    const thisWeekTotal = ch.reduce(function (sum, c) {
      return sum + (current.child_totals[c.id] || 0);
    }, 0);

    const lastWeekTotal = previous ? ch.reduce(function (sum, c) {
      return sum + (previous.child_totals[c.id] || 0);
    }, 0) : 0;

    const diff = thisWeekTotal - lastWeekTotal;
    let diffHtml = '';
    if (previous && diff !== 0) {
      const sign = diff > 0 ? '+' : '';
      const diffClass = diff > 0 ? 'text-emerald-700' : 'text-text-soft';
      diffHtml = '<span class="dash-week-diff ' + diffClass + '">' +
        escHtml(pt('home.starHistory.diffUp', { diff: sign + diff })) + '</span>';
    } else if (previous && diff === 0 && thisWeekTotal > 0) {
      diffHtml = '<span class="dash-week-diff text-text-soft">' +
        escHtml(pt('home.starHistory.diffSame')) + '</span>';
    }

    // Best week per child (for single-child families or highlight top performer)
    let bestChild = null;
    if (ch.length === 1) {
      const child = ch[0];
      const childThisWeek = current.child_totals[child.id] || 0;
      let childBest = 0;
      for (let i = 0; i < weeks.length - 1; i++) {
        const wk = weeks[i].child_totals[child.id] || 0;
        if (wk > childBest) childBest = wk;
      }
      if (childThisWeek > 0 && childThisWeek > childBest) {
        bestChild = { name: capName(child.name), stars: childThisWeek };
      }
    }

    return {
      thisWeekTotal: thisWeekTotal,
      diffHtml: diffHtml,
      bestChild: bestChild,
    };
  }

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  function render(data) {
    const storyEl = document.getElementById('starHistoryStory');
    if (!storyEl) return;

    const story = computeStory(data);
    if (!story) {
      storyEl.classList.add('hidden');
      storyEl.innerHTML = '';
      return;
    }

    const bestHtml = story.bestChild
      ? '<p class="dash-week-best">' + escHtml(pt('home.starHistory.bestWeek', { name: story.bestChild.name })) + '</p>'
      : '';

    storyEl.classList.remove('hidden');
    storyEl.innerHTML =
      '<div class="dash-week-story-inner">' +
        '<div class="dash-week-main">' +
          '<span class="dash-week-total">' + pt('home.starHistory.thisWeek', { count: story.thisWeekTotal }) + '</span>' +
        '</div>' +
        (story.diffHtml ? '<div class="dash-week-meta">' + story.diffHtml + '</div>' : '') +
        bestHtml +
      '</div>';
  }

  window.DashboardWeeklyStory = { render: render };
})();
