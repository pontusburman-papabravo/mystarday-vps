#!/usr/bin/env node
/**
 * Fail CI/archive prep if iPad Sign in with Apple presentation patch is missing.
 */
import fs from 'fs';
import path from 'path';

const pluginSwift = path.join(
  process.cwd(),
  'node_modules',
  '@capacitor-community',
  'apple-sign-in',
  'ios',
  'Sources',
  'SignInWithApple',
  'Plugin.swift'
);

const entitlements = path.join(process.cwd(), 'ios', 'App', 'App', 'App.entitlements');
const pbx = path.join(process.cwd(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

let ok = true;

if (!fs.existsSync(pluginSwift)) {
  console.error('FAIL: @capacitor-community/apple-sign-in not installed');
  process.exit(1);
}

const swift = fs.readFileSync(pluginSwift, 'utf8');
const required = [
  'ASAuthorizationControllerPresentationContextProviding',
  'presentationContextProvider = self',
  'presentationAnchor(for controller:',
];

for (const needle of required) {
  if (!swift.includes(needle)) {
    console.error(`FAIL: Plugin.swift missing: ${needle}`);
    ok = false;
  }
}

if (swift.includes('ASPresentationAnchor()') || swift.includes('UIApplication.shared.windows')) {
  console.error('FAIL: Plugin.swift uses deprecated/invalid presentation anchor fallback — re-run patch script');
  ok = false;
}

if (!fs.existsSync(entitlements) || !fs.readFileSync(entitlements, 'utf8').includes('com.apple.developer.applesignin')) {
  console.error('FAIL: App.entitlements missing com.apple.developer.applesignin');
  ok = false;
}

if (!fs.existsSync(pbx) || !fs.readFileSync(pbx, 'utf8').includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements')) {
  console.error('FAIL: project.pbxproj missing CODE_SIGN_ENTITLEMENTS');
  ok = false;
}

if (!ok) process.exit(1);
console.log('OK: Sign in with Apple iPad presentation + entitlements verified.');
