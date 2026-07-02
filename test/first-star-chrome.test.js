'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('First Star chrome (PR 2)', () => {
  it('child-first-star-mode.js exposes copy and API-driven applyFromDailyLog', () => {
    const src = read('public/js/child-first-star-mode.js');
    assert.match(src, /Ditt första uppdrag/);
    assert.match(src, /Tryck i ringen när du är klar!/);
    assert.match(src, /applyFromDailyLog/);
    assert.match(src, /first_star_mode === true/);
    assert.match(src, /first-star-mode/);
  });

  it('child-first-star-mode.css hides distractors when first-star-mode is active', () => {
    const css = read('public/css/child-first-star-mode.css');
    assert.match(css, /\.first-star-mode #goalTeaserBtn/);
    assert.match(css, /\.first-star-mode #childBottomNav/);
    assert.match(css, /\.first-star-mode #todayFocusMount/);
    assert.match(css, /\.first-star-mode \[data-child-world="world"\]/);
    assert.match(css, /\.first-star-mode \[data-child-world="family"\]/);
    assert.match(css, /\.first-star-mode #appViewToggleMount/);
  });

  it('child-dashboard wires first star mode from daily-log and blocks tab escape', () => {
    const dash = read('public/js/child-dashboard.js');
    const activities = read('public/js/child-dashboard-activities.js');
    assert.match(activities, /ChildFirstStarMode\.applyFromDailyLog\(data\)/);
    assert.match(dash, /ChildFirstStarMode\.isActive\(\) && tab !== 'schedule'/);
    assert.match(activities, /first-star-mission-wrap/);
    assert.match(activities, /renderNowCard\(item, isToday\)/);
  });

  it('child-dashboard.js skips goal bar and rewards mount while first star active', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /ChildFirstStarMode && ChildFirstStarMode\.isActive\(\)\) return/);
    assert.match(src, /ChildFirstStarMode\.isActive\(\)\)\) \{\s*\n\s*ChildRewardsEngine\.setGoalData/);
  });

  it('child-dashboard.html loads first star assets after today-focus', () => {
    const html = read('public/child-dashboard.html');
    const focusIdx = html.indexOf('child-today-focus.js');
    const firstStarIdx = html.indexOf('child-first-star-mode.js');
    const cssIdx = html.indexOf('child-first-star-mode.css');
    assert.ok(focusIdx > -1 && firstStarIdx > -1 && cssIdx > -1);
    assert.ok(focusIdx < firstStarIdx, 'first-star script after today-focus');
  });

  it('service worker precaches first star assets', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /\/js\/child-first-star-mode\.js/);
    assert.match(sw, /\/css\/child-first-star-mode\.css/);
  });

  it('child-first-star-mode.css beats legacy top-nav !important rule', () => {
    const css = read('public/css/child-first-star-mode.css');
    assert.match(css, /body\.first-star-mode #childLayerNav/);
    assert.match(css, /body\.first-star-mode \.child-bottom-nav/);
  });

  it('child-worlds-nav.js hides bottom nav when First Star Mode is active', () => {
    const nav = read('public/js/child-worlds-nav.js');
    assert.match(nav, /isFirstStarModeActive/);
    assert.match(nav, /ChildFirstStarMode\.isActive\(\)/);
    assert.match(nav, /hideBottomNavForFirstStar/);
    assert.match(nav, /childLayerNav/);
    assert.match(nav, /setProperty\('display', 'none', 'important'\)/);
    assert.match(nav, /if \(isFirstStarModeActive\(\)\) \{\s*\n\s*hideBottomNavForFirstStar\(\)/);
    assert.match(nav, /syncFirstStarHide/);
    assert.match(nav, /if \(isFirstStarModeActive\(\)\) return/);
  });

  it('child-today-tasks.js suppresses Skattkammaren CTA during First Star Mode', () => {
    const src = read('public/js/child-today-tasks.js');
    assert.match(src, /isFirstStarMode/);
    assert.match(src, /ChildFirstStarMode\.isActive\(\)/);
    assert.match(src, /hideSkattCta/);
    assert.match(src, /if \(isFirstStarMode\(\)\)/);
  });

  it('child-first-star-mode.js re-syncs nav hide after enter()', () => {
    const mode = read('public/js/child-first-star-mode.js');
    assert.match(mode, /ChildWorldsNav\.syncFirstStarHide/);
    assert.match(mode, /ChildTodayTasks\.hideSkattCta/);
  });

  it('flag OFF path leaves first_star_mode field absent (PR 1 contract)', () => {
    const src = read('src/routes/daily-logs/child-self.js');
    assert.match(src, /if \(firstStarModeFlagOn\)/);
    assert.match(src, /responsePayload\.first_star_mode = firstStarMode/);
  });
});

describe('First Star chrome — exit after completion (integration contract)', () => {
  it('completion reload uses daily-log first_star_mode to exit chrome', () => {
    const activities = read('public/js/child-dashboard-activities.js');
    const mode = read('public/js/child-first-star-mode.js');
    assert.match(activities, /ChildFirstStarMode\.applyFromDailyLog\(data\)/);
    assert.match(mode, /function exit\(\)/);
    assert.match(mode, /first_star_mode === true[\s\S]*enter\(\)/);
    assert.match(mode, /else[\s\S]*exit\(\)/);
  });

  it('celebration remains unchanged — still calls checkMilestones in first star path', () => {
    const src = read('public/js/child-dashboard-activities.js');
    assert.match(src, /ChildFirstStarMode\.isActive\(\)[\s\S]*checkMilestones\(total, completed\)/);
    const cel = read('public/js/child-dashboard-celebrations.js');
    assert.match(cel, /function checkMilestones/);
    assert.doesNotMatch(cel, /first_star_mode/);
  });
});
