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
    var ch = data.children || [];
    var weeks = data.weeks || [];
    if (!ch.length || !weeks.length) return null;

    var current = weeks[weeks.length - 1];
    var previous = weeks.length > 1 ? weeks[weeks.length - 2] : null;

    var thisWeekTotal = ch.reduce(function (sum, c) {
      return sum + (current.child_totals[c.id] || 0);
    }, 0);

    var lastWeekTotal = previous ? ch.reduce(function (sum, c) {
      return sum + (previous.child_totals[c.id] || 0);
    }, 0) : 0;

    var diff = thisWeekTotal - lastWeekTotal;
    var diffHtml = '';
    if (previous && diff !== 0) {
      var sign = diff > 0 ? '+' : '';
      var diffClass = diff > 0 ? 'text-emerald-700' : 'text-text-soft';
      diffHtml = '<span class="dash-week-diff ' + diffClass + '">' + sign + diff + ' jämfört med förra veckan</span>';
    } else if (previous && diff === 0 && thisWeekTotal > 0) {
      diffHtml = '<span class="dash-week-diff text-text-soft">Samma som förra veckan</span>';
    }

    // Best week per child (for single-child families or highlight top performer)
    var bestChild = null;
    if (ch.length === 1) {
      var child = ch[0];
      var childThisWeek = current.child_totals[child.id] || 0;
      var childBest = 0;
      for (var i = 0; i < weeks.length - 1; i++) {
        var wk = weeks[i].child_totals[child.id] || 0;
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

  function render(data) {
    var storyEl = document.getElementById('starHistoryStory');
    if (!storyEl) return;

    var story = computeStory(data);
    if (!story) {
      storyEl.classList.add('hidden');
      storyEl.innerHTML = '';
      return;
    }

    var bestHtml = story.bestChild
      ? '<p class="dash-week-best">🎉 ' + escHtml(story.bestChild.name) + 's bästa vecka hittills!</p>'
      : '';

    storyEl.classList.remove('hidden');
    storyEl.innerHTML =
      '<div class="dash-week-story-inner">' +
        '<div class="dash-week-main">' +
          '<span class="dash-week-label">Den här veckan</span>' +
          '<span class="dash-week-total">' + story.thisWeekTotal + ' ⭐</span>' +
        '</div>' +
        (story.diffHtml ? '<div class="dash-week-meta">' + story.diffHtml + '</div>' : '') +
        bestHtml +
      '</div>';
  }

  window.DashboardWeeklyStory = { render: render };
})();
