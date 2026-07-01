#!/usr/bin/env node
/**
 * stop hook — refresh estimated context % after each local Agent turn.
 */
import { buildContextSnapshot, readStdin } from './handoff-context-lib.mjs';

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  buildContextSnapshot(input);
  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exit(0);
});
