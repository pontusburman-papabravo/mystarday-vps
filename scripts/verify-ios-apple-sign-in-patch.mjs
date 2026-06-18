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

console.log('✅ Apple Sign In iPad presentation patch present');
