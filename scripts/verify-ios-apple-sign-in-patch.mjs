#!/usr/bin/env node
/**
 * Fail cap:sync:ios if Sign in with Apple iPad patch is missing from the build tree.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const pluginPkgRoot = path.join(ROOT, 'node_modules', '@capacitor-community', 'apple-sign-in');

function findPluginSwift(root) {
  const knownPaths = [
    path.join(root, 'ios', 'Plugin', 'Plugin.swift'),
    path.join(root, 'ios', 'Sources', 'SignInWithApple', 'Plugin.swift'),
  ];
  for (const candidate of knownPaths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

if (!fs.existsSync(pluginPkgRoot)) {
  console.error('❌ @capacitor-community/apple-sign-in not installed. Run: npm install --legacy-peer-deps');
  process.exit(1);
}

const swiftPath = findPluginSwift(pluginPkgRoot);
if (!swiftPath) {
  console.error('❌ Apple Sign In Plugin.swift not found in node_modules');
  process.exit(1);
}

const content = fs.readFileSync(swiftPath, 'utf8');
if (!content.includes('ASAuthorizationControllerPresentationContextProviding')) {
  console.error('❌ Apple Sign In iPad patch NOT applied. Run: npm run cap:sync:ios');
  process.exit(1);
}
if (!content.includes('presentationContextProvider = self')) {
  console.error('❌ Apple Sign In patch present but presentationContextProvider is not assigned. Run: npm run cap:sync:ios');
  process.exit(1);
}
// Guard against the regression that shipped in build 16: windowScene.keyWindow is
// iOS 15+, but the pod deploys at iOS 14 → compile error → build silently fell back
// to the unpatched plugin → Apple Sign In failed on iPad (App Review 2.1a).
if (/windowScene\.keyWindow/.test(content)) {
  console.error('❌ Apple Sign In patch uses windowScene.keyWindow (iOS 15+) on an iOS 14 target — this breaks the build. Remove it.');
  process.exit(1);
}
// Capacitor runs plugin methods off the main thread. ASAuthorizationController presentation
// MUST be dispatched to the main thread or iPad fails with ASAuthorizationError 1000 (the
// "works on iPhone, fails on iPad" App Review 2.1a rejection). Require the main-thread hop.
if (!content.includes('DispatchQueue.main.async')) {
  console.error('❌ Apple Sign In patch must present on the main thread (DispatchQueue.main.async) — iPad fails otherwise.');
  process.exit(1);
}

console.log('✅ Apple Sign In iPad presentation patch present');
