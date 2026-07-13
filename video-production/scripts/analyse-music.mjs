#!/usr/bin/env node
/**
 * Analyse generated music candidates — writes audio/generated/music-review.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PATHS, CONFIG } from '../lib/config.mjs';

const GENERATED_DIR = path.join(PATHS.audio, 'generated');
const REVIEW_PATH = path.join(GENERATED_DIR, 'music-review.json');

const CANDIDATE_FILES = [
  { id: 'a', slug: 'candidate-a-warm-felt-piano', label: 'Candidate A — Warm Felt Piano' },
  { id: 'b', slug: 'candidate-b-organic-acoustic', label: 'Candidate B — Organic Acoustic' },
  { id: 'c', slug: 'candidate-c-quiet-cinematic', label: 'Candidate C — Quiet Cinematic' },
];

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function probeField(filePath, entries) {
  const result = run(CONFIG.ffprobeBin, [
    '-v', 'error',
    '-show_entries', entries,
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  if (result.status !== 0) return null;
  return result.stdout.trim().split('\n');
}

function measureLoudness(filePath) {
  const result = run(CONFIG.ffmpegBin, [
    '-hide_banner',
    '-i', filePath,
    '-af', 'loudnorm=print_format=json',
    '-f', 'null',
    '-',
  ]);
  const stderr = result.stderr || '';
  const match = stderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function detectSilence(filePath) {
  const result = run(CONFIG.ffmpegBin, [
    '-hide_banner',
    '-i', filePath,
    '-af', 'silencedetect=noise=-40dB:d=0.3',
    '-f', 'null',
    '-',
  ]);
  const stderr = result.stderr || '';
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const totalSilence = ends.reduce((sum, end, i) => sum + (end - (starts[i] || 0)), 0);
  return { silenceRegions: starts.length, totalSilenceSec: Number(totalSilence.toFixed(2)) };
}

function segmentStats(filePath, startSec, endSec) {
  const dur = endSec - startSec;
  const tmp = path.join(GENERATED_DIR, `.seg-${path.basename(filePath)}.m4a`);
  run(CONFIG.ffmpegBin, [
    '-y', '-i', filePath,
    '-ss', String(startSec),
    '-t', String(dur),
    '-c:a', 'aac',
    tmp,
  ]);
  const loud = measureLoudness(tmp);
  fs.existsSync(tmp) && fs.unlinkSync(tmp);
  return {
    startSec,
    endSec,
    integratedLufs: loud?.input_i != null ? Number(loud.input_i) : null,
    truePeak: loud?.input_tp != null ? Number(loud.input_tp) : null,
  };
}

function analyseTrack(candidate) {
  const m4a = path.join(GENERATED_DIR, `${candidate.slug}.m4a`);
  const mp3 = path.join(GENERATED_DIR, `${candidate.slug}.mp3`);
  const filePath = fs.existsSync(m4a) ? m4a : (fs.existsSync(mp3) ? mp3 : null);

  if (!filePath) {
    return { ...candidate, status: 'missing', error: 'File not found — run music:candidates -- --confirm' };
  }

  const probe = probeField(filePath, 'format=duration:stream=channels,sample_rate');
  const durationSec = probe ? Number.parseFloat(probe[0]) : null;
  const channels = probe ? Number.parseInt(probe[1], 10) : null;
  const sampleRate = probe ? Number.parseInt(probe[2], 10) : null;

  const loudness = measureLoudness(filePath);
  const silence = detectSilence(filePath);
  const integratedLufs = loudness?.input_i != null ? Number(loudness.input_i) : null;
  const truePeak = loudness?.input_tp != null ? Number(loudness.input_tp) : null;
  const lra = loudness?.input_lra != null ? Number(loudness.input_lra) : null;

  const third = durationSec ? durationSec / 3 : 15;
  const beginning = durationSec ? segmentStats(filePath, 0, third) : null;
  const middle = durationSec ? segmentStats(filePath, third, third * 2) : null;
  const ending = durationSec ? segmentStats(filePath, third * 2, durationSec) : null;

  const clipping = truePeak != null && truePeak > -0.1;

  return {
    ...candidate,
    status: 'ok',
    file: path.relative(path.join(PATHS.audio, '..'), filePath),
    durationSec: durationSec != null ? Number(durationSec.toFixed(2)) : null,
    stereo: channels === 2,
    channels,
    sampleRate,
    integratedLufs,
    truePeak,
    dynamicRangeLra: lra,
    clipping,
    silence,
    segments: { beginning, middle, ending },
    passesTarget: integratedLufs != null
      && integratedLufs >= -18.5
      && integratedLufs <= -14
      && truePeak != null
      && truePeak < -1,
  };
}

function main() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const tracks = CANDIDATE_FILES.map(analyseTrack);
  const report = {
    analysedAt: new Date().toISOString(),
    target: { integratedLufs: -16, truePeakMax: -1, stereo: true },
    tracks,
    recommendation: tracks.find((t) => t.status === 'ok' && t.passesTarget)?.id
      || tracks.find((t) => t.status === 'ok')?.id
      || null,
  };

  fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${REVIEW_PATH}`);
  for (const t of tracks) {
    if (t.status === 'missing') {
      console.log(`  ${t.label}: MISSING`);
    } else {
      console.log(`  ${t.label}: ${t.durationSec}s, ${t.integratedLufs} LUFS, TP ${t.truePeak} dBTP`);
    }
  }
}

main();
