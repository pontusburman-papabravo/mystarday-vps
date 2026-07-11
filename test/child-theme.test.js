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

function makeDocumentMock(overrides) {
  const base = {
    documentElement: {
      getAttribute: function () { return null; },
      setAttribute: function () {},
      removeAttribute: function () {},
    },
    body: {
      classList: {
        remove: function () {},
        add: function () {},
      },
    },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    dispatchEvent: function () {},
    addEventListener: function () {},
  };
  return Object.assign(base, overrides || {});
}

function loadChildTheme(opts) {
  const script = read('public/js/child-theme.js');
  const win = {};
  if (opts && opts.window) Object.assign(win, opts.window);
  const ctx = {
    window: win,
    document: (opts && opts.document) || makeDocumentMock(),
  };
  vm.runInNewContext(script, ctx, { filename: 'child-theme.js' });
  return win.ChildTheme;
}

describe('child-theme — Barnets samling theme shell (PR 1)', () => {
  it('defines ten canonical themes with adventure default', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(ChildTheme.DEFAULT_THEME, 'adventure');
    assert.equal(ChildTheme.THEME_IDS.length, 10);
    assert.ok(ChildTheme.THEME_IDS.includes('adventure'));
    assert.ok(ChildTheme.THEME_IDS.includes('vehicles'));
    assert.ok(ChildTheme.THEME_IDS.includes('arcade'));
    assert.ok(!ChildTheme.THEME_IDS.includes('fantasy'));
    assert.ok(!ChildTheme.THEME_IDS.includes('cars'));
    ChildTheme.THEME_IDS.forEach(function (id) {
      assert.ok(ChildTheme.CHILD_THEMES[id], 'missing theme config: ' + id);
      assert.ok(ChildTheme.CHILD_THEMES[id].className);
      assert.ok(ChildTheme.CHILD_THEMES[id].accents.primary);
    });
  });

  it('resolveTheme uses visual_theme then child_view_config.visual_theme then adventure', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(ChildTheme.resolveTheme(null), 'adventure');
    assert.equal(ChildTheme.resolveTheme({}), 'adventure');
    assert.equal(ChildTheme.resolveTheme({ visual_theme: 'space' }), 'space');
    assert.equal(
      ChildTheme.resolveTheme({ child_view_config: { visual_theme: 'animals' } }),
      'animals'
    );
    assert.equal(
      ChildTheme.resolveTheme({
        visual_theme: 'ocean',
        child_view_config: { visual_theme: 'animals' },
      }),
      'ocean'
    );
  });

  it('normalizeThemeId falls back to adventure for unknown legacy values', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(ChildTheme.normalizeThemeId('castle'), 'adventure');
    assert.equal(ChildTheme.normalizeThemeId('treehouse'), 'adventure');
    assert.equal(ChildTheme.normalizeThemeId(''), 'adventure');
    assert.equal(ChildTheme.normalizeThemeId(undefined), 'adventure');
    assert.equal(ChildTheme.normalizeThemeId('SPACE'), 'space');
  });

  it('normalizeThemeId resolves temporary aliases', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(ChildTheme.normalizeThemeId('fantasy'), 'adventure');
    assert.equal(ChildTheme.normalizeThemeId('cars'), 'vehicles');
    assert.equal(ChildTheme.normalizeThemeId('airplanes'), 'vehicles');
    assert.equal(ChildTheme.normalizeThemeId('dolls'), 'builders');
    assert.equal(ChildTheme.THEME_ALIASES.fantasy, 'adventure');
    assert.equal(ChildTheme.THEME_ALIASES.cars, 'vehicles');
    assert.equal(ChildTheme.THEME_ALIASES.airplanes, 'vehicles');
    assert.equal(ChildTheme.THEME_ALIASES.dolls, 'builders');
  });

  it('apply sets data-child-theme when barnets_samling gate is ON', () => {
    const classes = [];
    const attrs = {};
    const body = {
      classList: {
        remove: function () { /* noop */ },
        add: function (c) { classes.push(c); },
      },
    };
    const root = {
      setAttribute: function (k, v) { attrs[k] = v; },
      removeAttribute: function (k) { delete attrs[k]; },
      getAttribute: function (k) {
        if (k === 'data-barnets-samling') return 'on';
        return attrs[k] || null;
      },
    };
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: root,
        body: body,
      }),
    });
    const themeId = ChildTheme.apply({ visual_theme: 'space' }, { silent: true });
    assert.equal(themeId, 'space');
    assert.equal(attrs['data-child-theme'], 'space');
    assert.ok(classes.indexOf('theme-space') >= 0);
  });

  it('apply resolves alias cars to vehicles on DOM', () => {
    const classes = [];
    const attrs = {};
    const root = {
      setAttribute: function (k, v) { attrs[k] = v; },
      removeAttribute: function (k) { delete attrs[k]; },
      getAttribute: function (k) {
        if (k === 'data-barnets-samling') return 'on';
        return attrs[k] || null;
      },
    };
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: root,
        body: { classList: { remove: function () {}, add: function (c) { classes.push(c); } } },
      }),
    });
    const themeId = ChildTheme.apply({ visual_theme: 'cars' }, { silent: true });
    assert.equal(themeId, 'vehicles');
    assert.equal(attrs['data-child-theme'], 'vehicles');
    assert.ok(classes.indexOf('theme-vehicles') >= 0);
  });

  it('apply clears theme when barnets_samling gate is OFF', () => {
    const attrs = { 'data-child-theme': 'space' };
    const root = {
      setAttribute: function (k, v) { attrs[k] = v; },
      removeAttribute: function (k) { delete attrs[k]; },
      getAttribute: function (k) {
        if (k === 'data-barnets-samling') return 'off';
        return attrs[k] || null;
      },
    };
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: root,
        body: { classList: { remove: function () {}, add: function () {} } },
      }),
    });
    const themeId = ChildTheme.apply({ visual_theme: 'space' });
    assert.equal(themeId, 'adventure');
    assert.equal(attrs['data-child-theme'], undefined);
  });

  it('applyThemeDom uses theme.className from config (not child-theme- prefix)', () => {
    const src = read('public/js/child-theme.js');
    assert.match(src, /theme\.className/);
    assert.doesNotMatch(src, /child-theme-' \+ id/);
    assert.match(src, /className: 'theme-adventure'/);
  });

  it('does not use legacy Min värld house theme at runtime', () => {
    const src = read('public/js/child-theme.js');
    assert.doesNotMatch(src, /house_config/);
    assert.doesNotMatch(src, /unlocked_themes/);
    assert.doesNotMatch(src, /skatt-theme/);
  });

  it('child-dashboard.html loads child-theme.js and child-themes.css', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /child-theme\.js/);
    assert.match(html, /child-themes\.css/);
  });

  it('child-dashboard applies ChildTheme after view-config', () => {
    const src = read('public/js/child-dashboard.js');
    assert.match(src, /ChildTheme\.apply/);
    assert.match(src, /child_view_config/);
  });

  it('child-worlds-nav uses theme icons when gate ON', () => {
    const src = read('public/js/child-worlds-nav.js');
    assert.match(src, /ChildTheme\.iconHtmlForWorld/);
    assert.match(src, /isBarnetsSamlingEnabled/);
  });

  it('gate OFF legacy child-skatt-house themes unchanged', () => {
    const house = read('public/js/child-skatt-house.js');
    assert.match(house, /skatt-theme-/);
    assert.match(house, /house\.theme/);
    const worlds = read('public/js/child-worlds.js');
    assert.match(worlds, /LEGACY_WORLDS/);
    assert.match(worlds, /configureFromFeatures/);
  });

  it('child-themes.css scopes to data-barnets-samling gate and ten themes', () => {
    const css = read('public/css/child-themes.css');
    assert.match(css, /\[data-barnets-samling="on"\]/);
    assert.match(css, /data-child-theme="adventure"/);
    assert.match(css, /data-child-theme="space"/);
    assert.match(css, /data-child-theme="vehicles"/);
    assert.match(css, /data-child-theme="arcade"/);
    assert.doesNotMatch(css, /data-child-theme="fantasy"/);
    assert.doesNotMatch(css, /data-child-theme="cars"/);
    assert.match(css, /cwb-theme-scene/);
  });

  it('asset paths use english slugs under public/images/child/themes/', () => {
    const ChildTheme = loadChildTheme();
    ChildTheme.THEME_IDS.forEach(function (id) {
      const assets = ChildTheme.CHILD_THEMES[id].assets;
      assert.match(assets.background, new RegExp('/images/child/themes/' + id + '/'));
    });
  });
});
