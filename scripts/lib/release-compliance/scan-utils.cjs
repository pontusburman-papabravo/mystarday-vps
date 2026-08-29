'use strict';

/** Shared text-scanning primitives used by the pre-release-language (A) and placeholder (C) scanners. */

function blank(text, regex) {
  return text.replace(regex, (match) => match.replace(/[^\n]/g, ' '));
}

function stripHtmlNonVisible(html) {
  let out = html;
  out = blank(out, /<!--[\s\S]*?-->/g);
  out = blank(out, /<script\b[^>]*>[\s\S]*?<\/script>/gi);
  out = blank(out, /<style\b[^>]*>[\s\S]*?<\/style>/gi);
  out = blank(out, /<[^>]*>/g); // tag markup + attributes; visible inter-tag text remains
  return out;
}

function stripJsNonStringCode(js) {
  let out = js;
  out = blank(out, /\/\*[\s\S]*?\*\//g);
  out = blank(out, /(^|[^:])\/\/.*$/gm);
  return out;
}

function findQuotedRanges(line) {
  const ranges = [];
  const re = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  let m;
  while ((m = re.exec(line))) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isWithinRanges(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function rangeContaining(index, ranges) {
  return ranges.find(([start, end]) => index >= start && index < end) || null;
}

const COMPARISON_PREFIX_PATTERN = /(===|!==|==|!=|\.indexOf\(|\.includes\(|\.startsWith\(|\.endsWith\()\s*$/;

/**
 * True when a quoted string literal is used as a code-comparison value
 * (`host.indexOf('staging')`, `env === 'test'`) rather than displayed text.
 * `linePrefix` is everything on the line before the opening quote.
 */
function isCodeComparisonContext(linePrefix) {
  const trimmed = linePrefix.trimEnd();
  if (COMPARISON_PREFIX_PATTERN.test(trimmed)) return true;
  // Ternary branch value: `condition ? 'preview' : 'print'`
  if (/\?\s*$/.test(trimmed)) return true;
  return false;
}

const FUNCTION_CALL_PREFIX_PATTERN = /[\w.]+\(\s*$/;

/**
 * True when a quoted string is the sole/first argument of a function call
 * (`setView('placeholder')`) AND its entire content is just the bare
 * keyword — a state/id token, not a displayed phrase. Real UI copy passed
 * to a function is virtually always more than one bare word, so this is a
 * narrow, low-risk heuristic.
 */
function isBareKeywordFunctionArg(linePrefix, quotedContent, keyword) {
  if (!FUNCTION_CALL_PREFIX_PATTERN.test(linePrefix.trimEnd())) return false;
  return quotedContent.trim().toLowerCase() === keyword.toLowerCase();
}

function lineAndColumnAt(text, index) {
  const upTo = text.slice(0, index);
  const lines = upTo.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function rawLineOf(originalText, lineNumber) {
  const lines = originalText.split('\n');
  return (lines[lineNumber - 1] || '').trim();
}

/** Recursively collect {pointer, value} for every string in a parsed JSON value. */
function collectJsonStrings(value, pointer = '') {
  const out = [];
  if (typeof value === 'string') {
    out.push({ pointer: pointer || '/', value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...collectJsonStrings(v, `${pointer}/${i}`)));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) out.push(...collectJsonStrings(v, `${pointer}/${k}`));
  }
  return out;
}

const TOKEN_CHAR = /[\w/-]/;

/**
 * Returns true when the match at [matchIndex, matchIndex+matchLength) in
 * `text` is a standalone prose word — i.e. not glued to other characters by
 * a hyphen, underscore, or slash (CSS class names like `ccsz-preview`,
 * identifiers like `preview_data_fetch_failed`, or API paths like
 * `/api/subscription/preview-data`). Those compound tokens are code/markup
 * plumbing, not text a person reads, and must not fail the gate on their own.
 */
function isStandaloneProseToken(text, matchIndex, matchLength) {
  let start = matchIndex;
  while (start > 0 && TOKEN_CHAR.test(text[start - 1])) start--;
  let end = matchIndex + matchLength;
  while (end < text.length && TOKEN_CHAR.test(text[end])) end++;
  const token = text.slice(start, end);
  return token.toLowerCase() === text.slice(matchIndex, matchIndex + matchLength).toLowerCase();
}

function fileTypeFor(filePath) {
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) return 'html';
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) return 'js';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'text';
}

module.exports = {
  stripHtmlNonVisible,
  stripJsNonStringCode,
  findQuotedRanges,
  isWithinRanges,
  rangeContaining,
  isCodeComparisonContext,
  isBareKeywordFunctionArg,
  lineAndColumnAt,
  rawLineOf,
  collectJsonStrings,
  isStandaloneProseToken,
  fileTypeFor,
};
