#!/usr/bin/env node
/**
 * iPad requires ASAuthorizationControllerPresentationContextProviding for Sign in with Apple.
 * @capacitor-community/apple-sign-in omits this — causes error sheet on iPad (App Review 2.1a).
 *
 * Copies a vendored patched Plugin.swift into node_modules AND ios/App/Pods (if present).
 *
 * Usage: node scripts/patch-ios-apple-sign-in-presentation.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PATCHED_SOURCE = path.join(ROOT, 'scripts', 'ios', 'SignInWithApple-Plugin.patched.swift');
const pluginPkgRoot = path.join(ROOT, 'node_modules', '@capacitor-community', 'apple-sign-in');

function findPluginSwift(root) {
  const knownPaths = [
    path.join(root, 'ios', 'Plugin', 'Plugin.swift'),
    path.join(root, 'ios', 'Sources', 'SignInWithApple', 'Plugin.swift'),
  ];
  for (const candidate of knownPaths) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const iosDir = path.join(root, 'ios');
  if (!fs.existsSync(iosDir)) return null;

  const stack = [iosDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === 'Plugin.swift') {
        return full;
      }
    }
  }
  return null;
}

function findPodsPluginSwift() {
  const podsRoot = path.join(ROOT, 'ios', 'App', 'Pods');
  if (!fs.existsSync(podsRoot)) return null;
  const stack = [podsRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'SignInWithApple' || entry.name === 'CapacitorCommunityAppleSignIn') {
          const candidate = path.join(full, 'Plugin.swift');
          if (fs.existsSync(candidate)) return candidate;
        }
        stack.push(full);
      } else if (entry.isFile() && entry.name === 'Plugin.swift' && full.includes('AppleSignIn')) {
        return full;
      }
    }
  }
  return findPluginSwift(path.join(podsRoot, 'CapacitorCommunityAppleSignIn'));
}

function applyPatch(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  const patched = fs.readFileSync(PATCHED_SOURCE, 'utf8');
  fs.writeFileSync(targetPath, patched);
  console.log(`Patched Apple Sign In plugin (${targetPath}).`);
  return true;
}

function verifyPatch(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  const content = fs.readFileSync(targetPath, 'utf8');
  return content.includes('ASAuthorizationControllerPresentationContextProviding') &&
    content.includes('presentationContextProvider = self');
}

if (!fs.existsSync(PATCHED_SOURCE)) {
  console.error('Missing patched source:', PATCHED_SOURCE);
  process.exit(1);
}

if (!fs.existsSync(pluginPkgRoot)) {
  console.log('Apple Sign In plugin not installed — skip presentation patch.');
  process.exit(0);
}

const nodeModulesSwift = findPluginSwift(pluginPkgRoot);
const podsSwift = findPodsPluginSwift();

let patchedAny = false;
if (applyPatch(nodeModulesSwift)) patchedAny = true;
if (podsSwift && podsSwift !== nodeModulesSwift && applyPatch(podsSwift)) patchedAny = true;

if (!patchedAny) {
  console.error(
    'ERROR: @capacitor-community/apple-sign-in is installed but Plugin.swift was not found.\n' +
      '       Run: npm install --legacy-peer-deps\n' +
      '       Then re-run: npm run cap:sync:ios'
  );
  process.exit(1);
}

const targets = [nodeModulesSwift, podsSwift].filter(Boolean);
for (const target of targets) {
  if (!verifyPatch(target)) {
    console.error('ERROR: Apple Sign In patch verification failed for', target);
    process.exit(1);
  }
}

console.log('Apple Sign In iPad presentation patch verified.');
