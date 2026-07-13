#!/usr/bin/env node
/**
 * Placeholder Swedish VO via Edge TTS — replace with human recordings before App Store ship.
 * Ella: Sofie + light pitch; Sara: Sofie warm pace.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VO_DIR = path.join(__dirname, '..', 'audio', 'vo');
const EDGE = process.env.EDGE_TTS_BIN || `${process.env.HOME}/.local/bin/edge-tts`;

const LINES = [
  { file: 'ella-sandals.m4a', voice: 'sv-SE-SofieNeural', text: 'Jag hittar inte mina sandaler!', child: true },
  { file: 'sara-dress-1.m4a', voice: 'sv-SE-SofieNeural', text: 'Nu måste vi klä på oss.', child: false },
  { file: 'sara-late.m4a', voice: 'sv-SE-SofieNeural', text: 'Vi kommer att bli sena.', child: false },
  { file: 'ella-whats-next.m4a', voice: 'sv-SE-SofieNeural', text: 'Vad är nästa?', child: true },
  { file: 'ella-friday-movie.m4a', voice: 'sv-SE-SofieNeural', text: 'Jag får välja fredagsfilm!', child: true },
  { file: 'sara-vad-mysigt.m4a', voice: 'sv-SE-SofieNeural', text: 'Vad mysigt.', child: false },
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr}`);
}

fs.mkdirSync(VO_DIR, { recursive: true });

for (const line of LINES) {
  const mp3 = path.join(VO_DIR, line.file.replace('.m4a', '.mp3'));
  const out = path.join(VO_DIR, line.file);
  run(EDGE, ['--voice', line.voice, '--text', line.text, '--write-media', mp3]);
  const af = line.child
    ? 'highpass=f=120,lowpass=f=10000,volume=0.92'
    : 'highpass=f=100,lowpass=f=9000,volume=0.88';
  run('ffmpeg', ['-y', '-i', mp3, '-af', af, '-c:a', 'aac', '-b:a', '128k', out]);
  fs.unlinkSync(mp3);
  console.log(`  ✓ ${line.file}`);
}

console.log('VO generated under audio/vo/');
