#!/usr/bin/env node
/**
 * beforeSubmitPrompt — /context shows % via user_message (no agent call).
 * Also refreshes context-state.json before /handoff runs.
 */
import {
  CONTEXT_CHECK_MARKER,
  buildContextSnapshot,
  formatContextUserMessage,
  readStdin
} from './handoff-context-lib.mjs';

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write('{}');
    process.exit(0);
  }

  const prompt = input.prompt || '';
  const isContextCheck = prompt.includes(CONTEXT_CHECK_MARKER);

  const state = buildContextSnapshot(input);

  if (isContextCheck) {
    process.stdout.write(JSON.stringify({
      continue: false,
      user_message: formatContextUserMessage(state)
    }));
    process.exit(0);
  }

  if (prompt.includes('/handoff') || prompt.includes('handoff/latest.md')) {
    buildContextSnapshot(input);
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exit(0);
});
