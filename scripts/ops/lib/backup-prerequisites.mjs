import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const UNSAFE_BACKUP_DIR_SEGMENTS = [
  `${path.sep}public${path.sep}`,
  `${path.sep}www${path.sep}`,
  `${path.sep}html${path.sep}`,
  `${path.sep}.git${path.sep}`,
];

export function assertCommandExists(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'pipe' });
  } catch {
    throw new Error(`MISSING_COMMAND:${cmd}`);
  }
}

function assertSha256Tool() {
  try {
    execFileSync('sha256sum', ['--version'], { stdio: 'pipe' });
  } catch {
    try {
      execFileSync('shasum', ['-a', '256', '/dev/null'], { stdio: 'pipe' });
    } catch {
      throw new Error('MISSING_COMMAND:sha256sum_or_shasum');
    }
  }
}

export function assertBackupToolchain() {
  assertCommandExists('pg_dump');
  assertCommandExists('pg_restore');
  assertCommandExists('psql');
  assertCommandExists('df');
  assertCommandExists('node');
  assertSha256Tool();
}

export function assertBackupDirectorySafe(backupDir, repoRoot = process.cwd()) {
  const resolved = path.resolve(backupDir);
  const repo = path.resolve(repoRoot);
  if (resolved === repo || resolved.startsWith(`${repo}${path.sep}`)) {
    throw new Error('BACKUP_DIR_INSIDE_APP_TREE');
  }
  for (const seg of UNSAFE_BACKUP_DIR_SEGMENTS) {
    if (resolved.includes(seg)) {
      throw new Error('BACKUP_DIR_UNSAFE_LOCATION');
    }
  }
  if (resolved.includes(`${path.sep}node_modules${path.sep}`)) {
    throw new Error('BACKUP_DIR_UNSAFE_LOCATION');
  }
}

export function assertWritableDirectory(dirPath) {
  const resolved = path.resolve(dirPath);
  fs.mkdirSync(resolved, { recursive: true });
  const probe = path.join(resolved, `.write_probe_${process.pid}`);
  try {
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
  } catch {
    throw new Error('BACKUP_DIR_NOT_WRITABLE');
  }
}
