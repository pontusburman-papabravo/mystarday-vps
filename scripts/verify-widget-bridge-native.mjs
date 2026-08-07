#!/usr/bin/env node
/**
 * Verify capacitor-widget-bridge plugin layout (R4.5c).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const pluginRoot = path.join(ROOT, 'plugins', 'capacitor-widget-bridge');
const required = [
  'package.json',
  'CapacitorWidgetBridge.podspec',
  'dist/plugin.cjs.js',
  'ios/Plugin/WidgetBridgePlugin.swift',
  'ios/Plugin/WidgetBridgeStore.swift',
  'android/src/main/java/com/stjarndag/widgetbridge/WidgetBridgePlugin.java',
];

let ok = true;
for (const rel of required) {
  const p = path.join(pluginRoot, rel);
  if (!fs.existsSync(p)) {
    console.error('Missing:', rel);
    ok = false;
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (!pkg.dependencies || !pkg.dependencies['capacitor-widget-bridge']) {
  console.error('package.json missing capacitor-widget-bridge dependency');
  ok = false;
}

const capConfig = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');
if (!capConfig.includes('capacitor-widget-bridge')) {
  console.error('capacitor.config.ts missing capacitor-widget-bridge in includePlugins');
  ok = false;
}

if (!ok) process.exit(1);
console.log('capacitor-widget-bridge layout OK');
