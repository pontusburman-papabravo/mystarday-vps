const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('F3 child-dashboard-celebrations.js', () => {
  it('celebration logic lives in its own file as an IIFE', () => {
    const src = read('public/js/child-dashboard-celebrations.js');
    assert.match(src, /^\(function \(\) \{/m);
    assert.match(src, /function checkMilestones\(/);
    assert.match(src, /function launchMilestoneConfetti\(/);
    assert.match(src, /function launchDopaminBurst\(/);
    assert.match(src, /function showMilestoneCelebration\(/);
  });

  it('exposes the cross-file entry points on window', () => {
    const src = read('public/js/child-dashboard-celebrations.js');
    for (const fn of ['checkMilestones', 'launchMilestoneConfetti', 'launchDopaminBurst']) {
      assert.match(src, new RegExp(`window\\.${fn}\\s*=\\s*${fn};`), `window.${fn} not exposed`);
    }
  });

  it('child-dashboard.js no longer defines the celebration functions', () => {
    const src = read('public/js/child-dashboard.js');
    assert.doesNotMatch(src, /function checkMilestones\(/);
    assert.doesNotMatch(src, /function launchMilestoneConfetti\(/);
    assert.doesNotMatch(src, /function launchDopaminBurst\(/);
    assert.doesNotMatch(src, /function getMilestoneStorageKey\(/);
  });

  it('child-dashboard.js still calls the extracted functions', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /checkMilestones\(total, completed\)/);
    assert.match(src, /launchDopaminBurst\(checkEl\)/);
    // launchMilestoneConfetti() anropas ur rewards-modulen efter F-split
    const rewards = read('public/js/child-dashboard-rewards.js');
    assert.match(rewards, /launchMilestoneConfetti\(\)/);
  });

  it('child-dashboard.html loads celebrations after child-dashboard.js', () => {
    const html = read('public/child-dashboard.html');
    const mainIdx = html.indexOf('/js/child-dashboard.js');
    const celIdx = html.indexOf('/js/child-dashboard-celebrations.js');
    assert.ok(celIdx !== -1, 'celebrations script tag missing');
    assert.ok(mainIdx < celIdx, 'celebrations must load after child-dashboard.js');
  });

  it('celebrations file is precached for offline child view', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /'\/js\/child-dashboard-celebrations\.js'/);
  });
});
