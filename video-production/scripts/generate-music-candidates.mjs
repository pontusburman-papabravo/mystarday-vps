#!/usr/bin/env node
/**
 * Generate three ElevenLabs music candidates via fal.ai.
 * Billable — requires --confirm flag.
 *
 * Model: fal-ai/elevenlabs/music
 * Pricing: $0.80 per output minute (rounded up per track)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';
import { PATHS, CONFIG } from '../lib/config.mjs';
import { configureFal } from '../lib/fal-image.mjs';
import { runFfmpeg } from '../lib/ffmpeg.mjs';
import { parseArgs } from '../lib/cli.mjs';

const MUSIC_MODEL = 'fal-ai/elevenlabs/music';
const MUSIC_LENGTH_MS = 45000;
const COST_PER_MINUTE_USD = 0.8;

const CANDIDATES = [
  {
    id: 'a',
    slug: 'candidate-a-warm-felt-piano',
    label: 'Candidate A — Warm Felt Piano',
    prompt: [
      'Warm Scandinavian acoustic instrumental for a calm family morning commercial.',
      'Felt piano lead, very sparse opening, gentle hope, no vocals, no choir, no lyrics.',
      'Honest, quiet, human, modern, hopeful. Not trailer music, not children TV, not ukulele ad.',
      'Soft resolved ending. 45 seconds total arc: sparse pulse, piano enters, brief silence room at midpoint, warm return, soft close.',
    ].join(' '),
  },
  {
    id: 'b',
    slug: 'candidate-b-organic-acoustic',
    label: 'Candidate B — Organic Acoustic',
    prompt: [
      'Organic Scandinavian morning instrumental. Muted acoustic guitar and soft cello, light felt piano.',
      'Instrumental only, no vocals. Documentary warmth, not celebratory, not epic build.',
      'Introduce gentle acoustic rhythm only in the second half. Leave space for natural home sounds early.',
      '45 seconds, premium family film underscore, hopeful but restrained.',
    ].join(' '),
  },
  {
    id: 'c',
    slug: 'candidate-c-quiet-cinematic',
    label: 'Candidate C — Quiet Cinematic',
    prompt: [
      'Quiet cinematic Scandinavian underscore for an emotional parent relief moment.',
      'Felt piano, distant soft strings, minimal organic percussion only late, never loud.',
      'Instrumental, no vocals, no choir, no whistles. Intimate, observed, not manipulated.',
      '45 seconds: near-silent opening, slow warmth, dip for dialogue space, gentle resolve.',
    ].join(' '),
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollMusicResult(requestId) {
  const started = Date.now();
  while (Date.now() - started < CONFIG.pollTimeoutMs) {
    const status = await fal.queue.status(MUSIC_MODEL, { requestId, logs: true });
    if (status.status === 'COMPLETED') {
      return fal.queue.result(MUSIC_MODEL, { requestId });
    }
    if (status.status === 'FAILED') {
      throw new Error(`Music generation failed: ${status.error || 'unknown'}`);
    }
    await sleep(CONFIG.pollIntervalMs);
  }
  throw new Error(`Timed out waiting for music request ${requestId}`);
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

function convertMp3ToM4a(mp3Path, m4aPath) {
  runFfmpeg([
    '-y', '-i', mp3Path,
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
    m4aPath,
  ], { label: `convert ${path.basename(m4aPath)}` });
}

function printCostEstimate() {
  const minutesPerTrack = Math.ceil(MUSIC_LENGTH_MS / 60000);
  const totalMinutes = minutesPerTrack * CANDIDATES.length;
  const estimatedUsd = totalMinutes * COST_PER_MINUTE_USD;

  console.log('\n=== Billable fal.ai music generation ===');
  console.log(`Model:              ${MUSIC_MODEL}`);
  console.log(`Candidates:         ${CANDIDATES.length} (A, B, C only)`);
  console.log(`Length per track:   ${MUSIC_LENGTH_MS / 1000}s`);
  console.log(`Billed minutes:     ${totalMinutes} (${minutesPerTrack} min × ${CANDIDATES.length} tracks, rounded up)`);
  console.log(`Estimated cost:     ~$${estimatedUsd.toFixed(2)} USD`);
  console.log('\nFiles affected:');
  for (const c of CANDIDATES) {
    console.log(`  audio/generated/${c.slug}.mp3`);
    console.log(`  audio/generated/${c.slug}.m4a`);
  }
  console.log('  audio/generated/music-manifest.json');
  console.log('\nAfter generation, run: npm run music:analyse');
  console.log('Select track: npm run music:select -- --candidate a|b|c');
  console.log('\nRe-run with --confirm to generate.\n');
}

async function generateCandidate(candidate) {
  const outDir = path.join(PATHS.audio, 'generated');
  fs.mkdirSync(outDir, { recursive: true });

  const mp3Path = path.join(outDir, `${candidate.slug}.mp3`);
  const m4aPath = path.join(outDir, `${candidate.slug}.m4a`);

  console.log(`\n→ ${candidate.label}`);
  const { request_id: requestId } = await fal.queue.submit(MUSIC_MODEL, {
    input: {
      prompt: candidate.prompt,
      music_length_ms: MUSIC_LENGTH_MS,
      force_instrumental: true,
      output_format: 'mp3_44100_128',
    },
  });
  console.log(`  request ${requestId}`);

  const result = await pollMusicResult(requestId);
  const url = result.data?.audio?.url;
  if (!url) throw new Error('No audio.url in response');

  await downloadFile(url, mp3Path);
  convertMp3ToM4a(mp3Path, m4aPath);
  console.log(`  ✓ ${m4aPath}`);

  return { ...candidate, mp3Path, m4aPath, requestId, url };
}

async function main() {
  const { flags, options } = parseArgs(process.argv.slice(2));

  printCostEstimate();

  if (!flags.has('confirm')) {
    console.log('Aborted — pass --confirm to run billable generation.');
    process.exit(0);
  }

  configureFal();

  const generated = [];
  for (const candidate of CANDIDATES) {
    generated.push(await generateCandidate(candidate));
  }

  const manifestPath = path.join(PATHS.audio, 'generated', 'music-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    model: MUSIC_MODEL,
    generatedAt: new Date().toISOString(),
    musicLengthMs: MUSIC_LENGTH_MS,
    candidates: generated.map((g) => ({
      id: g.id,
      slug: g.slug,
      label: g.label,
      m4a: path.relative(path.join(PATHS.audio, '..'), g.m4aPath),
      requestId: g.requestId,
    })),
  }, null, 2)}\n`);

  console.log(`\nDone. Manifest: ${manifestPath}`);
  console.log('Run: npm run music:analyse && npm run music:select -- --candidate a');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
