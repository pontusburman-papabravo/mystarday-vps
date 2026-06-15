#!/usr/bin/env node
/**
 * iPad requires ASAuthorizationControllerPresentationContextProviding for Sign in with Apple.
 * @capacitor-community/apple-sign-in omits this — causes error sheet on iPad (App Review 2.1a).
 *
 * Usage: node scripts/patch-ios-apple-sign-in-presentation.mjs
 */
import fs from 'fs';
import path from 'path';

const pluginPkgRoot = path.join(
  process.cwd(),
  'node_modules',
  '@capacitor-community',
  'apple-sign-in'
);

function findPluginSwift(root) {
  const knownPaths = [
    path.join(root, 'ios', 'Plugin', 'Plugin.swift'), // v7.0.x CocoaPods layout
    path.join(root, 'ios', 'Sources', 'SignInWithApple', 'Plugin.swift'), // v7.1+ SPM layout
  ];
  for (const candidate of knownPaths) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const iosDir = path.join(root, 'ios');
  if (!fs.existsSync(iosDir)) return null;

  /** @type {string[]} */
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

if (!fs.existsSync(pluginPkgRoot)) {
  console.log('Apple Sign In plugin not installed — skip presentation patch.');
  process.exit(0);
}

const pluginSwift = findPluginSwift(pluginPkgRoot);

if (!pluginSwift) {
  console.error(
    'ERROR: @capacitor-community/apple-sign-in is installed but Plugin.swift was not found.\n' +
      '       Run: npm install --legacy-peer-deps\n' +
      '       Then re-run: npm run cap:sync:ios'
  );
  process.exit(1);
}

let content = fs.readFileSync(pluginSwift, 'utf8');

if (content.includes('ASAuthorizationControllerPresentationContextProviding')) {
  console.log(`Apple Sign In presentation patch already applied (${pluginSwift}).`);
  process.exit(0);
}

const performMarker = 'authorizationController.performRequests()';
if (!content.includes(performMarker)) {
  console.error(`Could not find performRequests() in ${pluginSwift}`);
  process.exit(1);
}

content = content.replace(
  performMarker,
  `authorizationController.presentationContextProvider = self
        authorizationController.performRequests()`
);

const extensionBlock = `

extension SignInWithApple: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        if let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
           let window = scene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
`;

content = content.trimEnd() + extensionBlock + '\n';
fs.writeFileSync(pluginSwift, content);
console.log(`Patched Apple Sign In plugin for iPad presentation context (${pluginSwift}).`);
