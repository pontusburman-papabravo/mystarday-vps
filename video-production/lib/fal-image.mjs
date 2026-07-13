import fs from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';
import { CONFIG } from './config.mjs';
import { parseFalError } from './fal-health.mjs';

/** Fast keyframes — quality is refined by Pika motion pass. */
export const FLUX_MODEL = process.env.FLUX_MODEL || 'fal-ai/flux/schnell';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function configureFal() {
  if (!CONFIG.falKey) {
    throw new Error('FAL_KEY is not set. Copy .env.example to .env and add your fal.ai API key.');
  }
  fal.config({ credentials: CONFIG.falKey });
}

async function pollFluxResult(requestId, { onStatus } = {}) {
  const started = Date.now();
  const timeoutMs = CONFIG.pollTimeoutMs;

  while (Date.now() - started < timeoutMs) {
    const status = await fal.queue.status(FLUX_MODEL, { requestId, logs: true });
    if (onStatus) onStatus(status);

    if (status.status === 'COMPLETED') {
      return fal.queue.result(FLUX_MODEL, { requestId });
    }
    if (status.status === 'FAILED') {
      const detail = status.error || status.logs?.map((l) => l.message).join('; ') || 'Unknown error';
      throw new Error(`Flux generation failed: ${detail}`);
    }
    await sleep(CONFIG.pollIntervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for Flux request ${requestId}`);
}

export async function generateFluxImage({
  prompt,
  imageSize = 'landscape_16_9',
  seed,
  outputFormat = 'png',
}) {
  configureFal();
  const input = {
    prompt,
    image_size: imageSize,
    num_inference_steps: 4,
    guidance_scale: 3.5,
    output_format: outputFormat,
    enable_safety_checker: true,
    acceleration: 'high',
  };
  if (seed != null) input.seed = seed;

  try {
    const { request_id: requestId } = await fal.queue.submit(FLUX_MODEL, { input });
    const result = await pollFluxResult(requestId, {
      onStatus: (status) => {
        if (status.status === 'IN_PROGRESS') process.stdout.write('.');
      },
    });

    const url = result.data?.images?.[0]?.url;
    if (!url) throw new Error('Flux returned no image URL');
    return { url, seed: result.data?.seed, requestId };
  } catch (err) {
    throw new Error(parseFalError(err));
  }
}

export async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status}): ${url}`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

export async function generateAndSaveFluxImage({ prompt, destPath, seed, imageSize }) {
  const { url, seed: usedSeed } = await generateFluxImage({ prompt, seed, imageSize });
  await downloadImage(url, destPath);
  return { destPath, url, seed: usedSeed };
}
