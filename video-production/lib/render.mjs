import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.mjs';
import {
  listManifestFiles,
  loadManifest,
  sceneRenderCaption,
  resolveBrandCaption,
  resolveTimedAudioCues,
} from './manifest.mjs';
import {
  loadState,
  listCompletedScenePaths,
} from './state.mjs';
import {
  normalizeSceneClip,
  muxVideoAudio,
  renderFilmFormat,
  computeTimelineDuration,
  sceneRenderDuration,
  FORMAT_LAYOUTS,
  OUTPUT_FORMATS,
  probeAudioChannels,
} from './ffmpeg.mjs';
import { mixAudioLayers } from './audio-mix.mjs';
import {
  generatePlaceholdersForManifest,
  generateScenePlaceholder,
  generateSilentMusicBed,
} from './placeholders.mjs';
import { ensureBrandAssets } from '../scripts/setup-brand-assets.mjs';
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
  const audioDiagnose = !flags.has('no-audio-diagnose');

  ensureDirs(PATHS.output, path.join(PATHS.output, 'work'));
  ensureBrandAssets();

  const manifestFiles = requireFilmSelection(listManifestFiles(), options.film);
  const rendered = [];

  for (const filePath of manifestFiles) {
    const { manifest } = loadManifest(filePath);

    // Always refresh skipPika clips (app screens + end board) before render.
    const localScenes = manifest.scenes.filter((s) => s.skipPika);
    for (const [index, scene] of manifest.scenes.entries()) {
      if (!scene.skipPika) continue;
      const out = path.join(PATHS.raw, manifest.id, scene.outputFilename);
      generateScenePlaceholder(scene, out, index, {
        manifest,
        assetRoot: path.join(PATHS.assets, '..'),
      });
    }
    if (localScenes.length) {
      console.log(`  refreshed ${localScenes.length} local clip(s) (app/end board)`);
    }

    let scenes = listCompletedScenePaths(manifest, loadState(manifest.id));

    for (const scene of manifest.scenes) {
      if (!scene.skipPika) continue;
      const localPath = path.join(PATHS.raw, manifest.id, scene.outputFilename);
      if (!scenes.find((s) => s.scene.id === scene.id)) {
        scenes.push({ scene, localPath });
      }
    }

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
        .filter((s) => !s.skipPika)
        .filter((s) => !scenes.find((c) => c.scene.id === s.id))
        .map((s) => s.id);
      throw new Error(
        `Cannot render ${manifest.id}: missing completed scenes: ${missing.join(', ')}. ` +
        'Run npm run generate first, or use --placeholders.',
      );
    }

    // Re-order completed scenes to match manifest order (may include new local scenes).
    const sceneById = new Map(scenes.map((s) => [s.scene.id, s]));
    scenes = manifest.scenes.map((scene) => {
      const hit = sceneById.get(scene.id);
      if (hit) return hit;
      return {
        scene,
        localPath: path.join(PATHS.raw, manifest.id, scene.outputFilename),
      };
    });

    console.log(`\n[${manifest.id}] Rendering ${manifest.title}…`);
    const workDir = path.join(PATHS.output, 'work', manifest.id);
    fs.mkdirSync(workDir, { recursive: true });

    const taglineVariant = options.tagline || manifest.taglineVariantDefault || 'E';
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

    const { vo, sfx } = resolveTimedAudioCues(manifest);
    const resolveAudio = (rel) => path.normalize(path.join(root, rel));
    const resolvedVo = vo.map((c) => ({ ...c, file: resolveAudio(c.file) }));
    const resolvedSfx = sfx.map((c) => ({ ...c, file: resolveAudio(c.file) }));

    if (music && !fs.existsSync(music.file) && usePlaceholders) {
      const bed = path.join(workDir, 'music-bed.m4a');
      generateSilentMusicBed(bed, videoDuration + 2);
      music.file = bed;
      console.log('  (using synthesized music bed — add licensed file to audio/)');
    }

    const audioLayers = mixAudioLayers({
      workDir: path.join(workDir, 'audio'),
      music,
      ambient,
      sfx: resolvedSfx,
      vo: resolvedVo,
      videoDuration,
      musicDuck: manifest.musicDuck || [],
    });

    const channels = probeAudioChannels(audioLayers.full);
    if (channels < 2) {
      console.warn(`  warning: audio bed is ${channels}-channel; expected stereo`);
    }

    const filmOutDir = path.join(PATHS.output, manifest.outputBasename);
    fs.mkdirSync(filmOutDir, { recursive: true });
    const exportBasename = options.exportSuffix
      ? `${manifest.outputBasename}-${options.exportSuffix}`
      : manifest.outputBasename;

    const exports = [];
    const formatOutputs = [];

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
        manifest,
      });
      formatOutputs.push({ format, withLogoPath });
    }

    const landscapeVideo = formatOutputs.find((f) => f.format.id === 'landscape')?.withLogoPath;

    if (audioDiagnose && landscapeVideo) {
      for (const diag of [
        { key: 'voice-only', audio: audioLayers.voice },
        { key: 'music-only', audio: audioLayers.music },
        { key: 'sfx-only', audio: audioLayers.sfx },
        { key: 'full-mix', audio: audioLayers.full },
      ]) {
        const outPath = path.join(filmOutDir, `${exportBasename}-${diag.key}.mp4`);
        muxVideoAudio({
          videoPath: landscapeVideo,
          audioPath: diag.audio,
          outputPath: outPath,
          duration: videoDuration,
        });
        exports.push(outPath);
        console.log(`  ✓ ${outPath}`);
      }
    }

    for (const { format, withLogoPath } of formatOutputs) {
      const outPath = path.join(filmOutDir, `${exportBasename}-${format.suffix}.mp4`);
      muxVideoAudio({
        videoPath: withLogoPath,
        audioPath: audioLayers.full,
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
