/**
 * Extra stöd — seven questions NU overlay (E8).
 */
(function (global) {
  'use strict';

  const ORDER = ['what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why'];

  function cpt(key, params) {
    return typeof global.cpt === 'function' ? global.cpt(key, params) : '';
  }

  function questionLabel(key) {
    return cpt('sevenQuestions.labels.' + key) || key;
  }

  let accessCache = null;
  const analyticsSent = new Set();

  const readyPromise = (async function prefetchAccess() {
    try {
      if (window.fetchPackageAccess) {
        accessCache = await window.fetchPackageAccess();
      } else {
        const res = await fetch('/api/subscription/access', { credentials: 'include' });
        accessCache = res.ok ? await res.json() : null;
      }
    } catch (_) {
      accessCache = null;
    }
    return accessCache;
  })();

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function activityLabel(item) {
    if (!item) return '';
    return item.display_name || item.name || '';
  }

  function renderQuestion(key, val) {
    if (!val || (!val.text && !val.emoji)) return '';
    const emoji = val.emoji || '•';
    return `<div class="teacch-q-row">
      <span class="teacch-q-emoji">${esc(emoji)}</span>
      <div><span class="teacch-q-label">${esc(questionLabel(key))}</span>
      <span class="teacch-q-text">${esc(val.text)}</span></div>
    </div>`;
  }

  /** Sync render — call ChildSevenQuestions.ready() before first schedule render. */
  function tryRender(item, canToggle) {
    if (!accessCache?.components?.teacch?.has) return null;
    if (!accessCache.features?.de_sju_fragorna) return null;

    const sq = item.seven_questions || {};
    const enriched = { ...sq };
    const label = activityLabel(item);
    enriched.what = { text: label, emoji: item.icon || '⭐', virtual: true };

    const rows = ORDER.map((k) => renderQuestion(k, enriched[k])).filter(Boolean).join('');
    if (!rows) return null;

    const isDone = item.completed;
    const checkAttr = canToggle && !isDone ? `onclick="toggleItem('${item.id}', false)"` : '';

    try {
      if (!analyticsSent.has(item.id)) {
        analyticsSent.add(item.id);
        fetch('/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            event_type: 'seven_questions_shown',
            metadata: { fields_filled: rows.split('teacch-q-row').length - 1 },
          }),
        });
      }
    } catch (_) {}

    const readAloudLabel = esc(cpt('sevenQuestions.readAloud'));
    const exitLabel = esc(cpt('sevenQuestions.exitActivity'));
    const nowBadge = esc(cpt('todayWarmth.nowBadge'));

    const readAloudBtn = global.ChildReadAloud?.isAvailable()
      ? `<button type="button" class="teacch-read-btn" onclick="ChildReadAloud.speakNow('${item.id}')">🔊 ${readAloudLabel}</button>`
      : '';

    const exitBtn = `<button type="button" class="teacch-exit-btn" onclick="ChildSevenQuestions.exitNu()">${exitLabel}</button>`;

    return `
      <div class="now-card teacch-now-card ${isDone ? 'done' : ''}" id="card-${item.id}" data-item-id="${item.id}"
           data-item-name="${esc(label)}" data-item-icon="${esc(item.icon || '⭐')}">
        <div class="now-badge"><div class="pulse-dot"></div> ${nowBadge}</div>
        <div class="teacch-questions">${rows}</div>
        ${global.ChildActivityTimer && ChildActivityTimer.renderBlock
          ? '<div class="teacch-activity-timer">' + ChildActivityTimer.renderBlock(item) + '</div>'
          : ''}
        <div class="teacch-now-actions">
          ${readAloudBtn}
          ${exitBtn}
          ${isDone
            ? '<div class="now-check" style="background:#22C55E;border-color:#22C55E;">✓</div>'
            : `<button class="now-check" ${checkAttr}></button>`}
        </div>
      </div>`;
  }

  function exitNu() {
    if (global.ChildPackageNav) ChildPackageNav.setNavHidden(false);
    document.body.classList.remove('child-teacch-nu-active');
    if (typeof global.loadDay === 'function' && global.currentDate) {
      global.loadDay(global.currentDate, false);
      return;
    }
    location.reload();
  }

  global.ChildSevenQuestions = { tryRender, ready: () => readyPromise, exitNu: exitNu };
})(window);
