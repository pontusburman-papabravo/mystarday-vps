#!/usr/bin/env node
'use strict';

/**
 * Fail unless workflow runs from protected main at the expected SHA.
 * Used before any step that reads RC1_QA_DATABASE_URL.
 *
 * Env: GITHUB_REF, GITHUB_SHA, RC1_EXPECTED_SHA (required when RC1_ENFORCE_MAIN=1)
 */
const ref = process.env.GITHUB_REF || '';
const sha = process.env.GITHUB_SHA || '';
const expectedSha = (process.env.RC1_EXPECTED_SHA || '').trim();

if (process.env.RC1_ENFORCE_MAIN !== '1') {
  process.exit(0);
}

if (ref !== 'refs/heads/main') {
  console.error('[rc1-gate-guard] refused: not refs/heads/main (got %s)', ref || '(empty)');
  process.exit(1);
}

if (!expectedSha) {
  console.error('[rc1-gate-guard] refused: RC1_EXPECTED_SHA required');
  process.exit(1);
}

if (sha !== expectedSha) {
  console.error('[rc1-gate-guard] refused: GITHUB_SHA does not match RC1_EXPECTED_SHA');
  process.exit(1);
}

console.log('[rc1-gate-guard] main + SHA ok');
