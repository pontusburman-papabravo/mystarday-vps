import { configureFal } from './fal-image.mjs';
import { fal } from '@fal-ai/client';

/** Fail fast when fal.ai account cannot bill (avoids infinite IN_QUEUE hangs). */
export async function assertFalAccountReady() {
  configureFal();
  try {
    const { request_id: requestId } = await fal.queue.submit('fal-ai/flux/schnell', {
      input: {
        prompt: 'solid blue square, minimal',
        image_size: 'square',
        num_inference_steps: 1,
        num_images: 1,
      },
    });
    await fal.queue.cancel('fal-ai/flux/schnell', { requestId });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/exhausted balance|user is locked|insufficient/i.test(msg)) {
      throw new Error(
        'fal.ai account balance exhausted. Top up at https://fal.ai/dashboard/billing then re-run.',
      );
    }
    // Other submit errors (rate limit, etc.) — surface as-is.
    if (!/cancel/i.test(msg)) throw err;
  }
}

export function parseFalError(err) {
  const msg = err?.message || String(err);
  if (/exhausted balance|user is locked|insufficient/i.test(msg)) {
    return 'fal.ai balance exhausted — top up at https://fal.ai/dashboard/billing';
  }
  return msg;
}
