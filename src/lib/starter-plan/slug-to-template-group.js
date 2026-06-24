'use strict';

/** Maps starter-plan package slug → onboarding template_group key. */
const SLUG_TO_TEMPLATE_GROUP = {
  'morning-short': 'morgon',
  'evening-routine': 'kvall',
  'preschool-day': 'forskola',
  'school-day': 'skola',
  weekend: 'helg',
  'getting-ready': 'morgon',
};

const ROUTINE_TYPE_FROM_UI = {
  morgon: 'morning',
  kvall: 'evening',
  'efter-skola': 'after_school',
  laxor: 'homework',
  'gora-sig-klar': 'getting_ready',
};

const SUPPORT_FROM_UI = {
  ja: 'high',
  lite: 'medium',
  nej: 'low',
};

const LENGTH_FROM_UI = {
  kort: 'short',
  normal: 'normal',
  detaljerad: 'detailed',
};

function slugToTemplateGroup(slug) {
  return SLUG_TO_TEMPLATE_GROUP[slug] || 'forskola';
}

function parseStarterPlanAnswers(body) {
  const routineType = ROUTINE_TYPE_FROM_UI[body.routine_type_ui] || body.routineType || 'morning';
  const supportLevel = SUPPORT_FROM_UI[body.support_ui] || body.supportLevel || 'medium';
  const desiredLength = LENGTH_FROM_UI[body.length_ui] || body.desiredLength || 'normal';
  return {
    ageBand: body.age_band || body.ageBand || '6-8',
    routineType,
    supportLevel,
    desiredLength,
    mainChallenges: Array.isArray(body.main_challenges) ? body.main_challenges : [],
    freeText: typeof body.free_text === 'string' ? body.free_text.slice(0, 200) : undefined,
  };
}

module.exports = {
  SLUG_TO_TEMPLATE_GROUP,
  slugToTemplateGroup,
  parseStarterPlanAnswers,
  ROUTINE_TYPE_FROM_UI,
  SUPPORT_FROM_UI,
  LENGTH_FROM_UI,
};
