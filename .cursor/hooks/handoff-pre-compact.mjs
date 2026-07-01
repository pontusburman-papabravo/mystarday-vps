#!/usr/bin/env node
/**
 * preCompact hook — snapshot transcript + prompt user before context compaction.
 * Threshold: CURSOR_HANDOFF_THRESHOLD (default 75) context_usage_percent.
 *
 * Triggers:
 * - Automatic: Cursor compacts context (usually near context limit)
 * - Manual: user runs /summarize or /compress (trigger === "manual")
 */
import fs from 'node:fs';
import path from 'node:path';

const THRESHOLD = Number.parseInt(process.env.CURSOR_HANDOFF_THRESHOLD || '75', 10);
const SNAPSHOT_MAX_CHARS = 120_000;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function projectRoot(input) {
  return process.env.CURSOR_PROJECT_DIR
    || process.env.CLAUDE_PROJECT_DIR
    || input.workspace_roots?.[0]
    || process.cwd();
}

function transcriptPath(input) {
  return process.env.CURSOR_TRANSCRIPT_PATH || input.transcript_path || null;
}

function readTranscriptTail(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const fd = fs.openSync(filePath, 'r');
    const readLen = Math.min(stat.size, SNAPSHOT_MAX_CHARS);
    const buf = Buffer.alloc(readLen);
    fs.readSync(fd, buf, 0, readLen, Math.max(0, stat.size - readLen));
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

function isoNow() {
  return new Date().toISOString();
}

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write(JSON.stringify({ user_message: 'Handoff hook: invalid JSON input.' }));
    process.exit(0);
  }

  const percent = Number(input.context_usage_percent ?? 0);
  const trigger = input.trigger || 'auto';
  const root = projectRoot(input);
  const handoffDir = path.join(root, '.cursor', 'handoff');
  const latestPath = path.join(handoffDir, 'latest.md');
  const snapshotPath = path.join(handoffDir, 'transcript-snapshot.txt');
  const shouldAct = percent >= THRESHOLD || trigger === 'manual';

  if (!shouldAct) {
    process.stdout.write('{}');
    process.exit(0);
  }

  fs.mkdirSync(handoffDir, { recursive: true });

  const tPath = transcriptPath(input);
  const snapshot = tPath ? readTranscriptTail(tPath) : null;
  if (snapshot) {
    fs.writeFileSync(snapshotPath, snapshot, 'utf8');
  }

  const header = [
    '# Agent handoff (auto-snapshot)',
    '',
    `> Generated: ${isoNow()}`,
    `> Trigger: ${trigger} | Context: ${percent}% (${input.context_tokens ?? '?'} / ${input.context_window_size ?? '?'} tokens)`,
    `> Conversation: ${input.conversation_id || 'unknown'}`,
    `> Model: ${input.model || input.model_id || 'unknown'}`,
    '',
    '## Nästa agent — gör så här',
    '',
    '1. Starta **ny** Agent (lokal) eller ny Cloud Agent',
    '2. Kör slash-kommandot `/handoff-continue`',
    '3. Om snapshot finns: be agenten läsa `.cursor/handoff/transcript-snapshot.txt` för rådetaljer',
    '',
    '## Mål',
    '',
    '_Fyll i manuellt med `/handoff` om denna auto-snapshot saknar sammanfattning._',
    '',
    '## Klart',
    '',
    '- (okänt — kör `/handoff` för strukturerad sammanfattning)',
    '',
    '## Kvar',
    '',
    '- (okänt)',
    '',
    '## Viktiga filer',
    '',
    '- (okänt)',
    '',
    '## Beslut / constraints',
    '',
    '- (okänt)',
    ''
  ].join('\n');

  fs.writeFileSync(latestPath, header, 'utf8');

  const userMessage = [
    `Kontext ${percent}% — handoff-snapshot sparad.`,
    'Starta en NY agent och kör `/handoff-continue`.',
    'Kör `/handoff` först om du vill att nuvarande agent skriver en bättre sammanfattning innan du byter.',
    `Filer: .cursor/handoff/latest.md${snapshot ? ' + transcript-snapshot.txt' : ''}`
  ].join(' ');

  process.stdout.write(JSON.stringify({ user_message: userMessage }));
}

main().catch((err) => {
  process.stderr.write(`handoff-pre-compact: ${err.message}\n`);
  process.stdout.write('{}');
  process.exit(0);
});
