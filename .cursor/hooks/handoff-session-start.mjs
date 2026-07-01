#!/usr/bin/env node
/**
 * sessionStart hook — inject handoff pointer when a new local Agent session opens.
 * Note: does NOT run for Cloud Agents started from cursor.com/agents.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  const root = projectRoot(input);
  const latestPath = path.join(root, '.cursor', 'handoff', 'latest.md');

  if (!fs.existsSync(latestPath)) {
    process.stdout.write('{}');
    process.exit(0);
  }

  const stat = fs.statSync(latestPath);
  if (Date.now() - stat.mtimeMs > MAX_AGE_MS) {
    process.stdout.write('{}');
    process.exit(0);
  }

  const context = [
    '## Pågående agent-handoff',
    '',
    'En tidigare session lämnade `.cursor/handoff/latest.md` (max 7 dagar gammal).',
    'Om användaren kör `/handoff-continue` eller ber dig fortsätta: läs den filen först.',
    'Läs även `.cursor/handoff/transcript-snapshot.txt` om den finns och användaren behöver detaljer.',
    'Uppdatera `latest.md` när du avslutar eller innan sessionen blir för lång.'
  ].join('\n');

  process.stdout.write(JSON.stringify({ additional_context: context }));
}

main().catch(() => {
  process.stdout.write('{}');
  process.exit(0);
});
