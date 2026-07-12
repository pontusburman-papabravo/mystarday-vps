'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('child-legacy-chunk — barnets_samling skips load', () => {
  it('does not load scripts when data-barnets-samling=on', async () => {
    const appended = [];
    const doc = {
      documentElement: { getAttribute: (k) => (k === 'data-barnets-samling' ? 'on' : null) },
      scripts: [],
      addEventListener: () => {},
      body: {
        appendChild: (el) => { appended.push(el.src); },
      },
    };
    const win = {
      document: doc,
      console: { warn: () => {} },
    };
    win.window = win;
    vm.runInNewContext(read('public/js/child-legacy-chunk.js'), win, { filename: 'child-legacy-chunk.js' });
    await win.ChildLegacyChunk.maybeLoad();
    assert.equal(appended.length, 0);
    assert.equal(win.ChildLegacyChunk.isLoaded(), false);
  });

  it('exposes legacy script manifest with morgonhus and skatt-house', () => {
    const src = read('public/js/child-legacy-chunk.js');
    assert.match(src, /child-morgonhus\.js/);
    assert.match(src, /child-skatt-house\.js/);
    assert.match(src, /child-world\.js/);
  });
});
