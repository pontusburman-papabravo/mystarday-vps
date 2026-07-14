import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { concatWithTransitions, MIN_XFADE_SEC, probeDuration } from '../lib/ffmpeg.mjs';
import { generateBlackClip } from '../lib/placeholders.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '.tmp-concat');

test('concat with cut transitions produces full timeline (xfade >= MIN_XFADE_SEC)', () => {
  fs.mkdirSync(TMP, { recursive: true });
  const clips = [];
  for (let i = 0; i < 4; i++) {
    const p = path.join(TMP, `clip-${i}.mp4`);
    generateBlackClip({ outputPath: p, duration: 2 + i });
    clips.push({ path: p, duration: 2 + i });
  }
  const out = path.join(TMP, 'out.mp4');
  const expected = clips.reduce((s, c) => s + c.duration, 0) - 3 * MIN_XFADE_SEC;
  const dur = concatWithTransitions({
    sceneClips: clips,
    transitions: ['cut', 'cut', 'cut'],
    transitionDurationSec: 0.6,
    transitionDurations: [0.08, 0.08, 0.08],
    outputPath: out,
  });
  assert.ok(Math.abs(dur - expected) < 0.5, `got ${dur}s expected ~${expected}s`);
  assert.ok(probeDuration(out) > 6, 'output should not truncate to last clip only');
});
