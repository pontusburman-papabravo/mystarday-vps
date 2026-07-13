import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.mjs';
import {
  listManifestFiles,
  loadManifest,
  sceneRenderCaption,
  resolveBrandCaption,
} from './manifest.mjs';
import {
  loadState,
  listCompletedScenePaths,
} from './state.mjs';
import {
  normalizeSceneClip,
  mixAudioBed,
  muxVideoAudio,
  renderFilmFormat,
  computeTimelineDuration,
  sceneRenderDuration,
  FORMAT_LAYOUTS,
  OUTPUT_FORMATS,
  probeAudioChannels,
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

    const taglineVariant = options.tagline || manifest.taglineVariantDefault || 'E';
    if (taglineVariant && !['A', 'B', 'C', 'D', 'E'].includes(taglineVariant)) {
      throw new Error(`Invalid --tagline "${taglineVariant}". Use A, B, C, D, or E.`);
    }
    const brandCaption = resolveBrandCaption(manifest, taglineVariant);
    if (brandCaption) {
      console.log(`  brand tagline variant ${taglineVariant}: ${brandCaption.replace(/\n/g, ' / ')}`);
    } else {
      console.log(`  brand tagline variant ${taglineVariant}: (logo only — no slogan)`);
    }

    const normalizedPaths = [];
    const renderDurations = [];
    const swedishTexts = [];
    const transitions = [];

    for (let i = 0; i < scenes.length; i++) {
      const { scene, localPath } = scenes[i];
      const renderDur = sceneRenderDuration(scene);
      const normPath = path.join(workDir, `norm-${scene.outputFilename}`);

      normalizeSceneClip({
        inputPath: localPath,
        outputPath: normPath,
        width: MASTER_WIDTH,
        height: MASTER_HEIGHT,
        duration: scene.duration,
        renderDuration: renderDur,
      });

      normalizedPaths.push(normPath);
      renderDurations.push(renderDur);
      swedishTexts.push(sceneRenderCaption(manifest, scene, { taglineVariant }));
      if (i < scenes.length - 1) {
        transitions.push(scene.transition);
      }
    }

    const videoDuration = computeTimelineDuration(
      scenes.map((s) => s.scene),
    );

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

    const audioPath = path.join(workDir, 'master-audio.m4a');
    mixAudioBed({
      outputPath: audioPath,
      music,
      ambient,
      videoDuration,
    });

    const channels = probeAudioChannels(audioPath);
    if (channels < 2) {
      console.warn(`  warning: audio bed is ${channels}-channel; expected stereo`);
    }

    const filmOutDir = path.join(PATHS.output, manifest.outputBasename);
    fs.mkdirSync(filmOutDir, { recursive: true });

    const exports = [];

    for (const format of OUTPUT_FORMATS) {
      const layout = FORMAT_LAYOUTS[format.id];
      const { withLogoPath } = renderFilmFormat({
        normalizedScenes: normalizedPaths,
        transitions,
        layout,
        logoPath: PATHS.logo,
        swedishTexts,
        renderDurations,
        workDir,
        outputPath: null,
      });

      const outPath = path.join(filmOutDir, `${manifest.outputBasename}-${format.suffix}.mp4`);
      muxVideoAudio({
        videoPath: withLogoPath,
        audioPath,
        outputPath: outPath,
        duration: videoDuration,
      });
      exports.push(outPath);
      console.log(`  ✓ ${outPath}`);
    }

    rendered.push({ manifestId: manifest.id, exports });
  }

  console.log(`\nRender complete (${rendered.length} film(s)).`);
  return rendered;
}
