import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, OUTPUT_FORMATS } from './config.mjs';

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

export function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export function normalizeSceneClip({
  inputPath,
  outputPath,
  width,
  height,
  duration,
  swedishText,
  fps = 30,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const caption = escapeDrawtext(swedishText);
  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'setsar=1',
    `fps=${fps}`,
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${caption}':fontsize=48:fontcolor=white:borderw=3:bordercolor=black@0.6:x=(w-text_w)/2:y=h-120:shadowcolor=black@0.4:shadowx=2:shadowy=2`,
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
  ], { label: `normalize ${path.basename(outputPath)}` });
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
  ], { label: 'concat xfade' });

  return probeDuration(outputPath);
}

export function overlayLogo({
  inputPath,
  logoPath,
  outputPath,
  margin = 32,
  logoWidth = 220,
  opacity = 0.92,
}) {
  if (!fs.existsSync(logoPath)) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const filter = [
    `[1:v]scale=${logoWidth}:-1,format=rgba,colorchannelmixer=aa=${opacity}[logo]`,
    `[0:v][logo]overlay=W-w-${margin}:H-h-${margin}`,
  ].join(';');

  runFfmpeg([
    '-y',
    '-i', inputPath,
    '-i', logoPath,
    '-filter_complex', filter,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    outputPath,
  ], { label: 'logo overlay' });
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
    outputPath,
  ], { label: 'silent audio' });
}

export function mixAudioBed({
  videoPath,
  outputPath,
  music,
  ambient,
  videoDuration,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const inputs = ['-i', videoPath];
  const filters = [];
  const mixInputs = [];
  let inputIndex = 1;

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

  if (mixInputs.length === 0) {
    runFfmpeg([
      '-y',
      '-i', videoPath,
      '-f', 'lavfi',
      '-i', 'anullsrc=r=48000:cl=stereo',
      '-t', String(videoDuration),
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputPath,
    ], { label: 'mux silent' });
    return;
  }

  filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2[aout]`);

  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', String(videoDuration),
    outputPath,
  ], { label: 'audio mix' });
}

export function exportFormat({
  inputPath,
  outputPath,
  width,
  height,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    'setsar=1',
    'fps=30',
  ].join(',');

  runFfmpeg([
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  ], { label: `export ${width}x${height}` });
}

export function exportAllFormats(masterPath, basename, outputDir) {
  const exports = [];
  for (const format of OUTPUT_FORMATS) {
    const out = path.join(outputDir, `${basename}-${format.suffix}.mp4`);
    exportFormat({
      inputPath: masterPath,
      outputPath: out,
      width: format.width,
      height: format.height,
    });
    exports.push(out);
  }
  return exports;
}
