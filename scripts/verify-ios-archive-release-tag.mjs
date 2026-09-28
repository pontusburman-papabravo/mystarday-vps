#!/usr/bin/env node
/**
 * Refuse Xcode Cloud archives unless this commit is an intended native release.
 *
 * Xcode Cloud's standing workflow archives from `main` and does not set CI_TAG
 * even when the commit is already tagged. Accidental main merges must still
 * fail closed. Allow when:
 *   - workflow started from an ios-v* tag (CI_TAG / CI_GIT_REF), or
 *   - origin has an ios-v* tag pointing at this commit, or
 *   - IOS_ALLOW_STORE_ARCHIVE=1 (explicit one-off; do not set in the workflow)
 *
 * Override for tests: IOS_ARCHIVE_HEAD_SHA + IOS_ARCHIVE_LS_REMOTE (set, even empty).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const IOS_RELEASE_TAG_RE = /^ios-v\d/;

export function normalizeTagName(value) {
  return String(value || '')
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/\^\{\}$/, '');
}

export function isIosReleaseTagName(value) {
  return IOS_RELEASE_TAG_RE.test(normalizeTagName(value));
}

export function shaEquals(a, b) {
  const x = String(a || '').trim().toLowerCase();
  const y = String(b || '').trim().toLowerCase();
  if (!x || !y) return false;
  const len = Math.min(x.length, y.length);
  if (len < 7) return false;
  return x.slice(0, len) === y.slice(0, len);
}

export function iosReleaseTagsForCommit(headSha, lsRemoteText) {
  const rows = [];
  const annotated = new Set();
  for (const rawLine of String(lsRemoteText || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([0-9a-f]{7,40})\s+refs\/tags\/(\S+)$/i);
    if (!match) continue;
    const peeled = match[2].endsWith('^{}');
    const name = normalizeTagName(match[2]);
    if (!isIosReleaseTagName(name)) continue;
    if (peeled) annotated.add(name);
    rows.push({ sha: match[1], name, peeled });
  }
  const found = new Set();
  for (const row of rows) {
    const isCommitPointer = row.peeled || !annotated.has(row.name);
    if (isCommitPointer && shaEquals(headSha, row.sha)) found.add(row.name);
  }
  return [...found].sort();
}

function envHasIosReleaseTag(env) {
  const tag = String(env.CI_TAG || '').trim();
  const ref = String(env.CI_GIT_REF || '').trim();
  if (isIosReleaseTagName(tag)) return tag;
  if (isIosReleaseTagName(ref)) return ref;
  return '';
}

function resolveHeadSha(env) {
  const override = String(env.IOS_ARCHIVE_HEAD_SHA || '').trim();
  if (override) return override;
  const local = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (local.status === 0) return String(local.stdout || '').trim();
  return String(env.CI_COMMIT || '').trim();
}

function readOriginTags(env) {
  if (Object.prototype.hasOwnProperty.call(env, 'IOS_ARCHIVE_LS_REMOTE')) {
    return { ok: true, text: String(env.IOS_ARCHIVE_LS_REMOTE || ''), source: 'fixture' };
  }
  const remote = spawnSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8' });
  if (remote.status === 0) {
    return { ok: true, text: String(remote.stdout || ''), source: 'origin' };
  }
  const local = spawnSync('git', ['tag', '--points-at', 'HEAD'], { encoding: 'utf8' });
  if (local.status === 0) {
    const head = resolveHeadSha(env);
    const text = String(local.stdout || '')
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => `${head}\trefs/tags/${name}`)
      .join('\n');
    return { ok: true, text, source: 'local-points-at' };
  }
  return {
    ok: false,
    text: '',
    source: 'none',
    error: String(remote.stderr || local.stderr || 'git tag lookup failed').trim(),
  };
}

function main(env = process.env) {
  const action = String(env.CI_XCODEBUILD_ACTION || '').trim();
  if (action !== 'archive') {
    console.log('[verify-ios-archive-release-tag] skip: not an archive');
    return 0;
  }

  if (String(env.IOS_ALLOW_STORE_ARCHIVE || '').trim() === '1') {
    console.log(
      '[verify-ios-archive-release-tag] PASS: IOS_ALLOW_STORE_ARCHIVE=1 (explicit override)'
    );
    return 0;
  }

  const envTag = envHasIosReleaseTag(env);
  if (envTag) {
    console.log(`[verify-ios-archive-release-tag] PASS: archive allowed for ${envTag}`);
    return 0;
  }

  const headSha = resolveHeadSha(env);
  const remoteTags = readOriginTags(env);
  const matched = remoteTags.ok ? iosReleaseTagsForCommit(headSha, remoteTags.text) : [];
  if (matched.length) {
    console.log(
      `[verify-ios-archive-release-tag] PASS: archive allowed for ${matched.join(', ')} ` +
        `on ${headSha || '(unknown HEAD)'} (${remoteTags.source})`
    );
    return 0;
  }

  const tag = String(env.CI_TAG || '').trim();
  const ref = String(env.CI_GIT_REF || '').trim();
  const lookupNote = remoteTags.ok
    ? `tag-source=${remoteTags.source}`
    : `tag-source=failed:${remoteTags.error || 'unknown'}`;
  console.error(
    `[verify-ios-archive-release-tag] FAIL: archive refused without ios-v* tag ` +
      `(CI_TAG=${tag || '(empty)'} CI_GIT_REF=${ref || '(empty)'} ` +
      `CI_BRANCH=${env.CI_BRANCH || '(empty)'} HEAD=${headSha || '(unknown)'} ${lookupNote}). ` +
      `Founder freeze: no App Store/TestFlight delivery until an ios-v* tag points at this commit. ` +
      `Web deploys do not need an IPA.`
  );
  return 1;
}

const invokedDirectly =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  process.exit(main());
}
