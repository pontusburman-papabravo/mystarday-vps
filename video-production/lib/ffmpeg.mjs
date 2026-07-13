import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CONFIG, OUTPUT_FORMATS } from './config.mjs';
import {
  FORMAT_LAYOUTS,
  buildCaptionDrawtextFilters,
  buildLogoOverlayFilter,
  buildScaleCropFilter,
  sceneRenderDuration,
} from './caption-layout.mjs';

export const LOUDNESS = {
  I: -16,
  TP: -1.5,
  LRA: 11,
};

export const TRANSITION_DURATION_SEC = 0.6;

export function runFfmpeg(args, { label = 'ffmpeg' } = {}) {
  const result = spawnSync(CONFIG.ffmpegBin, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`${label} exited ${result.status}: ${stderr.slice(-2000)}`);
  }
  return result;
}

export function probeDuration(filePath) {
  const result = spawnSync(CONFIG.ffprobeBin, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${filePath}: ${result.stderr}`);
  }
  const duration = Number.parseFloat(result.stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error(`Could not read duration for ${filePath}`);
  }
  return duration;
}

export function probeAudioChannels(filePath) {
  const result = spawnSync(CONFIG.ffprobeBin, [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=channels',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });
  if (result.status !== 0) return 0;
  return Number.parseInt(result.stdout.trim(), 10) || 0;
}

/** Normalize raw Pika/placeholder clip to 1920×1080 master — no captions or logo. */
export function normalizeSceneClip({
  inputPath,
  outputPath,
  width = 1920,
  height = 1080,
  duration,
  renderDuration,
  fps = 30,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const outDur = renderDuration ?? duration;
  const holdSec = outDur > duration ? outDur - duration : 0;

  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'setsar=1',
    `fps=${fps}`,
    ...(holdSec > 0.01 ? [`tpad=stop_mode=clone:stop_duration=${holdSec.toFixed(3)}`] : []),
  ].join(',');

  runFfmpeg([
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-t', String(outDur),
    '-an',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    outputPath,
  ], { label: `normalize ${path.basename(outputPath)}` });
}

/** Scale master scene to target format and burn per-format captions. */
export function composeSceneForFormat({
  inputPath,
  outputPath,
  layout,
  swedishText,
  duration,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const captionFilters = buildCaptionDrawtextFilters(swedishText, layout);
  const vf = [
    buildScaleCropFilter(layout),
    'fps=30',
    ...captionFilters,
  ].join(',');

  runFfmpeg([
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-t', String(duration),
    '-an',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    outputPath,
  ], { label: `caption ${layout.id} ${path.basename(outputPath)}` });
}

export function concatWithTransitions({
  sceneClips,
  transitions,
  transitionDurationSec,
  outputPath,
  fps = 30,
}) {
  if (sceneClips.length === 1) {
    fs.copyFileSync(sceneClips[0].path, outputPath);
    return probeDuration(outputPath);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const inputs = sceneClips.flatMap((clip) => ['-i', clip.path]);
  const durations = sceneClips.map((clip) => clip.duration);

  let filter = '';
  let lastLabel = '[0:v]';

  for (let i = 0; i < sceneClips.length - 1; i++) {
    const transition = transitions[i] || 'fade';
    const offset = durations.slice(0, i + 1).reduce((a, b) => a + b, 0) - (i + 1) * transitionDurationSec;
    const outLabel = i === sceneClips.length - 2 ? '[vout]' : `[v${i + 1}]`;
    const xfadeType = transition === 'cut' ? 'fade' : transition;
    const xfadeDur = transition === 'cut' ? 0.01 : transitionDurationSec;

    filter += `${lastLabel}[${i + 1}:v]xfade=transition=${xfadeType}:duration=${xfadeDur}:offset=${Math.max(0, offset).toFixed(3)}${outLabel};`;
    lastLabel = outLabel;
  }

  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filter.replace(/;$/, ''),
    '-map', '[vout]',
    '-r', String(fps),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    outputPath,
  ], { label: `concat xfade ${path.basename(outputPath)}` });

  return probeDuration(outputPath);
}

export function overlayLogoForFormat({
  inputPath,
  logoPath,
  outputPath,
  layout,
}) {
  if (!fs.existsSync(logoPath)) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  runFfmpeg([
    '-y',
    '-i', inputPath,
    '-i', logoPath,
    '-filter_complex', buildLogoOverlayFilter(layout),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    outputPath,
  ], { label: `logo ${layout.id}` });
}

export function synthesizeSilentAudio(outputPath, durationSec) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=stereo',
    '-t', String(durationSec),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    outputPath,
  ], { label: 'silent audio' });
}

function loudnormFilter() {
  return `aformat=channel_layouts=stereo,loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}`;
}

/** Mix music + ambient + timed SFX/VO to stereo with loudness normalization. */
export function mixAudioBed({
  outputPath,
  music,
  ambient,
  sfx = [],
  vo = [],
  videoDuration,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const inputs = [];
  const filters = [];
  const mixInputs = [];
  let inputIndex = 0;

  if (music?.file && fs.existsSync(music.file)) {
    inputs.push('-i', music.file);
    const fadeIn = music.fadeInSec ?? 1.5;
    const fadeOut = music.fadeOutSec ?? 2;
    const fadeOutStart = Math.max(0, videoDuration - fadeOut);
    filters.push(
      `[${inputIndex}:a]volume=${music.volume ?? 0.35},afade=t=in:st=${music.startSec ?? 0}:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[music]`,
    );
    mixInputs.push('[music]');
    inputIndex += 1;
  }

  if (ambient?.file && fs.existsSync(ambient.file)) {
    inputs.push('-i', ambient.file);
    const fadeIn = ambient.fadeInSec ?? 2;
    const fadeOut = ambient.fadeOutSec ?? 2;
    const fadeOutStart = Math.max(0, videoDuration - fadeOut);
    filters.push(
      `[${inputIndex}:a]volume=${ambient.volume ?? 0.15},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},apad=whole_dur=${videoDuration}[ambient]`,
    );
    mixInputs.push('[ambient]');
    inputIndex += 1;
  }

  const timedCues = [...sfx, ...vo];
  for (const cue of timedCues) {
    if (!cue?.file || !fs.existsSync(cue.file)) continue;
    inputs.push('-i', cue.file);
    const delayMs = Math.round((cue.atSec ?? 0) * 1000);
    const label = `sfx${inputIndex}`;
    filters.push(
      `[${inputIndex}:a]adelay=${delayMs}|${delayMs},volume=${cue.volume ?? 0.5},apad=whole_dur=${videoDuration}[${label}]`,
    );
    mixInputs.push(`[${label}]`);
    inputIndex += 1;
  }

  if (mixInputs.length === 0) {
    runFfmpeg([
      '-y',
      '-f', 'lavfi',
      '-i', `anullsrc=r=48000:cl=stereo`,
      '-t', String(videoDuration),
      '-af', loudnormFilter(),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ac', '2',
      outputPath,
    ], { label: 'silent loudnorm bed' });
    return;
  }

  filters.push(
    `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2,${loudnormFilter()}[aout]`,
  );

  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[aout]',
    '-t', String(videoDuration),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    outputPath,
  ], { label: 'audio mix loudnorm' });
}

export function muxVideoAudio({
  videoPath,
  audioPath,
  outputPath,
  duration,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  runFfmpeg([
    '-y',
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ac', '2',
    '-t', String(duration),
    '-movflags', '+faststart',
    outputPath,
  ], { label: `mux ${path.basename(outputPath)}` });
}

export function computeTimelineDuration(scenes, transitionDurationSec = TRANSITION_DURATION_SEC) {
  const durations = scenes.map((s) => sceneRenderDuration(s));
  if (durations.length === 0) return 0;
  const overlap = (durations.length - 1) * transitionDurationSec;
  return durations.reduce((a, b) => a + b, 0) - overlap;
}

export function renderFilmFormat({
  normalizedScenes,
  transitions,
  layout,
  logoPath,
  swedishTexts,
  renderDurations,
  workDir,
  outputPath,
  manifest,
}) {
  const formatDir = path.join(workDir, layout.id);
  fs.mkdirSync(formatDir, { recursive: true });

  const composed = normalizedScenes.map((normPath, i) => {
    const out = path.join(formatDir, `scene-${String(i + 1).padStart(2, '0')}.mp4`);
    composeSceneForFormat({
      inputPath: normPath,
      outputPath: out,
      layout,
      swedishText: swedishTexts[i],
      duration: renderDurations[i],
    });
    return {
      path: out,
      duration: renderDurations[i],
      transition: transitions[i],
    };
  });

  const concatPath = path.join(formatDir, 'concat.mp4');
  const videoDuration = concatWithTransitions({
    sceneClips: composed,
    transitions,
    transitionDurationSec: TRANSITION_DURATION_SEC,
    outputPath: concatPath,
  });

  const withLogoPath = path.join(formatDir, 'with-logo.mp4');
  const logoInEndBoard = manifest?.scenes?.some((s) => s.endBoard);
  if (logoInEndBoard) {
    fs.copyFileSync(concatPath, withLogoPath);
  } else {
    overlayLogoForFormat({
      inputPath: concatPath,
      logoPath,
      outputPath: withLogoPath,
      layout,
    });
  }

  return { withLogoPath, videoDuration };
}

export { FORMAT_LAYOUTS, OUTPUT_FORMATS, sceneRenderDuration };
