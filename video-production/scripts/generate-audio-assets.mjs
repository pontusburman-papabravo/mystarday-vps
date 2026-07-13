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
    '-y', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=0.15`,
    '-af', 'afade=t=out:st=0.05:d=0.1,volume=0.4,aformat=channel_layouts=stereo',
    '-c:a', 'aac', '-b:a', '128k', out,
  ]);
}

function ambientBed(out, dur = 45) {
  run([
    '-y', '-f', 'lavfi', '-i', `sine=frequency=196:duration=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=294:duration=${dur}`,
    '-filter_complex',
    '[0:a][1:a]amix=inputs=2,volume=0.04,afade=t=in:st=0:d=2,afade=t=out:st=' + (dur - 3) + ':d=3,aformat=channel_layouts=stereo',
    '-t', String(dur), '-c:a', 'aac', '-b:a', '128k', out,
  ]);
}

function themeBed(out, dur = 45) {
  run([
    '-y', '-f', 'lavfi', '-i', `sine=frequency=262:duration=${dur}`,
    '-af', 'volume=0.06,lowpass=f=800,afade=t=in:st=0:d=3,afade=t=out:st=' + (dur - 4) + ':d=4,aformat=channel_layouts=stereo',
    '-t', String(dur), '-c:a', 'aac', '-b:a', '128k', out,
  ]);
}

function doorSfx(out) {
  run([
    '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.3:color=pink',
    '-af', 'volume=0.15,afade=t=in:st=0:d=0.02,afade=t=out:st=0.2:d=0.08,aformat=channel_layouts=stereo',
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
