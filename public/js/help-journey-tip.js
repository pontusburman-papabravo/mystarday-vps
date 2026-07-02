/**
 * help-journey-tip.js — contextual signup-journey tip for help panels (all parent pages).
 * Aligns with journey-coach.js ADR: day 1 parent preview, day 3 child login.
 */
(function () {
  'use strict';

  if (!document.getElementById('helpJourneyTipStyles')) {
    const style = document.createElement('style');
    style.id = 'helpJourneyTipStyles';
    style.textContent = [
      '.hb-journey-tip-mount,.help-journey-tip-mount{padding:0 16px 12px;border-bottom:1px solid #EDE7F6;flex-shrink:0}',
      '.help-journey-tip{border-radius:14px;border:2px solid #C7D2FE;background:#EEF2FF;padding:12px 14px}',
      '.help-journey-tip--celebration,.help-journey-tip--reflection{border-color:rgba(245,166,35,.45);background:#FFF8E7}',
      '.help-journey-tip-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#4338CA;margin:0 0 4px}',
      '.help-journey-tip--celebration .help-journey-tip-label,.help-journey-tip--reflection .help-journey-tip-label{color:#B45309}',
      '.help-journey-tip-headline{font-family:Outfit,sans-serif;font-weight:700;font-size:14px;color:#1B2340;margin:0 0 4px}',
      '.help-journey-tip-body{font-size:12px;color:#5A6178;line-height:1.6;margin:0 0 10px}',
      '.help-journey-tip-body--pre{white-space:pre-line}',
      '.help-journey-tip-cta{width:100%;padding:10px 12px;border:none;border-radius:10px;background:#F5A623;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}',
      '.help-journey-tip-cta:hover{background:#E09510}',
    ].join('');
    document.head.appendChild(style);
  }

  const SJ_EXPERIENCES = new Set([
    'sj_day1_child_preview',
    'sj_day2_try_routine',
    'sj_day3_child_try',
    'sj_celebrate_star',
    'sj_introduce_stars',
    'sj_welcome_child_login',
    'sj_help_get_started',
    'sj_day7_reflection',
  ]);

  const COACH_ROUTES = {
    sj_day2_try_routine: '/schedule',
    sj_introduce_stars: '/rewards',
  };

  let registryCache = null;

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function childDailyLogHref(childId) {
    if (!childId) return '/daily-log';
    return '/daily-log?childId=' + encodeURIComponent(childId) + '&date=' + encodeURIComponent(todayIsoDate());
  }

  function signupSignals(context) {
    return (context && context.signup_journey && context.signup_journey.signals) || {};
  }

  function personalizeSjCopy(exp, expKey, context) {
    const sig = signupSignals(context);
    const name = (sig.child_name || '').trim();
    if (!name) return exp;
    const out = Object.assign({}, exp);
    if (expKey === 'sj_day3_child_try') {
      out.headline = 'Dags att låta ' + name + ' prova';
    }
    return out;
  }

  function lookupExperience(registry, expKey, phase) {
    if (expKey && expKey.startsWith('sj_')) {
      return (registry && registry.phases && registry.phases.BUILDING_ROUTINE && registry.phases.BUILDING_ROUTINE[expKey])
        || (registry && registry.phases && registry.phases.FIRST_USE && registry.phases.FIRST_USE[expKey])
        || {};
    }
    return (registry && registry.phases && registry.phases[phase] && registry.phases[phase][expKey]) || {};
  }

  async function fetchContext() {
    if (window.JourneyContextClient && typeof JourneyContextClient.fetchContext === 'function') {
      return JourneyContextClient.fetchContext();
    }
    if (typeof window.apiFetch !== 'function') return null;
    try {
      const res = await window.apiFetch('/api/me/journey-context');
      if (!res.ok) return null;
      return res.json();
    } catch (_) {
      return null;
    }
  }

  async function fetchRegistry() {
    if (registryCache) return registryCache;
    if (window.JourneyContextClient && typeof JourneyContextClient.fetchRegistry === 'function') {
      registryCache = await JourneyContextClient.fetchRegistry();
      return registryCache;
    }
    if (typeof window.apiFetch !== 'function') return null;
    try {
      const res = await window.apiFetch('/api/me/journey-context/registry');
      if (!res.ok) return null;
      registryCache = await res.json();
      return registryCache;
    } catch (_) {
      return null;
    }
  }

  function onTipCta(expKey, context) {
    if (expKey === 'sj_day1_child_preview' || expKey === 'sj_help_get_started') {
      window.location.href = childDailyLogHref(signupSignals(context).child_id);
      return;
    }
    if (expKey === 'sj_day3_child_try') {
      if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
        DashboardChildHandoff.startChildLogin();
      } else {
        window.location.href = '/child-login';
      }
      return;
    }
    if (expKey === 'sj_celebrate_star' || expKey === 'sj_welcome_child_login') {
      return;
    }
    if (expKey === 'sj_day7_reflection') {
      return;
    }
    const route = COACH_ROUTES[expKey];
    if (route) {
      window.location.href = route;
    }
  }

  function buildTipHtml(context, registry) {
    if (!context || !context.signup_journey || !context.signup_journey.active) return '';

    const expKey = context.recommended_experiences && context.recommended_experiences[0];
    if (!expKey || !SJ_EXPERIENCES.has(expKey)) return '';
    if (context.signup_journey.silent) return '';

    const exp = personalizeSjCopy(lookupExperience(registry, expKey, context.phase), expKey, context);
    const isCelebration = context.priority === 'celebration' || exp.tone === 'celebration';
    const isReflection = expKey === 'sj_day7_reflection' || context.priority === 'reflection';

    if (isReflection) {
      const story = context.signup_journey.reflection_story || exp.body || '';
      return (
        '<div class="help-journey-tip help-journey-tip--reflection" data-exp-key="' + esc(expKey) + '">' +
        '<p class="help-journey-tip-label">En vecka</p>' +
        '<p class="help-journey-tip-headline">' + esc(exp.headline || 'En vecka tillsammans') + '</p>' +
        '<p class="help-journey-tip-body help-journey-tip-body--pre">' + esc(story) + '</p>' +
        (exp.cta ? '<button type="button" class="help-journey-tip-cta">' + esc(exp.cta) + '</button>' : '') +
        '</div>'
      );
    }

    const toneClass = isCelebration ? 'help-journey-tip--celebration' : 'help-journey-tip--coach';
    const label = isCelebration ? 'Milstolpe' : 'Tips';

    return (
      '<div class="help-journey-tip ' + toneClass + '" data-exp-key="' + esc(expKey) + '">' +
      '<p class="help-journey-tip-label">' + esc(label) + '</p>' +
      '<p class="help-journey-tip-headline">' + esc(exp.headline || '') + '</p>' +
      '<p class="help-journey-tip-body">' + esc(exp.body || '') + '</p>' +
      (exp.cta ? '<button type="button" class="help-journey-tip-cta">' + esc(exp.cta) + '</button>' : '') +
      '</div>'
    );
  }

  function bindTipHandlers(mount, context) {
    if (!mount) return;
    const card = mount.querySelector('.help-journey-tip');
    if (!card) return;
    const expKey = card.getAttribute('data-exp-key');
    const btn = card.querySelector('.help-journey-tip-cta');
    if (btn) {
      btn.addEventListener('click', function () {
        onTipCta(expKey, context);
        if (expKey === 'sj_day7_reflection' && mount.parentElement) {
          const panel = mount.closest('#hbPanel, #helpPanel');
          if (panel && panel.id === 'hbPanel' && typeof window.__hbClose === 'function') {
            window.__hbClose();
          } else if (typeof window.toggleHelpPanel === 'function') {
            window.toggleHelpPanel();
          }
        }
      });
    }
  }

  async function refresh(mountEl) {
    if (!mountEl) return;
    const context = await fetchContext();
    const registry = await fetchRegistry();
    const html = buildTipHtml(context, registry);
    mountEl.innerHTML = html;
    mountEl.style.display = html ? 'block' : 'none';
    if (html) bindTipHandlers(mountEl, context);
  }

  window.HelpJourneyTip = {
    refresh,
    buildTipHtml,
    childDailyLogHref,
  };
})();
