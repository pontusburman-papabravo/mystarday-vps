import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { PATHS, TRANSITIONS } from './config.mjs';

const MusicCueSchema = z.object({
  file: z.string().min(1),
  volume: z.number().min(0).max(1).default(0.35),
  fadeInSec: z.number().min(0).default(1.5),
  fadeOutSec: z.number().min(0).default(2),
  startSec: z.number().min(0).default(0),
}).optional();

const AmbientCueSchema = z.object({
  file: z.string().min(1),
  volume: z.number().min(0).max(1).default(0.15),
  fadeInSec: z.number().min(0).default(2),
  fadeOutSec: z.number().min(0).default(2),
}).optional();

const SoundCueSchema = z.object({
  file: z.string().min(1),
  atSec: z.number().min(0),
  volume: z.number().min(0).max(1).default(0.5),
}).optional();

const SceneSchema = z.object({
  id: z.string().min(1),
  duration: z.number().int().refine((v) => v === 5 || v === 10, {
    message: 'Pika scene duration must be 5 or 10 seconds',
  }),
  pikaPrompt: z.string().min(10),
  swedishText: z.string().min(1),
  transition: z.enum([...TRANSITIONS]).default('fade'),
  outputFilename: z.string().min(1),
  referenceImage: z.string().optional(),
  soundCue: SoundCueSchema,
});

export const ManifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  defaultSceneDuration: z.number().int().refine((v) => v === 5 || v === 10).default(5),
  outputBasename: z.string().min(1),
  referenceImage: z.string().min(1),
  seed: z.number().int().optional(),
  music: MusicCueSchema,
  ambient: AmbientCueSchema,
  scenes: z.array(SceneSchema).min(1),
});

export function listManifestFiles() {
  return fs.readdirSync(PATHS.manifests)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(PATHS.manifests, f));
}

export function loadManifest(filePathOrId) {
  const filePath = filePathOrId.endsWith('.json')
    ? filePathOrId
    : path.join(PATHS.manifests, `${filePathOrId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Manifest not found: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const manifest = ManifestSchema.parse(raw);

  for (const scene of manifest.scenes) {
    if (!scene.outputFilename.endsWith('.mp4')) {
      throw new Error(`Scene ${scene.id}: outputFilename must end with .mp4`);
    }
  }

  return { filePath, manifest };
}

export function resolveManifestPaths(manifest) {
  const root = path.join(PATHS.assets, '..');
  const resolve = (relativePath) => path.normalize(
    path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath),
  );

  return {
    referenceImage: resolve(manifest.referenceImage),
    scenes: manifest.scenes.map((scene) => ({
      ...scene,
      referenceImage: scene.referenceImage
        ? resolve(scene.referenceImage)
        : resolve(manifest.referenceImage),
    })),
    musicFile: manifest.music ? resolve(manifest.music.file) : null,
    ambientFile: manifest.ambient ? resolve(manifest.ambient.file) : null,
  };
}

export function countPendingScenes(manifest, state, { includeCompleted = false } = {}) {
  return manifest.scenes.filter((scene) => {
    const entry = state.scenes?.[scene.id];
    if (!entry) return true;
    if (entry.status === 'completed' && !includeCompleted) return false;
    if (entry.status === 'failed') return true;
    return entry.status !== 'completed';
  });
}

export function planGeneration(manifests) {
  let totalScenes = 0;
  let pendingScenes = 0;
  const films = [];

  for (const { manifest, state } of manifests) {
    const pending = countPendingScenes(manifest, state);
    totalScenes += manifest.scenes.length;
    pendingScenes += pending.length;
    films.push({
      id: manifest.id,
      title: manifest.title,
      totalScenes: manifest.scenes.length,
      pendingScenes: pending.length,
      completedScenes: manifest.scenes.length - pending.length,
      pending: pending.map((s) => s.id),
    });
  }

  return { totalScenes, pendingScenes, films };
}
