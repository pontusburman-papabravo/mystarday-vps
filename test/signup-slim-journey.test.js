'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  deriveSignupCalendarDay,
  pickSignupJourneyExperience,
  SIGNUP_JOURNEY_MAX_DAY,
} = require('../src/lib/journey/signup-journey');

const ROOT = path.join(__dirname, '..');

describe('signup-journey', () => {
  const signupAt = new Date('2026-07-01T10:00:00.000Z');

  it('deriveSignupCalendarDay: day 1 on signup day', () => {
    const day = deriveSignupCalendarDay(signupAt, new Date('2026-07-01T15:00:00.000Z'), 'Europe/Stockholm');
    assert.equal(day, 1);
  });

  it('deriveSignupCalendarDay: day 3 three calendar days later', () => {
    const day = deriveSignupCalendarDay(signupAt, new Date('2026-07-03T08:00:00.000Z'), 'Europe/Stockholm');
    assert.equal(day, 3);
  });

  it('pickSignupJourneyExperience: day 1 preview when routine ready', () => {
    const pick = pickSignupJourneyExperience({
      day: 1,
      milestones: { routine_ready: true },
      signals: { totalCompletions: 0 },
    });
    assert.equal(pick.experience, 'sj_day1_child_preview');
  });

  it('pickSignupJourneyExperience: silent days 4–6', () => {
    for (const day of [4, 5, 6]) {
      const pick = pickSignupJourneyExperience({
        day,
        milestones: { routine_ready: true },
        signals: {},
      });
      assert.equal(pick.silent, true, 'day ' + day);
      assert.equal(pick.experience, null);
    }
  });

  it('pickSignupJourneyExperience: day 3 child try when not logged in', () => {
    const pick = pickSignupJourneyExperience({
      day: 3,
      milestones: { routine_ready: true },
      signals: { childEverLoggedIn: false, totalCompletions: 0 },
    });
    assert.equal(pick.experience, 'sj_day3_child_try');
  });

  it('pickSignupJourneyExperience: never first-star copy when many completions', () => {
    const pick = pickSignupJourneyExperience({
      day: 3,
      milestones: { routine_ready: true },
      signals: { childEverLoggedIn: true, totalCompletions: 40 },
    });
    assert.notEqual(pick.experience, 'sj_celebrate_star');
    assert.notEqual(pick.experience, 'sj_introduce_stars');
  });

  it('pickSignupJourneyExperience: introduce stars only for early completions', () => {
    const pick = pickSignupJourneyExperience({
      day: 2,
      milestones: { routine_ready: true, parent_saw_completion: false },
      signals: { pendingParentAck: true, totalCompletions: 1 },
    });
    assert.equal(pick.experience, 'sj_introduce_stars');
  });

  it('pickSignupJourneyExperience: day 7 reflection', () => {
    const pick = pickSignupJourneyExperience({
      day: 7,
      milestones: { routine_ready: true },
      signals: {},
    });
    assert.equal(pick.experience, 'sj_day7_reflection');
  });

  it('pickSignupJourneyExperience: outside window after day 14', () => {
    const pick = pickSignupJourneyExperience({
      day: SIGNUP_JOURNEY_MAX_DAY + 1,
      milestones: { routine_ready: true },
      signals: {},
    });
    assert.equal(pick.experience, null);
  });
});

describe('signup-slim checkpoint', () => {
  it('onboarding-starter-plan supports slim mode', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/onboarding-starter-plan.js'), 'utf8');
    assert.match(src, /activation_signup_slim_v1/);
    assert.match(src, /SLIM_QUESTION_IDS/);
    assert.match(src, /autoSaveSlimAndFinish/);
    assert.match(src, /Er rutin är redo/);
    assert.match(src, /\/dashboard/);
  });

  it('onboarding-activation disables handoff when slim', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/onboarding-activation.js'), 'utf8');
    assert.match(src, /isSlimSignup/);
    assert.match(src, /activation_signup_slim_v1/);
  });

  it('migration seeds activation_signup_slim_v1', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1809230000000_activation_signup_slim_flag.js'),
      'utf8'
    );
    assert.match(src, /activation_signup_slim_v1/);
  });

  it('journey registry has sj_* experiences', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/journey-experience-registry.json'), 'utf8'));
    assert.ok(reg.phases.BUILDING_ROUTINE.sj_day1_child_preview);
    assert.ok(reg.phases.BUILDING_ROUTINE.sj_day7_reflection);
  });
});
