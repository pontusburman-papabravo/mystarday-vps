'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IGNORE_DIRS = new Set(['node_modules', '.git', 'coverage', 'artifacts', 'dist', 'build']);

/** Recursively list files under `dir` (relative to repoRoot), returning repo-relative posix paths. */
function walk(repoRoot, dir, { ignoreDirs = DEFAULT_IGNORE_DIRS, extensions = null } = {}) {
  const abs = path.join(repoRoot, dir);
  const out = [];
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) continue;
        out.push(toRepoRelative(repoRoot, full));
      }
    }
  }
  return out.sort();
}

function toRepoRelative(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

/** Minimal glob support for the small set of patterns used in this repo's config (`**`, `*`). */
function expandGlob(repoRoot, pattern) {
  if (!pattern.includes('*')) {
    const abs = path.join(repoRoot, pattern);
    return fs.existsSync(abs) ? [pattern] : [];
  }
  const parts = pattern.split('/');
  const doubleStarIndex = parts.indexOf('**');
  if (doubleStarIndex !== -1) {
    const baseDir = parts.slice(0, doubleStarIndex).join('/');
    const tail = parts.slice(doubleStarIndex + 1).join('/');
    const ext = tail.includes('.') ? `.${tail.split('.').pop()}` : null;
    return walk(repoRoot, baseDir, { extensions: ext ? [ext] : null }).filter((f) =>
      matchesSimpleGlob(f, pattern)
    );
  }
  const dir = parts.slice(0, -1).join('/');
  const filePattern = parts[parts.length - 1];
  const absDir = path.join(repoRoot, dir);
  if (!fs.existsSync(absDir)) return [];
  const regex = simpleGlobToRegex(filePattern);
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile() && regex.test(e.name))
    .map((e) => (dir ? `${dir}/${e.name}` : e.name))
    .sort();
}

function simpleGlobToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesSimpleGlob(repoRelPath, pattern) {
  let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // `**/` must also match zero path segments (e.g. `public/js/**/*.js` matches
  // files directly in public/js/, not only in a subdirectory).
  regexStr = regexStr.replace(/\*\*\//g, '(?:.*/)?');
  regexStr = regexStr.replace(/\*\*/g, '.*');
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  return new RegExp(`^${regexStr}$`).test(repoRelPath);
}

function expandGlobs(repoRoot, patterns) {
  const seen = new Set();
  for (const pattern of patterns) {
    for (const file of expandGlob(repoRoot, pattern)) seen.add(file);
  }
  return [...seen].sort();
}

function readFileSafe(repoRoot, relPath) {
  try {
    return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
  } catch {
    return null;
  }
}

function fileExists(repoRoot, relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

module.exports = { walk, expandGlob, expandGlobs, readFileSafe, fileExists, toRepoRelative };
