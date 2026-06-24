/**
 * onboarding-activation.js — ACT-1 PR2: child handoff + first star guide (flag-gated).
 */
(function () {
  'use strict';

  var config = null;
  var childId = null;

  function api(path, opts) {
    if (!window.apiFetch) return Promise.reject(new Error('no api'));
    return window.apiFetch(path, opts);
  }

  function trackEvent(eventType, metadata) {
    api('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata: metadata || {} }),
    }).catch(function () {});
  }

  function loadConfig() {
    return api('/api/family/activation-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        config = data || { flags: {} };
        return config;
      })
      .catch(function () {
        config = { flags: {} };
        return config;
      });
  }

  function recordChildAccess(source) {
    return api('/api/onboarding/child-access-complete', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, source: source }),
    });
  }

  function enhanceStep5() {
    if (!config || !config.flags.activation_child_handoff_v1) return;
    var step5 = document.getElementById('step5');
    if (!step5 || step5.dataset.handoffEnhanced) return;
    step5.dataset.handoffEnhanced = '1';

    var actions = step5.querySelector('.flex.flex-wrap.gap-3.mt-4');
    if (actions) {
      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'px-4 py-2.5 bg-gold hover:bg-gold-dark text-white rounded-lg font-semibold text-sm transition-colors';
      openBtn.textContent = '👶 Öppna barninloggning';
      openBtn.addEventListener('click', function () {
        recordChildAccess('child_view').then(function () {
          trackEvent('child_view_opened', { child_id: childId, source: 'handoff' });
          if (window.DashboardChildHandoff && DashboardChildHandoff.startChildLogin) {
            DashboardChildHandoff.startChildLogin();
          } else {
            window.location.href = '/child-login';
          }
        });
      });
      actions.appendChild(openBtn);
    }

    var nav = step5.querySelector('.flex.gap-3:last-of-type');
    if (nav) {
      var skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'px-4 py-3 text-text-soft text-sm font-semibold hover:text-navy';
      skipBtn.textContent = 'Hoppa över barnkod';
      skipBtn.addEventListener('click', function () {
        trackEvent('child_handoff_skipped', { child_id: childId });
        window.goToStep(6);
      });
      nav.insertBefore(skipBtn, nav.firstChild);
    }

    var nextBtn = step5.querySelector('button[onclick="goToStep(6)"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        recordChildAccess('step5_continue');
      }, { capture: true });
    }
  }

  function showFirstStarGuide(onDone) {
    if (!config || !config.flags.activation_first_star_guide_v1) {
      onDone();
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'firstStarGuideOverlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4';
    overlay.innerHTML = [
      '<div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">',
      '  <div class="text-center mb-4"><div class="text-4xl mb-2">⭐</div>',
      '  <h2 class="text-xl font-heading font-bold text-navy mb-2">Ge första stjärnan</h2>',
      '  <p class="text-sm text-text-soft mb-4">Tre snabba steg — sedan är ni igång på riktigt.</p></div>',
      '  <ol class="text-sm text-navy space-y-2 mb-5 list-decimal list-inside">',
      '    <li>Låt barnet logga in med PIN-koden</li>',
      '    <li>Markera en aktivitet som klar i barnvyn</li>',
      '    <li>Fira stjärnan tillsammans!</li>',
      '  </ol>',
      '  <div class="flex flex-col gap-2">',
      '    <button type="button" id="fsgChildLogin" class="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 rounded-xl">👶 Öppna barninloggning</button>',
      '    <button type="button" id="fsgDashboard" class="w-full bg-lavender hover:bg-purple-200 text-navy font-semibold py-3 rounded-xl">Gå till översikten</button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('fsgChildLogin').addEventListener('click', function () {
      recordChildAccess('first_star_guide');
      trackEvent('child_view_opened', { child_id: childId, source: 'first_star_guide' });
      window.location.href = '/child-login';
    });
    document.getElementById('fsgDashboard').addEventListener('click', function () {
      overlay.remove();
      onDone();
    });
  }

  function patchSkipInvite() {
    if (!window.skipInvite || window.skipInvite.__activationPatched) return;
    var original = window.skipInvite;
    window.skipInvite = async function () {
      if (!config || !config.flags.activation_first_star_guide_v1) {
        return original.apply(this, arguments);
      }
      var errorEl = document.getElementById('step6Error');
      if (errorEl) errorEl.classList.add('hidden');
      showFirstStarGuide(function () {
        original.apply(window, arguments);
      });
    };
    window.skipInvite.__activationPatched = true;
  }

  function init() {
    if (typeof window.IS_ADD_CHILD !== 'undefined' && window.IS_ADD_CHILD) return;
    loadConfig().then(function () {
      patchSkipInvite();
      var obs = new MutationObserver(function () {
        if (document.getElementById('step5') && document.getElementById('step5').classList.contains('active')) {
          enhanceStep5();
        }
      });
      var root = document.getElementById('onboardingRoot') || document.body;
      obs.observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] });
      enhanceStep5();
    });

    document.addEventListener('DOMContentLoaded', function () {
      if (typeof childId !== 'undefined') return;
    });
  }

  window.OnboardingActivation = {
    init: init,
    setChildId: function (id) { childId = id; },
  };

  document.addEventListener('DOMContentLoaded', init);

  var origGoToStep = window.goToStep;
  if (typeof origGoToStep === 'function') {
    window.goToStep = function (n) {
      origGoToStep(n);
      if (n === 5) enhanceStep5();
    };
  }
})();
