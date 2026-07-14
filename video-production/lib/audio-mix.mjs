import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONFIG } from './config.mjs';
import { LOUDNESS, runFfmpeg } from './ffmpeg.mjs';

/** Center mono/stereo dialog in the mix bus. */
const VO_CENTER = 'pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1';

/** Final broadcast loudness — applied once on the full mix only. */
const FINAL_LOUDNESS = `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}`;

function probeAudioDuration(filePath) {
  const result = spawnSync(CONFIG.ffprobeBin, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });
  if (result.status !== 0) return 2;
  const d = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(d) ? d : 2;
}

function buildMusicVolumeExpr(baseVol, duckRegions = []) {
  if (!duckRegions.length) return String(baseVol);
  let expr = String(baseVol);
  for (const d of duckRegions) {
    const duckVol = d.volume ?? baseVol * 0.25;
    expr = `if(between(t,${d.startSec},${d.endSec}),${duckVol},${expr})`;
  }
  return expr;
}

/** Auto-duck music under every VO line (+ padding). */
export function buildMusicDuckFromVo(vo = [], baseVol = 0.12, duckVol = 0.025, padSec = 0.35) {
  const regions = [];
  for (const cue of vo) {
    if (!cue?.file || !fs.existsSync(cue.file)) continue;
    const at = cue.atSec ?? 0;
    const dur = probeAudioDuration(cue.file);
    regions.push({
      startSec: Math.max(0, at - padSec),
      endSec: at + dur + padSec,
      volume: duckVol,
    });
  }
  return mergeDuckRegions(regions);
}

function mergeDuckRegions(regions) {
  if (!regions.length) return [];
  const sorted = [...regions].sort((a, b) => a.startSec - b.startSec);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.startSec <= prev.endSec + 0.05) {
      prev.endSec = Math.max(prev.endSec, cur.endSec);
      prev.volume = Math.min(prev.volume, cur.volume);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

function renderLayer({ outputPath, inputs, filterComplex, videoDuration }) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', `${filterComplex},aformat=channel_layouts=stereo[aout]`,
    '-map', '[aout]',
    '-t', String(videoDuration),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    outputPath,
  ], { label: `audio layer ${path.basename(outputPath)}` });
}

function renderSilent(outputPath, videoDuration) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=stereo',
    '-t', String(videoDuration),
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath,
  ], { label: 'silent layer' });
}

/**
 * Mix audio in isolated layers + full mix. Returns paths for diagnostics.
 */
export function mixAudioLayers({
  workDir,
  music,
  ambient,
  sfx = [],
  vo = [],
  videoDuration,
  musicDuck = [],
}) {
  fs.mkdirSync(workDir, { recursive: true });

  const duck = mergeDuckRegions([
    ...musicDuck,
    ...buildMusicDuckFromVo(vo, music?.volume ?? 0.12),
  ]);

  const paths = {
    voice: path.join(workDir, 'layer-voice.m4a'),
    music: path.join(workDir, 'layer-music.m4a'),
    sfx: path.join(workDir, 'layer-sfx.m4a'),
    full: path.join(workDir, 'master-audio.m4a'),
  };

  // —— Voice layer (centered, no loudnorm) ——
  const voInputs = [];
  const voFilters = [];
  const voMix = [];
  let idx = 0;
  for (const cue of vo) {
    if (!cue?.file || !fs.existsSync(cue.file)) continue;
    voInputs.push('-i', cue.file);
    const delayMs = Math.round((cue.atSec ?? 0) * 1000);
    const label = `vo${idx}`;
    voFilters.push(
      `[${idx}:a]adelay=${delayMs}|${delayMs},volume=${cue.volume ?? 0.85},${VO_CENTER},apad=whole_dur=${videoDuration}[${label}]`,
    );
    voMix.push(`[${label}]`);
    idx += 1;
  }
  if (voMix.length) {
    renderLayer({
      outputPath: paths.voice,
      inputs: voInputs,
      filterComplex: `${voFilters.join(';')};${voMix.join('')}amix=inputs=${voMix.length}:duration=first:dropout_transition=0`,
      videoDuration,
    });
  } else {
    renderSilent(paths.voice, videoDuration);
  }

  // —— Music layer ——
  if (music?.file && fs.existsSync(music.file)) {
    const fadeIn = music.fadeInSec ?? 2;
    const fadeOut = music.fadeOutSec ?? 3;
    const fadeOutStart = Math.max(0, videoDuration - fadeOut);
    const baseVol = music.volume ?? 0.12;
    const startSec = music.startSec ?? 0;
    let volExpr = buildMusicVolumeExpr(baseVol, duck);
    if (startSec > 0) {
      volExpr = `if(lt(t,${startSec}),0,${volExpr})`;
    }
    renderLayer({
      outputPath: paths.music,
      inputs: ['-i', music.file],
      filterComplex: `[0:a]volume='${volExpr}':eval=frame,afade=t=in:st=${startSec}:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},apad=whole_dur=${videoDuration}`,
      videoDuration,
    });
  } else {
    renderSilent(paths.music, videoDuration);
  }

  // —— SFX + optional ambient (ambient ~10 dB under VO) ——
  const sfxInputs = [];
  const sfxFilters = [];
  const sfxMix = [];
  let sfxIdx = 0;

  if (ambient?.file && fs.existsSync(ambient.file)) {
    sfxInputs.push('-i', ambient.file);
    const ambVol = ambient.volume ?? 0.04;
    const fadeOutStart = Math.max(0, videoDuration - (ambient.fadeOutSec ?? 2));
    sfxFilters.push(
      `[${sfxIdx}:a]volume=${ambVol},afade=t=in:st=0:d=${ambient.fadeInSec ?? 2},afade=t=out:st=${fadeOutStart}:d=${ambient.fadeOutSec ?? 2},apad=whole_dur=${videoDuration}[amb]`,
    );
    sfxMix.push('[amb]');
    sfxIdx += 1;
  }

  for (const cue of sfx) {
    if (!cue?.file || !fs.existsSync(cue.file)) continue;
    sfxInputs.push('-i', cue.file);
    const delayMs = Math.round((cue.atSec ?? 0) * 1000);
    const label = `sfx${sfxIdx}`;
    sfxFilters.push(
      `[${sfxIdx}:a]adelay=${delayMs}|${delayMs},volume=${cue.volume ?? 0.25},apad=whole_dur=${videoDuration}[${label}]`,
    );
    sfxMix.push(`[${label}]`);
    sfxIdx += 1;
  }

  if (sfxMix.length) {
    renderLayer({
      outputPath: paths.sfx,
      inputs: sfxInputs,
      filterComplex: `${sfxFilters.join(';')};${sfxMix.join('')}amix=inputs=${sfxMix.length}:duration=first:dropout_transition=0`,
      videoDuration,
    });
  } else {
    renderSilent(paths.sfx, videoDuration);
  }

  // —— Full mix: layers → limiter (music already loudnorm'd) ——
  runFfmpeg([
    '-y',
    '-i', paths.music,
    '-i', paths.sfx,
    '-i', paths.voice,
    '-filter_complex',
    // normalize=0 — default amix divides gain by input count and crushes music under silent VO/SFX beds.
    '[0:a][1:a][2:a]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,' + FINAL_LOUDNESS + '[aout]',
    '-map', '[aout]',
    '-t', String(videoDuration),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    paths.full,
  ], { label: 'full audio mix' });

  return paths;
}
