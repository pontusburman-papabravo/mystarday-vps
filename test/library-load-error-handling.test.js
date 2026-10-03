'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('library load error handling', () => {
  it('loadRewards shows error when API fails instead of staying on Laddar…', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/reward-editor.js'), 'utf8');
    assert.match(src, /showLoadError\(lpt\('library\.errors\.loadRewards'\)\)/);
    assert.match(src, /library\.errors\.loadRewards/);
  });

  it('loadActivities shows error when API fails', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /showLibraryLoadError\('activitiesContainer'/);
    assert.match(src, /library\.errors\.loadActivities/);
  });

  it('#treasury hash redirects to skattkammaren before magic hub init', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /initHash === 'treasury'/);
    assert.match(src, /window\.location\.href = '\/skattkammaren'/);
  });

  it('loads library data in parallel with magic hub init', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /const dataLoadPromise/);
    assert.match(src, /await dataLoadPromise/);
    assert.doesNotMatch(src, /await LibraryMagicHub\.init\(\)[\s\S]{0,120}await Promise\.all\(\[loadCategories/);
  });

  it('classic mode hash routing works when LibraryMagicHub is present', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /function routeLibraryHash/);
    assert.match(src, /LibraryMagicHub\.isMagic\(\)\) return/);
  });

  it('a name-only draft stays a create, not PUT /api/activities/undefined', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    const start = src.indexOf('async function openActivityModal');
    const end = src.indexOf('function closeActivityModal');
    const fn = src.slice(start, end);
    assert.match(fn, /const editing = !!\(act && act\.id\)/);
    assert.match(fn, /activityId'\)\.value = editing \? act\.id : ''/);
    assert.match(fn, /activityModalTitle'\)\.textContent = editing \?/);
    assert.match(fn, /selectStar\(act && act\.star_value \? act\.star_value : 1\)/);
    assert.doesNotMatch(fn, /activityId'\)\.value = act \? act\.id : ''/);
    assert.doesNotMatch(fn, /selectStar\(act \? act\.star_value : 1\)/);
  });

  it('switchTab retries activities load and sends rewards hash to /rewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /isContainerLoading\('activitiesContainer'\)/);
    assert.match(src, /redirectLegacyRewardsHash/);
    assert.match(src, /location\.replace\('\/rewards'/);
  });
});

describe('rewards hub treasury link', () => {
  it('embeds per-child star overview instead of skattkammaren CTA', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.doesNotMatch(src, /href="\/skattkammaren"/);
    assert.match(src, /proximityCopy/);
    assert.match(src, /dashboard-stats/);
  });
});
