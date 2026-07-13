import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapCaption } from '../lib/caption-layout.mjs';
import {
  ManifestSchema,
  loadManifest,
  computeAppScreenRatio,
  sceneCaptionText,
  planGeneration,
} from '../lib/manifest.mjs';
import { TRANSITIONS } from '../lib/config.mjs';
import { computeTimelineDuration } from '../lib/ffmpeg.mjs';

const FILM_IDS = ['a-morning-without-nagging', 'tomorrow-starts-here', 'real-families'];

test('wrapCaption respects manual line breaks', () => {
  const result = wrapCaption('Lugnare morgnar\nbörjar kvällen innan.', 24);
  assert.match(result, /^Lugnare morgnar\n/);
});

test('all films follow love-chaos-hope-solution arc', () => {
  for (const id of FILM_IDS) {
    const { manifest } = loadManifest(id);
    assert.ok(manifest.creativeBrief?.length > 20, `${id} missing creativeBrief`);

    assert.equal(manifest.scenes[0].role, 'recognition');
    assert.equal(sceneCaptionText(manifest.scenes[0]), '');

    assert.equal(manifest.scenes[1].role, 'chaos');
    assert.equal(sceneCaptionText(manifest.scenes[1]), '');

    const hope = manifest.scenes.find((s) => s.role === 'hope');
    assert.ok(hope, `${id} missing hope beat`);
    assert.equal(hope.skipPika, true);

    const starScenes = manifest.scenes.filter((s) => {
      const p = (s.pikaPrompt || '').toLowerCase();
      return (/first star|star reward|star graphic|belöning|⭐/.test(p))
        && !/no star|no reward|no belöning/.test(p);
    });
    assert.equal(starScenes.length, 0, `${id} must not show star/reward in prompts`);

    const { ratio } = computeAppScreenRatio(manifest);
    assert.ok(ratio <= 0.25, `${id} app ratio ${Math.round(ratio * 100)}% exceeds 25%`);

    const brand = manifest.scenes.find((s) => s.role === 'brand');
    assert.match(brand.swedishText, /kvällen innan/i);

    for (const scene of manifest.scenes) {
      assert.ok(TRANSITIONS.has(scene.transition));
      assert.match(scene.outputFilename, /\.mp4$/);
      if (!scene.skipPika) {
        assert.ok(scene.pikaPrompt.length > 40);
        if (scene.role === 'app-glimpse') {
          assert.match(scene.pikaPrompt, /blur|unreadable|out of focus|bokeh/i);
        }
      }
    }
  }
});

test('exactly one validation scene across all films: shoes alone', () => {
  let count = 0;
  let id = null;
  for (const filmId of FILM_IDS) {
    const { manifest } = loadManifest(filmId);
    const v = manifest.scenes.filter((s) => s.validationScene);
    count += v.length;
    if (v.length) id = v[0].id;
  }
  assert.equal(count, 1);
  assert.equal(id, 'scene-05-shoes-alone');
});

test('tomorrow flagship has evening hope line and one app glimpse', () => {
  const { manifest } = loadManifest('tomorrow-starts-here');
  const hope = manifest.scenes.find((s) => s.role === 'hope');
  assert.match(hope.swedishText, /Kvällen skapar morgonen/i);
  assert.equal(manifest.scenes.filter((s) => s.role === 'app-glimpse').length, 1);
  const shoes = manifest.scenes.find((s) => s.id === 'scene-06-morning-shoes');
  assert.equal(shoes.renderDuration, 7);
  assert.ok(computeTimelineDuration(manifest.scenes) > 28);
});

test('morning film has no app scenes', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  assert.equal(computeAppScreenRatio(manifest).ratio, 0);
});

test('manifest schema rejects renderDuration shorter than duration', () => {
  assert.throws(() => ManifestSchema.parse({
    id: 'x',
    title: 'X',
    outputBasename: 'x',
    referenceImage: 'assets/references/x.png',
    scenes: [{
      id: 's1',
      duration: 5,
      renderDuration: 3,
      pikaPrompt: 'A long enough prompt here for testing',
      swedishText: 'Hej',
      transition: 'fade',
      outputFilename: 's1.mp4',
    }],
  }));
});

test('planGeneration supports shoes validation scene filter', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  const plan = planGeneration([{ manifest, state: { scenes: {} } }], {
    sceneId: 'scene-05-shoes-alone',
  });
  assert.equal(plan.totalScenes, 1);
  assert.equal(plan.pendingScenes, 1);
});
