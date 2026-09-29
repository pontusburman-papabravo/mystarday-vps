'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { withPbxLock } = require('./helpers/pbxproj-test-lock');

const ROOT = path.join(__dirname, '..');
const PBX = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const PATCH = path.join(ROOT, 'scripts', 'patch-ios-widget-bundle-id.mjs');

describe('patch-ios-widget-bundle-id', () => {
  it('sets WIDGET_PARENT_BUNDLE_ID at project level when only widget macro references exist', () => {
    withPbxLock(() => {
      const original = fs.readFileSync(PBX, 'utf8');
      const stripped = original
        .replace(
          /\n\t\t\t\tWIDGET_PARENT_BUNDLE_ID = [^;]+;(?: \/\/ pragma: allowlist secret)?\n/g,
          '\n'
        );
      fs.writeFileSync(PBX, stripped);
      try {
        assert.doesNotMatch(stripped, /WIDGET_PARENT_BUNDLE_ID\s*=/);
        const r = spawnSync(process.execPath, [PATCH], { cwd: ROOT, encoding: 'utf8' });
        if (r.status !== 0) {
          throw new Error((r.stdout || '') + (r.stderr || ''));
        }
        const updated = fs.readFileSync(PBX, 'utf8');
        assert.match(updated, /WIDGET_PARENT_BUNDLE_ID\s*=\s*[^;\n]+;/);
        assert.match(updated, /\$\(WIDGET_PARENT_BUNDLE_ID\)\.WidgetRoutine/);
        const projectDebug = updated.match(
          /504EC3141FED79650016851F \/\* Debug \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\n\t\t\t\};/
        );
        assert.ok(projectDebug, 'project Debug configuration block');
        assert.match(projectDebug[1], /WIDGET_PARENT_BUNDLE_ID\s*=/);
      } finally {
        fs.writeFileSync(PBX, original);
      }
    });
  });
});
