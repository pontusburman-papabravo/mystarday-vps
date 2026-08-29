'use strict';

/**
 * CHECK A — Pre-release language scan.
 *
 * Case-insensitive scan for user-visible "beta / test / trial / preview /
 * experimental / early access / coming soon" wording. A hit is classified
 * before it is allowed to fail the gate:
 *
 *   A_CONSUMER_UI — rendered, user-visible, shipped consumer/production text
 *   B_INTERNAL    — admin/internal/dev/test/docs/identifier, not shipped prose
 *   C_SAFE        — allowlisted fixture / known non-issue
 *
 * Only A_CONSUMER_UI matches fail the gate. B and C are reported for
 * visibility but never fail on their own.
 *
 * This is a heuristic static scanner, not a full HTML/JS parser. It is a
 * first-pass filter: a PASS here is necessary but not sufficient — the
 * human submission checklist (docs/release/STORE_SUBMISSION_CHECKLIST.md)
 * still requires an actual click-through of the shipped build.
 */

const { CLASS, STATUS } = require('./constants.cjs');
const { loadReleaseComplianceConfig, compileRegexList, matchesAny } = require('./load-config.cjs');
const { expandGlobs, readFileSafe } = require('./fs-utils.cjs');
const { getClosedMarketSurfaces } = require('./market-context.cjs');
const { dispositionForHit, partitionHitsByDisposition, sectionStatusFromHits } = require('./disposition.cjs');
const {
  stripHtmlNonVisible,
  stripJsNonStringCode,
  findQuotedRanges,
  isWithinRanges,
  rangeContaining,
  isCodeComparisonContext,
  lineAndColumnAt,
  rawLineOf,
  collectJsonStrings,
  isStandaloneProseToken,
  fileTypeFor,
} = require('./scan-utils.cjs');

const MULTI_WORD_KEYWORDS = new Set(['early access', 'coming soon']);

/**
 * "test" and "preview" are common English words with everyday, non-pre-release
 * meanings (a hearing test, previewing your week). They only indicate a
 * pre-release/consumer-UI risk when paired with a release-stage word nearby
 * on the same line. Without that pairing they are downgraded to C_SAFE
 * (reported for visibility, never failed) rather than being treated the
 * same as an unambiguous word like "beta".
 */
const AMBIGUOUS_KEYWORDS = new Set(['test', 'preview']);
const AMBIGUOUS_CONTEXT_PATTERN = /\b(version|mode|feature|program|flag|release|only|access|coming|available|build|stage|env(ironment)?|group|cohort)\b/i;

function buildKeywordPatterns(keywords) {
  return keywords.map((keyword) => {
    const escaped = keyword.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const pattern = MULTI_WORD_KEYWORDS.has(keyword.toLowerCase())
      ? escaped.replace(/\s+/g, '\\s+')
      : escaped;
    return { keyword, regex: new RegExp(`\\b${pattern}\\b`, 'gi') };
  });
}

/**
 * Scan a single blob of text for pre-release keywords.
 *
 * @param {string} content raw text
 * @param {object} opts
 * @param {string} opts.filePath repo-relative path, used for path-based classification
 * @param {'html'|'js'|'text'} [opts.fileType]
 * @param {string} [opts.jsonPointer] JSON path, only used for values extracted from JSON files
 * @param {object} [opts.config] pre-loaded config/release-compliance-gate.json contents
 * @param {string} [opts.originalContent] original (unblanked) text used for line snippets
 */
function scanTextForPreReleaseLanguage(content, opts = {}) {
  const { filePath = '(inline)', fileType = 'text', jsonPointer = null, config = {} } = opts;
  const originalContent = opts.originalContent || content;

  const keywords = config.preReleaseKeywords || [
    'beta',
    'test',
    'trial',
    'preview',
    'experimental',
    'early access',
    'coming soon',
  ];
  const adminPatterns = compileRegexList(config.adminOrInternalPathPatterns || []);
  const safeFixturePatterns = compileRegexList(config.safeFixturePatterns || []);
  const safeContextPatterns = compileRegexList(config.preReleaseKeywordSafeContextPatterns || []);

  const scannable =
    fileType === 'html' ? stripHtmlNonVisible(content) : fileType === 'js' ? stripJsNonStringCode(content) : content;

  const patterns = buildKeywordPatterns(keywords);
  const results = [];

  for (const { keyword, regex } of patterns) {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(scannable))) {
      const { line: lineNumber, column } = lineAndColumnAt(scannable, m.index);
      const snippet = rawLineOf(originalContent, lineNumber) || rawLineOf(scannable, lineNumber);

      let classification = CLASS.A_CONSUMER_UI;
      let reason = 'user-visible text match';

      if (matchesAny(filePath, adminPatterns)) {
        classification = CLASS.B_INTERNAL;
        reason = 'file path is admin/internal/dev/test/docs';
      } else if (fileType === 'js') {
        const lineText = scannable.split('\n')[lineNumber - 1] || '';
        const columnInLine = column - 1;
        const quoted = findQuotedRanges(lineText);
        const enclosingQuote = rangeContaining(columnInLine, quoted);
        if (!enclosingQuote) {
          classification = CLASS.B_INTERNAL;
          reason = 'bare identifier/code token, not a quoted UI string';
        } else if (isCodeComparisonContext(lineText.slice(0, enclosingQuote[0]))) {
          classification = CLASS.B_INTERNAL;
          reason = 'string literal used in a code comparison (indexOf/includes/===), not displayed text';
        }
      }

      if (classification === CLASS.A_CONSUMER_UI && !isStandaloneProseToken(scannable, m.index, m[0].length)) {
        classification = CLASS.B_INTERNAL;
        reason = 'part of a compound identifier/CSS-class/path token (e.g. "ccsz-preview"), not a standalone prose word';
      }

      if (
        classification === CLASS.A_CONSUMER_UI &&
        AMBIGUOUS_KEYWORDS.has(keyword.toLowerCase()) &&
        !AMBIGUOUS_CONTEXT_PATTERN.test(snippet)
      ) {
        classification = CLASS.C_SAFE;
        reason = `"${keyword}" is a common English word without a nearby release-stage term (version/mode/feature/…) — legitimate non-pre-release usage`;
      }

      if (classification === CLASS.A_CONSUMER_UI && matchesAny(snippet, safeContextPatterns)) {
        classification = CLASS.C_SAFE;
        reason = 'legitimate store-compliant phrasing (e.g. "free trial" subscription copy, "coming soon" + waitlist for an unlaunched market) — see preReleaseKeywordSafeContextPatterns';
      }

      if (matchesAny(snippet, safeFixturePatterns) || /test fixture/i.test(snippet)) {
        classification = CLASS.C_SAFE;
        reason = 'matches allowlisted safe-fixture pattern (config/release-compliance-gate.json)';
      }

      results.push({
        keyword,
        filePath,
        jsonPointer,
        line: lineNumber,
        snippet: snippet.slice(0, 200),
        classification,
        reason,
      });
    }
  }
  return results;
}

function scanJsonFileForPreReleaseLanguage(repoRoot, filePath, config) {
  const raw = readFileSafe(repoRoot, filePath);
  if (raw == null) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [
      {
        keyword: null,
        filePath,
        line: 0,
        snippet: 'invalid JSON — could not parse for language scan',
        classification: CLASS.B_INTERNAL,
        reason: 'parse_error',
      },
    ];
  }
  const strings = collectJsonStrings(parsed);
  const hits = [];
  for (const { pointer, value } of strings) {
    hits.push(
      ...scanTextForPreReleaseLanguage(value, {
        filePath,
        fileType: 'text',
        jsonPointer: pointer,
        config,
        originalContent: value,
      })
    );
  }
  return hits;
}

/** Run Check A across the repo's consumer-facing surface. */
function runPreReleaseLanguageScan(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const closedMarketSurfaces = getClosedMarketSurfaces(repoRoot, config);
  const globs = config.consumerScanGlobs || [];
  const files = expandGlobs(repoRoot, globs);

  const allHits = [];
  for (const filePath of files) {
    const type = fileTypeFor(filePath);
    if (type === 'json') {
      allHits.push(...scanJsonFileForPreReleaseLanguage(repoRoot, filePath, config));
      continue;
    }
    const content = readFileSafe(repoRoot, filePath);
    if (content == null) continue;
    allHits.push(...scanTextForPreReleaseLanguage(content, { filePath, fileType: type, config }));
  }

  const withDisposition = allHits.map((hit) => dispositionForHit(hit, { config, closedMarketSurfaces }));
  const { blockerHits, reviewHits, notApplicableHits, informationalHits } = partitionHitsByDisposition(withDisposition);
  const status = sectionStatusFromHits({ blockerHits, reviewHits });

  return {
    id: 'A_pre_release_language_scan',
    title: 'A — Pre-release language scan (beta/test/trial/preview/experimental/early access/coming soon)',
    status,
    summary:
      status === STATUS.FAIL
        ? `${blockerHits.length} verified user-visible blocker(s) suggest the app, a language, or a live feature is presented as beta/test/trial/pre-release.`
        : status === STATUS.MANUAL_REVIEW_REQUIRED
          ? `No verified blockers; ${reviewHits.length} consumer-visible hit(s) need human review before submission.`
          : `No verified pre-release blockers in ${files.length} scanned files (${informationalHits.length} internal/safe, ${notApplicableHits.length} closed-market N/A — informational only).`,
    evidence: {
      scannedFiles: files.length,
      globs,
      consumerHits: blockerHits,
      reviewHits,
      notApplicableHits: notApplicableHits.slice(0, 50),
      internalHits: informationalHits.filter((h) => h.classification === CLASS.B_INTERNAL).slice(0, 50),
      safeHits: informationalHits.filter((h) => h.classification === CLASS.C_SAFE).slice(0, 50),
    },
  };
}

module.exports = {
  scanTextForPreReleaseLanguage,
  scanJsonFileForPreReleaseLanguage,
  buildKeywordPatterns,
  runPreReleaseLanguageScan,
};
