import fs from 'node:fs';
import path from 'node:path';

export const CONTEXT_CHECK_MARKER = 'HANDOFF_CONTEXT_CHECK';

const DEFAULT_RULES_OVERHEAD = Number.parseInt(
  process.env.CURSOR_HANDOFF_RULES_OVERHEAD_TOKENS || '80000',
  10
);

export function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

export function projectRoot(input) {
  return process.env.CURSOR_PROJECT_DIR
    || process.env.CLAUDE_PROJECT_DIR
    || input.workspace_roots?.[0]
    || process.cwd();
}

export function transcriptPath(input) {
  return process.env.CURSOR_TRANSCRIPT_PATH || input.transcript_path || null;
}

export function contextWindowSize(input) {
  const params = input.model_params || [];
  const ctx = params.find((p) => p.id === 'context');
  if (ctx?.value === '1m') return 1_000_000;
  if (ctx?.value === '200k') return 200_000;
  const fromEnv = Number.parseInt(process.env.CURSOR_HANDOFF_CONTEXT_WINDOW || '', 10);
  if (!Number.isNaN(fromEnv) && fromEnv > 0) return fromEnv;
  return 200_000;
}

export function estimateFromTranscript(filePath, windowSize, rulesOverhead = DEFAULT_RULES_OVERHEAD) {
  const stat = fs.statSync(filePath);
  const conversationTokens = Math.round(stat.size / 4);
  const tokens = conversationTokens + rulesOverhead;
  const percent = Math.min(100, Math.round((tokens / windowSize) * 100));
  return {
    percent,
    tokens,
    window_size: windowSize,
    conversation_tokens: conversationTokens,
    rules_overhead: rulesOverhead,
    source: 'estimated',
    model: null
  };
}

export function stateFromPreCompact(input) {
  const percent = Number(input.context_usage_percent ?? 0);
  return {
    percent,
    tokens: Number(input.context_tokens ?? 0),
    window_size: Number(input.context_window_size ?? contextWindowSize(input)),
    source: 'preCompact',
    model: input.model || input.model_id || null,
    trigger: input.trigger || 'auto',
    conversation_id: input.conversation_id || null
  };
}

export function contextStatePath(root) {
  return path.join(root, '.cursor', 'handoff', 'context-state.json');
}

export function writeContextState(root, state) {
  const filePath = contextStatePath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = {
    ...state,
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function readContextState(root) {
  const filePath = contextStatePath(root);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function buildContextSnapshot(input) {
  const root = projectRoot(input);
  const windowSize = contextWindowSize(input);
  const tPath = transcriptPath(input);

  if (input.context_usage_percent != null && input.hook_event_name === 'preCompact') {
    return writeContextState(root, stateFromPreCompact(input));
  }

  if (tPath && fs.existsSync(tPath)) {
    return writeContextState(root, {
      ...estimateFromTranscript(tPath, windowSize),
      model: input.model || input.model_id || null,
      conversation_id: input.conversation_id || null
    });
  }

  return null;
}

export function formatContextUserMessage(state) {
  if (!state) {
    return [
      'Kunde inte uppskatta kontext.',
      'Klicka på kontext-ringens % bredvid prompten och skriv värdet här.',
      'Eller kör /handoff och fortsätt i ny agent.'
    ].join(' ');
  }

  const src = state.source === 'preCompact' ? 'exakt (Cursor)' : 'uppskattning';
  const lines = [
    `Kontext: ${state.percent}%`,
    `Tokens: ~${state.tokens?.toLocaleString('sv-SE')} / ${state.window_size?.toLocaleString('sv-SE')}`,
    `Källa: ${src}`,
    `Uppdaterad: ${state.updated_at}`
  ];

  if (state.percent >= 75) {
    lines.push('', 'Rekommendation: kör /handoff → ny agent → /handoff-continue');
  } else if (state.percent >= 60) {
    lines.push('', 'Rekommendation: kör /handoff snart om sessionen fortsätter');
  } else {
    lines.push('', 'OK att fortsätta i denna session');
  }

  return lines.join('\n');
}
