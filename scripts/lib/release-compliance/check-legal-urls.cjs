'use strict';

/**
 * CHECK B — Legal URL / EULA checks.
 *
 * Verifies, as far as repo data allows:
 *   - Privacy Policy / Terms routes resolve for every live/draft market
 *   - The routes are actually wired to an existing static file
 *   - No forbidden host (localhost/dev/staging/example.com) appears in
 *     legal-related production copy
 *   - Apple's EULA handling matches the documented model (standard Apple
 *     EULA, never our own /terms page mislabeled as "EULA")
 *
 * Building or restructuring the legal-routing logic itself is out of
 * scope — this check only verifies consistency of what already exists.
 */

const { createRequire } = require('node:module');
const path = require('node:path');
const { STATUS } = require('./constants.cjs');
const { compileRegexList, matchesAny } = require('./load-config.cjs');
const { readFileSafe, fileExists } = require('./fs-utils.cjs');

const MARKET_MATRIX = [
  { countryCode: 'SE', locale: 'sv-SE', label: 'Sweden (live)' },
  { countryCode: 'IE', locale: 'en-GB', label: 'Ireland (live EEA)' },
  { countryCode: 'FI', locale: 'en-GB', label: 'Finland (live EEA)' },
  { countryCode: 'GB', locale: 'en-GB', label: 'United Kingdom (placeholder)' },
  { countryCode: 'DE', locale: 'en-GB', label: 'Other EEA (draft)' },
];

/** Default production hosts when config.allowedProductionHosts is empty. */
function defaultProductionHosts() {
  const brand = 'mystarday'; // pragma: allowlist secret
  return [`${brand}.se`, `${brand}.eu`, `${brand}.app`];
}

/** Pure classifier — used directly by regression tests. FAIL / PASS / MANUAL_REVIEW_REQUIRED. */
function classifyLegalUrl(url, config = {}) {
  if (!url || typeof url !== 'string') {
    return { status: STATUS.FAIL, reason: 'empty_or_non_string_url' };
  }
  const forbidden = compileRegexList(config.forbiddenUrlHostPatterns || []);
  if (matchesAny(url, forbidden)) {
    return { status: STATUS.FAIL, reason: 'matches_forbidden_host_pattern', url };
  }
  if (url.startsWith('/')) {
    return { status: STATUS.PASS, reason: 'relative_path_same_origin', url };
  }
  try {
    const parsed = new URL(url);
    const allowed = (config.allowedProductionHosts || []).length
      ? config.allowedProductionHosts
      : defaultProductionHosts();
    const appleHost = parsed.hostname.endsWith('apple.com');
    if (appleHost) return { status: STATUS.PASS, reason: 'apple_official_domain', url };
    if (allowed.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
      return { status: STATUS.PASS, reason: 'allowed_production_host', url };
    }
    return { status: STATUS.MANUAL_REVIEW_REQUIRED, reason: 'host_not_in_allowlist', url, host: parsed.hostname };
  } catch {
    return { status: STATUS.FAIL, reason: 'unparseable_url', url };
  }
}

function loadRepoModule(repoRoot, relPath) {
  const requireFromRepo = createRequire(path.join(repoRoot, 'package.json'));
  try {
    delete requireFromRepo.cache[requireFromRepo.resolve(path.join(repoRoot, relPath))];
  } catch {
    /* not previously required — nothing to clear */
  }
  return requireFromRepo(path.join(repoRoot, relPath));
}

function buildRouteFileIndex(repoRoot) {
  let registry;
  try {
    registry = loadRepoModule(repoRoot, 'config/public-web-routes.js');
  } catch (err) {
    return { error: err.message, byPath: new Map() };
  }
  const byPath = new Map();
  const list = registry.LEGAL_ROUTES || registry.legalRoutes || registry.PUBLIC_ROUTES || registry;
  const flatten = (obj) => {
    if (Array.isArray(obj)) {
      for (const entry of obj) {
        if (entry.path && entry.file) byPath.set(entry.path, `public/${entry.file}`);
        if (entry.sv && entry.fileSv) byPath.set(entry.sv, `public/${entry.fileSv}`);
        if (entry.en && entry.fileEn) byPath.set(entry.en, `public/${entry.fileEn}`);
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) flatten(value);
    }
  };
  flatten(list);
  return { byPath, error: null };
}

function checkEulaHandling(repoRoot, config) {
  const eula = config.appleEula || {};
  const docs = ['docs/app-store-connect-metadata.md', 'docs/app-store-connect-metadata-en-GB.md'];
  const findings = [];
  for (const docPath of docs) {
    const content = readFileSafe(repoRoot, docPath);
    if (content == null) {
      findings.push({ doc: docPath, status: STATUS.MANUAL_REVIEW_REQUIRED, reason: 'doc_not_found' });
      continue;
    }
    const hasStandardEulaUrl = eula.standardUrl && content.includes(eula.standardUrl);
    const mislabelsOwnTermsAsEula = /\/terms[^\n]{0,60}\bEULA\b/i.test(content) && !hasStandardEulaUrl;
    if (mislabelsOwnTermsAsEula) {
      findings.push({
        doc: docPath,
        status: STATUS.FAIL,
        reason: 'own_terms_page_labelled_as_eula_without_apple_standard_eula_link',
      });
    } else if (hasStandardEulaUrl) {
      findings.push({ doc: docPath, status: STATUS.PASS, reason: 'apple_standard_eula_url_present' });
    } else if (/\bEULA\b/i.test(content)) {
      findings.push({ doc: docPath, status: STATUS.MANUAL_REVIEW_REQUIRED, reason: 'eula_mentioned_but_no_standard_url_detected' });
    } else {
      findings.push({ doc: docPath, status: STATUS.NOT_APPLICABLE, reason: 'no_eula_reference_in_doc' });
    }
  }
  return findings;
}

function runLegalUrlChecks(repoRoot) {
  const { loadReleaseComplianceConfig } = require('./load-config.cjs');
  const config = loadReleaseComplianceConfig(repoRoot);

  let resolveLegalRoutes;
  try {
    ({ resolveLegalRoutes } = loadRepoModule(repoRoot, 'src/lib/legal-routing.js'));
  } catch (err) {
    return {
      id: 'B_legal_url_eula_checks',
      title: 'B — Legal URL / EULA checks',
      status: STATUS.MANUAL_REVIEW_REQUIRED,
      summary: `Could not load src/lib/legal-routing.js (${err.message}). Verify legal URLs manually.`,
      evidence: {},
    };
  }

  const { byPath: routeFileIndex, error: registryError } = buildRouteFileIndex(repoRoot);
  const perMarket = [];

  for (const market of MARKET_MATRIX) {
    const routes = resolveLegalRoutes({ countryCode: market.countryCode, locale: market.locale });
    const linkKeys = ['privacy', 'terms', 'childPrivacy', 'tracking'];
    const linkResults = [];
    for (const key of linkKeys) {
      const url = routes[key];
      if (url == null) {
        linkResults.push({ key, status: STATUS.NOT_APPLICABLE, reason: 'not_applicable_for_this_market' });
        continue;
      }
      const classification = classifyLegalUrl(url, config);
      const filePath = routeFileIndex.get(url);
      if (classification.status === STATUS.PASS && filePath && !fileExists(repoRoot, filePath)) {
        linkResults.push({ key, url, status: STATUS.FAIL, reason: 'route_wired_but_file_missing_on_disk', filePath });
        continue;
      }
      if (classification.status === STATUS.PASS && !filePath) {
        linkResults.push({
          key,
          url,
          status: STATUS.MANUAL_REVIEW_REQUIRED,
          reason: 'route_not_found_in_config/public-web-routes.js_registry',
        });
        continue;
      }
      linkResults.push({ key, url, filePath, ...classification });
    }
    perMarket.push({ market: market.label, countryCode: market.countryCode, marketStatus: routes.status, links: linkResults });
  }

  const eulaFindings = checkEulaHandling(repoRoot, config);

  const allStatuses = [
    ...perMarket.flatMap((m) => m.links.map((l) => l.status)),
    ...eulaFindings.map((f) => f.status),
  ];
  const status = allStatuses.includes(STATUS.FAIL)
    ? STATUS.FAIL
    : allStatuses.includes(STATUS.MANUAL_REVIEW_REQUIRED)
      ? STATUS.MANUAL_REVIEW_REQUIRED
      : STATUS.PASS;

  return {
    id: 'B_legal_url_eula_checks',
    title: 'B — Legal URL / EULA checks',
    status,
    summary:
      status === STATUS.FAIL
        ? 'A legal URL failed (missing file, forbidden host, or own Terms page mislabeled as Apple EULA).'
        : status === STATUS.MANUAL_REVIEW_REQUIRED
          ? 'All wired legal routes resolve, but some cannot be fully verified from repo data alone (see evidence).'
          : 'Privacy/Terms/EULA routes resolve to existing files for every checked market; Apple EULA handling matches the documented standard-EULA model.',
    evidence: { perMarket, eulaFindings, registryError },
  };
}

module.exports = {
  classifyLegalUrl,
  runLegalUrlChecks,
  buildRouteFileIndex,
  checkEulaHandling,
  MARKET_MATRIX,
  defaultProductionHosts,
};
