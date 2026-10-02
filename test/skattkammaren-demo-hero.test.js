'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HUBS = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'public/css/parent-magic-common.css'), 'utf8');

function classList() {
  const classes = new Set();
  return {
    add(c) { classes.add(c); },
    remove(c) { classes.delete(c); },
    contains(c) { return classes.has(c); },
    toggle(c, on) {
      if (on === undefined) {
        if (classes.has(c)) classes.delete(c);
        else classes.add(c);
      } else if (on) classes.add(c);
      else classes.delete(c);
    },
  };
}

function renderHero(pt) {
  const mount = {
    id: 'parentMagicPageMount',
    classList: classList(),
    innerHTML: '',
    querySelector() { return null; },
  };
  const body = {
    classList: classList(),
    getAttribute(name) {
      return name === 'data-magic-page' ? 'skattkammaren' : null;
    },
  };
  const sandbox = {
    document: {
      body,
      getElementById(id) {
        return id === 'parentMagicPageMount' ? mount : null;
      },
      querySelectorAll() { return []; },
      addEventListener() {},
    },
    location: { pathname: '/skattkammaren', hash: '' },
    ParentMagicShell: { isMagic() { return true; } },
    pt,
    addEventListener() {},
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.runInNewContext(HUBS, sandbox, { filename: 'parent-magic-page-hubs.js' });
  sandbox.ParentMagicPageHub.refresh('skattkammaren', true);
  return mount.innerHTML;
}

describe('Skattkammaren public demo hero', () => {
  it('uses Swedish copy when i18n returns the raw key', () => {
    const html = renderHero((key) => key);
    assert.match(html, />Skattkammaren</);
    assert.match(html, />Belöningar och stjärnor</);
    assert.doesNotMatch(html, /settings\.heroes\.treasure/);
  });

  it('keeps a translated title when i18n has one', () => {
    const html = renderHero((key) => (key.endsWith('.title') ? 'Treasure Chest' : 'Rewards and stars'));
    assert.match(html, />Treasure Chest</);
    assert.match(html, />Rewards and stars</);
  });

  it('keeps demo card headings dark on the white SEO cards', () => {
    assert.match(CSS, /body\.parent-magic-view:not\(\.parent-theme-light\) \.seo-content h2 \{\s*color: #1c2340 !important;/);
    assert.match(CSS, /\.magic-page-hero h1 \{[^}]*color: #f4f4ff;/);
  });
});
