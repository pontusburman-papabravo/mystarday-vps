'use strict';

/**
 * ActivityVisual.pick priority: own image_url → pictogram → emoji.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadActivityVisual(sandbox) {
  const packsSrc = fs.readFileSync(path.join(ROOT, 'public/js/child-pictogram-packs.js'), 'utf8');
  const visualSrc = fs.readFileSync(path.join(ROOT, 'public/js/activity-visual.js'), 'utf8');
  vm.runInNewContext(packsSrc, sandbox, { context: sandbox });
  sandbox.ChildPictogramPacks = sandbox.window.ChildPictogramPacks;
  sandbox.PictogramRegistry = sandbox.window.PictogramRegistry;
  vm.runInNewContext(visualSrc, sandbox, { context: sandbox });
  return sandbox.window.ActivityVisual;
}

describe('ActivityVisual priority chain', () => {
  it('prefers custom image_url over pictogram and emoji', () => {
    const sandbox = {
      window: {
        escHtml: (s) => String(s),
        ChildPictogramPacks: {
          isEnabled: () => true,
          DEFAULT_PACK: 'default',
          getActivePackId: () => 'default',
          resolveActivityAsset: () => '/pack/tooth.webp',
          activityEmoji: () => '🪥',
        },
        PictogramRegistry: {
          getUrl: () => '/picto/brush.svg',
          getEmoji: () => '🪥',
        },
      },
    };
    sandbox.window = sandbox.window;
    const ActivityVisual = loadActivityVisual(sandbox);

    const custom = ActivityVisual.pick({
      image_url: 'https://example.test/uploads/custom.jpg',
      icon_key: 'brush_teeth',
      icon: '📌',
      pictogram_emoji: '🪥',
    });
    assert.equal(custom.url, 'https://example.test/uploads/custom.jpg');

    const pictogram = ActivityVisual.pick({
      icon_key: 'brush_teeth',
      icon: '📌',
      pictogram_emoji: '🪥',
    });
    assert.ok(pictogram.url);
    assert.match(pictogram.url, /pack|picto/);

    const emoji = ActivityVisual.pick({ icon: '🌟' });
    assert.equal(emoji.url, null);
    assert.equal(emoji.icon, '🌟');
  });

  it('inline renders img for custom url and emoji text otherwise', () => {
    const sandbox = {
      window: {
        escHtml: (s) => String(s || '').replace(/"/g, '&quot;'),
        ChildPictogramPacks: { isEnabled: () => false },
        PictogramRegistry: {},
      },
    };
    const ActivityVisual = loadActivityVisual(sandbox);
    const html = ActivityVisual.inline({ image_url: 'https://x.test/a.jpg', icon: '⭐' });
    assert.match(html, /<img/);
    assert.match(html, /a\.jpg/);
    assert.equal(ActivityVisual.inline({ icon: '🦄' }), '🦄');
  });
});

describe('daily log snapshot COALESCE contract', () => {
  it('generator SQL prefers dli.image_url over template', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/daily-log-generator.js'), 'utf8');
    assert.match(src, /COALESCE\(dli\.image_url, at\.image_url\)/);
  });
});

describe('library crop contract', () => {
  it('library-image-crop uses barnvy 12:5 aspect', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library-image-crop.js'), 'utf8');
    assert.match(src, /12 \/ 5/);
    assert.match(src, /exportFile|toBlob|canvas/i);
  });
});
