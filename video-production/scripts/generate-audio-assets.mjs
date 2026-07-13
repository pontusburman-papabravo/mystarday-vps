#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO = path.join(__dirname, '..', 'audio');
const FFMPEG = 'ffmpeg';

function run(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pling(out, freq = 880) {
  run([
    '-y', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=0.12`,
    '-af', 'afade=t=out:st=0.04:d=0.06,volume=0.55,aformat=channel_layouts=stereo',
    '-c:a', 'aac', '-b:a', '128k', out,
  ]);
}

function themeBed(out, dur = 45) {
  run([
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=262:duration=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=330:duration=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=392:duration=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=523:duration=${dur}`,
    '-filter_complex',
    [
      '[0:a]volume=0.35[a0]',
      '[1:a]volume=0.28[a1]',
      '[2:a]volume=0.22[a2]',
      '[3:a]volume=0.15[a3]',
      '[a0][a1][a2][a3]amix=inputs=4:duration=first:dropout_transition=0:normalize=0',
      'volume=0.75',
      'lowpass=f=1400',
      'afade=t=in:st=0:d=2.5',
      'afade=t=out:st=' + (dur - 4) + ':d=4',
      'aformat=channel_layouts=stereo',
    ].join(','),
    '-t', String(dur), '-c:a', 'aac', '-b:a', '192k', out,
  ]);
}

function ambientBed(out, dur = 45) {
  run([
    '-y',
    '-f', 'lavfi', '-i', `sine=frequency=196:duration=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=247:duration=${dur}`,
    '-filter_complex',
    '[0:a]volume=0.2[a0];[1:a]volume=0.14[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0,volume=0.4,lowpass=f=500,afade=t=in:st=0:d=2,afade=t=out:st=' + (dur - 3) + ':d=3,aformat=channel_layouts=stereo',
    '-t', String(dur), '-c:a', 'aac', '-b:a', '192k', out,
  ]);
}

function doorSfx(out) {
  run([
    '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.35:color=pink',
    '-af', 'volume=0.35,lowpass=f=800,afade=t=in:st=0:d=0.02,afade=t=out:st=0.22:d=0.1,aformat=channel_layouts=stereo',
    '-c:a', 'aac', out,
  ]);
}

ensureDir(path.join(AUDIO, 'sfx'));
ensureDir(path.join(AUDIO, 'vo'));

pling(path.join(AUDIO, 'sfx', 'check-pling.m4a'), 920);
pling(path.join(AUDIO, 'sfx', 'redeem-pling.m4a'), 740);
doorSfx(path.join(AUDIO, 'sfx', 'door-summer.m4a'));
ambientBed(path.join(AUDIO, 'summer-ambient.m4a'));
themeBed(path.join(AUDIO, 'summer-morning-theme.m4a'));

console.log('Audio assets generated under audio/');
