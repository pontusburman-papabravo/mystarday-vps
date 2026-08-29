import { execSync } from 'node:child_process';

/**
 * @param {string} root
 * @param {object} options
 * @param {string} [options.baseRef]
 * @param {boolean} [options.staged]
 * @param {boolean} [options.unstaged]
 * @param {string[]} [options.files]
 */
export function collectChangedFiles(root, options = {}) {
  if (options.files?.length) {
    return [...new Set(options.files.map((f) => f.replace(/\\/g, '/')))].sort();
  }

  const parts = [];
  const baseRef = options.baseRef;

  if (baseRef) {
    try {
      const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      parts.push(...diff.split('\n').filter(Boolean));
    } catch {
      // fall through to working tree
    }
  }

  if (options.staged !== false) {
    try {
      const staged = execSync('git diff --name-only --cached', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      parts.push(...staged.split('\n').filter(Boolean));
    } catch {
      // ignore
    }
  }

  if (options.unstaged !== false) {
    try {
      const unstaged = execSync('git diff --name-only', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      parts.push(...unstaged.split('\n').filter(Boolean));
    } catch {
      // ignore
    }
  }

  return [...new Set(parts.map((f) => f.replace(/\\/g, '/')))].sort();
}
