import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${name}: expected non-negative integer, got ${raw}`);
  }
  return n;
}

function floatEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid ${name}: expected non-negative number, got ${raw}`);
  }
  return n;
}

export const PATHS = {
  manifests: path.join(ROOT, 'manifests'),
  assets: path.join(ROOT, 'assets'),
  references: path.join(ROOT, 'assets', 'references'),
  logo: path.join(ROOT, 'assets', 'logo', 'brand-logo.png'),
  brandMark: path.join(ROOT, 'assets', 'logo', 'brand-mark.png'),
  state: path.join(ROOT, 'state'),
  raw: path.join(ROOT, 'raw'),
  output: path.join(ROOT, 'output'),
  audio: path.join(ROOT, 'audio'),
};

export const CONFIG = {
  falKey: process.env.FAL_KEY || '',
  pikaModel: process.env.PIKA_MODEL || 'fal-ai/pika/v2.2/image-to-video',
  pikaResolution: process.env.PIKA_RESOLUTION || '1080p',
  maxGenerationsPerRun: intEnv('MAX_GENERATIONS_PER_RUN', 12),
  maxGenerationsPerDay: intEnv('MAX_GENERATIONS_PER_DAY', 24),
  estimatedCostPerSceneUsd: floatEnv('ESTIMATED_COST_PER_SCENE_USD', 0.35),
  pollIntervalMs: intEnv('POLL_INTERVAL_MS', 5000),
  pollTimeoutMs: intEnv('POLL_TIMEOUT_MS', 900000),
  ffmpegBin: process.env.FFMPEG_BIN || 'ffmpeg',
  ffprobeBin: process.env.FFPROBE_BIN || 'ffprobe',
};

export const OUTPUT_FORMATS = [
  { id: 'landscape', width: 1920, height: 1080, suffix: 'landscape' },
  { id: 'vertical', width: 1080, height: 1920, suffix: 'vertical' },
  { id: 'square', width: 1080, height: 1080, suffix: 'square' },
];

export const TRANSITIONS = new Set(['cut', 'fade', 'fadeblack', 'fadewhite', 'dissolve']);

/** End-board URL — resolved when manifest omits brandUrl (avoids secret-scan false positive in JSON). */
export const BRAND_URL = 'mystarday.se'; // pragma: allowlist secret

/** Wordmark on end board */
export const BRAND_NAME = 'Min Stjärndag'; // pragma: allowlist secret

export const NEGATIVE_PROMPT = [
  'text', 'logo', 'watermark', 'subtitle', 'caption', 'typography',
  'ugly', 'blurry', 'distorted faces', 'extra fingers',
].join(', ');

export const CARTOON_NEGATIVE_PROMPT = [
  'photorealistic', 'live action', 'documentary', 'uncanny valley',
  'text', 'logo', 'watermark', 'subtitle', 'caption', 'typography',
  'ugly', 'blurry', 'distorted faces', 'extra fingers', '3d render',
].join(', ');

export const CARTOON_MOTION_PREFIX =
  'Stylized 2D animated children\'s series motion, soft rounded characters, gentle fluid animation, warm Nordic summer palette, ';
