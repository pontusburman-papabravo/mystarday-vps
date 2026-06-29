/**
 * child-build-hype.js — Bygg-loop + stjärn-hype på barnvyn (10/10).
 */
(function () {
  'use strict';

  const MOUNT_ID = 'childBuildHypeMount';
  let _state = null;
  let _goalData = null;
  let _progress = { completed: 0, total: 0 };

  function $(id) { return document.getElementById(id); }

  function ensureMount() {
    let el = $(MOUNT_ID);
    if (el) return el;
    const focus = $('todayFocusMount');
    if (!focus || !focus.parentNode) return null;
    el = document.createElement('div');
    el.id = MOUNT_ID;
    el.className = 'cbh-mount';
    focus.parentNode.insertBefore(el, focus.nextSibling);
    return el;
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function remainingMissions() {
    return Math.max(0, (_progress.total || 0) - (_progress.completed || 0));
  }

  function goalNagLine() {
    if (!_goalData || !_goalData.goal || !_goalData.goal.reward_id) return '';
    const bal = _goalData.star_balance || 0;
    const cost = _goalData.goal.star_cost || 1;
    const left = Math.max(0, cost - bal);
    const icon = _goalData.goal.reward_icon || '🎁';
    const name = _goalData.goal.reward_name || 'belöningen';
    if (left <= 0) {
      return '<p class="cbh-line cbh-line--gold">Du har nog stjärnor till ' + esc(icon) + ' ' + esc(name) +
        '! <strong>Be en vuxen godkänna i Skattkammaren.</strong></p>';
    }
    if (left <= 3) {
      return '<p class="cbh-line">Bara <strong>' + left + ' stjärnor</strong> kvar till ' + esc(icon) +
        ' ' + esc(name) + '! Gör fler uppdrag idag ⭐</p>';
    }
    return '<p class="cbh-line">Varje uppdrag ger stjärnor — du har ' + bal + '/' + cost +
      ' till ' + esc(icon) + ' ' + esc(name) + '</p>';
  }

  function renderScene(active) {
    const stage = active.build_stage || { key: 'empty', label: 'Början' };
    const sceneClass = active.scene_class || 'cbh-scene--generic';
    const slug = active.catalog_slug || '';
    return '<div class="cbh-scene ' + esc(sceneClass) + '" data-stage="' + esc(stage.key) + '" data-slug="' + esc(slug) + '">' +
      '<div class="cbh-scene-sky" aria-hidden="true"></div>' +
      '<div class="cbh-scene-layer cbh-scene-layer--ground"></div>' +
      '<div class="cbh-scene-layer cbh-scene-layer--build"></div>' +
      '<div class="cbh-scene-layer cbh-scene-layer--detail"></div>' +
      '<div class="cbh-scene-layer cbh-scene-layer--hero">' + esc(active.icon || '🧩') + '</div>' +
      '<p class="cbh-scene-label">' + esc(stage.label) + '</p>' +
    '</div>';
  }

  function renderMilestones(active) {
    const milestones = active.milestones || [];
    if (!milestones.length) return '';
    const dots = milestones.map(function (m) {
      const cls = m.reached ? ' is-done' : '';
      const reward = m.reward || {};
      return '<div class="cbh-milestone' + cls + '" title="' + esc(reward.label || '') + '">' +
        '<span class="cbh-milestone-at">' + m.at + '</span>' +
        '<span class="cbh-milestone-icon">' + esc(reward.icon || '🎁') + '</span>' +
      '</div>';
    }).join('');
    return '<div class="cbh-milestones" aria-label="Delmål">' + dots + '</div>';
  }

  function renderGuideBubble(active, message) {
    const guide = active.guide || { name: 'Kompisen', emoji: '🧩' };
    const text = message || (active.routine_line || 'Gör uppdrag så bygger du vidare!');
    return '<div class="cbh-guide">' +
      '<span class="cbh-guide-avatar" aria-hidden="true">' + esc(guide.emoji) + '</span>' +
      '<div class="cbh-guide-bubble"><strong>' + esc(guide.name) + '</strong> ' + esc(text) + '</div>' +
    '</div>';
  }

  function buildNagHtml() {
    const active = _state && _state.active_project;
    const catalog = (_state && _state.catalog) || [];

    if (!active && catalog.length) {
      return '<div class="cbh-card cbh-card--pick">' +
        '<p class="cbh-title">🧩 Välj ditt äventyr!</p>' +
        '<p class="cbh-line">Gör uppdrag → samla delar → lås upp en värld att leka i.</p>' +
        '<a href="/child/adventures" class="cbh-cta">Välj äventyr</a></div>';
    }

    if (!active) return '';

    const left = active.parts_left != null
      ? active.parts_left
      : Math.max(0, active.parts_required - active.parts_collected);
    const pct = active.progress_pct || 0;
    const unlock = active.unlock_label || 'din värld';
    const icon = active.icon || '🧩';

    if (active.status === 'completed' || active.garage_unlocked) {
      const playHref = active.catalog_slug === 'racerbil' ? '/child/garage' : '/child/world';
      return '<div class="cbh-card cbh-card--unlock">' +
        renderScene(active) +
        '<p class="cbh-title">🎉 ' + esc(unlock) + ' är öppen!</p>' +
        '<p class="cbh-line">Fortsätt samla stjärnor ⭐ till Skattkammaren medan du leker.</p>' +
        '<a href="' + playHref + '" class="cbh-cta">Lek nu</a></div>';
    }

    let urgency = '';
    if (left === 1) {
      urgency = '<p class="cbh-line cbh-line--pulse"><strong>SNART KLART!</strong> Bara 1 del kvar till ' +
        esc(unlock) + '!</p>';
    } else {
      urgency = '<p class="cbh-line">' + icon + ' <strong>' + active.parts_collected + '/' +
        active.parts_required + ' delar</strong> till ' + esc(unlock) + '</p>';
    }

    const missions = remainingMissions();
    let missionLine = '';
    if (missions > 0) {
      missionLine = '<p class="cbh-line cbh-line--missions">Du har <strong>' + missions +
        ' uppdrag</strong> kvar idag — varje klart ger en byggdel 🧩</p>';
    }

    const nextM = active.next_milestone;
    const nextLine = nextM
      ? '<p class="cbh-line cbh-line--next">Nästa delmål: <strong>' + nextM + ' delar</strong></p>'
      : '';

    return '<div class="cbh-card cbh-card--building">' +
      renderGuideBubble(active, active.routine_line) +
      renderScene(active) +
      '<div class="cbh-progress" aria-label="Byggprogress">' +
        '<div class="cbh-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      renderMilestones(active) +
      urgency + nextLine + missionLine + goalNagLine() +
      '</div>';
  }

  function render() {
    const mount = ensureMount();
    if (!mount) return;
    const html = buildNagHtml();
    mount.innerHTML = html;
    mount.hidden = !html;
  }

  async function refresh() {
    if (!window.Auth || typeof Auth.api !== 'function') return;
    try {
      _state = await Auth.api('/api/me/build');
    } catch (_) {
      _state = null;
    }
    render();
  }

  function showGuideToast(message, reward) {
    let msg = message;
    if (reward && reward.label) {
      msg = (reward.icon || '🎁') + ' ' + reward.label + ' upplåst! ' + (message || '');
    }
    if (typeof showToast === 'function') showToast(msg);
    else if (window.showToast) window.showToast(msg);
  }

  function onPartEarned(payload) {
    if (!payload || !payload.project) return;
    if (_state) {
      _state.active_project = payload.project;
    }
    render();

    const p = payload.project;
    const left = Math.max(0, p.parts_required - p.parts_collected);

    if (payload.completed) {
      if (window.ChildBuildCeremony) ChildBuildCeremony.show(p);
      else showGuideToast(payload.guide_message || ('🎉 KLART! ' + (p.unlock_label || 'Din värld') + ' är öppen!'));
      return;
    }

    if (payload.milestone_hit && payload.milestone_reward) {
      showGuideToast(payload.guide_message, payload.milestone_reward);
      if (window.BuildGameMobile) BuildGameMobile.haptic('heavy');
      else if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      return;
    }

    if (payload.guide_message) {
      showGuideToast(payload.guide_message);
    } else {
      showGuideToast('🧩 Ny del! (' + p.parts_collected + '/' + p.parts_required + ')');
    }

    if (left === 1) {
      if (window.BuildGameMobile) BuildGameMobile.haptic('heavy');
    } else if (window.BuildGameMobile) {
      BuildGameMobile.haptic('success');
    }
  }

  function updateProgress(completed, total) {
    _progress = { completed: completed || 0, total: total || 0 };
    render();
  }

  function setGoalData(data) {
    _goalData = data;
    render();
  }

  window.ChildBuildHype = {
    refresh: refresh,
    render: render,
    onPartEarned: onPartEarned,
    updateProgress: updateProgress,
    setGoalData: setGoalData,
  };

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(refresh, 400);
  });
})();
