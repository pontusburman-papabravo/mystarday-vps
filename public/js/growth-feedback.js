/**
 * growth-feedback.js — short Journey-gated feedback surface (parent Hem).
 * Shows only when GET /api/growth/feedback/eligible returns eligible.
 */
(function () {
  'use strict';

  const DISMISS_KEY = 'msd_growth_feedback_dismissed';
  const SHOWN_KEY = 'msd_growth_feedback_shown';
  const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
  const ROOT_ID = 'growthFeedbackMount';

  function locale() {
    try {
      if (window.I18n && I18n.getLocale) return I18n.getLocale();
      if (document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
    } catch (_) {}
    return 'sv-SE';
  }

  function platform() {
    if (window.UtmCapture && UtmCapture.detectPlatform) return UtmCapture.detectPlatform();
    return 'web';
  }

  function readMap(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function writeMap(key, map) {
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch (_) {}
  }

  function wasDismissed(promptKey) {
    const map = readMap(DISMISS_KEY);
    const entry = map[promptKey];
    if (!entry) return false;
    if (typeof entry === 'number') {
      if (Date.now() - entry > DISMISS_TTL_MS) {
        delete map[promptKey];
        writeMap(DISMISS_KEY, map);
        return false;
      }
      return true;
    }
    return Boolean(entry);
  }

  function markDismissed(promptKey) {
    const map = readMap(DISMISS_KEY);
    map[promptKey] = Date.now();
    writeMap(DISMISS_KEY, map);
  }

  function markShownOnce(promptKey, reason) {
    const map = readMap(SHOWN_KEY);
    if (map[promptKey]) return;
    map[promptKey] = Date.now();
    writeMap(SHOWN_KEY, map);
    try {
      if (window.analytics && typeof analytics.track === 'function') {
        analytics.track('growth_feedback_shown', {
          prompt_key: promptKey,
          reason: reason || null,
        });
      }
    } catch (_) {}
  }

  function ensureRoot() {
    let el = document.getElementById(ROOT_ID);
    if (el) return el;
    const slot =
      document.getElementById('parentHubCoachSlot') ||
      document.getElementById('homeReadinessMount') ||
      document.querySelector('main') ||
      document.body;
    if (!slot || !slot.parentNode) return null;
    el = document.createElement('div');
    el.id = ROOT_ID;
    el.className = 'growth-feedback-mount px-4 mb-3';
    el.setAttribute('aria-live', 'polite');
    slot.parentNode.insertBefore(el, slot.nextSibling);
    return el;
  }

  function render(prompt, reason) {
    const root = ensureRoot();
    if (!root) return;
    root.innerHTML = '';

    const card = document.createElement('section');
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Feedback');
    card.className =
      'rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm';

    const q = document.createElement('p');
    q.className = 'text-base font-semibold text-slate-800 mb-3';
    q.textContent = prompt.question;
    card.appendChild(q);

    let commentEl = null;
    if (prompt.allowComment) {
      commentEl = document.createElement('textarea');
      commentEl.rows = 2;
      commentEl.maxLength = 500;
      commentEl.className =
        'w-full mb-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700';
      commentEl.placeholder =
        locale().indexOf('en') === 0
          ? 'Optional short comment (sent with your answer)'
          : 'Valfri kort kommentar (skickas med ditt svar)';
      commentEl.setAttribute('aria-label', commentEl.placeholder);
      card.appendChild(commentEl);
    }

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap gap-2 mb-2';
    (prompt.answers || []).forEach(function (ans) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'min-h-[44px] px-4 py-2 rounded-xl bg-white border border-slate-200 ' +
        'text-slate-800 font-medium hover:border-amber-400 focus:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-amber-400';
      btn.textContent = ans.label;
      btn.addEventListener('click', function () {
        const comment = commentEl && commentEl.value ? commentEl.value : null;
        submit(prompt.promptKey, ans.value, comment);
      });
      actions.appendChild(btn);
    });
    card.appendChild(actions);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'mt-2 block min-h-[44px] text-xs text-slate-500';
    dismiss.textContent = locale().indexOf('en') === 0 ? 'Not now' : 'Inte nu';
    dismiss.addEventListener('click', function () {
      markDismissed(prompt.promptKey);
      try {
        if (window.analytics && typeof analytics.track === 'function') {
          analytics.track('growth_feedback_dismissed', {
            prompt_key: prompt.promptKey,
          });
        }
      } catch (_) {}
      root.innerHTML = '';
    });
    card.appendChild(dismiss);

    root.appendChild(card);
    markShownOnce(prompt.promptKey, reason);
  }

  async function submit(promptKey, answer, comment) {
    try {
      if (!window.Auth || !Auth.api) return;
      await Auth.api('/api/growth/feedback', {
        method: 'POST',
        body: JSON.stringify({
          prompt_key: promptKey,
          answer: answer,
          comment: comment || undefined,
          locale: locale(),
          platform: platform(),
        }),
      });
      markDismissed(promptKey);
      const root = document.getElementById(ROOT_ID);
      if (root) {
        root.innerHTML =
          '<p class="text-sm text-slate-600 px-1">' +
          (locale().indexOf('en') === 0 ? 'Thank you for the feedback.' : 'Tack för feedbacken.') +
          '</p>';
      }
    } catch (_) {
      /* non-blocking */
    }
  }

  async function init(opts) {
    opts = opts || {};
    try {
      if (!window.Auth || !Auth.api) return;
      if (!document.getElementById(ROOT_ID) && !document.querySelector('main')) {
        return;
      }
      const qs = new URLSearchParams();
      qs.set('locale', locale());
      if (opts.intent) qs.set('intent', opts.intent);
      const data = await Auth.api('/api/growth/feedback/eligible?' + qs.toString());
      if (!data || !data.eligible || !data.prompt) return;
      if (wasDismissed(data.prompt.promptKey)) return;
      // Do not compete with readiness blockers for positive prompts
      if (
        (data.prompt.promptKey === 'first_value' ||
          data.prompt.promptKey === 'three_routine_days') &&
        window.EngineClient &&
        typeof EngineClient.isReadinessBlockingCoach === 'function' &&
        EngineClient.isReadinessBlockingCoach()
      ) {
        return;
      }
      render(data.prompt, data.reason);
    } catch (_) {
      /* flag off / network — silent */
    }
  }

  window.GrowthFeedback = { init: init };

  function boot() {
    // Defer so readiness/engine can settle — never first-paint / first login splash
    setTimeout(function () {
      init();
    }, 1200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
