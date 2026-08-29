import fs from 'node:fs';
import path from 'node:path';

/**
 * Convert a simple glob (**, *) to RegExp against forward-slash paths.
 * @param {string} pattern
 * @returns {RegExp}
 */
export function globToRegExp(pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  let re = '^';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '*') {
      if (normalized[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  re += '$';
  return new RegExp(re);
}

/**
 * @param {string} filePath
 * @param {string} pattern
 */
export function matchGlob(filePath, pattern) {
  const normalized = filePath.replace(/\\/g, '/');
  return globToRegExp(pattern).test(normalized);
}

/**
 * @param {string} filePath
 * @param {string[]} patterns
 */
export function matchAnyGlob(filePath, patterns) {
  return patterns.some((p) => matchGlob(filePath, p));
}

/**
 * @param {string} root
 * @param {string} routingConfigPath
 */
export function loadRoutingConfig(root, routingConfigPath = 'config/test-routing.json') {
  const entryPath = path.join(root, routingConfigPath);
  const entry = JSON.parse(fs.readFileSync(entryPath, 'utf8'));
  const globalCore = JSON.parse(
    fs.readFileSync(path.join(root, entry.globalCore), 'utf8'),
  );
  const overlay = JSON.parse(fs.readFileSync(path.join(root, entry.overlay), 'utf8'));
  return { entry, globalCore, overlay };
}

/**
 * Walk directory collecting files matching any glob.
 * @param {string} dir
 * @param {string[]} patterns
 * @param {string} prefix
 */
export function collectFilesByGlobs(dir, patterns, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectFilesByGlobs(full, patterns, rel));
    } else if (patterns.some((p) => matchGlob(rel, p))) {
      out.push(rel.replace(/\\/g, '/'));
    }
  }
  return out;
}

/**
 * Resolve domain test files from explicit globs under test/.
 * @param {string} root
 * @param {{ testGlobs?: string[], tests?: string[], l1Tests?: string[] }} domain
 */
export function resolveDomainTests(root, domain) {
  const explicit = domain.tests || [];
  const testDir = path.join(root, 'test');
  const fromGlobs = collectFilesByGlobs(testDir, domain.testGlobs || [], 'test');
  return [...new Set([...explicit, ...fromGlobs])].sort();
}

/**
 * Resolve explicit L1 contract tests for a domain (must exist on disk).
 * @param {string} root
 * @param {{ l1Tests?: string[] }} domain
 */
export function resolveDomainL1Tests(root, domain) {
  const explicit = domain.l1Tests || [];
  return explicit.filter((t) => fs.existsSync(path.join(root, t))).sort();
}

/**
 * @param {string} root
 * @param {Record<string, object>} domains
 */
export function buildDomainTestIndex(root, domains) {
  /** @type {Record<string, string[]>} */
  const index = {};
  /** @type {Record<string, string[]>} */
  const l1Index = {};
  for (const [id, domain] of Object.entries(domains)) {
    index[id] = resolveDomainTests(root, domain);
    l1Index[id] = resolveDomainL1Tests(root, domain);
  }
  return { index, l1Index };
}

/**
 * Map a changed file to domain ids via pathGlobs.
 * @param {string} filePath
 * @param {Record<string, { pathGlobs?: string[] }>} domains
 */
export function mapFileToDomains(filePath, domains) {
  const normalized = filePath.replace(/\\/g, '/');
  const matched = [];
  for (const [id, domain] of Object.entries(domains)) {
    if ((domain.pathGlobs || []).some((g) => matchGlob(normalized, g))) {
      matched.push(id);
    }
  }
  return matched;
}

/**
 * Classify unknown file per global policy (no content heuristics).
 * @param {string} filePath
 * @param {object} unknownPolicy
 * @returns {'critical' | 'shared_core' | 'non_critical' | 'unmapped'}
 */
export function classifyUnknownFile(filePath, unknownPolicy) {
  const normalized = filePath.replace(/\\/g, '/');
  if (matchAnyGlob(normalized, unknownPolicy.criticalPathGlobs || [])) return 'critical';
  if (matchAnyGlob(normalized, unknownPolicy.sharedCoreGlobs || [])) return 'shared_core';
  if (matchAnyGlob(normalized, unknownPolicy.nonCriticalBroadenGlobs || [])) return 'non_critical';
  return 'unmapped';
}
