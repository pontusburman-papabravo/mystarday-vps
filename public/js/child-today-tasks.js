/**
 * child-today-tasks.js — Today layer: quest log cap, reward teasers, secondary CTA.
 * Separation contract: tasks only; no universe/family data.
 */
(function () {
  'use strict';

  var MAX_VISIBLE = 5;

  function isFocusMode() {
    return document.documentElement.classList.contains('today-focus-mode');
  }

  function buildStarMap(items) {
    var map = {};
    (items || []).forEach(function (item) {
      if (item && item.id && !item.completed && item.star_value > 0) {
        map[item.id] = item.star_value;
      }
    });
    return map;
  }

  function injectRewardTeasers(starMap) {
    Object.keys(starMap).forEach(function (id) {
      var card = document.getElementById('card-' + id);
      if (!card || card.classList.contains('done')) return;
      if (card.querySelector('.ctf-reward-teaser')) return;

      var teaser = document.createElement('span');
      teaser.className = 'ctf-reward-teaser';
      teaser.setAttribute('aria-label', 'Belöning vid avklaring');
      teaser.textContent = '+' + starMap[id] + ' ⭐';

      var anchor = card.querySelector('.now-details .flex') ||
        card.querySelector('.flex-1 .flex') ||
        card.querySelector('.nl-info') ||
        card.querySelector('.now-details') ||
        card.querySelector('.flex-1');
      if (anchor) {
        anchor.appendChild(teaser);
      } else {
        card.appendChild(teaser);
      }
    });
  }

  function hideDoneHistory() {
    document.querySelectorAll('#scheduleView .nl-section-label').forEach(function (label) {
      if ((label.textContent || '').indexOf('Klart') >= 0) {
        var block = label.closest('.mb-4');
        if (block) block.classList.add('ctf-hidden');
      }
    });
    document.querySelectorAll('#scheduleView .nl-card.done, #scheduleView .activity-card.done').forEach(function (card) {
      card.classList.add('ctf-hidden');
    });
  }

  function capIncompleteTasks() {
    var selector = [
      '#scheduleView .now-card:not(.done)',
      '#scheduleView .activity-card:not(.done)',
    ].join(', ');
    var cards = Array.from(document.querySelectorAll(selector));
  // Exclude non-actionable preview cards (next/later in filtered view)
    cards = cards.filter(function (card) {
      return !card.classList.contains('next-card') && !card.classList.contains('later-card');
    });

    var hidden = 0;
    cards.forEach(function (card, index) {
      if (index >= MAX_VISIBLE) {
        card.classList.add('ctf-hidden');
        hidden++;
      }
    });

    if (hidden > 0) {
      showMoreHint(hidden);
    } else {
      removeMoreHint();
    }
  }

  function showMoreHint(count) {
    var hint = document.getElementById('ctfMoreTasksHint');
    if (!hint) {
      hint = document.createElement('p');
      hint.id = 'ctfMoreTasksHint';
      hint.className = 'ctf-more-hint';
      var scheduleView = document.getElementById('scheduleView');
      if (scheduleView) scheduleView.appendChild(hint);
    }
    hint.textContent = '+' + count + ' fler uppdrag väntar — klara dessa först!';
    hint.classList.remove('ctf-hidden');
  }

  function removeMoreHint() {
    var hint = document.getElementById('ctfMoreTasksHint');
    if (hint) hint.classList.add('ctf-hidden');
  }

  function mountSkattCta() {
    var bottom = document.getElementById('ctfSkattBottom');
    if (!bottom) {
      bottom = document.createElement('div');
      bottom.id = 'ctfSkattBottom';
      bottom.className = 'ctf-skatt-bottom';
      bottom.innerHTML = '<button type="button" class="ctf-skatt-btn" id="ctfSkattBtnBottom">💎 Skattkammaren</button>';
      var scheduleView = document.getElementById('scheduleView');
      if (scheduleView && scheduleView.parentNode) {
        scheduleView.parentNode.insertBefore(bottom, scheduleView.nextSibling);
      }
      var btn = document.getElementById('ctfSkattBtnBottom');
      if (btn) {
        btn.addEventListener('click', function () {
          if (typeof showTab === 'function') showTab('rewards');
        });
      }
    }
    bottom.classList.remove('ctf-hidden');
  }

  function hideSkattCta() {
    var bottom = document.getElementById('ctfSkattBottom');
    if (bottom) bottom.classList.add('ctf-hidden');
  }

  function afterRender(data, isToday) {
    if (!isFocusMode() || !isToday) {
      hideSkattCta();
      removeMoreHint();
      return;
    }
    var items = (data && data.items) || [];
    injectRewardTeasers(buildStarMap(items));
    hideDoneHistory();
    capIncompleteTasks();
    mountSkattCta();
  }

  window.ChildTodayTasks = {
    afterRender: afterRender,
    MAX_VISIBLE: MAX_VISIBLE,
  };
})();
