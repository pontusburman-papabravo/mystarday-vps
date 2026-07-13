import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.mjs';
import {
  listManifestFiles,
  loadManifest,
  sceneRenderCaption,
  resolveBrandCaption,
  resolveTimedAudioCues,
  sceneTransitionDurations,
} from './manifest.mjs';
import {
  loadState,
  listCompletedScenePaths,
  isSceneComplete,
} from './state.mjs';
import {
  normalizeSceneClip,
  muxVideoAudio,
  renderFilmFormat,
  computeTimelineDuration,
  sceneRenderDuration,
  resolveSceneColourGrade,
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

function resolveSceneClips(manifest, state, { usePlaceholders } = {}) {
  const sourceId = manifest.rawSourceManifest || manifest.id;
  const sourceState = sourceId !== manifest.id ? loadState(sourceId) : state;
  const sourceByFilename = new Map();

  for (const scene of manifest.scenes) {
    const entry = sourceState.scenes?.[scene.id];
    if (entry?.localPath && fs.existsSync(entry.localPath)) {
      sourceByFilename.set(scene.outputFilename, entry.localPath);
    }
  }

  for (const scene of manifest.scenes) {
    if (!scene.skipPika) {
      const entry = sourceState.scenes?.[scene.id];
      if (entry?.localPath && fs.existsSync(entry.localPath)) {
        sourceByFilename.set(scene.outputFilename, entry.localPath);
      }
    }
  }

  const scenes = [];
  for (const scene of manifest.scenes) {
    const v4Path = path.join(PATHS.raw, manifest.id, scene.outputFilename);
    let localPath = null;

    if (scene.sourceClip) {
      const src = path.join(PATHS.raw, sourceId, scene.sourceClip);
      if (fs.existsSync(src)) localPath = src;
    }

    if (scene.skipPika || scene.keyframeMotion) {
      generateScenePlaceholder(scene, v4Path, manifest.scenes.indexOf(scene), {
        manifest,
        assetRoot: path.join(PATHS.assets, '..'),
      });
      localPath = v4Path;
    } else if (!localPath && sourceByFilename.has(scene.outputFilename)) {
      localPath = sourceByFilename.get(scene.outputFilename);
    } else if (!localPath && isSceneComplete(state, scene.id)) {
      localPath = state.scenes[scene.id].localPath;
    } else if (!localPath && fs.existsSync(path.join(PATHS.raw, sourceId, scene.outputFilename))) {
      localPath = path.join(PATHS.raw, sourceId, scene.outputFilename);
    }

    if (!localPath && usePlaceholders) {
      generateScenePlaceholder(scene, v4Path, manifest.scenes.indexOf(scene), {
        manifest,
        assetRoot: path.join(PATHS.assets, '..'),
      });
      localPath = v4Path;
    }

    if (!localPath) {
      scenes.push(null);
    } else {
      scenes.push({ scene, localPath });
    }
  }

  return scenes;
}

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

    // Refresh local / keyframe clips (always when reusing source footage).
    const localScenes = manifest.scenes.filter((s) => s.skipPika || s.keyframeMotion);
    if (localScenes.length) {
      for (const [index, scene] of manifest.scenes.entries()) {
        if (!scene.skipPika && !scene.keyframeMotion) continue;
        const out = path.join(PATHS.raw, manifest.id, scene.outputFilename);
        generateScenePlaceholder(scene, out, index, {
          manifest,
          assetRoot: path.join(PATHS.assets, '..'),
        });
      }
      console.log(`  refreshed ${localScenes.length} local/keyframe clip(s)`);
    }

    const state = loadState(manifest.id);
    let scenes = resolveSceneClips(manifest, state, { usePlaceholders });

    if (scenes.some((s) => s == null) && usePlaceholders) {
      console.log(`[${manifest.id}] Missing raw clips — generating placeholders for render test.`);
      generatePlaceholdersForManifest(manifest, PATHS.raw);
      scenes = manifest.scenes.map((scene) => ({
        scene,
        localPath: path.join(PATHS.raw, manifest.id, scene.outputFilename),
      }));
    }

    if (scenes.some((s) => s == null)) {
      const missing = manifest.scenes
        .filter((s, i) => scenes[i] == null)
        .map((s) => s.id);
      throw new Error(
        `Cannot render ${manifest.id}: missing completed scenes: ${missing.join(', ')}. ` +
        'Run npm run generate first, or use --placeholders.',
      );
    }

    if (manifest.rawSourceManifest) {
      console.log(`  reusing raw clips from ${manifest.rawSourceManifest}`);
    }

    // Re-order to manifest order (resolveSceneClips already ordered).
    scenes = scenes.filter(Boolean);

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
    const transitionDurations = sceneTransitionDurations(manifest.scenes);

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
        colourGrade: resolveSceneColourGrade(scene, manifest),
        clipStartSec: scene.clipStartSec ?? 0,
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

    if (music && !fs.existsSync(music.file)) {
      const fallback = path.join(PATHS.audio, 'summer-morning-theme.m4a');
      if (fs.existsSync(fallback)) {
        console.warn(`  music file missing (${path.basename(music.file)}) — fallback to summer-morning-theme.m4a`);
        console.warn('  Run: npm run music:candidates -- --confirm  for ElevenLabs tracks');
        music.file = fallback;
      } else if (usePlaceholders) {
        const bed = path.join(workDir, 'music-bed.m4a');
        generateSilentMusicBed(bed, videoDuration + 2);
        music.file = bed;
        console.log('  (using synthesized music bed — add licensed file to audio/)');
      } else {
        throw new Error(`Music file not found: ${music.file}. Generate with npm run music:candidates -- --confirm`);
      }
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
        transitionDurations,
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
