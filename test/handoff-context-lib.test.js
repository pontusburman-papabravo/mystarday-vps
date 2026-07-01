const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CONTEXT_CHECK_MARKER,
  contextWindowSize,
  estimateFromTranscript,
  formatContextUserMessage,
  readContextState,
  resolveContextState,
  stateFromPreCompact,
  writeContextState
} = require('../.cursor/hooks/handoff-context-lib.mjs');

describe('handoff-context-lib', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('CONTEXT_CHECK_MARKER is stable', () => {
    assert.equal(CONTEXT_CHECK_MARKER, 'HANDOFF_CONTEXT_CHECK');
  });

  test('contextWindowSize reads model_params', () => {
    assert.equal(contextWindowSize({ model_params: [{ id: 'context', value: '1m' }] }), 1_000_000);
    assert.equal(contextWindowSize({ model_params: [{ id: 'context', value: '200k' }] }), 200_000);
    assert.equal(contextWindowSize({}), 200_000);
  });

  test('estimateFromTranscript scales file size + rules overhead', () => {
    const transcript = path.join(tmpDir, 'transcript.txt');
    fs.writeFileSync(transcript, 'a'.repeat(4000));
    const result = estimateFromTranscript(transcript, 200_000, 80_000);
    assert.equal(result.conversation_tokens, 1000);
    assert.equal(result.tokens, 81_000);
    assert.equal(result.source, 'estimated');
    assert.ok(result.percent > 0);
  });

  test('stateFromPreCompact preserves exact Cursor values', () => {
    const state = stateFromPreCompact({
      context_usage_percent: 55,
      context_tokens: 110_000,
      context_window_size: 200_000,
      model: 'claude-sonnet-4',
      trigger: 'manual'
    });
    assert.equal(state.percent, 55);
    assert.equal(state.tokens, 110_000);
    assert.equal(state.source, 'preCompact');
  });

  test('writeContextState and readContextState round-trip', () => {
    const written = writeContextState(tmpDir, { percent: 42, tokens: 84_000, source: 'estimated' });
    const read = readContextState(tmpDir);
    assert.equal(read.percent, 42);
    assert.equal(read.updated_at, written.updated_at);
  });

  test('formatContextUserMessage recommends handoff at 75%+', () => {
    const msg = formatContextUserMessage({
      percent: 80,
      tokens: 160_000,
      window_size: 200_000,
      source: 'preCompact',
      updated_at: new Date().toISOString()
    });
    assert.match(msg, /80%/);
    assert.match(msg, /\/handoff/);
  });

  test('formatContextUserMessage notes stale cached source', () => {
    const msg = formatContextUserMessage({
      percent: 50,
      tokens: 100_000,
      window_size: 200_000,
      source: 'cached_stale',
      updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    });
    assert.match(msg, /inaktuell/);
  });

  test('resolveContextState falls back to cached state without transcript', () => {
    writeContextState(tmpDir, {
      percent: 33,
      tokens: 66_000,
      window_size: 200_000,
      source: 'estimated'
    });
    const state = resolveContextState({ workspace_roots: [tmpDir] });
    assert.equal(state.percent, 33);
    assert.equal(state.source, 'cached');
  });

  test('resolveContextState prefers fresh transcript estimate', () => {
    const transcript = path.join(tmpDir, 'transcript.txt');
    fs.writeFileSync(transcript, 'x'.repeat(8000));
    writeContextState(tmpDir, { percent: 10, tokens: 20_000, source: 'cached' });

    const state = resolveContextState({
      workspace_roots: [tmpDir],
      transcript_path: transcript,
      model_params: [{ id: 'context', value: '200k' }]
    });
    assert.equal(state.source, 'estimated');
    assert.ok(state.percent > 10);
  });
});

describe('handoff hooks (integration)', () => {
  let tmpDir;
  let transcriptPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-hook-'));
    transcriptPath = path.join(tmpDir, 'transcript.txt');
    fs.writeFileSync(transcriptPath, 'y'.repeat(16000));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('beforeSubmitPrompt /context returns continue:false', async () => {
    const { spawnSync } = require('node:child_process');
    const input = JSON.stringify({
      prompt: 'HANDOFF_CONTEXT_CHECK',
      workspace_roots: [tmpDir],
      transcript_path: transcriptPath,
      model_params: [{ id: 'context', value: '200k' }]
    });
    const result = spawnSync('node', ['.cursor/hooks/handoff-before-prompt.mjs'], {
      input,
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    const out = JSON.parse(result.stdout);
    assert.equal(out.continue, false);
    assert.match(out.user_message, /Kontext:/);
  });

  test('preCompact at threshold writes latest.md', async () => {
    const { spawnSync } = require('node:child_process');
    const input = JSON.stringify({
      context_usage_percent: 76,
      context_tokens: 152_000,
      context_window_size: 200_000,
      workspace_roots: [tmpDir],
      trigger: 'auto'
    });
    const result = spawnSync('node', ['.cursor/hooks/handoff-pre-compact.mjs'], {
      input,
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
    const out = JSON.parse(result.stdout);
    assert.match(out.user_message, /Handoff-snapshot sparad/);
    assert.ok(fs.existsSync(path.join(tmpDir, '.cursor', 'handoff', 'latest.md')));
  });
});
