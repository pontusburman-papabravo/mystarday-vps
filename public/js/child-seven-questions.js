/**
 * Extra stöd — seven questions NU overlay (E8).
 */
(function (global) {
  'use strict';

  const ORDER = ['what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why'];
  const LABELS = {
    what: 'Vad?',
    where: 'Var?',
    who: 'Vem?',
    how_long: 'Hur länge?',
    what_next: 'Vad händer sen?',
    what_need: 'Vad behöver jag?',
    why: 'Varför?',
  };

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

  function renderQuestion(key, val) {
    if (!val || (!val.text && !val.emoji)) return '';
    const emoji = val.emoji || '•';
    return `<div class="teacch-q-row">
      <span class="teacch-q-emoji">${esc(emoji)}</span>
      <div><span class="teacch-q-label">${LABELS[key] || key}</span>
      <span class="teacch-q-text">${esc(val.text)}</span></div>
    </div>`;
  }

  /** Sync render — call ChildSevenQuestions.ready() before first schedule render. */
  function tryRender(item, canToggle) {
    if (!accessCache?.components?.teacch?.has) return null;
    if (!accessCache.features?.de_sju_fragorna) return null;

    const sq = item.seven_questions || {};
    const enriched = { ...sq };
    enriched.what = { text: item.name, emoji: item.icon || '⭐', virtual: true };

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

    const readAloudBtn = global.ChildReadAloud?.isAvailable()
      ? `<button type="button" class="teacch-read-btn" onclick="ChildReadAloud.speakNow('${item.id}')">🔊 Läs upp</button>`
      : '';

    const exitBtn = `<button type="button" class="teacch-exit-btn" onclick="ChildPackageNav.setNavHidden(false);location.reload()">Avsluta aktivitet</button>`;

    return `
      <div class="now-card teacch-now-card ${isDone ? 'done' : ''}" id="card-${item.id}" data-item-id="${item.id}">
        <div class="now-badge"><div class="pulse-dot"></div> NU</div>
        <div class="teacch-questions">${rows}</div>
        <div class="teacch-now-actions">
          ${readAloudBtn}
          ${exitBtn}
          ${isDone
            ? '<div class="now-check" style="background:#22C55E;border-color:#22C55E;">✓</div>'
            : `<button class="now-check" ${checkAttr}></button>`}
        </div>
      </div>`;
  }

  global.ChildSevenQuestions = { tryRender, ready: () => readyPromise };
})(window);
