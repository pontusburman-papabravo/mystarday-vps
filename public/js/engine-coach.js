/**
 * engine-coach.js — sole writer to #engineCoachMount (A exclusive monopoly surface).
 */
(function () {
  'use strict';

  var MOUNT_ID = 'engineCoachMount';

  function esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function toneClass(tone) {
    if (tone === 'celebration') return 'border-gold bg-gold-light';
    if (tone === 'calm') return 'border-lavender bg-sky';
    return 'border-indigo-200 bg-indigo-50';
  }

  function buildChangeNoticeHtml(notice) {
    if (!notice) return '';
    var rid = esc(notice.release_id);
    return (
      '<div class="engine-coach-change-notice mb-3 p-3 rounded-xl bg-white/80 border border-indigo-200 text-sm" ' +
      'role="status" data-engine-change-id="' + rid + '">' +
      '<div class="flex items-start gap-2">' +
      '<span class="flex-shrink-0 text-xs font-bold uppercase tracking-wide text-indigo-600 mt-0.5">Nytt</span>' +
      '<div class="flex-1 min-w-0">' +
      '<p class="text-navy font-medium leading-snug">' + esc(notice.user_visible_intent) + '</p>' +
      '<p class="text-text-soft text-xs mt-1 leading-snug">' + esc(notice.why_it_matters) + '</p>' +
      '</div>' +
      '<button type="button" class="engine-coach-change-dismiss flex-shrink-0 text-text-soft hover:text-navy text-lg leading-none w-8 h-8" ' +
      'aria-label="Stäng förklaring">×</button>' +
      '</div></div>'
    );
  }

  function bindChangeNotice(mount) {
    var el = mount.querySelector('.engine-coach-change-notice');
    if (!el || !window.EngineCoachChange) return;
    var releaseId = el.getAttribute('data-engine-change-id');
    function dismiss() {
      EngineCoachChange.acknowledge(releaseId);
      el.remove();
    }
    var btn = el.querySelector('.engine-coach-change-dismiss');
    if (btn) btn.addEventListener('click', dismiss);
  }

  function onPrimaryAction(copy, policyName) {
    if (policyName === 'SHOW_CHILD' || policyName === 'TRIGGER_CELEBRATION') {
      if (window.DashboardChildHandoff && typeof DashboardChildHandoff.startChildLogin === 'function') {
        DashboardChildHandoff.startChildLogin();
        return;
      }
    }
    if (policyName === 'INVITE_CO_PARENT' && typeof window.openCoParentInviteModal === 'function') {
      window.openCoParentInviteModal();
      return;
    }
    if (copy.route) {
      window.location.href = copy.route;
    }
  }

  function shouldDeferToExceptions() {
    return window.EngineClient &&
      typeof EngineClient.isReadinessBlockingCoach === 'function' &&
      EngineClient.isReadinessBlockingCoach();
  }

  function shouldDeferToJourneyCoach() {
    var journey = document.getElementById('journeyCoachMount');
    return journey && !journey.classList.contains('hidden') && journey.innerHTML.trim().length > 0;
  }

  function render(engine) {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;
    if (shouldDeferToExceptions() || shouldDeferToJourneyCoach()) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return false;
    }
    if (!engine || !engine.policy) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return false;
    }

    var copy = window.EngineVoice ? EngineVoice.get(engine.policy.name) : { headline: '', body: '', cta: 'Fortsätt', tone: 'coach' };
    var theme = (engine.policy.uiTokens && engine.policy.uiTokens.theme) || copy.tone;
    var border = toneClass(theme === 'CELEBRATION' ? 'celebration' : theme === 'CALM' ? 'calm' : 'coach');

    mount.classList.remove('hidden');
    mount.setAttribute('data-authority', 'engine-only');
    mount.setAttribute('data-engine-policy', engine.policy.name);
    var changeNotice = window.EngineCoachChange ? EngineCoachChange.getNotice() : null;
    mount.innerHTML =
      '<div class="engine-coach-card rounded-2xl border-2 p-4 mb-4 ' + border + '" role="region" aria-label="Nästa steg">' +
      buildChangeNoticeHtml(changeNotice) +
      '<p class="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Nästa steg</p>' +
      '<p class="font-heading font-bold text-navy text-base mb-1">' + esc(copy.headline) + '</p>' +
      '<p class="text-sm text-text-soft mb-3">' + esc(copy.body) + '</p>' +
      '<button type="button" class="engine-coach-cta w-full py-3 rounded-xl bg-gold hover:bg-yellow-500 text-white font-semibold text-sm transition-colors">' +
      esc(copy.cta) + '</button></div>';

    bindChangeNotice(mount);

    var btn = mount.querySelector('.engine-coach-cta');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.EngineCoachChange && changeNotice) {
          EngineCoachChange.acknowledge(changeNotice.release_id);
        }
        if (typeof window.analytics !== 'undefined' && analytics.track) {
          analytics.track(null, 'engine_coach_cta_click', {
            policy: engine.policy.name,
            need: engine.trace && engine.trace.evaluatedNeed,
          });
        }
        onPrimaryAction(copy, engine.policy.name);
      });
    }
    return true;
  }

  function clear() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    mount.classList.add('hidden');
    mount.innerHTML = '';
  }

  async function load(options) {
    if (!window.EngineClient) return { ok: false, reason: 'no_client' };
    var result = await EngineClient.load(options);
    if (!result.ok) {
      clear();
      return result;
    }
    render(result.engine);
    return result;
  }

  window.EngineCoach = {
    load: load,
    render: render,
    clear: clear,
    MOUNT_ID: MOUNT_ID,
  };

  function init() {
    if (!document.getElementById(MOUNT_ID)) return;
    (async function () {
      if (window.JourneyContextClient) {
        try {
          const journeyOn = await JourneyContextClient.isJourneyApiEnabled();
          if (journeyOn) {
            const ctx = await JourneyContextClient.fetchContext();
            if (ctx?.capabilities?.coach_v1) {
              clear();
              return;
            }
          }
        } catch (_) {}
      }
      load().catch(function () {});
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
