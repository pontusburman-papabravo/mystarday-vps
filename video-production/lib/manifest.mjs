import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { PATHS, TRANSITIONS, BRAND_URL } from './config.mjs';
import { sceneRenderDuration } from './caption-layout.mjs';

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

const AudioCueNoteSchema = z.object({
  type: z.enum(['vo', 'sfx', 'ambient', 'silence']),
  description: z.string().min(1),
  atSec: z.number().min(0).optional(),
});

const SfxCueSchema = z.object({
  file: z.string().min(1),
  atSec: z.number().min(0).optional(),
  sceneId: z.string().min(1).optional(),
  atSecInScene: z.number().min(0).optional(),
  volume: z.number().min(0).max(1).default(0.55),
}).refine(
  (c) => c.atSec != null || (c.sceneId && c.atSecInScene != null),
  { message: 'Audio cue needs atSec or sceneId+atSecInScene' },
);

const MusicDuckSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  volume: z.number().min(0).max(1),
});

const SceneRoleSchema = z.enum([
  'recognition',
  'chaos',
  'hope',
  'payoff',
  'validation',
  'story',
  'app-glimpse',
  'app-screen',
  'brand',
]);

export const TAGLINE_VARIANTS = {
  A: 'Morgnar kan kännas så här.',
  B: 'Mer lugn. Mindre tjat.',
  C: 'En bättre morgon börjar tillsammans.',
  D: 'Det här är bara början.',
  E: '',
};

const TaglineVariantIdSchema = z.enum(['A', 'B', 'C', 'D', 'E']);

const ColourGradeSchema = z.enum(['cool', 'neutral', 'warm']).optional();

const SceneSchema = z.object({
  id: z.string().min(1),
  duration: z.number().int().refine((v) => v === 5 || v === 10, {
    message: 'Pika scene duration must be 5 or 10 seconds',
  }),
  renderDuration: z.number().positive().optional(),
  role: SceneRoleSchema.optional(),
  skipPika: z.boolean().default(false),
  validationScene: z.boolean().default(false),
  duckMusic: z.boolean().default(false),
  colourGrade: ColourGradeSchema,
  transitionDuration: z.number().min(0).max(3).optional(),
  pikaPrompt: z.string().min(10).optional(),
  swedishText: z.string().default(''),
  showCaption: z.boolean().default(true),
  transition: z.enum([...TRANSITIONS]).default('fade'),
  outputFilename: z.string().min(1),
  referenceImage: z.string().optional(),
  appScreenshot: z.string().optional(),
  appMotion: z.enum(['none', 'push-in', 'zoom-star']).default('none'),
  endBoard: z.boolean().default(false),
  cartoonScene: z.boolean().default(false),
  soundCue: SoundCueSchema,
  audioCues: z.array(AudioCueNoteSchema).optional(),
}).refine(
  (scene) => scene.skipPika || scene.cartoonScene || (scene.pikaPrompt && scene.pikaPrompt.length >= 10),
  { message: 'pikaPrompt is required unless skipPika or cartoonScene is true' },
);

export const ManifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  defaultSceneDuration: z.number().int().refine((v) => v === 5 || v === 10).default(5),
  outputBasename: z.string().min(1),
  referenceImage: z.string().min(1),
  rawSourceManifest: z.string().min(1).optional(),
  seed: z.number().int().optional(),
  creativeBrief: z.string().optional(),
  taglineVariantDefault: TaglineVariantIdSchema.default('E'),
  taglineVariants: z.record(z.string()).optional(),
  brandUrl: z.string().optional(),
  endBoardShowUrl: z.boolean().default(true),
  endBoardLogoOnly: z.boolean().default(false),
  colourGradeDefault: ColourGradeSchema,
  visualStyle: z.enum(['documentary', 'cartoon']).default('documentary'),
  music: MusicCueSchema,
  ambient: AmbientCueSchema,
  musicDuck: z.array(MusicDuckSchema).optional(),
  sfx: z.array(SfxCueSchema).optional(),
  vo: z.array(SfxCueSchema).optional(),
  scenes: z.array(SceneSchema).min(1),
});

export function resolveTaglineVariants(manifest) {
  return { ...TAGLINE_VARIANTS, ...(manifest.taglineVariants || {}) };
}

export function resolveBrandCaption(manifest, variantId) {
  const key = variantId || manifest.taglineVariantDefault || 'E';
  const variants = resolveTaglineVariants(manifest);
  return variants[key]?.trim() || '';
}

export function sceneRenderCaption(manifest, scene, { taglineVariant } = {}) {
  if (scene.role === 'brand') {
    const text = resolveBrandCaption(manifest, taglineVariant);
    return text;
  }
  return sceneCaptionText(scene);
}

export function sceneCaptionText(scene) {
  if (scene.showCaption === false) return '';
  return scene.swedishText?.trim() || '';
}

export function resolveBrandUrl(manifest) {
  return manifest?.brandUrl?.trim() || BRAND_URL;
}

const TRANSITION_OVERLAP_SEC = 0.6;

/** Per-scene transition overlap into the next shot (seconds). */
export function sceneTransitionDurations(scenes, defaultSec = TRANSITION_OVERLAP_SEC) {
  const out = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const d = scenes[i].transitionDuration;
    out.push(d != null ? d : defaultSec);
  }
  return out;
}

/** Scene start times on the final timeline (seconds). */
export function computeSceneStarts(scenes, transitionOverlapSec = TRANSITION_OVERLAP_SEC) {
  const overlaps = sceneTransitionDurations(scenes, transitionOverlapSec);
  const starts = [];
  let t = 0;
  for (let i = 0; i < scenes.length; i++) {
    starts.push(t);
    const dur = sceneRenderDuration(scenes[i]);
    t += dur - (i < scenes.length - 1 ? overlaps[i] : 0);
  }
  return starts;
}

/** Total timeline length with variable transition overlaps. */
export function computeManifestDuration(manifest, defaultTransitionSec = TRANSITION_OVERLAP_SEC) {
  const scenes = manifest.scenes;
  const durations = scenes.map((s) => sceneRenderDuration(s));
  if (durations.length === 0) return 0;
  const overlaps = sceneTransitionDurations(scenes, defaultTransitionSec);
  const overlapSum = overlaps.reduce((a, b) => a + b, 0);
  return durations.reduce((a, b) => a + b, 0) - overlapSum;
}

/** Resolve vo/sfx cues — supports sceneId+atSecInScene or legacy global atSec. */
export function resolveTimedAudioCues(manifest) {
  const starts = computeSceneStarts(manifest.scenes);
  const sceneIndex = new Map(manifest.scenes.map((s, i) => [s.id, i]));

  const resolve = (cue) => {
    let atSec = cue.atSec;
    if (cue.sceneId != null && cue.atSecInScene != null) {
      const idx = sceneIndex.get(cue.sceneId);
      if (idx == null) throw new Error(`Unknown sceneId in audio cue: ${cue.sceneId}`);
      atSec = starts[idx] + cue.atSecInScene;
    }
    if (atSec == null) throw new Error(`Audio cue missing timing: ${cue.file}`);
    return { ...cue, atSec };
  };

  return {
    vo: (manifest.vo || []).map(resolve),
    sfx: (manifest.sfx || []).map(resolve),
  };
}

export function computeAppScreenRatio(manifest, transitionOverlapSec = 0.6) {
  const total = computeManifestDuration(manifest, transitionOverlapSec);
  const durations = manifest.scenes.map((s) => sceneRenderDuration(s));
  const appSec = manifest.scenes
    .filter((s) => s.role === 'app-glimpse' || s.role === 'app-screen')
    .reduce((sum, s) => sum + sceneRenderDuration(s), 0);
  return { appSec, totalSec: total, ratio: total > 0 ? appSec / total : 0 };
}

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

export function countPendingScenes(manifest, state, { includeCompleted = false, sceneId } = {}) {
  return manifest.scenes.filter((scene) => {
    if (sceneId && scene.id !== sceneId) return false;
    const entry = state.scenes?.[scene.id];
    if (!entry) return true;
    if (entry.status === 'completed' && !includeCompleted) return false;
    if (entry.status === 'failed') return true;
    return entry.status !== 'completed';
  });
}

export function planGeneration(manifests, { sceneId } = {}) {
  let totalScenes = 0;
  let pendingScenes = 0;
  const films = [];

  for (const { manifest, state } of manifests) {
    const scope = sceneId
      ? manifest.scenes.filter((s) => s.id === sceneId)
      : manifest.scenes;

    if (sceneId && scope.length === 0) {
      throw new Error(`Scene "${sceneId}" not found in film "${manifest.id}"`);
    }

    const pending = countPendingScenes(manifest, state, { sceneId });
    totalScenes += scope.length;
    pendingScenes += pending.length;
    const app = computeAppScreenRatio(manifest);
    films.push({
      id: manifest.id,
      title: manifest.title,
      totalScenes: scope.length,
      pendingScenes: pending.length,
      completedScenes: scope.length - pending.length,
      pending: pending.map((s) => s.id),
      appScreenPct: Math.round(app.ratio * 100),
      sceneFilter: sceneId || null,
    });
  }

  return { totalScenes, pendingScenes, films };
}
