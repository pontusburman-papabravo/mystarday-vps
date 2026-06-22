/**
 * child-capabilities.js — Feature-gated child capabilities (barnmeny v2 Sprint 0).
 */
(function () {
  'use strict';

  var CHILD_CAPABILITIES = [
    {
      id: 'today_coach',
      feature: null,
      domain: 'today',
      primaryPlacement: 'today_coach_post_activity',
      secondaryPlacements: ['today_coach_post_section', 'today_coach_day_done'],
      label: 'Coach',
    },
    {
      id: 'teacch_now',
      feature: 'teacch',
      domain: 'today',
      primaryPlacement: 'today_overlay',
      secondaryPlacements: ['activity_support'],
      label: 'NU-kort',
    },
    {
      id: 'adaptive_substeps',
      feature: null,
      domain: 'today',
      primaryPlacement: 'activity_support',
      secondaryPlacements: [],
      label: 'Adaptivt stöd',
    },
    {
      id: 'reporting',
      feature: 'reporting',
      domain: 'world',
      primaryPlacement: 'world_history',
      secondaryPlacements: [],
      label: 'Min historia',
    },
    {
      id: 'pedagog_family',
      feature: 'pedagog',
      domain: 'family',
      primaryPlacement: 'family_hall',
      secondaryPlacements: ['family_persons'],
      label: 'Pedagoginnehåll',
    },
  ];

  var CHILD_SYSTEM_ACTIONS = [
    { id: 'switch_child', label: 'Byt barn', action: 'switchChild', requiresParentalGate: true },
    { id: 'dark_mode', label: 'Mörkt läge', action: 'toggleDark', requiresParentalGate: true },
    { id: 'logout', label: 'Logga ut', action: 'logout', requiresParentalGate: true },
  ];

  function hasFeatureAccess(access, featureSlug) {
    if (!featureSlug) return true;
    if (!access || !access.features) return false;
    return access.features[featureSlug] === true;
  }

  function visibleCapability(cap, access, visibility) {
    if (!hasFeatureAccess(access, cap.feature)) return false;
    if (visibility && visibility[cap.id] === false) return false;
    return true;
  }

  function capabilitiesForDomain(access, visibility, domain) {
    return CHILD_CAPABILITIES.filter(function (c) {
      return c.domain === domain && visibleCapability(c, access, visibility);
    });
  }

  function capabilitiesForPlacement(access, visibility, placement) {
    return CHILD_CAPABILITIES.filter(function (c) {
      if (c.primaryPlacement === placement) return visibleCapability(c, access, visibility);
      if (c.secondaryPlacements && c.secondaryPlacements.indexOf(placement) >= 0) {
        return visibleCapability(c, access, visibility);
      }
      return false;
    });
  }

  window.ChildCapabilities = {
    CHILD_CAPABILITIES: CHILD_CAPABILITIES,
    CHILD_SYSTEM_ACTIONS: CHILD_SYSTEM_ACTIONS,
    hasFeatureAccess: hasFeatureAccess,
    capabilitiesForDomain: capabilitiesForDomain,
    capabilitiesForPlacement: capabilitiesForPlacement,
  };
})();
