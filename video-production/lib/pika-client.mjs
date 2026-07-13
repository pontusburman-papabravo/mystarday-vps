import fs from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';
import { CONFIG, NEGATIVE_PROMPT } from './config.mjs';
import { PATHS } from './config.mjs';

export function configureFal() {
  if (!CONFIG.falKey) {
    throw new Error('FAL_KEY is not set. Copy .env.example to .env and add your fal.ai API key.');
  }
  fal.config({ credentials: CONFIG.falKey });
}

export async function uploadReferenceImage(imagePath) {
  configureFal();
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const file = new File([buffer], path.basename(imagePath), { type: mime });
  return fal.storage.upload(file);
}

export async function submitScene({ prompt, referenceImagePath, duration, resolution, seed }) {
  configureFal();
  const imageUrl = await uploadReferenceImage(referenceImagePath);

  const input = {
    image_url: imageUrl,
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    resolution,
    duration,
  };
  if (seed != null) input.seed = seed;

  const { request_id: requestId } = await fal.queue.submit(CONFIG.pikaModel, { input });
  return { requestId, imageUrl };
}

export async function pollUntilComplete(requestId, { onStatus } = {}) {
  configureFal();
  const started = Date.now();

  while (Date.now() - started < CONFIG.pollTimeoutMs) {
    const status = await fal.queue.status(CONFIG.pikaModel, {
      requestId,
      logs: true,
    });

    if (onStatus) onStatus(status);

    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(CONFIG.pikaModel, { requestId });
      return result;
    }

    if (status.status === 'FAILED') {
      const detail = status.error || status.logs?.map((l) => l.message).join('; ') || 'Unknown error';
      throw new Error(`Pika generation failed for request ${requestId}: ${detail}`);
    }

    await sleep(CONFIG.pollIntervalMs);
  }

  throw new Error(`Timed out after ${CONFIG.pollTimeoutMs}ms waiting for request ${requestId}`);
}

export async function downloadVideo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download video (${res.status}): ${url}`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
