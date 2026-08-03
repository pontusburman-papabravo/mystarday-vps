#!/usr/bin/env node
/**
 * Verify RevenueCat Capacitor plugin is declared for native sync (no secrets).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

function ok(msg) {
  console.log('OK:', msg);
}

const pkg = path.join(ROOT, 'package.json');
const cap = path.join(ROOT, 'capacitor.config.ts');
const rc = path.join(ROOT, 'node_modules', '@revenuecat', 'purchases-capacitor', 'package.json');

if (!fs.existsSync(rc)) {
  fail('@revenuecat/purchases-capacitor not installed — npm install');
} else {
  ok('RevenueCat Capacitor npm package present');
}

if (fs.existsSync(pkg)) {
  const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
  const deps = { ...json.dependencies, ...json.devDependencies };
  if (!deps['@revenuecat/purchases-capacitor']) {
    fail('package.json missing @revenuecat/purchases-capacitor dependency');
  } else {
    ok('package.json lists @revenuecat/purchases-capacitor');
  }
}

if (fs.existsSync(cap)) {
  const cfg = fs.readFileSync(cap, 'utf8');
  if (!cfg.includes('@revenuecat/purchases-capacitor')) {
    fail('capacitor.config.ts missing @revenuecat/purchases-capacitor in includePlugins');
  } else {
    ok('capacitor.config.ts includes RevenueCat plugin');
  }
}

const iapMgr = path.join(ROOT, 'public', 'js', 'iap-manager.js');
if (fs.existsSync(iapMgr)) {
  const src = fs.readFileSync(iapMgr, 'utf8');
  if (!src.includes('getPurchasesPlugin') && !src.includes('Plugins.Purchases')) {
    fail('iap-manager.js missing Capacitor Purchases bridge');
  } else {
    ok('iap-manager.js uses Capacitor Purchases bridge');
  }
  if (src.includes("import('@revenuecat/purchases-capacitor')")) {
    fail('iap-manager.js must not use bare RevenueCat ESM import in remote WebView');
  }
}

process.exit(failed ? 1 : 0);
