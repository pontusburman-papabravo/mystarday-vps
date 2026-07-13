import assert from 'node:assert/strict';
import test from 'node:test';
import { ManifestSchema } from '../lib/manifest.mjs';
import { listManifestFiles, loadManifest } from '../lib/manifest.mjs';
import { TRANSITIONS } from '../lib/config.mjs';

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

test('manifest schema rejects invalid duration', () => {
  assert.throws(() => ManifestSchema.parse({
    id: 'x',
    title: 'X',
    outputBasename: 'x',
    referenceImage: 'assets/references/x.png',
    scenes: [{
      id: 's1',
      duration: 7,
      pikaPrompt: 'A long enough prompt here',
      swedishText: 'Hej',
      transition: 'fade',
      outputFilename: 's1.mp4',
    }],
  }));
});
