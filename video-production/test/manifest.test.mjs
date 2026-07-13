import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapCaption } from '../lib/caption-layout.mjs';
import {
  ManifestSchema,
  listManifestFiles,
  loadManifest,
  computeAppScreenRatio,
  sceneCaptionText,
  planGeneration,
} from '../lib/manifest.mjs';
import { TRANSITIONS } from '../lib/config.mjs';
import { computeTimelineDuration } from '../lib/ffmpeg.mjs';

const FILM_IDS = ['a-morning-without-nagging', 'tomorrow-starts-here', 'real-families'];

test('wrapCaption respects manual line breaks', () => {
  const result = wrapCaption('Stjärndag\nFör familjer som vill ha lugnare vardag', 24);
  assert.match(result, /^Stjärndag\n/);
  assert.ok(result.split('\n').length >= 2);
});

test('all films follow emotional brand structure', () => {
  for (const id of FILM_IDS) {
    const { manifest } = loadManifest(id);
    assert.ok(manifest.creativeBrief?.includes('Chaos') || manifest.creativeBrief?.includes('chaos') || manifest.creativeBrief?.includes('stress') || manifest.creativeBrief?.includes('Anxiety') || manifest.creativeBrief?.includes('anxiety') || manifest.creativeBrief?.includes('Authentic'), `${id} missing creativeBrief`);
    assert.equal(manifest.scenes[0].role, 'hook');
    assert.equal(sceneCaptionText(manifest.scenes[0]), '');
    assert.equal(manifest.scenes[1].role, 'breath');
    assert.equal(manifest.scenes[1].skipPika, true);

    const appScenes = manifest.scenes.filter((s) => s.role === 'app-glimpse');
    assert.equal(appScenes.length, 1, `${id} must have exactly one app-glimpse`);

    const { ratio } = computeAppScreenRatio(manifest);
    assert.ok(ratio <= 0.25, `${id} app ratio ${Math.round(ratio * 100)}% exceeds 25%`);

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

test('morning film marks validation scene for first star', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  const validation = manifest.scenes.filter((s) => s.validationScene);
  assert.equal(validation.length, 1);
  assert.equal(validation[0].id, 'scene-05-first-star');
});

test('tomorrow morning wake holds 7 seconds', () => {
  const { manifest } = loadManifest('tomorrow-starts-here');
  const wake = manifest.scenes.find((s) => s.id === 'scene-05-morning-wake');
  assert.equal(wake.duration, 5);
  assert.equal(wake.renderDuration, 7);
  assert.ok(computeTimelineDuration(manifest.scenes) > 25);
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

test('planGeneration supports single-scene filter', () => {
  const { manifest } = loadManifest('a-morning-without-nagging');
  const plan = planGeneration([{ manifest, state: { scenes: {} } }], {
    sceneId: 'scene-05-first-star',
  });
  assert.equal(plan.totalScenes, 1);
  assert.equal(plan.pendingScenes, 1);
});
