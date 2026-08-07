#!/usr/bin/env node
/**
 * Ensure MainActivity enables WebView remote debugging only in DEBUG builds.
 * android/ is gitignored — namespace is read from build.gradle at patch time.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GRADLE = path.join(ROOT, 'android/app/build.gradle');

function mainActivityPath(namespace) {
  const rel = namespace.replace(/\./g, path.sep);
  return path.join(ROOT, 'android/app/src/main/java', rel, 'MainActivity.java');
}

function buildMainActivitySource(namespace) {
  return `package ${namespace};

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // chrome://inspect only in debug builds — never in Play release.
    if (BuildConfig.DEBUG) {
      WebView.setWebContentsDebuggingEnabled(true);
    }
  }
}
`;
}

if (!fs.existsSync(GRADLE)) {
  console.error('Not found:', GRADLE, '— run npm run cap:sync:android');
  process.exit(1);
}

const gradle = fs.readFileSync(GRADLE, 'utf8');
const nsMatch = gradle.match(/namespace\s+"([^"]+)"/);
if (!nsMatch) {
  console.error('Could not read namespace from android/app/build.gradle');
  process.exit(1);
}

const namespace = nsMatch[1];
const main = mainActivityPath(namespace);
const expected = buildMainActivitySource(namespace);

if (!fs.existsSync(main)) {
  console.error('Not found:', main, '— run npm run cap:sync:android');
  process.exit(1);
}

const current = fs.readFileSync(main, 'utf8');
if (current === expected) {
  console.log('MainActivity.java already gates WebView debugging on BuildConfig.DEBUG');
} else {
  fs.writeFileSync(main, expected);
  console.log('Patched MainActivity.java → WebView debugging DEBUG-only');
}
