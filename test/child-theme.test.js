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
  if (opts && opts.window && opts.window.Image) {
    ctx.Image = opts.window.Image;
  }
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
      assert.equal(
        assets.background,
        '/images/child/themes/' + id + '/background@2x.webp'
      );
    });
  });

  it('all ten canonical background assets exist on disk', () => {
    const ChildTheme = loadChildTheme();
    ChildTheme.THEME_IDS.forEach(function (id) {
      const rel = 'public/images/child/themes/' + id + '/background@2x.webp';
      assert.ok(fs.existsSync(path.join(ROOT, rel)), 'missing asset: ' + rel);
      const buf = fs.readFileSync(path.join(ROOT, rel));
      assert.equal(buf.slice(0, 4).toString(), 'RIFF');
      assert.equal(buf.slice(8, 12).toString(), 'WEBP');
    });
  });

  it('alias themes resolve to canonical background asset paths', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(
      ChildTheme.getTheme('fantasy').assets.background,
      '/images/child/themes/adventure/background@2x.webp'
    );
    assert.equal(
      ChildTheme.getTheme('cars').assets.background,
      '/images/child/themes/vehicles/background@2x.webp'
    );
    assert.equal(
      ChildTheme.getTheme('airplanes').assets.background,
      '/images/child/themes/vehicles/background@2x.webp'
    );
    assert.equal(
      ChildTheme.getTheme('dolls').assets.background,
      '/images/child/themes/builders/background@2x.webp'
    );
    assert.equal(
      ChildTheme.getTheme('castle').assets.background,
      '/images/child/themes/adventure/background@2x.webp'
    );
  });

  it('gate ON sets --ct-background-image on theme scene', () => {
    const styleProps = {};
    const scene = {
      classList: { remove: function () {}, add: function () {} },
      style: {
        setProperty: function (k, v) { styleProps[k] = v; },
      },
      setAttribute: function () {},
    };
    const host = {
      querySelector: function (sel) {
        return sel === '.cwb-theme-scene' ? scene : null;
      },
      appendChild: function () {},
    };
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
        body: { classList: { remove: function () {}, add: function () {} } },
        getElementById: function (id) { return id === 'childWorldBg' ? host : null; },
      }),
    });
    ChildTheme.apply({ visual_theme: 'animals' }, { silent: true });
    assert.equal(
      styleProps['--ct-background-image'],
      'url("/images/child/themes/animals/background@2x.webp")'
    );
    assert.equal(attrs['data-child-theme'], 'animals');
  });

  it('gate OFF does not set theme background variable', () => {
    const styleProps = {};
    const scene = {
      classList: { remove: function () {}, add: function () {} },
      style: {
        setProperty: function (k, v) { styleProps[k] = v; },
      },
      setAttribute: function () {},
      parentNode: { removeChild: function () {} },
    };
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
        querySelector: function () { return scene; },
      }),
    });
    ChildTheme.apply({ visual_theme: 'space' });
    assert.equal(styleProps['--ct-background-image'], undefined);
    assert.equal(attrs['data-child-theme'], undefined);
  });

  it('failed background load keeps gradient without ct-bg-loaded', () => {
    const classes = [];
    const scene = {
      classList: {
        remove: function (c) {
          const i = classes.indexOf(c);
          if (i >= 0) classes.splice(i, 1);
        },
        add: function (c) { classes.push(c); },
      },
      style: { setProperty: function () {} },
      setAttribute: function () {},
    };
    const host = {
      querySelector: function (sel) {
        return sel === '.cwb-theme-scene' ? scene : null;
      },
      appendChild: function () {},
    };
    function MockImage() {
      this._onerror = null;
      const self = this;
      Object.defineProperty(this, 'onerror', {
        get: function () { return self._onerror; },
        set: function (fn) {
          self._onerror = fn;
          if (fn) fn();
        },
      });
      this.onload = null;
    }
    const ChildTheme = loadChildTheme({
      window: { Image: MockImage },
      document: makeDocumentMock({
        documentElement: {
          setAttribute: function () {},
          removeAttribute: function () {},
          getAttribute: function (k) {
            return k === 'data-barnets-samling' ? 'on' : null;
          },
        },
        body: { classList: { remove: function () {}, add: function () {} } },
        getElementById: function (id) { return id === 'childWorldBg' ? host : null; },
      }),
    });
    ChildTheme.apply({ visual_theme: 'space' }, { silent: true });
    assert.ok(classes.indexOf('ct-bg-loaded') < 0);
  });

  it('successful background load adds ct-bg-loaded class', () => {
    const classes = [];
    const scene = {
      classList: {
        remove: function (c) {
          const i = classes.indexOf(c);
          if (i >= 0) classes.splice(i, 1);
        },
        add: function (c) { classes.push(c); },
      },
      style: { setProperty: function () {} },
      setAttribute: function () {},
    };
    const host = {
      querySelector: function (sel) {
        return sel === '.cwb-theme-scene' ? scene : null;
      },
      appendChild: function () {},
    };
    function MockImage() {
      this._onload = null;
      const self = this;
      Object.defineProperty(this, 'onload', {
        get: function () { return self._onload; },
        set: function (fn) {
          self._onload = fn;
          if (fn) fn();
        },
      });
      this.onerror = null;
    }
    const ChildTheme = loadChildTheme({
      window: { Image: MockImage },
      document: makeDocumentMock({
        documentElement: {
          setAttribute: function () {},
          removeAttribute: function () {},
          getAttribute: function (k) {
            return k === 'data-barnets-samling' ? 'on' : null;
          },
        },
        body: { classList: { remove: function () {}, add: function () {} } },
        getElementById: function (id) { return id === 'childWorldBg' ? host : null; },
      }),
    });
    ChildTheme.apply({ visual_theme: 'ocean' }, { silent: true });
    assert.ok(classes.indexOf('ct-bg-loaded') >= 0);
  });

  it('theme scene is shared across all four worlds (single apply path)', () => {
    const src = read('public/js/child-theme.js');
    assert.match(src, /ensureThemeSceneLayer/);
    assert.match(src, /childWorldBg/);
    assert.doesNotMatch(src, /data-child-layer/);
    const css = read('public/css/child-themes.css');
    assert.match(css, /cwb-theme-scene/);
    assert.match(css, /data-child-layer='collection'/);
    assert.match(css, /data-child-layer='treasure'/);
  });

  it('child-themes.css uses --ct-background-image for loaded backgrounds', () => {
    const css = read('public/css/child-themes.css');
    assert.match(css, /--ct-background-image/);
    assert.doesNotMatch(css, /--ct-bg-image/);
  });

  it('sw.js does not precache theme background webps', () => {
    const sw = read('public/sw.js');
    assert.doesNotMatch(sw, /\/images\/child\/themes\/adventure\/background@2x\.webp/);
    assert.match(sw, /stjarndag-v583/);
  });

  const ICON_KEYS = ['today', 'collection', 'treasure', 'family'];

  it('all ten canonical themes have four icon asset paths', () => {
    const ChildTheme = loadChildTheme();
    ChildTheme.THEME_IDS.forEach(function (id) {
      const icons = ChildTheme.CHILD_THEMES[id].assets.icons;
      ICON_KEYS.forEach(function (key) {
        assert.equal(
          icons[key],
          '/images/child/themes/' + id + '/icon-' + key + '@2x.webp'
        );
      });
    });
  });

  it('all forty icon assets exist on disk', () => {
    const ChildTheme = loadChildTheme();
    let count = 0;
    ChildTheme.THEME_IDS.forEach(function (id) {
      ICON_KEYS.forEach(function (key) {
        const rel = 'public/images/child/themes/' + id + '/icon-' + key + '@2x.webp';
        assert.ok(fs.existsSync(path.join(ROOT, rel)), 'missing icon: ' + rel);
        const buf = fs.readFileSync(path.join(ROOT, rel));
        assert.equal(buf.slice(0, 4).toString(), 'RIFF');
        assert.equal(buf.slice(8, 12).toString(), 'WEBP');
        count += 1;
      });
    });
    assert.equal(count, 40);
  });

  it('alias themes resolve to canonical icon asset paths', () => {
    const ChildTheme = loadChildTheme();
    assert.equal(
      ChildTheme.iconAssetForWorld('today', 'cars'),
      '/images/child/themes/vehicles/icon-today@2x.webp'
    );
    assert.equal(
      ChildTheme.iconAssetForWorld('family', 'fantasy'),
      '/images/child/themes/adventure/icon-family@2x.webp'
    );
    assert.equal(
      ChildTheme.iconAssetForWorld('treasure', 'dolls'),
      '/images/child/themes/builders/icon-treasure@2x.webp'
    );
  });

  it('gate ON iconHtmlForWorld renders WebP img with emoji fallback', () => {
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: {
          getAttribute: function (k) {
            return k === 'data-barnets-samling' ? 'on' : null;
          },
        },
      }),
    });
    const html = ChildTheme.iconHtmlForWorld('today', 'space');
    assert.match(html, /child-nav-icon/);
    assert.match(html, /child-nav-icon-img/);
    assert.match(html, /src="\/images\/child\/themes\/space\/icon-today@2x\.webp"/);
    assert.match(html, /alt=""/);
    assert.match(html, /child-nav-icon-fallback/);
    assert.match(html, /aria-hidden="true"/);
  });

  it('gate OFF iconHtmlForWorld renders emoji only', () => {
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: {
          getAttribute: function (k) {
            return k === 'data-barnets-samling' ? 'off' : null;
          },
        },
      }),
    });
    const html = ChildTheme.iconHtmlForWorld('today', 'space');
    assert.match(html, /child-theme-nav-emoji/);
    assert.doesNotMatch(html, /<img/);
  });

  it('missing icon asset falls back to emoji markup', () => {
    const ChildTheme = loadChildTheme({
      document: makeDocumentMock({
        documentElement: {
          getAttribute: function (k) {
            return k === 'data-barnets-samling' ? 'on' : null;
          },
        },
      }),
    });
    const broken = ChildTheme.getTheme('adventure');
    const saved = broken.assets.icons.today;
    broken.assets.icons.today = '';
    const html = ChildTheme.iconHtmlForWorld('today', 'adventure');
    broken.assets.icons.today = saved;
    assert.match(html, /child-theme-nav-emoji/);
    assert.doesNotMatch(html, /<img/);
  });

  it('child-worlds-nav wires image error fallback for theme icons', () => {
    const src = read('public/js/child-worlds-nav.js');
    assert.match(src, /child-nav-icon-img/);
    assert.match(src, /is-broken/);
    assert.match(src, /ChildTheme\.iconHtmlForWorld/);
  });

  it('sw.js does not precache theme icon webps', () => {
    const sw = read('public/sw.js');
    assert.doesNotMatch(sw, /\/images\/child\/themes\/adventure\/icon-today@2x\.webp/);
  });

  it('listThemes returns ten canonical themes with assets', () => {
    const ChildTheme = loadChildTheme();
    const list = ChildTheme.listThemes();
    assert.equal(list.length, 10);
    list.forEach(function (theme) {
      assert.ok(ChildTheme.THEME_IDS.includes(theme.id));
      assert.ok(theme.label);
      assert.match(theme.assets.background, /background@2x\.webp/);
      assert.ok(theme.assets.icons);
    });
  });

  it('childPayloadWithTheme writes visual_theme into child_view_config', () => {
    const ChildTheme = loadChildTheme();
    const payload = ChildTheme.childPayloadWithTheme({ id: 'c1', name: 'A' }, 'ocean');
    assert.equal(payload.child_view_config.visual_theme, 'ocean');
  });
});
