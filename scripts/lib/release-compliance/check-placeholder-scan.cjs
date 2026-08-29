'use strict';

/**
 * CHECK C — Placeholder / review-unsafe copy scan.
 *
 * Scans the same consumer-facing surface as Check A (shipped UI/i18n).
 *
 * Historical submission/review docs (config → reviewPackageDocs) are NOT
 * blocking scan targets — they may contain sandbox/beta/rejected notes by
 * design. They are verified for presence in check-submission-metadata.cjs
 * only.
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
  rangeContaining,
  isCodeComparisonContext,
  isBareKeywordFunctionArg,
  lineAndColumnAt,
  rawLineOf,
  isStandaloneProseToken,
  fileTypeFor,
} = require('./scan-utils.cjs');

function buildPlaceholderPatterns(keywords) {
  return keywords.map((keyword) => {
    const isPhrase = /\s/.test(keyword);
    const escaped = keyword.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const boundary = isPhrase ? escaped : `\\b${escaped}\\b`;
    return { keyword, regex: new RegExp(boundary, 'gi') };
  });
}

/**
 * Pure classifier for a single blob of text (used directly by regression tests
 * and by the consumer scan surface below).
 */
function scanTextForPlaceholders(content, opts = {}) {
  const { filePath = '(inline)', fileType = 'text', config = {} } = opts;
  const originalContent = opts.originalContent || content;

  const keywords = config.placeholderKeywords || [
    'TODO',
    'FIXME',
    'lorem ipsum',
    'example.com',
    'your review password',
    'not implemented',
    'placeholder',
    'sandbox',
    'staging',
    'dev only',
  ];
  const adminPatterns = compileRegexList(config.adminOrInternalPathPatterns || []);
  const safeFixturePatterns = compileRegexList(config.safeFixturePatterns || []);
  const safeContextPatterns = compileRegexList(config.placeholderScanSafeContextPatterns || []);

  const scannable =
    fileType === 'html' ? stripHtmlNonVisible(content) : fileType === 'js' ? stripJsNonStringCode(content) : content;

  const patterns = buildPlaceholderPatterns(keywords);
  const results = [];

  for (const { keyword, regex } of patterns) {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(scannable))) {
      const { line: lineNumber, column } = lineAndColumnAt(scannable, m.index);
      const snippet = rawLineOf(originalContent, lineNumber) || rawLineOf(scannable, lineNumber);

      let classification = CLASS.A_CONSUMER_UI;
      let reason = 'placeholder text in shipped consumer surface';

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
        } else {
          const quotedContent = lineText.slice(enclosingQuote[0] + 1, enclosingQuote[1] - 1);
          if (isBareKeywordFunctionArg(lineText.slice(0, enclosingQuote[0]), quotedContent, keyword)) {
            classification = CLASS.B_INTERNAL;
            reason = 'bare keyword passed as a function argument (internal state/id), not a UI phrase';
          }
        }
      }

      if (
        classification === CLASS.A_CONSUMER_UI &&
        fileType !== 'markdown' &&
        !isStandaloneProseToken(scannable, m.index, m[0].length)
      ) {
        classification = CLASS.B_INTERNAL;
        reason = 'part of a compound identifier/attribute name (e.g. "data-i18n-placeholder"), not a standalone prose word';
      }

      if (classification === CLASS.A_CONSUMER_UI && matchesAny(snippet, safeContextPatterns)) {
        classification = CLASS.C_SAFE;
        reason = 'legitimate code usage (e.g. HTML input placeholder attribute), not review-unsafe copy — see placeholderScanSafeContextPatterns';
      }

      if (matchesAny(snippet, safeFixturePatterns) || /test fixture/i.test(snippet)) {
        classification = CLASS.C_SAFE;
        reason = 'explicitly marked test fixture / allowlisted pattern';
      }

      results.push({
        keyword,
        filePath,
        line: lineNumber,
        snippet: snippet.slice(0, 200),
        classification,
        reason,
      });
    }
  }
  return results;
}

function runPlaceholderScan(repoRoot) {
  const config = loadReleaseComplianceConfig(repoRoot);
  const closedMarketSurfaces = getClosedMarketSurfaces(repoRoot, config);
  const consumerGlobs = config.consumerScanGlobs || [];
  const consumerFiles = expandGlobs(repoRoot, consumerGlobs).filter((f) => !f.endsWith('.json'));

  const allHits = [];

  for (const filePath of consumerFiles) {
    const content = readFileSafe(repoRoot, filePath);
    if (content == null) continue;
    allHits.push(
      ...scanTextForPlaceholders(content, { filePath, fileType: fileTypeFor(filePath), config })
    );
  }

  const withDisposition = allHits.map((hit) => dispositionForHit(hit, { config, closedMarketSurfaces }));
  const { blockerHits, reviewHits, notApplicableHits, informationalHits } = partitionHitsByDisposition(withDisposition);
  const status = sectionStatusFromHits({ blockerHits, reviewHits });

  return {
    id: 'C_placeholder_review_unsafe_copy_scan',
    title: 'C — Placeholder / review-unsafe copy scan',
    status,
    summary:
      status === STATUS.FAIL
        ? `${blockerHits.length} verified placeholder/review-unsafe hit(s) in shipped consumer copy.`
        : status === STATUS.MANUAL_REVIEW_REQUIRED
          ? `No verified blockers; ${reviewHits.length} consumer-visible hit(s) need human review.`
          : `No verified placeholders in ${consumerFiles.length} consumer files (${informationalHits.length} internal/safe, ${notApplicableHits.length} closed-market N/A — informational only). Historical docs are evidence-only and not scanned for blocking.`,
    evidence: {
      scannedConsumerFiles: consumerFiles.length,
      scannedSubmissionDocs: 0,
      consumerHits: blockerHits,
      reviewHits,
      notApplicableHits: notApplicableHits.slice(0, 50),
      internalHits: informationalHits.filter((h) => h.classification === CLASS.B_INTERNAL).slice(0, 50),
      safeHits: informationalHits.filter((h) => h.classification === CLASS.C_SAFE).slice(0, 50),
    },
  };
}

module.exports = { scanTextForPlaceholders, runPlaceholderScan, buildPlaceholderPatterns };
