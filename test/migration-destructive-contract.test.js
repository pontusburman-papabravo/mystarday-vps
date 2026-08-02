'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const ALLOWLIST_PATH = path.join(__dirname, '../config/migration-destructive-allowlist.json');
const REPO_ROOT = path.join(__dirname, '..');

const DESTRUCTIVE_PATTERNS = [
  { id: 'drop_table', re: /\bDROP\s+TABLE\b/i },
  { id: 'drop_column', re: /\bDROP\s+COLUMN\b/i },
  { id: 'truncate', re: /\bTRUNCATE\b/i },
  { id: 'delete_unqualified', re: /\bDELETE\s+FROM\s+(?!_migrations\b)/i },
  { id: 'rename_column', re: /\bRENAME\s+COLUMN\b/i },
  { id: 'alter_type', re: /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i },
  { id: 'cascade', re: /\bCASCADE\b/i },
  { id: 'destructive_constraint', re: /\bDROP\s+CONSTRAINT\b/i },
];

function loadAllowlist() {
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  return new Set(raw.allowedMigrationFiles || []);
}

function listNewMigrationFiles() {
  let diff;
  try {
    diff = execSync('git diff --name-only --diff-filter=A origin/main -- migrations/', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js'));
  }
  if (!diff) {
    return [];
  }
  return diff.split('\n').map((p) => path.basename(p)).filter(Boolean);
}

describe('migration destructive SQL contract (new files only)', () => {
  const allowlist = loadAllowlist();
  const newFiles = listNewMigrationFiles();

  if (newFiles.length === 0) {
    test('no new migrations on this branch', () => {
      assert.ok(true);
    });
    return;
  }

  for (const file of newFiles) {
    test(`up() in ${file} avoids destructive SQL unless allowlisted`, () => {
      const src = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const upSection = src.split(/\bdown\s*:/)[0] || src;
      if (allowlist.has(file)) return;

      for (const pattern of DESTRUCTIVE_PATTERNS) {
        assert.equal(
          pattern.re.test(upSection),
          false,
          `${file} up() matches destructive pattern ${pattern.id} — add to allowlist only after manual review`
        );
      }
    });
  }

  test('documents that static analysis is not complete', () => {
    const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    assert.ok(raw.comment);
  });
});
