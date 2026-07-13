#!/usr/bin/env node
/**
 * Generate stylized 2D cartoon keyframes via fal.ai Flux.
 * These stills feed Pika image-to-video for motion — much better than color placeholders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAndSaveFluxImage } from '../lib/fal-image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KEYFRAMES = path.join(ROOT, 'assets', 'references', 'together-keyframes');
const SEED = 42010;

const STYLE = [
  'Premium 2D animated children\'s series style',
  'soft rounded characters, warm Nordic summer palette',
  'clean vector-like shading, gentle outlines',
  'Pixar-storybook quality illustration',
  'no text, no logos, no watermarks',
  'Scandinavian family: mother Sara (teal shirt, brown hair bun)',
  'daughter Ella age 6 (yellow summer pajamas, brown pigtails)',
  'toddler brother in blue onesie',
].join(', ');

const KEYFRAMES_SPEC = [
  {
    file: 'summer-family-cartoon.png',
    dir: path.join(ROOT, 'assets', 'references'),
    prompt: `${STYLE}, family portrait in bright Nordic apartment hallway, summer morning, warm window light, mother Sara with Ella and toddler, friendly establishing shot, 16:9`,
  },
  {
    file: '01-chaos-summer.png',
    prompt: `${STYLE}, morning chaos in apartment hallway 07:52, Ella sits on wooden floor refusing sandals scattered around, Sara stressed standing, toddler crying, breakfast table visible, painful but loving not comedy, wide shot`,
  },
  {
    file: '02-together-phone.png',
    prompt: `${STYLE}, Sara sits on hallway floor at eye level beside Ella, smartphone between them screen down unreadable, both look down together calmly, warm summer light, intimate medium shot`,
  },
  {
    file: '04-brush-teeth.png',
    prompt: `${STYLE}, bathroom scene, Ella brushes teeth independently at sink, Sara watches from doorway with surprised gentle smile, says nothing, soft morning light, medium shot`,
  },
  {
    file: '06-whats-next.png',
    prompt: `${STYLE}, close medium shot hallway, Ella looks up at Sara on floor, Sara has soft knowing closed-lip smile about to speak then stops, phone between them blurred, child protagonist, warm light`,
  },
  {
    file: '08-pack-bag.png',
    prompt: `${STYLE}, sunny hallway, Ella age 6 zips school backpack focused, summer clothes, medium shot side angle`,
  },
  {
    file: '10-friday-movie-pride.png',
    prompt: `${STYLE}, tight close-up Ella age 6 happy proud face, summer morning golden light, joyful speaking expression, shallow depth of field feel in 2D art`,
  },
  {
    file: '11-ella-exit.png',
    prompt: `${STYLE}, open front door summer morning, Ella with backpack putting on sandals smiling back toward Sara inside Nordic home, garden path outside, medium wide shot`,
  },
  {
    file: '12-sara-doorway-relief.png',
    prompt: `${STYLE}, Sara stands in doorway relaxed shoulders, soft smile watching children leave, warm backlight summer garden, portrait medium shot, relieved calm emotion`,
  },
];

async function main() {
  const only = process.argv.find((a) => a.startsWith('--scene='))?.slice('--scene='.length);
  fs.mkdirSync(KEYFRAMES, { recursive: true });

  const specs = KEYFRAMES_SPEC.filter((s) => !only || s.file.includes(only));
  console.log(`Generating ${specs.length} Flux keyframe(s)…\n`);

  for (const spec of specs) {
    const dest = path.join(spec.dir || KEYFRAMES, spec.file);
    if (fs.existsSync(dest) && !process.argv.includes('--force')) {
      console.log(`  skip ${spec.file} (exists — use --force to regenerate)`);
      continue;
    }
    console.log(`  → ${spec.file}`);
    try {
      const { url } = await generateAndSaveFluxImage({
        prompt: spec.prompt,
        destPath: dest,
        seed: SEED,
        imageSize: 'landscape_16_9',
      });
      console.log(`    ✓ ${dest}`);
      console.log(`    ${url}\n`);
    } catch (err) {
      console.error(`    ✗ ${spec.file}: ${err.message}`);
      throw err;
    }
    // Brief pause — avoids transient 403/rate-limit between queue submits.
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('Keyframes ready. Run: npm run generate -- --film together-through-the-morning --confirm');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
