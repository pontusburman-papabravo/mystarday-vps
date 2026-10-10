#!/usr/bin/env node
/**
 * Edge-to-edge: modern androidx.activity API + theme without deprecated opt-out.
 * Web content already uses env(safe-area-inset-*) — Capacitor margin adjustment stays disabled.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const STYLES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
const STYLES_V35 = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'values-v35', 'styles.xml');

const NO_ACTION_BAR_STYLE = `    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>`;

const V35_OVERLAY = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Android 15+ edge-to-edge: do not opt out; bars are transparent via EdgeToEdge.enable() -->
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowOptOutEdgeToEdgeEnforcement">false</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowOptOutEdgeToEdgeEnforcement">false</item>
    </style>
</resources>
`;

function fail(msg) {
  console.error('[patch-android-edge-to-edge]', msg);
  process.exit(1);
}

if (!fs.existsSync(STYLES)) {
  console.warn('[patch-android-edge-to-edge] styles.xml missing — run cap:sync:android first');
  process.exit(0);
}

let styles = fs.readFileSync(STYLES, 'utf8');
const noActionBarRe =
  /<style name="AppTheme\.NoActionBar" parent="Theme\.AppCompat\.DayNight\.NoActionBar">[\s\S]*?<\/style>/;

if (!noActionBarRe.test(styles)) {
  fail('Could not find AppTheme.NoActionBar in styles.xml');
}

const updatedStyles = styles.replace(noActionBarRe, NO_ACTION_BAR_STYLE);
if (updatedStyles !== styles) {
  fs.writeFileSync(STYLES, updatedStyles);
  console.log('[patch-android-edge-to-edge] Updated AppTheme.NoActionBar for cutout + edge-to-edge');
} else {
  console.log('[patch-android-edge-to-edge] AppTheme.NoActionBar already patched');
}

fs.mkdirSync(path.dirname(STYLES_V35), { recursive: true });
const existingV35 = fs.existsSync(STYLES_V35) ? fs.readFileSync(STYLES_V35, 'utf8') : '';
if (existingV35 !== V35_OVERLAY) {
  fs.writeFileSync(STYLES_V35, V35_OVERLAY);
  console.log('[patch-android-edge-to-edge] Wrote values-v35/styles.xml (no edge-to-edge opt-out)');
} else {
  console.log('[patch-android-edge-to-edge] values-v35/styles.xml already current');
}
