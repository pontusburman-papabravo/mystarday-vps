/**
 * child-build-hype.js — Bygg-loop + stjärn-hype på barnvyn.
 * Mål: barn ska vilja göra fler uppdrag och "tjata" på föräldrar om stjärnor.
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

    const left = Math.max(0, active.parts_required - active.parts_collected);
    const pct = active.progress_pct || 0;
    const unlock = active.unlock_label || 'din värld';
    const icon = active.icon || '🧩';
    let urgency = '';

    if (left === 1) {
      urgency = '<p class="cbh-line cbh-line--pulse"><strong>SNART KLART!</strong> Bara 1 del kvar till ' +
        esc(unlock) + '! Gör nästa uppdrag nu.</p>';
    } else if (left > 0) {
      urgency = '<p class="cbh-line">' + icon + ' <strong>' + active.parts_collected + '/' +
        active.parts_required + ' delar</strong> till ' + esc(unlock) +
        ' — gör fler uppdrag så bygger du vidare!</p>';
    }

    if (active.status === 'completed' || active.garage_unlocked) {
      const playHref = active.catalog_slug === 'racerbil' ? '/child/garage' : '/child/world';
      return '<div class="cbh-card cbh-card--unlock">' +
        '<p class="cbh-title">🎉 ' + esc(unlock) + ' är öppen!</p>' +
        '<p class="cbh-line">Fortsätt samla stjärnor ⭐ till Skattkammaren medan du leker.</p>' +
        '<a href="' + playHref + '" class="cbh-cta">Lek nu</a></div>';
    }

    const missions = remainingMissions();
    let missionLine = '';
    if (missions > 0) {
      missionLine = '<p class="cbh-line cbh-line--missions">Du har <strong>' + missions +
        ' uppdrag</strong> kvar idag — varje klart ger en byggdel 🧩</p>';
    }

    return '<div class="cbh-card">' +
      '<div class="cbh-progress"><div class="cbh-progress-fill" style="width:' + pct + '%"></div></div>' +
      urgency + missionLine + goalNagLine() +
      '<p class="cbh-parent-nag">💬 Tips: Säg till mamma eller pappa att kolla Idag — då ser de att du jobbat!</p>' +
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

  function onPartEarned(payload) {
    if (!payload || !payload.project) return;
    if (_state) {
      _state.active_project = payload.project;
    }
    render();

    const p = payload.project;
    const left = Math.max(0, p.parts_required - p.parts_collected);
    let msg = '🧩 Ny del till ' + (p.name || 'projektet') + '! (' + p.parts_collected + '/' + p.parts_required + ')';
    if (payload.completed) {
      msg = '🎉 KLART! ' + (p.unlock_label || 'Din värld') + ' är öppen!';
      if (window.BuildGameMobile) BuildGameMobile.haptic('success');
      else if (window.Platform && Platform.haptics) Platform.haptics.success();
    } else if (left === 1) {
      msg = '🔥 SNART! Bara 1 del kvar — gör ett till uppdrag!';
      if (window.BuildGameMobile) BuildGameMobile.haptic('heavy');
    } else if (window.BuildGameMobile) {
      BuildGameMobile.haptic('success');
    }

    if (typeof showToast === 'function') showToast(msg);
    else if (window.showToast) window.showToast(msg);
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
