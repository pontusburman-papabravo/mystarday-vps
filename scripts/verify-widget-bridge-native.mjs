#!/usr/bin/env node
/**
 * Widget-bridge repo hygiene + release-scope gate (R4.5c, extended for the widget pause).
 *
 * The home-screen widget is PAUSED for this release: `capacitor-widget-bridge` is
 * excluded from both platforms' `includePlugins` in capacitor.config.ts. This script
 * still verifies the plugin's *source* stays in the repo (so the feature can resume
 * later without re-authoring it), and — when a generated native project exists on
 * disk — verifies the plugin is not actually wired into that release build.
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
  'android/src/main/java/com/stjarndag/widgetbridge/widget/RoutineWidgetProvider.java',
  'android/src/main/res/layout/widget_routine.xml',
  'android/src/main/res/xml/routine_widget_info.xml',
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
  console.error('package.json missing capacitor-widget-bridge dependency (widget source must stay in the repo)');
  ok = false;
}

const capConfig = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');
const androidBlock = capConfig.match(/android:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
const iosBlock = capConfig.match(/ios:\s*\{[\s\S]*?includePlugins:\s*\[([\s\S]*?)\]/);
if (androidBlock && /['"]capacitor-widget-bridge['"]/.test(androidBlock[1])) {
  console.error('capacitor.config.ts still includes capacitor-widget-bridge in Android includePlugins (widget is paused for this release)');
  ok = false;
} else {
  console.log('capacitor.config.ts excludes capacitor-widget-bridge from Android includePlugins (widget paused)');
}
if (iosBlock && /['"]capacitor-widget-bridge['"]/.test(iosBlock[1])) {
  console.error('capacitor.config.ts still includes capacitor-widget-bridge in iOS includePlugins (widget is paused for this release)');
  ok = false;
} else {
  console.log('capacitor.config.ts excludes capacitor-widget-bridge from iOS includePlugins (widget paused)');
}

const androidCapSettings = path.join(ROOT, 'android', 'capacitor.settings.gradle');
if (fs.existsSync(androidCapSettings)) {
  const settings = fs.readFileSync(androidCapSettings, 'utf8');
  if (/capacitor-widget-bridge/i.test(settings)) {
    console.error('android/capacitor.settings.gradle still wires in the capacitor-widget-bridge module');
    ok = false;
  } else {
    console.log('android/capacitor.settings.gradle excludes the capacitor-widget-bridge module');
  }
}

const iosCapacitorConfigJson = path.join(ROOT, 'ios', 'App', 'App', 'capacitor.config.json');
if (fs.existsSync(iosCapacitorConfigJson)) {
  const capJson = fs.readFileSync(iosCapacitorConfigJson, 'utf8');
  if (capJson.includes('capacitor-widget-bridge') || capJson.includes('WidgetBridge')) {
    console.error('ios/App/App/capacitor.config.json still registers the WidgetBridge plugin');
    ok = false;
  } else {
    console.log('ios/App/App/capacitor.config.json has no WidgetBridge plugin registration');
  }
}

if (!ok) process.exit(1);
console.log('capacitor-widget-bridge source retained; plugin excluded from the current release build');
