import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.mjs';
import {
  listManifestFiles,
  loadManifest,
} from './manifest.mjs';
import {
  loadState,
  listCompletedScenePaths,
} from './state.mjs';
import {
  normalizeSceneClip,
  concatWithTransitions,
  overlayLogo,
  mixAudioBed,
  exportAllFormats,
} from './ffmpeg.mjs';
import {
  generatePlaceholdersForManifest,
  generatePlaceholderLogo,
  generateSilentMusicBed,
} from './placeholders.mjs';
import {
  parseArgs,
  requireFilmSelection,
  ensureDirs,
} from './cli.mjs';
import { TRANSITION_DURATION_SEC } from './generate.mjs';

const MASTER_WIDTH = 1920;
const MASTER_HEIGHT = 1080;

export async function runRender(argv = process.argv.slice(2)) {
  const { flags, options } = parseArgs(argv);
  const usePlaceholders = flags.has('placeholders');

  ensureDirs(PATHS.output, path.join(PATHS.output, 'work'));

  if (!fs.existsSync(PATHS.logo)) {
    console.log('Logo not found — creating placeholder logo for testing.');
    generatePlaceholderLogo();
  }

  const manifestFiles = requireFilmSelection(listManifestFiles(), options.film);
  const rendered = [];

  for (const filePath of manifestFiles) {
    const { manifest } = loadManifest(filePath);

    let scenes = listCompletedScenePaths(manifest, loadState(manifest.id));

    if (scenes.length !== manifest.scenes.length && usePlaceholders) {
      console.log(`[${manifest.id}] Missing raw clips — generating placeholders for render test.`);
      generatePlaceholdersForManifest(manifest, PATHS.raw);
      scenes = manifest.scenes.map((scene) => ({
        scene,
        localPath: path.join(PATHS.raw, manifest.id, scene.outputFilename),
      }));
    }

    if (scenes.length !== manifest.scenes.length) {
      const missing = manifest.scenes
        .filter((s) => !scenes.find((c) => c.scene.id === s.id))
        .map((s) => s.id);
      throw new Error(
        `Cannot render ${manifest.id}: missing completed scenes: ${missing.join(', ')}. ` +
        'Run npm run generate first, or use --placeholders.',
      );
    }

    console.log(`\n[${manifest.id}] Rendering ${manifest.title}…`);
    const workDir = path.join(PATHS.output, 'work', manifest.id);
    fs.mkdirSync(workDir, { recursive: true });

    const normalized = [];
    for (const { scene, localPath } of scenes) {
      const normPath = path.join(workDir, `norm-${scene.outputFilename}`);
      normalizeSceneClip({
        inputPath: localPath,
        outputPath: normPath,
        width: MASTER_WIDTH,
        height: MASTER_HEIGHT,
        duration: scene.duration,
        swedishText: scene.swedishText,
      });
      normalized.push({
        path: normPath,
        duration: scene.duration,
        transition: scene.transition,
      });
    }

    const concatPath = path.join(workDir, 'concat.mp4');
    const transitions = scenes.map((s) => s.scene.transition);
    const videoDuration = concatWithTransitions({
      sceneClips: normalized,
      transitions,
      transitionDurationSec: TRANSITION_DURATION_SEC,
      outputPath: concatPath,
    });

    const withLogoPath = path.join(workDir, 'with-logo.mp4');
    overlayLogo({
      inputPath: concatPath,
      logoPath: PATHS.logo,
      outputPath: withLogoPath,
    });

    const root = path.join(PATHS.audio, '..');
    const music = manifest.music
      ? { ...manifest.music, file: path.normalize(path.join(root, manifest.music.file)) }
      : null;
    const ambient = manifest.ambient
      ? { ...manifest.ambient, file: path.normalize(path.join(root, manifest.ambient.file)) }
      : null;

    if (music && !fs.existsSync(music.file) && usePlaceholders) {
      const bed = path.join(workDir, 'music-bed.m4a');
      generateSilentMusicBed(bed, videoDuration + 2);
      music.file = bed;
      console.log('  (using synthesized music bed — add licensed file to audio/)');
    }

    const masterPath = path.join(workDir, 'master.mp4');
    mixAudioBed({
      videoPath: withLogoPath,
      outputPath: masterPath,
      music,
      ambient,
      videoDuration,
    });

    const filmOutDir = path.join(PATHS.output, manifest.outputBasename);
    const exports = exportAllFormats(masterPath, manifest.outputBasename, filmOutDir);

    for (const file of exports) {
      console.log(`  ✓ ${file}`);
    }
    rendered.push({ manifestId: manifest.id, exports });
  }

  console.log(`\nRender complete (${rendered.length} film(s)).`);
  return rendered;
}
