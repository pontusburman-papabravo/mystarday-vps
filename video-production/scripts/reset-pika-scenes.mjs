#!/usr/bin/env node
/** Reset Pika scene state so they regenerate on next `npm run generate --confirm`. */
import { loadManifest } from '../lib/manifest.mjs';
import { loadState, saveState } from '../lib/state.mjs';

const filmId = process.argv.find((a) => a.startsWith('--film='))?.slice('--film='.length)
  || process.argv[process.argv.indexOf('--film') + 1]
  || 'together-through-the-morning';

const sceneFilter = process.argv.find((a) => a.startsWith('--scene='))?.slice('--scene='.length)
  || (process.argv.includes('--scene') ? process.argv[process.argv.indexOf('--scene') + 1] : null);

const { manifest } = loadManifest(filmId);
const state = loadState(manifest.id);
let cleared = 0;

for (const scene of manifest.scenes) {
  if (scene.skipPika) continue;
  if (sceneFilter && scene.id !== sceneFilter) continue;
  if (state.scenes[scene.id]) {
    delete state.scenes[scene.id];
    cleared += 1;
    console.log(`  cleared ${scene.id}`);
  }
}

saveState(manifest.id, state);
console.log(`\nReset ${cleared} Pika scene(s) for ${filmId}.`);
