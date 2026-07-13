import fs from 'node:fs';
import path from 'node:path';
import { generateCartoonScene, isCartoonScene } from './cartoon-scenes.mjs';
import { runFfmpeg, sceneRenderDuration } from './ffmpeg.mjs';
import { PATHS, BRAND_NAME, BRAND_URL } from './config.mjs';

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
      brandMarkPath: PATHS.brandMark,
      brandName: BRAND_NAME,
      showUrl: manifest?.endBoardShowUrl !== false,
      brandUrl: manifest?.brandUrl?.trim() || BRAND_URL,
      logoOnly: manifest?.endBoardLogoOnly === true,
    });
    return;
  }
  if (isCartoonScene(scene, manifest)) {
    generateCartoonScene(scene, outputPath, duration);
    return;
  }
  if (scene.appScreenshot) {
    const root = assetRoot || path.join(PATHS.assets, '..');
    const imgPath = path.isAbsolute(scene.appScreenshot)
      ? scene.appScreenshot
      : path.join(root, scene.appScreenshot);
    generateAppScreenshotClip({
      outputPath,
      duration,
      screenshotPath: imgPath,
      appMotion: scene.appMotion || 'none',
    });
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

export function buildAppPhoneFilter({ appMotion, duration, phoneWidth }) {
  const frames = Math.max(1, Math.round(duration * 30));
  const phoneH = Math.round(phoneWidth * 2.05);
  const baseScale = Math.round(phoneWidth * 1.15);

  if (appMotion === 'push-in') {
    return `[1:v]scale=${baseScale}:-1:flags=lanczos,zoompan=z='min(1.02+0.0006*on,1.09)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${phoneWidth}x${phoneH}:fps=30,format=rgba[phone]`;
  }
  if (appMotion === 'zoom-star') {
    return `[1:v]scale=${baseScale}:-1:flags=lanczos,zoompan=z='min(1.04+0.0009*on,1.14)':x='iw/2-(iw/zoom/2)':y='ih*0.38-(ih/zoom/2)':d=${frames}:s=${phoneWidth}x${phoneH}:fps=30,format=rgba[phone]`;
  }
  return `[1:v]scale=${phoneWidth}:-1:flags=lanczos,format=rgba[phone]`;
}

export function generateAppScreenshotClip({
  outputPath,
  duration,
  screenshotPath,
  width = 1920,
  height = 1080,
  phoneWidth = 500,
  appMotion = 'none',
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (!fs.existsSync(screenshotPath)) {
    generatePlaceholderClip({
      outputPath,
      duration,
      color: '0x1B2340',
      label: path.basename(screenshotPath, '.png'),
      width,
      height,
    });
    return;
  }

  const phoneFilter = buildAppPhoneFilter({ appMotion, duration, phoneWidth });
  const filter = [
    phoneFilter,
    `[0:v][phone]overlay=(W-w)/2:(H-h)/2:format=auto`,
  ].join(';');

  runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x1B2340:s=${width}x${height}:r=30:d=${duration}`,
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
  brandMarkPath,
  brandName = BRAND_NAME,
  showUrl = true,
  brandUrl = BRAND_URL,
  logoOnly = false,
  width = 1920,
  height = 1080,
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (!brandMarkPath || !fs.existsSync(brandMarkPath)) {
    throw new Error(
      `End board requires brand mark at ${brandMarkPath}. Run setup-brand-assets.mjs first.`,
    );
  }
  const url = showUrl
    ? (brandUrl || BRAND_URL).replace(/:/g, '\\:').replace(/'/g, "\\'")
    : '';

  const navy = '0x1B2340';
  const filters = [
    '[1:v]scale=220:-1,format=rgba[mark]',
    '[0:v][mark]overlay=(W-w)/2:(H-h)/2:format=auto',
  ];
  if (!logoOnly) {
    const name = (brandName || BRAND_NAME).replace(/:/g, '\\:').replace(/'/g, "\\'");
    filters.length = 0;
    filters.push(
      '[1:v]scale=220:-1,format=rgba[mark]',
      '[0:v][mark]overlay=(W-w)/2:(H-h)/2-88[withmark]',
    );
    if (url) {
      filters.push(
        `[withmark]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf:text='${name}':fontsize=50:fontcolor=white@0.96:x=(w-text_w)/2:y=(h/2)+28[withname]`,
        `[withname]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${url}':fontsize=28:fontcolor=white@0.55:x=(w-text_w)/2:y=(h/2)+100`,
      );
    } else {
      filters.push(
        `[withmark]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf:text='${name}':fontsize=50:fontcolor=white@0.96:x=(w-text_w)/2:y=(h/2)+28`,
      );
    }
  }

  runFfmpeg([
    '-y',
    '-f', 'lavfi', '-i', `color=c=${navy}:s=${width}x${height}:r=30:d=${duration}`,
    '-loop', '1', '-i', brandMarkPath,
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
