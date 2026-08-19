#!/usr/bin/env node
/**
 * Set WIDGET_PARENT_BUNDLE_ID from main app target (R4.5d).
 * Must live in **project-level** Debug/Release configs so WidgetRoutine can resolve
 * $(WIDGET_PARENT_BUNDLE_ID). App-target-only settings are invisible to the extension.
 */
import fs from 'fs';
import path from 'path';

const pbxPath = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbxPath)) process.exit(0);

let pbx = fs.readFileSync(pbxPath, 'utf8');

const PROJECT_CONFIGS = [
  ['504EC3141FED79650016851F', 'Debug'],
  ['504EC3151FED79650016851F', 'Release'],
];

/** App target bundle id (not the widget $(WIDGET_PARENT_BUNDLE_ID) macro). */
function readMainAppBundleId(source) {
  const blockRe = /buildSettings = \{([\s\S]*?)\n\t\t\t\};/g;
  for (const match of source.matchAll(blockRe)) {
    const settings = match[1];
    if (!settings.includes('INFOPLIST_FILE = App/Info.plist')) continue;
    if (settings.includes('APPLICATION_EXTENSION_API_ONLY')) continue;
    const bid = settings.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);/);
    if (!bid) continue;
    const raw = bid[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  const re =
    /INFOPLIST_FILE = App\/Info\.plist;[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);/g;
  for (const match of source.matchAll(re)) {
    const raw = match[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  const pragmaMatch = source.match(
    /PRODUCT_BUNDLE_IDENTIFIER = ([^;\n]+);\s*\/\/ pragma: allowlist secret/
  );
  if (pragmaMatch) {
    const raw = pragmaMatch[1].trim().replace(/^"|"$/g, '');
    if (raw && !raw.includes('$(')) {
      return raw;
    }
  }

  return null;
}

function upsertWidgetParentInProjectConfigs(source, settingLine) {
  let out = source;
  let touched = 0;
  for (const [id, name] of PROJECT_CONFIGS) {
    const blockRe = new RegExp(
      `(${id} /\\* ${name} \\*/ = \\{[\\s\\S]*?buildSettings = \\{)([\\s\\S]*?)(\\n\\t\\t\\t\\};)`,
    );
    const m = out.match(blockRe);
    if (!m) continue;
    let inner = m[2];
    if (/WIDGET_PARENT_BUNDLE_ID\s*=/.test(inner)) {
      inner = inner.replace(
        /[ \t]*WIDGET_PARENT_BUNDLE_ID\s*=\s*[^;]+;\s*(\/\/ pragma: allowlist secret)?\n/g,
        `\t\t\t\t${settingLine}\n`
      );
    } else {
      const next = inner.replace(
        /(IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;\n)/,
        `$1\t\t\t\t${settingLine}\n`
      );
      if (next === inner) {
        continue;
      }
      inner = next;
    }
    out = out.replace(blockRe, `${m[1]}${inner}${m[3]}`);
    touched += 1;
  }
  return { pbx: out, touched };
}

/** Remove App-target-only copies (optional cleanup; project level is authoritative). */
function stripAppTargetWidgetParent(source) {
  return source.replace(
    /(INFOPLIST_FILE = App\/Info\.plist;\n)\t\t\t\tWIDGET_PARENT_BUNDLE_ID\s*=\s*[^;]+;\s*(\/\/ pragma: allowlist secret)?\n/g,
    '$1'
  );
}

const parentId = readMainAppBundleId(pbx);
if (!parentId) {
  console.error(
    '[widget-bundle] FAIL: could not read main App PRODUCT_BUNDLE_IDENTIFIER from project.pbxproj'
  );
  process.exit(1);
}

const settingLine = `WIDGET_PARENT_BUNDLE_ID = ${parentId}; // pragma: allowlist secret`;

const { pbx: withProject, touched } = upsertWidgetParentInProjectConfigs(pbx, settingLine);
if (touched === 0) {
  console.error(
    '[widget-bundle] FAIL: could not set WIDGET_PARENT_BUNDLE_ID on project Debug/Release build settings'
  );
  process.exit(1);
}

pbx = stripAppTargetWidgetParent(withProject);

fs.writeFileSync(pbxPath, pbx);
console.log('[widget-bundle] WIDGET_PARENT_BUNDLE_ID configured at project level (WidgetRoutine can resolve macro)');
