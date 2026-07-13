import fs from 'node:fs';
import path from 'node:path';
import { runFfmpeg, sceneRenderDuration } from './ffmpeg.mjs';
import { PATHS, BRAND_URL } from './config.mjs';

const PLACEHOLDER_COLORS = [
  '0x1E3A5F',
  '0x2D5A87',
  '0x4A7C59',
  '0x8B6F47',
  '0x5C4B7A',
  '0x3D6B6B',
];

export function generateBlackClip({
  outputPath,
  duration,
  width = 1920,
  height = 1080,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=black:s=${width}x${height}:r=30:d=${duration}`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-t', String(duration),
    outputPath,
  ], { label: `black ${path.basename(outputPath)}` });
}

export function generatePlaceholderClip({
  outputPath,
  duration,
  color,
  label,
  width = 1920,
  height = 1080,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const text = (label || 'placeholder').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const vf = [
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${text}':fontsize=42:fontcolor=white@0.35:x=(w-text_w)/2:y=(h-text_h)/2`,
  ].join(',');

  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${color}:s=${width}x${height}:r=30:d=${duration}`,
    '-vf', vf,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-t', String(duration),
    outputPath,
  ], { label: `placeholder ${path.basename(outputPath)}` });
}

export function generateScenePlaceholder(scene, outputPath, index = 0, { manifest, assetRoot } = {}) {
  const duration = sceneRenderDuration(scene);
  if (scene.endBoard) {
    generateEndBoardClip({
      outputPath,
      duration,
      logoPath: PATHS.logo,
      brandUrl: manifest?.brandUrl?.trim() || BRAND_URL,
    });
    return;
  }
  if (scene.appScreenshot) {
    const root = assetRoot || path.join(PATHS.assets, '..');
    const imgPath = path.isAbsolute(scene.appScreenshot)
      ? scene.appScreenshot
      : path.join(root, scene.appScreenshot);
    generateAppScreenshotClip({ outputPath, duration, screenshotPath: imgPath });
    return;
  }
  if (scene.skipPika) {
    generateBlackClip({ outputPath, duration });
    return;
  }
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  generatePlaceholderClip({
    outputPath,
    duration,
    color,
    label: scene.id,
  });
}

export function generateAppScreenshotClip({
  outputPath,
  duration,
  screenshotPath,
  width = 1920,
  height = 1080,
  phoneWidth = 440,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (!fs.existsSync(screenshotPath)) {
    generatePlaceholderClip({
      outputPath,
      duration,
      color: '0x1a1a2e',
      label: path.basename(screenshotPath, '.png'),
      width,
      height,
    });
    return;
  }

  const filter = [
    `[1:v]scale=${phoneWidth}:-1:flags=lanczos,format=rgba[phone]`,
    `[0:v][phone]overlay=(W-w)/2:(H-h)/2:format=auto`,
  ].join(';');

  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0f1419:s=${width}x${height}:r=30:d=${duration}`,
    '-loop', '1',
    '-i', screenshotPath,
    '-filter_complex', filter,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ], { label: `app-screen ${path.basename(outputPath)}` });
}

export function generateEndBoardClip({
  outputPath,
  duration,
  logoPath,
  brandUrl = '',
  width = 1920,
  height = 1080,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const url = brandUrl.replace(/:/g, '\\:').replace(/'/g, "\\'");

  const filters = [];
  const inputs = ['-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=30:d=${duration}`];
  let inputCount = 1;

  if (fs.existsSync(logoPath)) {
    inputs.push('-loop', '1', '-i', logoPath);
    filters.push(
      `[${inputCount}:v]scale=320:-1,format=rgba[logo]`,
      `[0:v][logo]overlay=(W-w)/2:(H-h)/2-40[bg]`,
    );
    inputCount += 1;
  } else {
    filters.push('[0:v]copy[bg]');
  }

  filters.push(
    `[bg]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${url}':fontsize=36:fontcolor=white@0.85:x=(w-text_w)/2:y=(h/2)+60`,
  );

  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-t', String(duration),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ], { label: `end-board ${path.basename(outputPath)}` });
}

export function generatePlaceholderLogo(outputPath = PATHS.logo) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const label = 'Stjärndag'; // pragma: allowlist secret
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x00000000:s=480x120',
    '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${label}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
    '-frames:v', '1',
    outputPath,
  ], { label: 'placeholder logo' });
}

export function generatePlaceholdersForManifest(manifest, rawDir, { sceneId } = {}) {
  const clips = [];
  const assetRoot = path.join(PATHS.assets, '..');
  manifest.scenes.forEach((scene, index) => {
    if (sceneId && scene.id !== sceneId) return;
    const out = path.join(rawDir, manifest.id, scene.outputFilename);
    generateScenePlaceholder(scene, out, index, { manifest, assetRoot });
    clips.push({ scene, localPath: out });
  });
  return clips;
}

export function generateSilentMusicBed(outputPath, durationSec) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'sine=frequency=220:sample_rate=48000',
    '-t', String(durationSec),
    '-af', 'volume=0.02,aformat=channel_layouts=stereo',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    outputPath,
  ], { label: 'silent music bed' });
}
