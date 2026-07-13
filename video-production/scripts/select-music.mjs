#!/usr/bin/env node
/** Copy selected music candidate to audio/generated/selected-music.m4a */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../lib/config.mjs';
import { parseArgs } from '../lib/cli.mjs';

const SLUGS = {
  a: 'candidate-a-warm-felt-piano',
  b: 'candidate-b-organic-acoustic',
  c: 'candidate-c-quiet-cinematic',
};

function main() {
  const { options } = parseArgs(process.argv.slice(2));
  const key = (options.candidate || 'a').toLowerCase();
  const slug = SLUGS[key];
  if (!slug) {
    console.error(`Unknown candidate "${key}". Use: a, b, or c`);
    process.exit(1);
  }

  const src = path.join(PATHS.audio, 'generated', `${slug}.m4a`);
  const dest = path.join(PATHS.audio, 'generated', 'selected-music.m4a');
  if (!fs.existsSync(src)) {
    console.error(`Missing ${src}. Run: npm run music:candidates -- --confirm`);
    process.exit(1);
  }

  fs.copyFileSync(src, dest);
  console.log(`Selected Candidate ${key.toUpperCase()} → ${dest}`);
}

main();
