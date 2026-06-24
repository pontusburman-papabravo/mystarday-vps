'use strict';

/**
 * Starter plan packages — maps onboarding answers to default_schedule.name.
 * No DB table in v1 (D6).
 */

/** @typedef {'morning'|'evening'|'after_school'|'homework'|'getting_ready'} RoutineType */

/**
 * @typedef {Object} StarterPlanPackage
 * @property {string} slug
 * @property {string} scheduleName
 * @property {RoutineType} routineType
 * @property {number} ageMin
 * @property {number} ageMax
 * @property {string[]} goalTags
 * @property {string[]} difficultyTags
 * @property {'low'|'medium'|'high'} supportLevel
 * @property {'short'|'normal'|'detailed'} defaultLength
 */

/** @type {StarterPlanPackage[]} */
const STARTER_PLAN_PACKAGES = [
  {
    slug: 'morning-short',
    scheduleName: 'Kort morgon',
    routineType: 'morning',
    ageMin: 3,
    ageMax: 12,
    goalTags: ['getting_ready', 'school_morning'],
    difficultyTags: ['getting_started', 'transitions'],
    supportLevel: 'medium',
    defaultLength: 'short',
  },
  {
    slug: 'evening-routine',
    scheduleName: 'Kvällsrutin',
    routineType: 'evening',
    ageMin: 3,
    ageMax: 12,
    goalTags: ['bedtime', 'wind_down'],
    difficultyTags: ['transitions', 'conflicts'],
    supportLevel: 'medium',
    defaultLength: 'normal',
  },
  {
    slug: 'preschool-day',
    scheduleName: 'Förskola vardag',
    routineType: 'after_school',
    ageMin: 3,
    ageMax: 6,
    goalTags: ['daycare', 'full_day'],
    difficultyTags: ['forgetting_steps'],
    supportLevel: 'low',
    defaultLength: 'normal',
  },
  {
    slug: 'school-day',
    scheduleName: 'Skola vardag',
    routineType: 'after_school',
    ageMin: 6,
    ageMax: 12,
    goalTags: ['school', 'homework'],
    difficultyTags: ['focus', 'homework'],
    supportLevel: 'medium',
    defaultLength: 'normal',
  },
  {
    slug: 'weekend',
    scheduleName: 'Helg',
    routineType: 'getting_ready',
    ageMin: 3,
    ageMax: 12,
    goalTags: ['weekend', 'flexible'],
    difficultyTags: ['transitions'],
    supportLevel: 'low',
    defaultLength: 'short',
  },
  {
    slug: 'getting-ready',
    scheduleName: 'Kort morgon',
    routineType: 'getting_ready',
    ageMin: 3,
    ageMax: 12,
    goalTags: ['getting_ready'],
    difficultyTags: ['getting_started'],
    supportLevel: 'high',
    defaultLength: 'detailed',
  },
];

const AGE_BAND_RANGES = {
  '3-5': [3, 5],
  '6-8': [6, 8],
  '9-12': [9, 12],
  '13+': [13, 18],
};

const ACTIVITY_LIMITS = {
  short: { default: 4, max: 5 },
  normal: { default: 5, max: 6 },
  detailed: { default: 6, max: 7 },
};

module.exports = {
  STARTER_PLAN_PACKAGES,
  AGE_BAND_RANGES,
  ACTIVITY_LIMITS,
};
