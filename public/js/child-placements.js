/**
 * child-placements.js — Placement register for barnmeny v2 (Sprint 0).
 */
(function () {
  'use strict';

  const CHILD_PLACEMENTS = {
    today_overlay: { domain: 'today', description: 'TEACCH NU-kort, fullskärmsstöd' },
    today_coach_post_activity: { domain: 'today', description: 'Coach efter aktivitet' },
    today_coach_post_section: { domain: 'today', description: 'Coach efter FM/EM/kväll' },
    today_coach_day_done: { domain: 'today', description: 'Coach när dagen är klar' },
    activity_support: { domain: 'today', description: 'Adaptiv delsteg-rendering' },
    world_history: { domain: 'world', description: 'Min historia / reporting' },
    world_tools: { domain: 'world', description: 'TEACCH-verktyg i världen' },
    family_hall: { domain: 'family', description: 'Familjehallen' },
    family_persons: { domain: 'family', description: 'Personkort med relationstext' },
  };

  function placementDomain(placementId) {
    const p = CHILD_PLACEMENTS[placementId];
    return p ? p.domain : null;
  }

  window.ChildPlacements = {
    CHILD_PLACEMENTS: CHILD_PLACEMENTS,
    placementDomain: placementDomain,
  };
})();
