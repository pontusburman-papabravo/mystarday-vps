'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('library load error handling', () => {
  it('loadRewards shows error when API fails instead of staying on Laddar…', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /showLibraryLoadError\('rewardsContainer'/);
    assert.match(src, /Kunde inte ladda belöningar/);
  });

  it('loadActivities shows error when API fails', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /showLibraryLoadError\('activitiesContainer'/);
    assert.match(src, /Kunde inte ladda aktiviteter/);
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

  it('switchTab retries rewards/activities load if still on Laddar', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /isContainerLoading\('rewardsContainer'\)/);
    assert.match(src, /isContainerLoading\('activitiesContainer'\)/);
  });
});

describe('rewards hub treasury link', () => {
  it('Stjärnor & kista links to /skattkammaren not library#treasury', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.match(src, /href="\/skattkammaren"/);
    assert.doesNotMatch(src, /library#treasury/);
  });
});
