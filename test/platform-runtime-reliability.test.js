'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Platform Runtime — stale-read race fix', () => {
  it('child-self awaits platform-runtime handleActivityComplete before res.json', () => {
    const src = read('src/routes/daily-logs/child-self.js');
    const block = src.slice(src.indexOf("'/daily-log-items/:itemId/complete'"));
    const runtimeIdx = block.indexOf("require('../../lib/platform-runtime').handleActivityComplete");
    const resIdx = block.indexOf('res.json(result.rows[0])');
    assert.ok(runtimeIdx > 0, 'platform-runtime handleActivityComplete missing from complete route');
    assert.ok(resIdx > runtimeIdx, 'runtime must finish before HTTP response');
  });

  it('child-dashboard emits ActivityCompleted only after successful API', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /apiSucceeded/);
    assert.match(src, /await apiPromise[\s\S]*apiSucceeded && !isCurrentlyDone[\s\S]*emitActivityCompleted/);
    assert.doesNotMatch(
      src,
      /await _refreshLoadDay\(\);[\s\S]{0,300}emitActivityCompleted[\s\S]{0,300}await apiPromise/
    );
  });

  it('offline queue replay emits ActivityCompleted after COMPLETE_ACTIVITY sync', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /offlineQueue:synced[\s\S]*COMPLETE_ACTIVITY[\s\S]*emitActivityCompleted/);
  });

  it('orchestrator isolates world-runtime failures from markEventProcessed', () => {
    const src = read('src/lib/platform-runtime/orchestrator.js');
    assert.match(src, /world error \(progression kept\)/);
    assert.match(src, /markEventProcessed/);
    const worldTry = src.indexOf('try {');
    const markIdx = src.indexOf('markEventProcessed');
    const worldCatch = src.indexOf('world error');
    assert.ok(worldTry > 0 && worldCatch > worldTry && markIdx > worldCatch);
  });
});
