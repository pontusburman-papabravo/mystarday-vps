import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapCaption, estimateLineCount } from '../lib/caption-layout.mjs';
import { ManifestSchema } from '../lib/manifest.mjs';
import { listManifestFiles, loadManifest } from '../lib/manifest.mjs';
import { TRANSITIONS } from '../lib/config.mjs';
import { computeTimelineDuration } from '../lib/ffmpeg.mjs';

test('wrapCaption respects manual line breaks', () => {
  const result = wrapCaption('Stjärndag\nFör familjer som vill ha lugnare vardag', 24);
  assert.match(result, /^Stjärndag\n/);
  assert.ok(result.split('\n').length >= 2);
});

test('wrapCaption wraps near 26 characters', () => {
  const result = wrapCaption('Ni förbereder morgondagen tillsammans.', 26);
  assert.ok(result.length > 0);
  for (const line of result.split('\n')) {
    assert.ok(line.length <= 28, `line too long: ${line}`);
  }
});

test('all promotional manifests validate', () => {
  const files = listManifestFiles();
  assert.equal(files.length, 3);

  for (const file of files) {
    const { manifest } = loadManifest(file);
    assert.ok(manifest.scenes.length >= 4);
    for (const scene of manifest.scenes) {
      assert.ok(scene.pikaPrompt.length > 20);
      assert.ok(scene.swedishText.length > 3);
      assert.ok(TRANSITIONS.has(scene.transition));
      assert.match(scene.outputFilename, /\.mp4$/);
    }
  }
});

test('tomorrow scene 4 has extended render duration', () => {
  const { manifest } = loadManifest('tomorrow-starts-here');
  const scene4 = manifest.scenes.find((s) => s.id === 'scene-04-morning-preview');
  assert.equal(scene4.duration, 5);
  assert.equal(scene4.renderDuration, 7);
  const total = computeTimelineDuration(manifest.scenes);
  assert.ok(total > 23, `expected >23s timeline, got ${total}`);
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
      pikaPrompt: 'A long enough prompt here',
      swedishText: 'Hej',
      transition: 'fade',
      outputFilename: 's1.mp4',
    }],
  }));
});

test('real families ending uses two-line caption', () => {
  const { manifest } = loadManifest('real-families');
  const ending = manifest.scenes.at(-1);
  assert.match(ending.swedishText, /\n/);
  assert.ok(estimateLineCount(ending.swedishText, 24) >= 2);
});
