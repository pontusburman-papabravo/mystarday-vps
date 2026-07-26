/**
 * engine-voice.js — presentation mapping for Engine policy.name (no product logic).
 */
(function () {
  'use strict';

  var ROUTES = {
    SHOW_CHILD: '/child-login',
    ADD_EVENING: '/planning',
    INVITE_CO_PARENT: '/family',
    SIMPLIFY_ROUTINE: '/schedule',
    CUSTOMIZE_ROUTINE: '/onboarding',
    TRIGGER_CELEBRATION: '/child-login',
  };

  var TONES = {
    SHOW_CHILD: 'coach',
    ADD_EVENING: 'coach',
    INVITE_CO_PARENT: 'calm',
    SIMPLIFY_ROUTINE: 'calm',
    CUSTOMIZE_ROUTINE: 'calm',
    TRIGGER_CELEBRATION: 'celebration',
  };

  function pt(key, params) {
    return window.pt ? window.pt(key, params) : key;
  }

  function get(policyName) {
    var name = ROUTES[policyName] ? policyName : 'SHOW_CHILD';
    var base = 'journey.engineVoice.' + name;
    return {
      headline: pt(base + '.headline'),
      body: pt(base + '.body'),
      cta: pt(base + '.cta'),
      route: ROUTES[name],
      tone: TONES[name],
    };
  }

  window.EngineVoice = { get: get };
})();
