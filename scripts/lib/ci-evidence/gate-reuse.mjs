import { createRequire } from 'node:module';
import { collectCiEvidence } from '../../ci-evidence.mjs';
import { EVIDENCE_STATUS } from './evaluate.mjs';
import { assertExtraFilesSubset, loadTestManifest } from './manifest.mjs';

const require = createRequire(import.meta.url);
const { EXTRA_UNIT, EXTRA_DB } = require('../pre-public-release-gate/manifest.cjs');

/**
 * Gate A trust boundary — never trust a JSON file's status field.
 * Re-runs live CI evidence collection + static invariants before skip.
 *
 * @param {object} options
 * @param {string} options.root
 * @param {string} options.candidateSha
 * @param {import('./gh-fetch.mjs').GhDeps} [options.deps]
 * @param {object} [options.config]
 */
export function validateCiEvidenceForGateReuse(options) {
  const { root, candidateSha, deps, config } = options;

  if (!candidateSha) {
    return {
      status: EVIDENCE_STATUS.NOT_VERIFIED,
      reason: 'candidate_sha_missing',
      head_sha: null,
    };
  }

  const manifest = loadTestManifest(root);
  const extraSubset = assertExtraFilesSubset(manifest, EXTRA_UNIT, EXTRA_DB);
  if (!extraSubset.ok) {
    return {
      status: EVIDENCE_STATUS.REUSE_FORBIDDEN,
      reason: 'extra_files_not_in_test_gate_manifest',
      head_sha: candidateSha,
      missing_unit: extraSubset.missingUnit,
      missing_db: extraSubset.missingDb,
      test_manifest_sha256: manifest.sha256,
    };
  }

  const live = collectCiEvidence({
    root,
    headSha: candidateSha,
    deps,
    config,
  });

  if (live.head_sha !== candidateSha) {
    return {
      ...live,
      status: EVIDENCE_STATUS.REUSE_FORBIDDEN,
      reason: 'candidate_sha_mismatch',
      candidate_sha: candidateSha,
    };
  }

  return live;
}
