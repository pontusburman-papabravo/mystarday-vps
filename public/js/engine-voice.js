/**
 * engine-voice.js — presentation mapping for Engine policy.name (no product logic).
 */
(function () {
  'use strict';

  var VOICE = {
    SHOW_CHILD: {
      headline: 'Visa barnet rutinen',
      body: 'Nästa steg är att barnet ser sin dag — det tar under en minut.',
      cta: 'Visa barnet',
      route: '/child-login',
      tone: 'coach',
    },
    ADD_EVENING: {
      headline: 'Lägg till kvällsrutinen',
      body: 'Gör läggningen lika tydlig som morgonen.',
      cta: 'Lägg till kväll',
      route: '/planning',
      tone: 'coach',
    },
    INVITE_CO_PARENT: {
      headline: 'Bjud in den andra föräldern',
      body: 'Dela rutinen så ni kan följa upp tillsammans.',
      cta: 'Bjud in',
      route: '/family',
      tone: 'calm',
    },
    SIMPLIFY_ROUTINE: {
      headline: 'Börja med ett litet steg',
      body: 'Er rutin finns kvar — ta en aktivitet i taget idag.',
      cta: 'Öppna schema',
      route: '/dashboard',
      tone: 'calm',
    },
    CUSTOMIZE_ROUTINE: {
      headline: 'Anpassa rutinen',
      body: 'Nu kan ni göra schemat till er eget.',
      cta: 'Anpassa',
      route: '/onboarding',
      tone: 'calm',
    },
    TRIGGER_CELEBRATION: {
      headline: 'Fira framsteget',
      body: 'Ni har tagit ett viktigt steg — ta en stund tillsammans.',
      cta: 'Visa barnet',
      route: '/child-login',
      tone: 'celebration',
    },
  };

  function get(policyName) {
    return VOICE[policyName] || VOICE.SHOW_CHILD;
  }

  window.EngineVoice = { get: get, VOICE: VOICE };
})();
