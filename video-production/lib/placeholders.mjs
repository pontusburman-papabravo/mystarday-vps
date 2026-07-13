import fs from 'node:fs';
import path from 'node:path';
import { runFfmpeg } from './ffmpeg.mjs';
import { PATHS } from './config.mjs';

const PLACEHOLDER_COLORS = [
  '0x1E3A5F',
  '0x2D5A87',
  '0x4A7C59',
  '0x8B6F47',
  '0x5C4B7A',
  '0x3D6B6B',
];

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

export function generatePlaceholdersForManifest(manifest, rawDir) {
  const clips = [];
  manifest.scenes.forEach((scene, index) => {
    const out = path.join(rawDir, manifest.id, scene.outputFilename);
    const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
    generatePlaceholderClip({
      outputPath: out,
      duration: scene.duration,
      color,
      label: scene.id,
    });
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
    '-af', 'volume=0.02',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ], { label: 'silent music bed' });
}
