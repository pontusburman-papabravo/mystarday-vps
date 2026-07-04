'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

describe('child-world-hub', () => {
  it('renders three labeled choices', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-world-hub.js'), 'utf8');
    const dom = {
      getElementById: () => ({ innerHTML: '', style: { display: '' } }),
      body: { classList: { add: () => {}, remove: () => {} } },
    };
    const ctx = {
      document: dom,
      window: { me: { name: 'Anna' }, ChildWorldHub: null, document: dom },
    };
    vm.runInNewContext(src, ctx);
    const html = ctx.window.ChildWorldHub.renderHub({ gardenLocked: false });
    assert.match(html, /Trädgården/);
    assert.match(html, /Morgonhuset/);
    assert.match(html, /Skattkammaren/);
    assert.match(html, /data-cwh-go="garden"/);
  });

  it('loadRewards opens Morgonhus by default with hub fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/child-dashboard-rewards.js'), 'utf8');
    assert.match(src, /ChildMorgonhus\.tryMountWorld/);
    assert.match(src, /ChildWorldHub\.tryShow/);
    assert.match(src, /options\.showHub/);
  });

  it('hub CSS uses 72px minimum choice height', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public/css/child-world-hub.css'), 'utf8');
    assert.match(css, /min-height:\s*72px/);
  });
});
